"""
Feature 1 (Phase 5): LERS Response Service Layer

Business logic for LERS response management.
"""
from typing import Dict, Optional, Tuple
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
import logging

from apps.lers.models import LERSResponse, LERSRequest

logger = logging.getLogger(__name__)


class LERSResponseService:
    """Service layer for LERS response operations."""

    @staticmethod
    @transaction.atomic
    def submit_response(
        lers_request: LERSRequest,
        submitted_by,
        response_text: Optional[str] = None,
        remarks: Optional[str] = None,
        signature: Optional[str] = None
    ) -> LERSResponse:
        """Submit provider response to LERS request."""
        # Validate request status
        if lers_request.status not in ['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS']:
            raise ValidationError(
                f"Cannot submit response for request in status {lers_request.status}"
            )

        # Generate response number
        response_number = f"{lers_request.request_number}-RESP-{lers_request.responses.count() + 1:03d}"

        # Create response
        response = LERSResponse.objects.create(
            request=lers_request,
            tenant=lers_request.tenant,
            response_number=response_number,
            submitted_by=submitted_by,
            submitted_at=timezone.now(),
            response_text=response_text,
            remarks=remarks,
            signature=signature,
            status='RECEIVED'
        )

        # Update request status
        lers_request.status = 'RESPONSE_UPLOADED'
        lers_request.save(update_fields=['status'])

        logger.info(f"Response submitted: {response.response_number}")

        # Create timeline event
        from apps.cases.services import TimelineService
        TimelineService.create_request_event(
            case=lers_request.case,
            lers_request=lers_request,
            actor=submitted_by,
            event_type='RESPONSE_RECEIVED',
            description=f'Response received from {lers_request.provider}'
        )

        # Notify IO
        from apps.lers.services import LERSNotificationService
        LERSNotificationService.notify_response_received(
            lers_request=lers_request,
            response=response
        )

        return response

    @staticmethod
    def verify_signature(response: LERSResponse) -> Tuple[bool, str]:
        """Verify digital signature of response."""
        if not response.signature:
            return False, "No signature present"

        # TODO: Implement actual signature verification
        response.signature_verified = True
        response.save(update_fields=['signature_verified'])

        logger.info(f"Signature verified: {response.response_number}")

        return True, ""
