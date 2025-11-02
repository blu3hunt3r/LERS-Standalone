"""
Cryptographic utilities for digital signatures and evidence integrity.

Feature 6: Signature Verification System
- RSA digital signatures for evidence files
- Ed25519 signatures for court bundles (faster, smaller)
- HMAC for internal integrity checks
- Signature verification with public key infrastructure
- Timestamping support for legal compliance

Security Features:
- RSA-4096 for maximum security
- Ed25519 for performance-critical operations
- SHA-256 hashing throughout
- Key rotation support
- Signature metadata (timestamp, algorithm, key ID)
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime
from typing import Dict, Tuple, Optional
from base64 import b64encode, b64decode

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding, ed25519
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


class SignatureError(Exception):
    """Base exception for signature operations."""
    pass


class SignatureVerificationError(SignatureError):
    """Raised when signature verification fails."""
    pass


class KeyManager:
    """
    Manages cryptographic keys for signing operations.

    Key Types:
    - RSA-4096: Evidence file signatures (high security)
    - Ed25519: Court bundle signatures (fast, small)
    - HMAC-SHA256: Internal integrity checks

    Key Storage:
    - Production: AWS KMS, Azure Key Vault, or HashiCorp Vault
    - Development: File-based keys in secure directory
    - Key rotation: Configurable rotation period
    """

    # Cache TTL for loaded keys (1 hour)
    CACHE_TTL = 3600

    @staticmethod
    def _get_cache_key(key_type: str, key_id: str) -> str:
        """Generate cache key for cryptographic key."""
        return f"crypto_key:{key_type}:{key_id}"

    @staticmethod
    def get_rsa_private_key() -> rsa.RSAPrivateKey:
        """
        Get RSA private key for signing.

        Returns:
            RSA private key object

        Raises:
            SignatureError: If key cannot be loaded
        """
        cache_key = KeyManager._get_cache_key('rsa', 'private')

        # Try cache first
        cached_key = cache.get(cache_key)
        if cached_key:
            return cached_key

        # Load from settings/storage
        try:
            if hasattr(settings, 'RSA_PRIVATE_KEY_PATH'):
                # Load from file (development)
                with open(settings.RSA_PRIVATE_KEY_PATH, 'rb') as f:
                    private_key = serialization.load_pem_private_key(
                        f.read(),
                        password=None,
                        backend=default_backend()
                    )
            elif hasattr(settings, 'RSA_PRIVATE_KEY_PEM'):
                # Load from settings (environment variable)
                private_key = serialization.load_pem_private_key(
                    settings.RSA_PRIVATE_KEY_PEM.encode(),
                    password=None,
                    backend=default_backend()
                )
            else:
                # Generate ephemeral key (DEVELOPMENT ONLY)
                logger.warning(
                    "No RSA private key configured. Generating ephemeral key. "
                    "DO NOT USE IN PRODUCTION!"
                )
                private_key = rsa.generate_private_key(
                    public_exponent=65537,
                    key_size=4096,
                    backend=default_backend()
                )

            # Cache the key
            cache.set(cache_key, private_key, KeyManager.CACHE_TTL)
            return private_key

        except Exception as e:
            raise SignatureError(f"Failed to load RSA private key: {e}")

    @staticmethod
    def get_rsa_public_key() -> rsa.RSAPublicKey:
        """
        Get RSA public key for verification.

        Returns:
            RSA public key object
        """
        private_key = KeyManager.get_rsa_private_key()
        return private_key.public_key()

    @staticmethod
    def get_ed25519_private_key() -> ed25519.Ed25519PrivateKey:
        """
        Get Ed25519 private key for signing (court bundles).

        Returns:
            Ed25519 private key object

        Raises:
            SignatureError: If key cannot be loaded
        """
        cache_key = KeyManager._get_cache_key('ed25519', 'private')

        # Try cache first
        cached_key = cache.get(cache_key)
        if cached_key:
            return cached_key

        try:
            if hasattr(settings, 'ED25519_PRIVATE_KEY_PATH'):
                with open(settings.ED25519_PRIVATE_KEY_PATH, 'rb') as f:
                    private_key = serialization.load_pem_private_key(
                        f.read(),
                        password=None,
                        backend=default_backend()
                    )
            elif hasattr(settings, 'ED25519_PRIVATE_KEY_PEM'):
                private_key = serialization.load_pem_private_key(
                    settings.ED25519_PRIVATE_KEY_PEM.encode(),
                    password=None,
                    backend=default_backend()
                )
            else:
                # Generate ephemeral key (DEVELOPMENT ONLY)
                logger.warning(
                    "No Ed25519 private key configured. Generating ephemeral key. "
                    "DO NOT USE IN PRODUCTION!"
                )
                private_key = ed25519.Ed25519PrivateKey.generate()

            # Cache the key
            cache.set(cache_key, private_key, KeyManager.CACHE_TTL)
            return private_key

        except Exception as e:
            raise SignatureError(f"Failed to load Ed25519 private key: {e}")

    @staticmethod
    def get_ed25519_public_key() -> ed25519.Ed25519PublicKey:
        """Get Ed25519 public key for verification."""
        private_key = KeyManager.get_ed25519_private_key()
        return private_key.public_key()

    @staticmethod
    def get_hmac_key() -> bytes:
        """
        Get HMAC key for internal integrity checks.

        Returns:
            HMAC key bytes
        """
        if hasattr(settings, 'HMAC_SIGNATURE_KEY'):
            return settings.HMAC_SIGNATURE_KEY.encode()

        # Fallback to SECRET_KEY (not ideal but acceptable for internal use)
        logger.warning("Using SECRET_KEY for HMAC. Set HMAC_SIGNATURE_KEY for better security.")
        return settings.SECRET_KEY.encode()


class EvidenceSignature:
    """
    Digital signatures for evidence files using RSA-4096.

    Signature Format:
    {
        "file_hash": "sha256:...",
        "file_name": "evidence.pdf",
        "file_size": 1024,
        "timestamp": "2025-10-29T12:00:00Z",
        "uploader_id": 123,
        "case_id": 456,
        "metadata": {...}
    }

    The entire JSON is signed with RSA-4096 + SHA-256.
    """

    @staticmethod
    def sign_evidence(
        file_hash: str,
        file_name: str,
        file_size: int,
        uploader_id: int,
        case_id: int,
        metadata: Optional[Dict] = None
    ) -> Dict[str, str]:
        """
        Sign evidence file with RSA-4096.

        Args:
            file_hash: SHA-256 hash of file
            file_name: Original file name
            file_size: File size in bytes
            uploader_id: ID of user who uploaded
            case_id: Case ID
            metadata: Optional additional metadata

        Returns:
            Dictionary with signature and metadata:
            {
                "signature": "base64-encoded-signature",
                "algorithm": "RSA-SHA256",
                "key_id": "key-identifier",
                "signed_at": "ISO-8601-timestamp",
                "payload": {...}  # What was signed
            }

        Raises:
            SignatureError: If signing fails
        """
        try:
            # Prepare payload
            payload = {
                "file_hash": file_hash,
                "file_name": file_name,
                "file_size": file_size,
                "timestamp": datetime.utcnow().isoformat() + 'Z',
                "uploader_id": uploader_id,
                "case_id": case_id,
                "metadata": metadata or {}
            }

            # Serialize payload (canonical JSON for consistent signatures)
            payload_bytes = json.dumps(payload, sort_keys=True).encode('utf-8')

            # Get private key
            private_key = KeyManager.get_rsa_private_key()

            # Sign payload
            signature = private_key.sign(
                payload_bytes,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )

            # Encode signature
            signature_b64 = b64encode(signature).decode('utf-8')

            # Return signature package
            result = {
                "signature": signature_b64,
                "algorithm": "RSA-4096-PSS-SHA256",
                "key_id": getattr(settings, 'RSA_KEY_ID', 'default'),
                "signed_at": payload["timestamp"],
                "payload": payload
            }

            logger.info(
                f"Evidence signed: file={file_name}, hash={file_hash[:16]}..., "
                f"case={case_id}, uploader={uploader_id}"
            )

            return result

        except Exception as e:
            logger.error(f"Evidence signing failed: {e}")
            raise SignatureError(f"Failed to sign evidence: {e}")

    @staticmethod
    def verify_evidence(signature_data: Dict) -> Tuple[bool, Optional[str]]:
        """
        Verify evidence signature.

        Args:
            signature_data: Signature dictionary from sign_evidence()

        Returns:
            Tuple of (is_valid, error_message)
            - (True, None) if signature is valid
            - (False, error_message) if signature is invalid
        """
        try:
            # Extract components
            signature_b64 = signature_data.get('signature')
            payload = signature_data.get('payload')
            algorithm = signature_data.get('algorithm')

            if not all([signature_b64, payload, algorithm]):
                return False, "Missing signature components"

            # Check algorithm
            if not algorithm.startswith('RSA-'):
                return False, f"Unsupported algorithm: {algorithm}"

            # Decode signature
            signature = b64decode(signature_b64)

            # Reconstruct payload bytes (canonical JSON)
            payload_bytes = json.dumps(payload, sort_keys=True).encode('utf-8')

            # Get public key
            public_key = KeyManager.get_rsa_public_key()

            # Verify signature
            public_key.verify(
                signature,
                payload_bytes,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )

            logger.info(
                f"Evidence signature verified: file={payload.get('file_name')}, "
                f"hash={payload.get('file_hash', '')[:16]}..."
            )

            return True, None

        except InvalidSignature:
            return False, "Signature verification failed - signature is invalid"
        except Exception as e:
            logger.error(f"Signature verification error: {e}")
            return False, f"Verification error: {str(e)}"

    @staticmethod
    def verify_file_integrity(
        signature_data: Dict,
        current_file_hash: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify signature AND that file hasn't been modified.

        Args:
            signature_data: Signature dictionary
            current_file_hash: Current SHA-256 hash of file

        Returns:
            Tuple of (is_valid, error_message)
        """
        # First verify signature
        is_valid, error = EvidenceSignature.verify_evidence(signature_data)
        if not is_valid:
            return False, error

        # Then check file hash
        signed_hash = signature_data.get('payload', {}).get('file_hash')
        if signed_hash != current_file_hash:
            return False, f"File has been modified (hash mismatch)"

        return True, None


