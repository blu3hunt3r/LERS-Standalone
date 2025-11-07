"""
Feature 1 (Phase 5): LERS Request Service Layer

Business logic for LERS request lifecycle management.
Extracted from views to support Clean Architecture.

Usage:
    from apps.lers.services import LERSRequestService

    service = LERSRequestService()
    request = service.create_request(
        case=case,
        request_type='BANK_TX_HISTORY',
        provider='HDFC Bank',
        created_by=user,
        ...
    )
"""
from typing import Dict, Optional, Tuple
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.conf import settings
import logging

from apps.lers.models import LERSRequest, LERSApprovalWorkflow

logger = logging.getLogger(__name__)


class LERSRequestService:
    """
    Service layer for LERS request operations.

    Handles:
    - Request creation with auto-numbering and SLA calculation
    - State machine transitions (DRAFT → PENDING → APPROVED → SUBMITTED → COMPLETED)
    - Approval workflow
    - Provider submission
    - SLA tracking and breach detection
    - Request completion
    """

    # Valid state transitions (state machine)
    VALID_TRANSITIONS = {
        'DRAFT': ['PENDING_APPROVAL', 'CANCELLED'],
        'PENDING_APPROVAL': ['APPROVED', 'REJECTED', 'DRAFT'],  # DRAFT = Request changes
        'APPROVED': ['SUBMITTED', 'CANCELLED'],
        'SUBMITTED': ['ACKNOWLEDGED', 'CANCELLED'],
        'ACKNOWLEDGED': ['IN_PROGRESS', 'CANCELLED'],
        'IN_PROGRESS': ['RESPONSE_UPLOADED', 'CANCELLED'],
        'RESPONSE_UPLOADED': ['COMPLETED', 'IN_PROGRESS'],  # Can go back if more needed
        'COMPLETED': [],  # Terminal state
        'REJECTED': [],  # Terminal state
        'CANCELLED': [],  # Terminal state
    }

    @staticmethod
    @transaction.atomic
    def create_request(
        case,
        request_type: str,
        provider: str,
        created_by,
        identifiers: Dict,
        description: str,
        legal_mandate_type: str,
        date_range_from: Optional[timezone.datetime] = None,
        date_range_to: Optional[timezone.datetime] = None,
        priority: str = 'NORMAL',
        provider_tenant=None,
        legal_mandate_file=None,
        court_order_number: Optional[str] = None,
        notes: Optional[str] = None
    ) -> LERSRequest:
        """
        Create a new LERS request with auto-numbering and SLA calculation.

        Args:
            case: Case this request belongs to
            request_type: Type of request (from LERSRequest.RequestType)
            provider: Provider/company name
            created_by: User creating the request
            identifiers: Dictionary of target identifiers (phone, account, etc.)
            description: Detailed description
            legal_mandate_type: Type of legal mandate (Section 91, etc.)
            date_range_from: Start date for data request
            date_range_to: End date for data request
            priority: Request priority (NORMAL, URGENT, CRITICAL)
            provider_tenant: Optional provider tenant
            legal_mandate_file: Optional evidence file with legal mandate
            court_order_number: Court order reference
            notes: Additional notes

        Returns:
            Created LERSRequest instance

        Raises:
            ValidationError: If validation fails
        """
        # Validate request type
        if request_type not in dict(LERSRequest.RequestType.choices):
            raise ValidationError(f"Invalid request type: {request_type}")

        # Validate priority
        if priority not in dict(LERSRequest.Priority.choices):
            raise ValidationError(f"Invalid priority: {priority}")

        # Create request
        lers_request = LERSRequest(
            case=case,
            tenant=case.tenant,
            request_type=request_type,
            provider=provider,
            provider_tenant=provider_tenant,
            identifiers=identifiers,
            description=description,
            date_range_from=date_range_from,
            date_range_to=date_range_to,
            legal_mandate_type=legal_mandate_type,
            legal_mandate_file=legal_mandate_file,
            court_order_number=court_order_number,
            status='DRAFT',
            priority=priority,
            created_by=created_by,
            notes=notes
        )

        # Generate unique request number
        lers_request.request_number = lers_request.generate_request_number()

        # Calculate SLA due date
        lers_request.sla_due_date = LERSRequestService._calculate_sla_due_date(priority)

        # Save request
        lers_request.save()

        logger.info(
            f"LERS request created: {lers_request.request_number} "
            f"({request_type} from {provider})"
        )

        # Create timeline event
        from apps.cases.services import TimelineService
        # Timeline event (optional - only if linked to case)
        if lers_request.case:
            from apps.cases.services import TimelineService
            TimelineService.create_request_event(
            case=case,
            lers_request=lers_request,
            actor=created_by,
            event_type='REQUEST_CREATED',
            description=f'LERS request created: {request_type} from {provider}'
        )

        return lers_request

    @staticmethod
    @transaction.atomic
    def submit_for_approval(
        lers_request: LERSRequest,
        submitted_by
    ) -> LERSRequest:
        """
        Submit request for approval with validation.

        Args:
            lers_request: Request to submit
            submitted_by: User submitting

        Returns:
            Updated LERSRequest

        Raises:
            ValidationError: If validation fails or invalid state
        """
        # Validate state transition
        LERSRequestService._validate_state_transition(
            lers_request,
            'PENDING_APPROVAL'
        )

        # Validate required fields
        if not lers_request.legal_mandate_file:
            raise ValidationError("Legal mandate file is required for approval")

        if not lers_request.description:
            raise ValidationError("Description is required")

        if not lers_request.identifiers:
            raise ValidationError("Target identifiers are required")

        # Update status
        lers_request.status = 'PENDING_APPROVAL'
        lers_request.save(update_fields=['status'])

        logger.info(
            f"LERS request submitted for approval: {lers_request.request_number}"
        )

        # Create timeline event
        from apps.cases.services import TimelineService
        # Timeline event (optional - only if linked to case)
        if lers_request.case:
            from apps.cases.services import TimelineService
            TimelineService.create_event(
            case=lers_request.case,
            event_type='CUSTOM',
            title='LERS Request Submitted for Approval',
            description=f'Request {lers_request.request_number} submitted for approval',
            actor=submitted_by,
            related_request=lers_request
        )

        # TODO: Send notification to approvers
        # from apps.lers.services import LERSNotificationService
        # LERSNotificationService.notify_approvers(lers_request)

        return lers_request

    @staticmethod
    @transaction.atomic
    def approve_request(
        lers_request: LERSRequest,
        approved_by,
        comments: Optional[str] = None,
        signature_hash: Optional[str] = None,
        auto_submit_to_provider: bool = True
    ) -> LERSRequest:
        """
        Approve LERS request.

        Args:
            lers_request: Request to approve
            approved_by: Approver user
            comments: Optional approval comments
            signature_hash: Digital signature hash
            auto_submit_to_provider: Auto-submit to provider if configured

        Returns:
            Updated LERSRequest

        Raises:
            ValidationError: If invalid state
        """
        # Validate state
        LERSRequestService._validate_state_transition(lers_request, 'APPROVED')

        # Create approval workflow record
        from apps.lers.services import LERSWorkflowService
        LERSWorkflowService.create_approval_record(
            lers_request=lers_request,
            approver=approved_by,
            action='APPROVE',
            comments=comments,
            signature_hash=signature_hash
        )

        # Update request
        lers_request.status = 'APPROVED'
        lers_request.approved_by = approved_by
        lers_request.approved_at = timezone.now()
        lers_request.save(update_fields=['status', 'approved_by', 'approved_at'])

        logger.info(
            f"LERS request approved: {lers_request.request_number} "
            f"by {approved_by.email}"
        )

        # Create timeline event
        from apps.cases.services import TimelineService
        # Timeline event (optional - only if linked to case)
        if lers_request.case:
            from apps.cases.services import TimelineService
            TimelineService.create_approval_event(
            case=lers_request.case,
            approver=approved_by,
            approval_type='LERS Request Approval',
            approved=True,
            comments=comments
        )

        # Auto-submit if provider tenant is configured
        if auto_submit_to_provider and lers_request.provider_tenant:
            try:
                LERSRequestService.submit_to_provider(
                    lers_request=lers_request,
                    submitted_by=approved_by
                )
            except Exception as e:
                logger.error(
                    f"Auto-submission failed for {lers_request.request_number}: {e}"
                )

        # Notify creator
        from apps.lers.services import LERSNotificationService
        LERSNotificationService.notify_request_approved(
            lers_request=lers_request,
            approver=approved_by
        )

        return lers_request

    @staticmethod
    @transaction.atomic
    def reject_request(
        lers_request: LERSRequest,
        rejected_by,
        reason: str,
        signature_hash: Optional[str] = None
    ) -> LERSRequest:
        """
        Reject LERS request.

        Args:
            lers_request: Request to reject
            rejected_by: User rejecting
            reason: Rejection reason
            signature_hash: Digital signature

        Returns:
            Updated LERSRequest

        Raises:
            ValidationError: If invalid state
        """
        # Validate state
        LERSRequestService._validate_state_transition(lers_request, 'REJECTED')

        if not reason:
            raise ValidationError("Rejection reason is required")

        # Create approval workflow record
        from apps.lers.services import LERSWorkflowService
        LERSWorkflowService.create_approval_record(
            lers_request=lers_request,
            approver=rejected_by,
            action='REJECT',
            comments=reason,
            signature_hash=signature_hash
        )

        # Update request
        lers_request.status = 'REJECTED'
        lers_request.rejection_reason = reason
        lers_request.save(update_fields=['status', 'rejection_reason'])

        logger.info(
            f"LERS request rejected: {lers_request.request_number} "
            f"by {rejected_by.email}"
        )

        # Create timeline event
        from apps.cases.services import TimelineService
        # Timeline event (optional - only if linked to case)
        if lers_request.case:
            from apps.cases.services import TimelineService
            TimelineService.create_approval_event(
            case=lers_request.case,
            approver=rejected_by,
            approval_type='LERS Request Approval',
            approved=False,
            comments=reason
        )

        # Notify creator
        from apps.lers.services import LERSNotificationService
        LERSNotificationService.notify_request_rejected(
            lers_request=lers_request,
            rejector=rejected_by,
            reason=reason
        )

        return lers_request

    @staticmethod
    @transaction.atomic
    def request_changes(
        lers_request: LERSRequest,
        requested_by,
        changes_needed: str,
        signature_hash: Optional[str] = None
    ) -> LERSRequest:
        """
        Request changes to LERS request.

        Args:
            lers_request: Request to send back
            requested_by: User requesting changes
            changes_needed: What changes are needed
            signature_hash: Digital signature

        Returns:
            Updated LERSRequest

        Raises:
            ValidationError: If invalid state
        """
        # Validate state (can go from PENDING_APPROVAL back to DRAFT)
        LERSRequestService._validate_state_transition(lers_request, 'DRAFT')

        if not changes_needed:
            raise ValidationError("Please specify what changes are needed")

        # Create approval workflow record
        from apps.lers.services import LERSWorkflowService
        LERSWorkflowService.create_approval_record(
            lers_request=lers_request,
            approver=requested_by,
            action='REQUEST_CHANGES',
            comments=changes_needed,
            signature_hash=signature_hash
        )

        # Update request
        lers_request.status = 'DRAFT'
        lers_request.notes = f"Changes requested: {changes_needed}"
        lers_request.save(update_fields=['status', 'notes'])

        logger.info(
            f"Changes requested for LERS request: {lers_request.request_number}"
        )

        # Notify creator
        from apps.lers.services import LERSNotificationService
        LERSNotificationService.notify_changes_requested(
            lers_request=lers_request,
            requested_by=requested_by,
            changes_needed=changes_needed
        )

        return lers_request

    @staticmethod
    @transaction.atomic
    def submit_to_provider(
        lers_request: LERSRequest,
        submitted_by
    ) -> LERSRequest:
        """
        Submit approved request to provider.

        Args:
            lers_request: Request to submit
            submitted_by: User submitting

        Returns:
            Updated LERSRequest

        Raises:
            ValidationError: If invalid state
        """
        # Validate state
        LERSRequestService._validate_state_transition(lers_request, 'SUBMITTED')

        # Update request
        lers_request.status = 'SUBMITTED'
        lers_request.submitted_at = timezone.now()
        lers_request.save(update_fields=['status', 'submitted_at'])

        logger.info(
            f"LERS request submitted to provider: {lers_request.request_number} "
            f"({lers_request.provider})"
        )

        # Create timeline event
        from apps.cases.services import TimelineService
        # Timeline event (optional - only if linked to case)
        if lers_request.case:
            from apps.cases.services import TimelineService
            TimelineService.create_event(
            case=lers_request.case,
            event_type='CUSTOM',
            title='LERS Request Submitted to Provider',
            description=f'Request submitted to {lers_request.provider}',
            actor=submitted_by,
            related_request=lers_request
        )

        # Notify provider if provider_tenant exists
        if lers_request.provider_tenant:
            from apps.lers.services import LERSNotificationService
            LERSNotificationService.notify_provider_new_request(
                lers_request=lers_request
            )

        # TODO: Send email/webhook notification to provider
        # TODO: If provider has API integration, call their API

        return lers_request

    @staticmethod
    @transaction.atomic
    def acknowledge_request(
        lers_request: LERSRequest,
        acknowledged_by
    ) -> LERSRequest:
        """
        Provider acknowledges receipt of request.

        Args:
            lers_request: Request to acknowledge
            acknowledged_by: Provider user

        Returns:
            Updated LERSRequest

        Raises:
            ValidationError: If invalid state
        """
        # Validate state
        LERSRequestService._validate_state_transition(lers_request, 'ACKNOWLEDGED')

        # Update request
        lers_request.status = 'ACKNOWLEDGED'
        lers_request.assigned_to_company = acknowledged_by
        lers_request.save(update_fields=['status', 'assigned_to_company'])

        logger.info(
            f"LERS request acknowledged: {lers_request.request_number} "
            f"by {acknowledged_by.email}"
        )

        # Notify IO
        from apps.lers.services import LERSNotificationService
        LERSNotificationService.notify_request_acknowledged(
            lers_request=lers_request,
            acknowledged_by=acknowledged_by
        )

        return lers_request

    @staticmethod
    @transaction.atomic
    def start_processing(
        lers_request: LERSRequest,
        processor
    ) -> LERSRequest:
        """
        Provider starts processing the request.

        Args:
            lers_request: Request to process
            processor: Provider user processing

        Returns:
            Updated LERSRequest

        Raises:
            ValidationError: If invalid state
        """
        # Validate state
        LERSRequestService._validate_state_transition(lers_request, 'IN_PROGRESS')

        # Update request
        lers_request.status = 'IN_PROGRESS'
        if not lers_request.assigned_to_company:
            lers_request.assigned_to_company = processor
        lers_request.save(update_fields=['status', 'assigned_to_company'])

        logger.info(
            f"LERS request processing started: {lers_request.request_number}"
        )

        return lers_request

    @staticmethod
    @transaction.atomic
    def complete_request(
        lers_request: LERSRequest,
        completed_by
    ) -> LERSRequest:
        """
        Mark request as completed (IO marks as done after reviewing response).

        Args:
            lers_request: Request to complete
            completed_by: User completing

        Returns:
            Updated LERSRequest

        Raises:
            ValidationError: If invalid state
        """
        # Validate state
        LERSRequestService._validate_state_transition(lers_request, 'COMPLETED')

        # Must have response
        if not lers_request.responses.exists():
            raise ValidationError("Cannot complete request without a response")

        # Update request
        lers_request.status = 'COMPLETED'
        lers_request.completed_at = timezone.now()
        lers_request.save(update_fields=['status', 'completed_at'])

        logger.info(
            f"LERS request completed: {lers_request.request_number}"
        )

        # Create timeline event
        from apps.cases.services import TimelineService
        # Timeline event (optional - only if linked to case)
        if lers_request.case:
            from apps.cases.services import TimelineService
            TimelineService.create_event(
            case=lers_request.case,
            event_type='CUSTOM',
            title='LERS Request Completed',
            description=f'Request {lers_request.request_number} completed',
            actor=completed_by,
            related_request=lers_request
        )

        return lers_request

    @staticmethod
    def check_sla_breach(lers_request: LERSRequest) -> bool:
        """
        Check if SLA has been breached.

        Args:
            lers_request: Request to check

        Returns:
            True if breached, False otherwise
        """
        if not lers_request.sla_due_date:
            return False

        if lers_request.status in ['COMPLETED', 'CANCELLED', 'REJECTED']:
            return False  # Already terminal

        if timezone.now() > lers_request.sla_due_date:
            if not lers_request.sla_breached:
                lers_request.sla_breached = True
                lers_request.save(update_fields=['sla_breached'])

                logger.warning(
                    f"SLA breached for LERS request: {lers_request.request_number}"
                )

                # Notify about breach
                if not lers_request.sla_breach_notified:
                    from apps.lers.services import LERSNotificationService
                    LERSNotificationService.notify_sla_breach(lers_request)
                    lers_request.sla_breach_notified = True
                    lers_request.save(update_fields=['sla_breach_notified'])

            return True

        return False

    @staticmethod
    def _calculate_sla_due_date(priority: str) -> timezone.datetime:
        """
        Calculate SLA due date based on priority.

        Args:
            priority: Request priority

        Returns:
            Calculated due date
        """
        if priority == 'CRITICAL':
            hours = getattr(settings, 'URGENT_SLA_HOURS', 24)
        elif priority == 'URGENT':
            hours = getattr(settings, 'URGENT_SLA_HOURS', 48)
        else:  # NORMAL
            hours = getattr(settings, 'DEFAULT_SLA_HOURS', 168)  # 7 days

        return timezone.now() + timedelta(hours=hours)

    @staticmethod
    def _validate_state_transition(
        lers_request: LERSRequest,
        new_status: str
    ) -> None:
        """
        Validate state machine transition.

        Args:
            lers_request: Request to validate
            new_status: Desired new status

        Raises:
            ValidationError: If transition is invalid
        """
        current_status = lers_request.status

        if new_status not in LERSRequestService.VALID_TRANSITIONS.get(current_status, []):
            raise ValidationError(
                f"Invalid state transition: {current_status} → {new_status}. "
                f"Valid transitions: {LERSRequestService.VALID_TRANSITIONS.get(current_status, [])}"
            )

    @staticmethod
    def get_request_statistics(queryset) -> Dict:
        """
        Calculate statistics for a request queryset.

        Args:
            queryset: LERSRequest queryset

        Returns:
            Dictionary of statistics
        """
        from django.db import models

        stats = {
            'total': queryset.count(),
            'by_status': {},
            'by_priority': {},
            'by_provider': {},
            'sla_breached': queryset.filter(sla_breached=True).count(),
            'pending_approval': queryset.filter(status='PENDING_APPROVAL').count(),
            'awaiting_response': queryset.filter(
                status__in=['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS']
            ).count(),
        }

        # Count by status
        for status in LERSRequest.Status.choices:
            count = queryset.filter(status=status[0]).count()
            if count > 0:
                stats['by_status'][status[1]] = count

        # Count by priority
        for priority in LERSRequest.Priority.choices:
            count = queryset.filter(priority=priority[0]).count()
            if count > 0:
                stats['by_priority'][priority[1]] = count

        # Top providers
        provider_counts = queryset.values('provider').annotate(
            count=models.Count('id')
        ).order_by('-count')[:10]

        for provider in provider_counts:
            stats['by_provider'][provider['provider']] = provider['count']

        return stats
