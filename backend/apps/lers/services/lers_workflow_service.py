"""
Feature 1 (Phase 5): LERS Workflow Service Layer

Business logic for approval workflow management.
"""
from typing import Optional
from django.db import transaction
from django.utils import timezone
import logging

from apps.lers.models import LERSApprovalWorkflow, LERSRequest

logger = logging.getLogger(__name__)


class LERSWorkflowService:
    """Service layer for LERS approval workflow operations."""

    @staticmethod
    def create_approval_record(
        lers_request: LERSRequest,
        approver,
        action: str,
        comments: Optional[str] = None,
        signature_hash: Optional[str] = None
    ) -> LERSApprovalWorkflow:
        """Create approval workflow record."""
        workflow = LERSApprovalWorkflow.objects.create(
            request=lers_request,
            approver=approver,
            action=action,
            comments=comments,
            signature_hash=signature_hash,
            action_timestamp=timezone.now()
        )

        logger.info(
            f"Approval workflow created: {lers_request.request_number} - "
            f"{action} by {approver.email}"
        )

        return workflow

    @staticmethod
    def get_approval_history(lers_request: LERSRequest):
        """Get approval workflow history for a request."""
        return lers_request.approval_workflow.all().order_by('-action_timestamp')