class CourtBundleSignature:
    """
    Digital signatures for court bundles using Ed25519.

    Uses Ed25519 for:
    - Faster signing/verification
    - Smaller signatures (64 bytes vs 512 bytes for RSA)
    - Simpler implementation
    - Sufficient security for bundle manifests
    """

    @staticmethod
    def sign_bundle(
        bundle_id: int,
        case_id: int,
        evidence_hashes: list,
        manifest: Dict,
        created_by_id: int
    ) -> Dict[str, str]:
        """
        Sign court bundle manifest with Ed25519.

        Args:
            bundle_id: CourtBundle ID
            case_id: Case ID
            evidence_hashes: List of evidence file hashes
            manifest: Bundle manifest dictionary
            created_by_id: User ID of creator

        Returns:
            Dictionary with signature and metadata
        """
        try:
            # Prepare payload
            payload = {
                "bundle_id": bundle_id,
                "case_id": case_id,
                "evidence_hashes": sorted(evidence_hashes),  # Canonical order
                "manifest": manifest,
                "created_by": created_by_id,
                "timestamp": datetime.utcnow().isoformat() + 'Z'
            }

            # Serialize payload
            payload_bytes = json.dumps(payload, sort_keys=True).encode('utf-8')

            # Get private key
            private_key = KeyManager.get_ed25519_private_key()

            # Sign payload
            signature = private_key.sign(payload_bytes)

            # Encode signature
            signature_b64 = b64encode(signature).decode('utf-8')

            result = {
                "signature": signature_b64,
                "algorithm": "Ed25519",
                "key_id": getattr(settings, 'ED25519_KEY_ID', 'default'),
                "signed_at": payload["timestamp"],
                "payload": payload
            }

            logger.info(
                f"Court bundle signed: bundle_id={bundle_id}, case={case_id}, "
                f"evidence_count={len(evidence_hashes)}"
            )

            return result

        except Exception as e:
            logger.error(f"Bundle signing failed: {e}")
            raise SignatureError(f"Failed to sign bundle: {e}")

    @staticmethod
    def verify_bundle(signature_data: Dict) -> Tuple[bool, Optional[str]]:
        """
        Verify court bundle signature.

        Args:
            signature_data: Signature dictionary from sign_bundle()

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Extract components
            signature_b64 = signature_data.get('signature')
            payload = signature_data.get('payload')
            algorithm = signature_data.get('algorithm')

            if not all([signature_b64, payload, algorithm]):
                return False, "Missing signature components"

            if algorithm != 'Ed25519':
                return False, f"Unsupported algorithm: {algorithm}"

            # Decode signature
            signature = b64decode(signature_b64)

            # Reconstruct payload bytes
            payload_bytes = json.dumps(payload, sort_keys=True).encode('utf-8')

            # Get public key
            public_key = KeyManager.get_ed25519_public_key()

            # Verify signature
            public_key.verify(signature, payload_bytes)

            logger.info(
                f"Bundle signature verified: bundle_id={payload.get('bundle_id')}"
            )

            return True, None

        except InvalidSignature:
            return False, "Bundle signature is invalid"
        except Exception as e:
            logger.error(f"Bundle verification error: {e}")
            return False, f"Verification error: {str(e)}"


class HMACIntegrity:
    """
    HMAC-SHA256 for internal integrity checks.

    Use Cases:
    - API request signatures
    - Internal service-to-service authentication
    - Tamper detection for non-legal documents
    - Fast integrity checks where legal signatures not required
    """

    @staticmethod
    def sign(data: bytes) -> str:
        """
        Generate HMAC-SHA256 signature.

        Args:
            data: Data to sign

        Returns:
            Base64-encoded HMAC signature
        """
        key = KeyManager.get_hmac_key()
        signature = hmac.new(key, data, hashlib.sha256).digest()
        return b64encode(signature).decode('utf-8')

    @staticmethod
    def verify(data: bytes, signature: str) -> bool:
        """
        Verify HMAC-SHA256 signature.

        Args:
            data: Data to verify
            signature: Base64-encoded signature

        Returns:
            True if signature is valid
        """
        try:
            expected = HMACIntegrity.sign(data)
            # Constant-time comparison to prevent timing attacks
            return hmac.compare_digest(expected, signature)
        except Exception:
            return False


# Utility functions for common operations

def hash_file_content(file_content: bytes) -> str:
    """Calculate SHA-256 hash of file content."""
    return hashlib.sha256(file_content).hexdigest()


def hash_string(text: str) -> str:
    """Calculate SHA-256 hash of string."""
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def generate_key_pair(key_type: str = 'rsa') -> Tuple[bytes, bytes]:
    """
    Generate key pair for initial setup.

    Args:
        key_type: 'rsa' or 'ed25519'

    Returns:
        Tuple of (private_key_pem, public_key_pem)
    """
    if key_type == 'rsa':
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=4096,
            backend=default_backend()
        )
    elif key_type == 'ed25519':
        private_key = ed25519.Ed25519PrivateKey.generate()
    else:
        raise ValueError(f"Unsupported key type: {key_type}")

    # Serialize private key
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )

    # Serialize public key
    public_key = private_key.public_key()
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

    return private_pem, public_pem
