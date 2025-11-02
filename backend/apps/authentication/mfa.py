"""
Multi-Factor Authentication (MFA/2FA) utilities.

Feature 11: Multi-Factor Authentication
- TOTP (Time-based One-Time Password) using Google Authenticator, Authy, etc.
- Backup codes for account recovery
- QR code generation for easy setup
- Rate limiting for MFA attempts
- Audit logging for MFA events

Security Features:
- RFC 6238 compliant TOTP
- 30-second time window
- 6-digit codes
- Backup codes (8 codes, single-use)
- Rate limiting (5 attempts per 5 minutes)
"""

import pyotp
import qrcode
import secrets
import hashlib
from io import BytesIO
from base64 import b64encode
from datetime import datetime, timedelta
from typing import Tuple, List, Optional
from django.core.cache import cache
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class MFAManager:
    """
    Manager for Multi-Factor Authentication operations.

    Feature 11: Complete MFA implementation.
    """

    # TOTP configuration
    TOTP_ISSUER = "CMS LERS"
    TOTP_DIGITS = 6
    TOTP_INTERVAL = 30  # seconds

    # Backup codes configuration
    BACKUP_CODE_COUNT = 8
    BACKUP_CODE_LENGTH = 10

    # Rate limiting
    MAX_MFA_ATTEMPTS = 5
    MFA_LOCKOUT_MINUTES = 5

    @staticmethod
    def generate_totp_secret() -> str:
        """
        Generate a new TOTP secret key.

        Returns:
            Base32-encoded secret string
        """
        return pyotp.random_base32()

    @staticmethod
    def generate_totp_uri(secret: str, email: str) -> str:
        """
        Generate TOTP provisioning URI for QR code.

        Args:
            secret: TOTP secret key
            email: User's email address

        Returns:
            otpauth:// URI string
        """
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(
            name=email,
            issuer_name=MFAManager.TOTP_ISSUER
        )

    @staticmethod
    def generate_qr_code(totp_uri: str) -> str:
        """
        Generate QR code image for TOTP setup.

        Args:
            totp_uri: TOTP provisioning URI

        Returns:
            Base64-encoded PNG image
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(totp_uri)
        qr.make(fit=True)

        # Generate image
        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = b64encode(buffer.getvalue()).decode()

        return f"data:image/png;base64,{img_str}"

    @staticmethod
    def verify_totp_code(secret: str, code: str, window: int = 1) -> bool:
        """
        Verify TOTP code.

        Args:
            secret: TOTP secret key
            code: 6-digit code from authenticator app
            window: Number of time windows to check (allows for clock skew)

        Returns:
            True if code is valid
        """
        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(code, valid_window=window)
        except Exception as e:
            logger.error(f"TOTP verification error: {e}")
            return False

    @staticmethod
    def generate_backup_codes(count: int = BACKUP_CODE_COUNT) -> List[str]:
        """
        Generate backup codes for account recovery.

        Args:
            count: Number of backup codes to generate

        Returns:
            List of backup codes
        """
        codes = []
        for _ in range(count):
            # Generate random alphanumeric code
            code = ''.join(
                secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')
                for _ in range(MFAManager.BACKUP_CODE_LENGTH)
            )
            # Format as XXXX-XXXX-XX
            formatted_code = f"{code[:4]}-{code[4:8]}-{code[8:]}"
            codes.append(formatted_code)

        return codes

    @staticmethod
    def hash_backup_code(code: str) -> str:
        """
        Hash backup code for secure storage.

        Args:
            code: Backup code

        Returns:
            SHA-256 hash of code
        """
        # Remove hyphens and convert to uppercase
        normalized_code = code.replace('-', '').upper()
        return hashlib.sha256(normalized_code.encode()).hexdigest()

    @staticmethod
    def verify_backup_code(code: str, hashed_codes: List[str]) -> Tuple[bool, Optional[str]]:
        """
        Verify backup code against list of hashed codes.

        Args:
            code: Backup code to verify
            hashed_codes: List of hashed backup codes

        Returns:
            Tuple of (is_valid, matched_hash)
        """
        code_hash = MFAManager.hash_backup_code(code)

        if code_hash in hashed_codes:
            return True, code_hash

        return False, None

    @staticmethod
    def check_rate_limit(user_id: int) -> Tuple[bool, int]:
        """
        Check if user has exceeded MFA attempt rate limit.

        Args:
            user_id: User ID

        Returns:
            Tuple of (is_allowed, remaining_attempts)
        """
        cache_key = f"mfa_attempts:{user_id}"
        attempts = cache.get(cache_key, 0)

        if attempts >= MFAManager.MAX_MFA_ATTEMPTS:
            # Check lockout time
            lockout_key = f"mfa_lockout:{user_id}"
            lockout_time = cache.get(lockout_key)

            if lockout_time:
                return False, 0

        remaining = max(0, MFAManager.MAX_MFA_ATTEMPTS - attempts)
        return True, remaining

    @staticmethod
    def record_mfa_attempt(user_id: int, success: bool):
        """
        Record MFA verification attempt.

        Args:
            user_id: User ID
            success: Whether attempt was successful
        """
        cache_key = f"mfa_attempts:{user_id}"

        if success:
            # Clear attempts on success
            cache.delete(cache_key)
            cache.delete(f"mfa_lockout:{user_id}")
        else:
            # Increment failed attempts
            attempts = cache.get(cache_key, 0) + 1
            cache.set(cache_key, attempts, timeout=300)  # 5 minutes

            # Set lockout if max attempts reached
            if attempts >= MFAManager.MAX_MFA_ATTEMPTS:
                lockout_key = f"mfa_lockout:{user_id}"
                lockout_until = timezone.now() + timedelta(minutes=MFAManager.MFA_LOCKOUT_MINUTES)
                cache.set(lockout_key, lockout_until, timeout=300)

                logger.warning(
                    f"User {user_id} locked out from MFA attempts until {lockout_until}"
                )

    @staticmethod
    def create_mfa_session(user_id: int) -> str:
        """
        Create temporary MFA session for pending verification.

        Args:
            user_id: User ID

        Returns:
            MFA session token
        """
        token = secrets.token_urlsafe(32)
        cache_key = f"mfa_session:{token}"

        # Store session for 5 minutes
        cache.set(cache_key, user_id, timeout=300)

        return token

    @staticmethod
    def verify_mfa_session(token: str) -> Optional[int]:
        """
        Verify MFA session token and get user ID.

        Args:
            token: MFA session token

        Returns:
            User ID if valid, None otherwise
        """
        cache_key = f"mfa_session:{token}"
        user_id = cache.get(cache_key)

        if user_id:
            # Delete session after verification
            cache.delete(cache_key)
            return user_id

        return None


class MFASetup:
    """
    Helper class for MFA setup process.

    Feature 11: MFA enrollment flow.
    """

    @staticmethod
    def initiate_setup(user) -> dict:
        """
        Initiate MFA setup for user.

        Args:
            user: User object

        Returns:
            Dictionary with secret and QR code
        """
        # Generate new secret
        secret = MFAManager.generate_totp_secret()

        # Generate TOTP URI
        totp_uri = MFAManager.generate_totp_uri(secret, user.email)

        # Generate QR code
        qr_code = MFAManager.generate_qr_code(totp_uri)

        # Store temporary secret in cache (not saved to DB until verified)
        cache_key = f"mfa_setup:{user.id}"
        cache.set(cache_key, secret, timeout=600)  # 10 minutes

        return {
            'secret': secret,
            'qr_code': qr_code,
            'issuer': MFAManager.TOTP_ISSUER,
            'email': user.email
        }

    @staticmethod
    def verify_setup(user, code: str) -> Tuple[bool, Optional[List[str]]]:
        """
        Verify MFA setup with test code.

        Args:
            user: User object
            code: TOTP code from authenticator app

        Returns:
            Tuple of (success, backup_codes)
        """
        # Get temporary secret from cache
        cache_key = f"mfa_setup:{user.id}"
        secret = cache.get(cache_key)

        if not secret:
            logger.error(f"MFA setup expired for user {user.id}")
            return False, None

        # Verify code
        if not MFAManager.verify_totp_code(secret, code):
            logger.warning(f"Invalid MFA setup code for user {user.id}")
            return False, None

        # Generate backup codes
        backup_codes = MFAManager.generate_backup_codes()
        hashed_backup_codes = [
            MFAManager.hash_backup_code(code) for code in backup_codes
        ]

        # Save to user model
        user.two_factor_enabled = True
        user.two_factor_secret = secret
        user.mfa_backup_codes = hashed_backup_codes
        user.mfa_setup_at = timezone.now()
        user.save(update_fields=[
            'two_factor_enabled',
            'two_factor_secret',
            'mfa_backup_codes',
            'mfa_setup_at'
        ])

        # Clear cache
        cache.delete(cache_key)

        # Log MFA enablement
        from apps.audit.models import AuditLog
        AuditLog.log_security_event(
            user=user,
            action='MFA_ENABLED',
            description=f'Multi-factor authentication enabled for {user.email}',
            risk_score=0
        )

        logger.info(f"MFA enabled for user {user.id}")

        return True, backup_codes

    @staticmethod
    def disable_mfa(user) -> bool:
        """
        Disable MFA for user.

        Args:
            user: User object

        Returns:
            Success status
        """
        user.two_factor_enabled = False
        user.two_factor_secret = None
        user.mfa_backup_codes = []
        user.mfa_setup_at = None
        user.save(update_fields=[
            'two_factor_enabled',
            'two_factor_secret',
            'mfa_backup_codes',
            'mfa_setup_at'
        ])

        # Log MFA disablement
        from apps.audit.models import AuditLog
        AuditLog.log_security_event(
            user=user,
            action='MFA_DISABLED',
            description=f'Multi-factor authentication disabled for {user.email}',
            risk_score=20  # Disabling MFA is slightly risky
        )

        logger.info(f"MFA disabled for user {user.id}")

        return True


class MFAVerification:
    """
    Helper class for MFA verification during login.

    Feature 11: MFA login flow.
    """

    @staticmethod
    def verify_login(user, code: str, is_backup_code: bool = False) -> Tuple[bool, str]:
        """
        Verify MFA code during login.

        Args:
            user: User object
            code: TOTP code or backup code
            is_backup_code: Whether this is a backup code

        Returns:
            Tuple of (success, error_message)
        """
        # Check rate limit
        is_allowed, remaining = MFAManager.check_rate_limit(user.id)
        if not is_allowed:
            return False, "Too many failed attempts. Please try again in 5 minutes."

        # Verify backup code
        if is_backup_code:
            is_valid, matched_hash = MFAManager.verify_backup_code(
                code,
                user.mfa_backup_codes or []
            )

            if is_valid:
                # Remove used backup code
                user.mfa_backup_codes.remove(matched_hash)
                user.save(update_fields=['mfa_backup_codes'])

                # Log backup code usage
                from apps.audit.models import AuditLog
                AuditLog.log_security_event(
                    user=user,
                    action='MFA_BACKUP_CODE_USED',
                    description=f'Backup code used for login: {user.email}',
                    risk_score=10  # Backup code usage is slightly notable
                )

                # Record successful attempt
                MFAManager.record_mfa_attempt(user.id, success=True)

                logger.info(f"MFA backup code verified for user {user.id}")
                return True, ""
            else:
                # Record failed attempt
                MFAManager.record_mfa_attempt(user.id, success=False)

                logger.warning(f"Invalid MFA backup code for user {user.id}")
                return False, f"Invalid backup code. {remaining - 1} attempts remaining."

        # Verify TOTP code
        if MFAManager.verify_totp_code(user.two_factor_secret, code):
            # Record successful attempt
            MFAManager.record_mfa_attempt(user.id, success=True)

            # Update last MFA verification time
            user.mfa_last_verified_at = timezone.now()
            user.save(update_fields=['mfa_last_verified_at'])

            logger.info(f"MFA TOTP verified for user {user.id}")
            return True, ""
        else:
            # Record failed attempt
            MFAManager.record_mfa_attempt(user.id, success=False)

            logger.warning(f"Invalid MFA TOTP code for user {user.id}")
            return False, f"Invalid code. {remaining - 1} attempts remaining."
