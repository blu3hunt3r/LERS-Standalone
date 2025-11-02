"""
Feature 1 (Phase 5): LERS Notification Service Layer

Business logic for notification management.
"""
from typing import Optional
from django.db import transaction
import logging

from apps.lers.models import LERSNotification, LERSRequest, LERSResponse, LERSMessage

logger = logging.getLogger(__name__)


class LERSNotificationService:
    """Service layer for LERS notification operations."""

    @staticmethod
    def notify_request_approved(lers_request: LERSRequest, approver):
        """Notify IO that request was approved."""
        if not lers_request.created_by:
            return

        LERSNotification.create_notification(
            user=lers_request.created_by,
            notification_type='REQUEST_APPROVED',
            title=f"Request {lers_request.request_number} Approved",
            message=f"Your request was approved by {approver.full_name}",
            request=lers_request,
            priority='NORMAL',
            link=f"/lers/requests/{lers_request.id}",
            icon="check-circle"
        )

        logger.info(f"Notification sent: Request approved - {lers_request.request_number}")

    @staticmethod
    def notify_request_rejected(lers_request: LERSRequest, rejector, reason: str):
        """Notify IO that request was rejected."""
        if not lers_request.created_by:
            return

        LERSNotification.create_notification(
            user=lers_request.created_by,
            notification_type='REQUEST_REJECTED',
            title=f"Request {lers_request.request_number} Rejected",
            message=f"Reason: {reason}",
            request=lers_request,
            priority='HIGH',
            link=f"/lers/requests/{lers_request.id}",
            icon="x-circle"
        )

    @staticmethod
    def notify_changes_requested(lers_request: LERSRequest, requested_by, changes_needed: str):
        """Notify IO that changes are requested."""
        if not lers_request.created_by:
            return

        LERSNotification.create_notification(
            user=lers_request.created_by,
            notification_type='CHANGES_REQUESTED',
            title=f"Changes Requested: {lers_request.request_number}",
            message=changes_needed,
            request=lers_request,
            priority='NORMAL',
            link=f"/lers/requests/{lers_request.id}",
            icon="alert-circle"
        )

    @staticmethod
    def notify_provider_new_request(lers_request: LERSRequest):
        """Notify provider of new request."""
        if not lers_request.provider_tenant:
            return

        # Notify all company agents in provider tenant
        from apps.authentication.models import User
        agents = User.objects.filter(
            tenant=lers_request.provider_tenant,
            role='COMPANY_AGENT'
        )

        for agent in agents:
            LERSNotification.create_notification(
                user=agent,
                notification_type='REQUEST_SUBMITTED',
                title=f"New LERS Request: {lers_request.request_number}",
                message=f"{lers_request.request_type} - {lers_request.description[:100]}",
                request=lers_request,
                priority='HIGH',
                link=f"/provider/requests/{lers_request.id}",
                icon="file-text"
            )

    @staticmethod
    def notify_request_acknowledged(lers_request: LERSRequest, acknowledged_by):
        """Notify IO that provider acknowledged request."""
        if not lers_request.created_by:
            return

        LERSNotification.create_notification(
            user=lers_request.created_by,
            notification_type='PROVIDER_ACKNOWLEDGED',
            title=f"Request Acknowledged: {lers_request.request_number}",
            message=f"Provider acknowledged receipt and will process soon",
            request=lers_request,
            priority='NORMAL',
            link=f"/lers/requests/{lers_request.id}",
            icon="check"
        )

    @staticmethod
    def notify_response_received(lers_request: LERSRequest, response: LERSResponse):
        """Notify IO that response was received."""
        if not lers_request.created_by:
            return

        LERSNotification.create_notification(
            user=lers_request.created_by,
            notification_type='RESPONSE_RECEIVED',
            title=f"Response Received: {lers_request.request_number}",
            message=f"Provider submitted response #{response.response_number}",
            request=lers_request,
            priority='HIGH',
            link=f"/lers/requests/{lers_request.id}",
            icon="inbox"
        )

    @staticmethod
    def notify_new_message(lers_request: LERSRequest, message: LERSMessage, sender_type: str):
        """Notify about new message in chat."""
        # If sender is IO, notify provider
        if sender_type == 'IO':
            if lers_request.provider_tenant:
                from apps.authentication.models import User
                agents = User.objects.filter(
                    tenant=lers_request.provider_tenant,
                    role='COMPANY_AGENT'
                )
                for agent in agents:
                    LERSNotification.create_notification(
                        user=agent,
                        notification_type='NEW_MESSAGE',
                        title=f"New message in {lers_request.request_number}",
                        message=message.message_text[:100],
                        request=lers_request,
                        priority='NORMAL',
                        link=f"/provider/requests/{lers_request.id}",
                        icon="message-circle"
                    )
        # If sender is provider, notify IO
        else:
            if lers_request.created_by:
                LERSNotification.create_notification(
                    user=lers_request.created_by,
                    notification_type='NEW_MESSAGE',
                    title=f"New message in {lers_request.request_number}",
                    message=message.message_text[:100],
                    request=lers_request,
                    priority='NORMAL',
                    link=f"/lers/requests/{lers_request.id}",
                    icon="message-circle"
                )

    @staticmethod
    def notify_sla_breach(lers_request: LERSRequest):
        """Notify about SLA breach."""
        if not lers_request.created_by:
            return

        LERSNotification.create_notification(
            user=lers_request.created_by,
            notification_type='REQUEST_OVERDUE',
            title=f"SLA Breached: {lers_request.request_number}",
            message=f"Request is overdue - SLA deadline was {lers_request.sla_due_date}",
            request=lers_request,
            priority='URGENT',
            link=f"/lers/requests/{lers_request.id}",
            icon="alert-triangle"
        )
