"""
Feature 1 (Phase 5): LERS Message Service Layer

Business logic for real-time messaging between IO and providers.
"""
from typing import Dict, List, Optional
from django.db import transaction
from django.utils import timezone
import logging

from apps.lers.models import LERSMessage, LERSRequest

logger = logging.getLogger(__name__)


class LERSMessageService:
    """Service layer for LERS messaging operations."""

    @staticmethod
    @transaction.atomic
    def send_message(
        lers_request: LERSRequest,
        sender,
        sender_type: str,
        message_text: str,
        message_type: str = 'TEXT',
        attachments: List[Dict] = None
    ) -> LERSMessage:
        """Send a message in LERS request chat."""
        message = LERSMessage.objects.create(
            request=lers_request,
            sender=sender,
            sender_type=sender_type,
            message_type=message_type,
            message_text=message_text,
            attachments=attachments or []
        )

        logger.info(
            f"Message sent: {lers_request.request_number} - "
            f"{sender_type} - {sender.email}"
        )

        # Create notification for other party
        from apps.lers.services import LERSNotificationService
        LERSNotificationService.notify_new_message(
            lers_request=lers_request,
            message=message,
            sender_type=sender_type
        )

        return message

    @staticmethod
    def mark_messages_read(
        lers_request: LERSRequest,
        reader,
        sender_type_filter: str
    ) -> int:
        """Mark messages as read for a user."""
        # Get unread messages from the other party
        unread = LERSMessage.objects.filter(
            request=lers_request,
            sender_type=sender_type_filter,
            read_by_receiver=False
        )

        count = unread.count()

        for message in unread:
            message.mark_as_read()

        logger.info(
            f"Marked {count} messages as read in {lers_request.request_number}"
        )

        return count

    @staticmethod
    def get_unread_count(lers_request: LERSRequest, for_role: str) -> int:
        """Get count of unread messages for a role."""
        # Determine which sender type to look for
        if for_role == 'COMPANY_AGENT':
            sender_type = 'IO'
        else:
            sender_type = 'PROVIDER'

        return LERSMessage.objects.filter(
            request=lers_request,
            sender_type=sender_type,
            read_by_receiver=False
        ).count()
