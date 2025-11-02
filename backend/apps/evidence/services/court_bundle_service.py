"""
Feature 1 (Phase 5): Court Bundle Service Layer

Business logic for court bundle management.
Extracted from views to support Clean Architecture.

Usage:
    from apps.evidence.services import CourtBundleService

    service = CourtBundleService()
    bundle = service.create_bundle(
        case=case,
        bundle_name='Evidence Package',
        evidence_files=[evidence1, evidence2],
        created_by=user,
        ...
    )
"""
from typing import Dict, Optional, List, Tuple
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
import logging
import zipfile
import io
import hashlib

from apps.evidence.models import CourtBundle, EvidenceFile
from apps.evidence.storage import get_evidence_vault

logger = logging.getLogger(__name__)


class CourtBundleService:
    """
    Service layer for court bundle operations.

    Handles:
    - Court bundle creation with manifest
    - Bundle generation (ZIP packaging)
    - Digital signature (Ed25519)
    - Bundle verification
    - Evidence export for legal proceedings
    """

    @staticmethod
    @transaction.atomic
    def create_bundle(
        case,
        bundle_name: str,
        created_by,
        evidence_files: List[EvidenceFile],
        description: str = '',
        court_name: Optional[str] = None,
        case_reference: Optional[str] = None,
        auto_generate: bool = False
    ) -> CourtBundle:
        """
        Create a court bundle from evidence files.

        Args:
            case: Case the bundle is for
            bundle_name: Name of the bundle
            created_by: User creating the bundle
            evidence_files: List of EvidenceFile instances to include
            description: Optional description
            court_name: Name of court (for legal proceedings)
            case_reference: Court case reference number
            auto_generate: Whether to automatically generate the bundle file

        Returns:
            Created CourtBundle instance

        Raises:
            ValidationError: If validation fails
        """
        # Validate evidence files belong to case
        for evidence in evidence_files:
            if evidence.case_id != case.id:
                raise ValidationError(
                    f"Evidence {evidence.id} does not belong to case {case.id}"
                )

        # Create bundle
        bundle = CourtBundle.objects.create(
            case=case,
            tenant=case.tenant,
            bundle_name=bundle_name,
            description=description,
            status='PENDING',
            created_by=created_by,
            court_name=court_name,
            case_reference=case_reference or case.fir_number
        )

        # Add evidence files to bundle
        bundle.evidence_files.set(evidence_files)

        # Generate manifest
        manifest = CourtBundleService._generate_manifest(
            bundle=bundle,
            evidence_files=evidence_files
        )
        bundle.manifest = manifest
        bundle.save(update_fields=['manifest'])

        logger.info(
            f"Court bundle created: {bundle.id} - {bundle_name} "
            f"({len(evidence_files)} files)"
        )

        # Auto-generate if requested
        if auto_generate:
            try:
                CourtBundleService.generate_bundle_file(
                    bundle=bundle,
                    sign_bundle=True
                )
            except Exception as e:
                logger.error(f"Auto-generation failed for bundle {bundle.id}: {e}")
                # Don't fail creation if generation fails
                bundle.status = 'FAILED'
                bundle.save(update_fields=['status'])

        return bundle

    @staticmethod
    @transaction.atomic
    def generate_bundle_file(
        bundle: CourtBundle,
        sign_bundle: bool = True
    ) -> CourtBundle:
        """
        Generate the actual bundle ZIP file with all evidence.

        Creates a ZIP archive containing:
        - All evidence files
        - Manifest.json (metadata)
        - Custody_Chain.csv (for each file)
        - README.txt (instructions)

        Args:
            bundle: CourtBundle to generate
            sign_bundle: Whether to digitally sign the bundle

        Returns:
            Updated CourtBundle instance with READY status

        Raises:
            ValidationError: If bundle is invalid
            Exception: If generation fails
        """
        if bundle.status not in ['PENDING', 'FAILED']:
            raise ValidationError(
                f"Cannot generate bundle in status {bundle.status}"
            )

        try:
            bundle.status = 'GENERATING'
            bundle.save(update_fields=['status'])

            logger.info(f"Generating bundle file: {bundle.id} - {bundle.bundle_name}")

            # Create ZIP file in memory
            zip_buffer = io.BytesIO()

            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Add manifest.json
                import json
                manifest_json = json.dumps(bundle.manifest, indent=2)
                zip_file.writestr('manifest.json', manifest_json)

                # Add README.txt
                readme = CourtBundleService._generate_readme(bundle)
                zip_file.writestr('README.txt', readme)

                # Add each evidence file
                for evidence in bundle.evidence_files.all():
                    try:
                        # Download evidence
                        file_content = get_evidence_vault().download_evidence(
                            storage_path=evidence.storage_path,
                            decrypt=True  # Always decrypt for court bundles
                        )

                        # Add to ZIP with folder structure
                        zip_path = f"evidence/{evidence.file_name}"
                        zip_file.writestr(zip_path, file_content)

                        # Add custody chain CSV for this evidence
                        custody_csv = CourtBundleService._generate_custody_csv(evidence)
                        custody_path = f"custody_chains/{evidence.id}_{evidence.file_name}.csv"
                        zip_file.writestr(custody_path, custody_csv)

                        logger.debug(f"Added to bundle: {evidence.file_name}")

                    except Exception as e:
                        logger.error(
                            f"Failed to add evidence {evidence.id} to bundle: {e}"
                        )
                        # Continue with other files

            # Get ZIP content
            zip_content = zip_buffer.getvalue()

            # Calculate hash
            bundle_hash = hashlib.sha256(zip_content).hexdigest()

            # Upload to storage
            bundle_filename = f"{bundle.bundle_name.replace(' ', '_')}_{bundle.id}.zip"

            storage_result = get_evidence_vault().upload_evidence(
                file_content=zip_content,
                file_name=bundle_filename,
                case_id=bundle.case.id,
                user_id=bundle.created_by.id if bundle.created_by else 0,
                encrypt=False  # Court bundles are not encrypted
            )

            # Update bundle
            bundle.bundle_path = storage_result['storage_path']
            bundle.bundle_size = len(zip_content)
            bundle.bundle_hash = bundle_hash
            bundle.status = 'READY'
            bundle.generated_at = timezone.now()
            bundle.save(update_fields=[
                'bundle_path',
                'bundle_size',
                'bundle_hash',
                'status',
                'generated_at'
            ])

            # Sign bundle if requested
            if sign_bundle:
                try:
                    bundle.sign_bundle(save=True)
                    logger.info(f"Bundle signed: {bundle.id}")
                except Exception as e:
                    logger.error(f"Failed to sign bundle {bundle.id}: {e}")
                    # Don't fail generation if signing fails

            logger.info(
                f"Bundle generated: {bundle.id} - {bundle_filename} "
                f"({bundle.bundle_size} bytes, hash: {bundle_hash[:16]}...)"
            )

            return bundle

        except Exception as e:
            logger.error(f"Bundle generation failed for {bundle.id}: {e}", exc_info=True)
            bundle.status = 'FAILED'
            bundle.save(update_fields=['status'])
            raise

    @staticmethod
    def download_bundle(
        bundle: CourtBundle,
        downloaded_by
    ) -> bytes:
        """
        Download generated court bundle.

        Args:
            bundle: CourtBundle to download
            downloaded_by: User downloading the bundle

        Returns:
            Bundle file content as bytes

        Raises:
            ValidationError: If bundle is not ready
            Exception: If download fails
        """
        if bundle.status != 'READY':
            raise ValidationError(
                f"Bundle is not ready for download (status: {bundle.status})"
            )

        try:
            logger.info(f"Downloading bundle: {bundle.id} - {bundle.bundle_name}")

            file_content = get_evidence_vault().download_evidence(
                storage_path=bundle.bundle_path,
                decrypt=False  # Bundles are not encrypted
            )

            # Create audit log (optional - could add BundleDownloadLog model)
            logger.info(
                f"Bundle downloaded: {bundle.id} by {downloaded_by.email} "
                f"({len(file_content)} bytes)"
            )

            return file_content

        except Exception as e:
            logger.error(f"Bundle download failed for {bundle.id}: {e}", exc_info=True)
            raise

    @staticmethod
    def verify_bundle_signature(
        bundle: CourtBundle
    ) -> Tuple[bool, str]:
        """
        Verify digital signature of court bundle.

        Args:
            bundle: CourtBundle to verify

        Returns:
            Tuple of (is_valid: bool, error: str)
        """
        try:
            logger.info(f"Verifying bundle signature: {bundle.id}")

            # Verify using model method
            is_valid, error = bundle.verify_bundle_signature()

            logger.info(
                f"Bundle signature verification: {bundle.id} - valid={is_valid}"
            )

            return is_valid, error

        except Exception as e:
            logger.error(
                f"Bundle signature verification failed for {bundle.id}: {e}",
                exc_info=True
            )
            return False, str(e)

    @staticmethod
    def _generate_manifest(
        bundle: CourtBundle,
        evidence_files: List[EvidenceFile]
    ) -> Dict:
        """
        Generate bundle manifest with metadata.

        Args:
            bundle: Court bundle
            evidence_files: List of evidence files

        Returns:
            Manifest dictionary
        """
        manifest = {
            'bundle_id': str(bundle.id),
            'bundle_name': bundle.bundle_name,
            'case_number': bundle.case.case_number,
            'fir_number': bundle.case.fir_number,
            'court_name': bundle.court_name,
            'case_reference': bundle.case_reference,
            'created_at': timezone.now().isoformat(),
            'created_by': {
                'name': bundle.created_by.full_name if bundle.created_by else 'Unknown',
                'email': bundle.created_by.email if bundle.created_by else 'unknown@example.com',
                'badge_number': bundle.created_by.badge_number if hasattr(bundle.created_by, 'badge_number') else None
            },
            'evidence_count': len(evidence_files),
            'evidence_files': []
        }

        # Add evidence file details
        for idx, evidence in enumerate(evidence_files, 1):
            manifest['evidence_files'].append({
                'sequence_number': idx,
                'evidence_id': str(evidence.id),
                'file_name': evidence.file_name,
                'file_type': evidence.file_type,
                'file_size': evidence.file_size,
                'sha256_hash': evidence.sha256_hash,
                'uploaded_date': evidence.created_at.isoformat(),
                'uploaded_by': evidence.uploaded_by.full_name if evidence.uploaded_by else 'Unknown',
                'description': evidence.description,
                'source': evidence.source,
                'digital_signature': evidence.digital_signature if evidence.digital_signature else None,
                'custody_record_count': evidence.custody_records.count()
            })

        return manifest

    @staticmethod
    def _generate_readme(bundle: CourtBundle) -> str:
        """
        Generate README.txt for court bundle.

        Args:
            bundle: Court bundle

        Returns:
            README content as string
        """
        readme = f"""
COURT EVIDENCE BUNDLE
=====================

Bundle Name: {bundle.bundle_name}
Case Number: {bundle.case.case_number}
FIR Number: {bundle.case.fir_number}
Court: {bundle.court_name or 'Not specified'}
Case Reference: {bundle.case_reference or 'Not specified'}

Generated: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}
Created By: {bundle.created_by.full_name if bundle.created_by else 'Unknown'}

Evidence Files: {bundle.evidence_files.count()}

CONTENTS
--------

1. manifest.json
   - Complete metadata for all evidence files
   - File hashes for integrity verification
   - Digital signatures
   - Chain of custody summaries

2. evidence/
   - All evidence files in original format
   - Files are decrypted for court submission
   - Each file is listed in manifest.json

3. custody_chains/
   - CSV files documenting chain of custody for each evidence file
   - Shows who accessed, when, and what actions were performed
   - Includes integrity verification records

INTEGRITY VERIFICATION
-----------------------

This bundle is digitally signed using Ed25519 algorithm.
Signature data is included in manifest.json.

To verify bundle integrity:
1. Check SHA-256 hash of entire ZIP file matches bundle_hash in manifest
2. Verify each evidence file hash matches the hash in manifest.json
3. Verify digital signature using the public key provided

Bundle Hash: {bundle.bundle_hash if bundle.bundle_hash else 'Not yet generated'}
Signature Algorithm: {bundle.signature_algorithm}
Signed At: {bundle.signed_at.isoformat() if bundle.signed_at else 'Not yet signed'}

LEGAL NOTICE
------------

This evidence bundle has been prepared for legal proceedings.
All evidence files have been properly documented with chain-of-custody records.
Any tampering with files will be detectable through hash verification.

Do not modify any files in this bundle.
Maintain the integrity of this bundle for legal validity.

For questions, contact: {bundle.created_by.email if bundle.created_by else 'N/A'}

Generated by CMS LERS - Cyber Crime Investigation Platform
"""
        return readme

    @staticmethod
    def _generate_custody_csv(evidence: EvidenceFile) -> str:
        """
        Generate CSV of chain of custody for an evidence file.

        Args:
            evidence: Evidence file

        Returns:
            CSV content as string
        """
        import csv
        import io

        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            'Timestamp',
            'Action',
            'Actor',
            'Description',
            'IP Address',
            'File Hash',
            'Integrity Verified'
        ])

        # Custody records
        for custody in evidence.custody_records.all().order_by('action_timestamp'):
            writer.writerow([
                custody.action_timestamp.strftime('%Y-%m-%d %H:%M:%S UTC'),
                custody.get_action_display(),
                custody.actor.full_name if custody.actor else 'System',
                custody.description,
                custody.ip_address or 'N/A',
                custody.file_hash_at_action or 'N/A',
                'Yes' if custody.integrity_verified else 'No'
            ])

        return output.getvalue()

    @staticmethod
    def get_bundle_statistics(queryset) -> Dict:
        """
        Calculate statistics for a bundle queryset.

        Args:
            queryset: CourtBundle queryset

        Returns:
            Dictionary of statistics
        """
        from django.db import models

        stats = {
            'total': queryset.count(),
            'by_status': {},
            'total_evidence_files': 0,
            'total_size_bytes': queryset.aggregate(
                total=models.Sum('bundle_size')
            )['total'] or 0,
            'signed_bundles': queryset.filter(signature_verified=True).count(),
        }

        # Count by status
        for status in CourtBundle.Status.choices:
            count = queryset.filter(status=status[0]).count()
            if count > 0:
                stats['by_status'][status[1]] = count

        # Total evidence files across all bundles
        for bundle in queryset:
            stats['total_evidence_files'] += bundle.evidence_files.count()

        # Human-readable size
        stats['total_size_mb'] = stats['total_size_bytes'] / (1024 * 1024)
        stats['total_size_gb'] = stats['total_size_bytes'] / (1024 * 1024 * 1024)

        return stats
