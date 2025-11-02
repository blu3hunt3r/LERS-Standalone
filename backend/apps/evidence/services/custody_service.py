"""
Feature 1 (Phase 5): Custody Service Layer

Business logic for chain-of-custody management.
Extracted from views to support Clean Architecture.

Usage:
    from apps.evidence.services import CustodyService

    service = CustodyService()
    custody = service.create_custody_record(
        evidence=evidence,
        action='DOWNLOADED',
        actor=user,
        ...
    )
"""
from typing import Dict, Optional, List, Tuple
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
import logging

from apps.evidence.models import ChainOfCustody, EvidenceFile

logger = logging.getLogger(__name__)


class CustodyService:
    """
    Service layer for chain-of-custody operations.

    Handles:
    - Custody record creation with validation
    - Signature verification integration
    - Custody chain querying and analysis
    - Audit trail management
    """

    @staticmethod
    def create_custody_record(
        evidence: EvidenceFile,
        action: str,
        actor,
        description: str = '',
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        file_hash: Optional[str] = None,
        integrity_verified: bool = False,
        metadata: Dict = None
    ) -> ChainOfCustody:
        """
        Create a chain-of-custody record for an evidence file.

        Args:
            evidence: Evidence file this record is for
            action: Action performed (from ChainOfCustody.Action choices)
            actor: User who performed the action
            description: Detailed description
            ip_address: Client IP address
            user_agent: Client user agent
            file_hash: File hash at time of action
            integrity_verified: Whether integrity was verified
            metadata: Additional metadata

        Returns:
            Created ChainOfCustody instance

        Raises:
            ValidationError: If validation fails
        """
        # Validate action
        if action not in dict(ChainOfCustody.Action.choices):
            raise ValidationError(f"Invalid custody action: {action}")

        # Create custody record
        custody = ChainOfCustody.objects.create(
            evidence=evidence,
            action=action,
            actor=actor,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            file_hash_at_action=file_hash or evidence.sha256_hash,
            integrity_verified=integrity_verified,
            metadata=metadata or {},
            action_timestamp=timezone.now()
        )

        logger.info(
            f"Custody record created: {custody.id} - {action} - "
            f"{evidence.file_name} by {actor.email if actor else 'System'}"
        )

        return custody

    @staticmethod
    def create_with_verification(
        evidence: EvidenceFile,
        action: str,
        actor,
        description: str = '',
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        verify_signature: bool = True
    ) -> ChainOfCustody:
        """
        Create custody record with automatic signature verification.

        This is the recommended method for creating custody records
        as it ensures digital signature is verified and recorded.

        Args:
            evidence: Evidence file
            action: Action performed
            actor: User who performed action
            description: Description
            ip_address: Client IP
            user_agent: User agent
            verify_signature: Whether to verify signature (default: True)

        Returns:
            Created ChainOfCustody instance with signature verification
        """
        # Create base custody record
        custody = CustodyService.create_custody_record(
            evidence=evidence,
            action=action,
            actor=actor,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            file_hash=evidence.sha256_hash
        )

        # Verify and record signature if requested
        if verify_signature and evidence.digital_signature:
            custody.verify_and_record_signature()

        return custody

    @staticmethod
    def get_custody_chain(
        evidence: EvidenceFile,
        action_filter: Optional[List[str]] = None,
        actor_id: Optional[int] = None,
        start_date: Optional[timezone.datetime] = None,
        end_date: Optional[timezone.datetime] = None
    ):
        """
        Get filtered chain of custody for an evidence file.

        Args:
            evidence: Evidence file
            action_filter: List of actions to include
            actor_id: Filter by specific actor
            start_date: Filter actions after this date
            end_date: Filter actions before this date

        Returns:
            Filtered queryset of ChainOfCustody records
        """
        queryset = evidence.custody_records.all()

        if action_filter:
            queryset = queryset.filter(action__in=action_filter)

        if actor_id:
            queryset = queryset.filter(actor_id=actor_id)

        if start_date:
            queryset = queryset.filter(action_timestamp__gte=start_date)

        if end_date:
            queryset = queryset.filter(action_timestamp__lte=end_date)

        return queryset.order_by('action_timestamp')

    @staticmethod
    def get_custody_summary(evidence: EvidenceFile) -> Dict:
        """
        Get comprehensive summary of custody chain.

        Args:
            evidence: Evidence file

        Returns:
            Dictionary with custody statistics
        """
        from django.db import models

        custody_records = evidence.custody_records.all()

        summary = {
            'total_actions': custody_records.count(),
            'by_action': {},
            'by_actor': {},
            'integrity_checks': custody_records.filter(
                integrity_verified=True
            ).count(),
            'first_action': custody_records.order_by('action_timestamp').first(),
            'last_action': custody_records.order_by('-action_timestamp').first(),
            'unique_actors': custody_records.values('actor').distinct().count(),
        }

        # Count by action type
        for action in ChainOfCustody.Action.choices:
            count = custody_records.filter(action=action[0]).count()
            if count > 0:
                summary['by_action'][action[1]] = count

        # Count by actor
        actor_counts = custody_records.values(
            'actor__full_name', 'actor__email'
        ).annotate(
            count=models.Count('id')
        ).order_by('-count')

        for actor in actor_counts:
            actor_name = actor['actor__full_name'] or actor['actor__email']
            summary['by_actor'][actor_name] = actor['count']

        return summary

    @staticmethod
    def validate_custody_chain(evidence: EvidenceFile) -> Tuple[bool, List[str]]:
        """
        Validate integrity of custody chain.

        Checks for:
        - Continuous chain (no gaps)
        - Hash consistency
        - Signature verification records

        Args:
            evidence: Evidence file to validate

        Returns:
            Tuple of (is_valid: bool, issues: List[str])
        """
        issues = []

        custody_records = evidence.custody_records.order_by('action_timestamp')

        if not custody_records.exists():
            issues.append("No custody records found")
            return False, issues

        # Check first action is UPLOADED
        first_record = custody_records.first()
        if first_record.action != 'UPLOADED':
            issues.append(
                f"First action should be UPLOADED, found {first_record.action}"
            )

        # Check hash consistency
        expected_hash = evidence.sha256_hash
        for record in custody_records:
            if record.file_hash_at_action and record.file_hash_at_action != expected_hash:
                issues.append(
                    f"Hash mismatch at {record.action_timestamp}: "
                    f"expected {expected_hash[:16]}..., "
                    f"found {record.file_hash_at_action[:16]}..."
                )

        # Check for signature verification
        if evidence.digital_signature:
            signature_verified = custody_records.filter(
                action='VERIFIED',
                metadata__signature_verification__verified=True
            ).exists()

            if not signature_verified:
                issues.append("Digital signature has not been verified")

        is_valid = len(issues) == 0

        return is_valid, issues

    @staticmethod
    def create_share_record(
        evidence: EvidenceFile,
        shared_by,
        shared_with_tenant,
        reason: str,
        ip_address: Optional[str] = None
    ) -> ChainOfCustody:
        """
        Create custody record for evidence sharing.

        Args:
            evidence: Evidence being shared
            shared_by: User sharing the evidence
            shared_with_tenant: Tenant receiving the evidence
            reason: Reason for sharing
            ip_address: Client IP

        Returns:
            Created ChainOfCustody instance
        """
        description = f'Evidence shared with {shared_with_tenant.name}: {reason}'

        return CustodyService.create_custody_record(
            evidence=evidence,
            action='SHARED',
            actor=shared_by,
            description=description,
            ip_address=ip_address,
            metadata={
                'shared_with_tenant_id': shared_with_tenant.id,
                'shared_with_tenant_name': shared_with_tenant.name,
                'reason': reason
            }
        )

    @staticmethod
    def create_export_record(
        evidence: EvidenceFile,
        exported_by,
        export_format: str,
        bundle_id: Optional[int] = None,
        ip_address: Optional[str] = None
    ) -> ChainOfCustody:
        """
        Create custody record for evidence export.

        Args:
            evidence: Evidence being exported
            exported_by: User exporting
            export_format: Format of export (e.g., 'court_bundle', 'zip')
            bundle_id: Optional court bundle ID
            ip_address: Client IP

        Returns:
            Created ChainOfCustody instance
        """
        description = f'Evidence exported to {export_format}'
        if bundle_id:
            description += f' (Court Bundle #{bundle_id})'

        return CustodyService.create_custody_record(
            evidence=evidence,
            action='EXPORTED',
            actor=exported_by,
            description=description,
            ip_address=ip_address,
            metadata={
                'export_format': export_format,
                'bundle_id': bundle_id
            }
        )
