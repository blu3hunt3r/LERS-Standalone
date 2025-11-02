"""
Celery tasks for notifications and SLA monitoring.
"""
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@shared_task
def send_pending_notifications():
    """
    Send pending notifications via email/SMS.
    Runs every 5 minutes.
    """
    from .models import Notification
    
    pending = Notification.objects.filter(
        status='PENDING',
        is_deleted=False
    )
    
    sent_count = 0
    for notification in pending:
        try:
            if notification.send_email and not notification.email_sent:
                send_email_notification(notification)
            
            if notification.send_sms and not notification.sms_sent:
                # TODO: Implement SMS sending
                pass
            
            notification.status = 'SENT'
            notification.sent_at = timezone.now()
            notification.save()
            sent_count += 1
            
        except Exception as e:
            logger.error(f"Failed to send notification {notification.id}: {str(e)}")
            notification.status = 'FAILED'
            notification.save()
    
    logger.info(f"Sent {sent_count} notifications")
    return {'sent': sent_count}


def send_email_notification(notification):
    """Send email notification."""
    try:
        send_mail(
            subject=notification.title,
            message=notification.message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[notification.user.email],
            fail_silently=False
        )
        notification.email_sent = True
        notification.save(update_fields=['email_sent'])
        
    except Exception as e:
        logger.error(f"Email send failed: {str(e)}")
        raise


@shared_task
def check_sla_violations():
    """
    Check for SLA violations and send notifications.
    Runs every 15 minutes.
    """
    from apps.lers.models import LERSRequest
    from django.utils import timezone
    
    # Check for breached SLA
    overdue_requests = LERSRequest.objects.filter(
        status__in=['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS'],
        sla_due_date__lt=timezone.now(),
        sla_breached=False,
        is_deleted=False
    )
    
    for request in overdue_requests:
        request.sla_breached = True
        request.save(update_fields=['sla_breached'])
        
        # Send notification
        send_sla_breach_notification.delay(str(request.id))
    
    logger.info(f"Found {overdue_requests.count()} SLA breaches")


@shared_task
def send_sla_breach_notification(request_id):
    """Send SLA breach notification."""
    from .models import Notification
    from apps.lers.models import LERSRequest
    
    try:
        lers_request = LERSRequest.objects.get(id=request_id)
        
        # Notify IO
        if lers_request.created_by:
            Notification.objects.create(
                user=lers_request.created_by,
                notification_type='SLA_BREACH',
                title=f'SLA Breach: {lers_request.request_number}',
                message=f'LERS request {lers_request.request_number} has breached its SLA deadline.',
                lers_request=lers_request,
                case=lers_request.case
            )
        
        # Notify company agent if assigned
        if lers_request.assigned_to_company:
            Notification.objects.create(
                user=lers_request.assigned_to_company,
                notification_type='SLA_BREACH',
                title=f'SLA Breach: {lers_request.request_number}',
                message=f'LERS request {lers_request.request_number} has breached its SLA deadline. Urgent action required.',
                lers_request=lers_request
            )
        
        logger.info(f"SLA breach notifications sent for request {request_id}")
        
    except Exception as e:
        logger.error(f"Failed to send SLA breach notification: {str(e)}")


@shared_task
def send_sla_reminder_notification(request_id):
    """Send SLA approaching deadline reminder."""
    from .models import Notification
    from apps.lers.models import LERSRequest
    
    try:
        lers_request = LERSRequest.objects.get(id=request_id)
        
        if lers_request.assigned_to_company:
            Notification.objects.create(
                user=lers_request.assigned_to_company,
                notification_type='SLA_REMINDER',
                title=f'SLA Reminder: {lers_request.request_number}',
                message=f'LERS request {lers_request.request_number} is approaching its SLA deadline.',
                lers_request=lers_request
            )
        
    except Exception as e:
        logger.error(f"Failed to send SLA reminder: {str(e)}")

