"""
Feature 1 (Phase 5): Evidence Service Layer

Business logic for evidence file lifecycle management.
Extracted from views to support Clean Architecture.

Usage:
    from apps.evidence.services import EvidenceService

    service = EvidenceService()
    evidence = service.upload_evidence(
        case=case,
        uploaded_file=file,
        uploaded_by=user,
        source='MANUAL_UPLOAD',
        ...
    )
"""
from typing import Dict, Optional, Tuple, BinaryIO
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile
import hashlib
import magic
import logging

from apps.evidence.models import EvidenceFile, ChainOfCustody
from apps.evidence.storage import get_evidence_vault

logger = logging.getLogger(__name__)


class EvidenceService:
    """
    Service layer for evidence file management operations.

    Handles:
    - Evidence upload with encryption and hashing
    - Digital signature generation and verification
    - Evidence download with chain of custody
    - Integrity verification
    - Automatic timeline and custody tracking
    """

    @staticmethod
    @transaction.atomic
    def upload_evidence(
        case,
        uploaded_file: UploadedFile,
        uploaded_by,
        source: str,
        description: str = '',
        tags: list = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        encrypt: bool = True,
        auto_sign: bool = True
    ) -> EvidenceFile:
        """
        Upload evidence file with encryption, hashing, and chain of custody.

        This is the core evidence upload operation that handles:
        1. File reading and MIME type detection
        2. Upload to secure vault with encryption
        3. Hash calculation (SHA-256)
        4. Evidence record creation
        5. Chain of custody initialization
        6. Digital signature generation (if enabled)
        7. Case timeline event creation

        Args:
            case: Case to attach evidence to
            uploaded_file: Django UploadedFile instance
            uploaded_by: User uploading the evidence
            source: Evidence source (from EvidenceFile.Source choices)
            description: Optional description
            tags: List of tags
            ip_address: Client IP address for custody chain
            user_agent: Client user agent for custody chain
            encrypt: Whether to encrypt the file (default: True)
            auto_sign: Whether to automatically sign evidence (default: True)

        Returns:
            Created EvidenceFile instance with all metadata

        Raises:
            ValidationError: If validation fails
            Exception: If upload or storage fails
        """
        # Validate source
        from apps.evidence.models import EvidenceFile
        if source not in dict(EvidenceFile.Source.choices):
            raise ValidationError(f"Invalid source: {source}")

        try:
            # Read file content
            file_content = uploaded_file.read()

            # Detect MIME type using python-magic
            mime_type = magic.from_buffer(file_content, mime=True)

            # Upload to evidence vault with encryption
            logger.info(
                f"Uploading evidence: {uploaded_file.name} "
                f"({len(file_content)} bytes) for case {case.id}"
            )

            storage_metadata = get_evidence_vault().upload_evidence(
                file_content=file_content,
                file_name=uploaded_file.name,
                case_id=case.id,
                user_id=uploaded_by.id,
                encrypt=encrypt
            )

            # Determine file type from MIME type
            file_type = EvidenceService._determine_file_type(mime_type)

            # Create evidence record
            evidence = EvidenceFile.objects.create(
                case=case,
                tenant=case.tenant,
                file_name=uploaded_file.name,
                file_type=file_type,
                mime_type=mime_type,
                file_size=storage_metadata['file_size'],
                storage_path=storage_metadata['storage_path'],
                sha256_hash=storage_metadata['sha256_hash'],
                md5_hash=storage_metadata.get('md5_hash'),
                source=source,
                uploaded_by=uploaded_by,
                description=description,
                tags=tags or [],
                is_encrypted=storage_metadata['is_encrypted'],
                encryption_algorithm='AES-256-GCM' if encrypt else None,
                encryption_key_id=storage_metadata.get('encryption_key_id')
            )

            logger.info(
                f"Evidence created: {evidence.id} - {evidence.file_name} "
                f"(hash: {evidence.sha256_hash[:16]}...)"
            )

            # Create initial chain of custody record
            from apps.evidence.services import CustodyService
            CustodyService.create_custody_record(
                evidence=evidence,
                action='UPLOADED',
                actor=uploaded_by,
                description=f'Evidence uploaded: {uploaded_file.name}',
                ip_address=ip_address,
                user_agent=user_agent,
                file_hash=storage_metadata['sha256_hash'],
                integrity_verified=True
            )

            # Generate digital signature for evidence
            if auto_sign:
                try:
                    evidence.sign_evidence(save=True)
                    logger.info(
                        f"Evidence signed: {evidence.id} "
                        f"(signature algorithm: {evidence.digital_signature.get('algorithm')})"
                    )
                except Exception as e:
                    # Don't fail upload if signing fails, but log it
                    logger.error(f"Failed to sign evidence {evidence.id}: {e}")

            # Create timeline event
            from apps.cases.services import TimelineService
            TimelineService.create_evidence_event(
                case=case,
                evidence_file=evidence,
                actor=uploaded_by,
                description=f'Evidence file uploaded: {uploaded_file.name} ({file_type})'
            )

            logger.info(
                f"Evidence upload complete: {evidence.id} - {evidence.file_name}"
            )

            return evidence

        except Exception as e:
            logger.error(f"Evidence upload failed: {str(e)}", exc_info=True)
            raise

    @staticmethod
    def download_evidence(
        evidence: EvidenceFile,
        downloaded_by,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        decrypt: bool = True,
        create_custody_record: bool = True
    ) -> bytes:
        """
        Download evidence file with optional decryption and custody tracking.

        Args:
            evidence: Evidence file to download
            downloaded_by: User downloading the evidence
            ip_address: Client IP address for custody chain
            user_agent: Client user agent for custody chain
            decrypt: Whether to decrypt the file (default: True)
            create_custody_record: Whether to create custody record (default: True)

        Returns:
            File content as bytes

        Raises:
            ValidationError: If legal hold prevents download
            Exception: If download fails
        """
        # Check legal hold
        if evidence.legal_hold:
            raise ValidationError(
                "Evidence is under legal hold and cannot be downloaded"
            )

        try:
            # Download from vault
            logger.info(f"Downloading evidence: {evidence.id} - {evidence.file_name}")

            file_content = get_evidence_vault().download_evidence(
                storage_path=evidence.storage_path,
                decrypt=decrypt if evidence.is_encrypted else False
            )

            # Create chain of custody record with signature verification
            if create_custody_record:
                from apps.evidence.services import CustodyService

                # Use create_with_signature_verification for automatic signature check
                ChainOfCustody.create_with_signature_verification(
                    evidence=evidence,
                    action='DOWNLOADED',
                    actor=downloaded_by,
                    description=f'Evidence downloaded by {downloaded_by.full_name}',
                    ip_address=ip_address,
                    user_agent=user_agent,
                    file_hash_at_action=evidence.sha256_hash
                )

            logger.info(
                f"Evidence download complete: {evidence.id} "
                f"({len(file_content)} bytes)"
            )

            return file_content

        except Exception as e:
            logger.error(
                f"Evidence download failed for {evidence.id}: {str(e)}",
                exc_info=True
            )
            raise

    @staticmethod
    def verify_evidence_integrity(
        evidence: EvidenceFile,
        verified_by,
        ip_address: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Verify integrity of evidence file against stored hash.

        Args:
            evidence: Evidence file to verify
            verified_by: User performing verification
            ip_address: Client IP address for custody chain

        Returns:
            Tuple of (is_valid: bool, message: str)
        """
        try:
            logger.info(f"Verifying integrity: {evidence.id} - {evidence.file_name}")

            # Verify integrity using vault
            is_valid = get_evidence_vault().verify_integrity(
                storage_path=evidence.storage_path,
                expected_hash=evidence.sha256_hash
            )

            # Create custody record
            from apps.evidence.services import CustodyService
            CustodyService.create_custody_record(
                evidence=evidence,
                action='VERIFIED',
                actor=verified_by,
                description='Integrity verification performed',
                ip_address=ip_address,
                file_hash=evidence.sha256_hash,
                integrity_verified=is_valid
            )

            message = 'Integrity verified successfully' if is_valid else 'Integrity verification failed - hash mismatch'

            logger.info(
                f"Integrity verification: {evidence.id} - valid={is_valid}"
            )

            return is_valid, message

        except Exception as e:
            logger.error(
                f"Integrity verification failed for {evidence.id}: {str(e)}",
                exc_info=True
            )
            return False, f"Verification error: {str(e)}"

    @staticmethod
    def verify_evidence_signature(
        evidence: EvidenceFile,
        verified_by,
        current_file_hash: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[bool, str, Dict]:
        """
        Verify digital signature of evidence file.

        Args:
            evidence: Evidence file to verify
            verified_by: User performing verification
            current_file_hash: Optional current hash for re-verification
            ip_address: Client IP address for custody chain
            user_agent: Client user agent for custody chain

        Returns:
            Tuple of (is_valid: bool, error: str, signature_data: dict)
        """
        try:
            logger.info(
                f"Verifying signature: {evidence.id} - {evidence.file_name}"
            )

            # Get hash to verify against
            hash_to_verify = current_file_hash or evidence.sha256_hash

            # Verify signature using model method
            is_valid, error = evidence.verify_signature(
                current_file_hash=hash_to_verify
            )

            # Create custody record for verification
            from apps.evidence.services import CustodyService
            CustodyService.create_custody_record(
                evidence=evidence,
                action='VERIFIED',
                actor=verified_by,
                description=f'Digital signature verified: {"Valid" if is_valid else "Invalid"}',
                ip_address=ip_address,
                user_agent=user_agent,
                file_hash=hash_to_verify,
                integrity_verified=is_valid
            )

            logger.info(
                f"Signature verification: {evidence.id} - valid={is_valid}"
            )

            return is_valid, error or '', evidence.digital_signature

        except Exception as e:
            logger.error(
                f"Signature verification failed for {evidence.id}: {str(e)}",
                exc_info=True
            )
            return False, str(e), {}

    @staticmethod
    def set_legal_hold(
        evidence: EvidenceFile,
        set_by,
        reason: str,
        retention_until: Optional[timezone.datetime] = None
    ) -> EvidenceFile:
        """
        Place evidence under legal hold.

        Args:
            evidence: Evidence file to place on hold
            set_by: User placing the hold
            reason: Reason for legal hold
            retention_until: Optional retention date

        Returns:
            Updated EvidenceFile instance
        """
        evidence.legal_hold = True
        evidence.retention_until = retention_until
        evidence.save(update_fields=['legal_hold', 'retention_until'])

        # Create custody record
        from apps.evidence.services import CustodyService
        CustodyService.create_custody_record(
            evidence=evidence,
            action='VERIFIED',  # Using VERIFIED as closest action
            actor=set_by,
            description=f'Legal hold placed: {reason}',
            file_hash=evidence.sha256_hash
        )

        logger.info(
            f"Legal hold placed: {evidence.id} by {set_by.email} - {reason}"
        )

        return evidence

    @staticmethod
    def release_legal_hold(
        evidence: EvidenceFile,
        released_by,
        reason: str
    ) -> EvidenceFile:
        """
        Release evidence from legal hold.

        Args:
            evidence: Evidence file to release
            released_by: User releasing the hold
            reason: Reason for release

        Returns:
            Updated EvidenceFile instance
        """
        if not evidence.legal_hold:
            raise ValidationError("Evidence is not under legal hold")

        evidence.legal_hold = False
        evidence.save(update_fields=['legal_hold'])

        # Create custody record
        from apps.evidence.services import CustodyService
        CustodyService.create_custody_record(
            evidence=evidence,
            action='VERIFIED',
            actor=released_by,
            description=f'Legal hold released: {reason}',
            file_hash=evidence.sha256_hash
        )

        logger.info(
            f"Legal hold released: {evidence.id} by {released_by.email} - {reason}"
        )

        return evidence

    @staticmethod
    def _determine_file_type(mime_type: str) -> str:
        """
        Determine file type category from MIME type.

        Args:
            mime_type: MIME type string

        Returns:
            File type category (from EvidenceFile.FileType)
        """
        if mime_type.startswith('image/'):
            return 'IMAGE'
        elif mime_type.startswith('video/'):
            return 'VIDEO'
        elif mime_type.startswith('audio/'):
            return 'AUDIO'
        elif mime_type in [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]:
            return 'DOCUMENT'
        elif mime_type in [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
        ]:
            return 'SPREADSHEET'
        elif mime_type in [
            'application/zip',
            'application/x-rar-compressed',
            'application/x-7z-compressed'
        ]:
            return 'ARCHIVE'
        else:
            return 'OTHER'

    @staticmethod
    def calculate_hash(file_content: bytes) -> str:
        """
        Calculate SHA-256 hash of file content.

        Args:
            file_content: File content as bytes

        Returns:
            Hexadecimal SHA-256 hash string
        """
        return hashlib.sha256(file_content).hexdigest()

    @staticmethod
    def get_evidence_statistics(queryset) -> Dict:
        """
        Calculate statistics for an evidence queryset.

        Args:
            queryset: EvidenceFile queryset to analyze

        Returns:
            Dictionary of statistics
        """
        from django.db import models

        stats = {
            'total': queryset.count(),
            'by_type': {},
            'by_source': {},
            'total_size_bytes': queryset.aggregate(
                total=models.Sum('file_size')
            )['total'] or 0,
            'encrypted_count': queryset.filter(is_encrypted=True).count(),
            'legal_hold_count': queryset.filter(legal_hold=True).count(),
            'signed_count': queryset.exclude(
                digital_signature={}
            ).filter(signature_verified=True).count(),
        }

        # Count by file type
        from apps.evidence.models import EvidenceFile
        for file_type in EvidenceFile.FileType.choices:
            count = queryset.filter(file_type=file_type[0]).count()
            if count > 0:
                stats['by_type'][file_type[1]] = count

        # Count by source
        for source in EvidenceFile.Source.choices:
            count = queryset.filter(source=source[0]).count()
            if count > 0:
                stats['by_source'][source[1]] = count

        # Human-readable size
        stats['total_size_mb'] = stats['total_size_bytes'] / (1024 * 1024)
        stats['total_size_gb'] = stats['total_size_bytes'] / (1024 * 1024 * 1024)

        return stats
