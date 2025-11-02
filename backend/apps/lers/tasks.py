"""
Celery tasks for LERS processing and SLA monitoring.
"""
from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task
def process_lers_response(response_id):
    """
    Process LERS response - parse evidence files and extract data.
    
    Args:
        response_id (str): LERSResponse ID
    """
    from .models import LERSResponse
    from apps.evidence.tasks import parse_evidence_file
    
    try:
        response = LERSResponse.objects.get(id=response_id)
        response.status = 'PROCESSING'
        response.save(update_fields=['status'])
        
        logger.info(f"Processing LERS response: {response.response_number}")
        
        # Parse each evidence file
        for evidence in response.evidence_files.all():
            if not evidence.parsed:
                parse_evidence_file.delay(str(evidence.id))
        
        response.status = 'PARSED'
        response.save(update_fields=['status'])
        
        logger.info(f"LERS response processed: {response_id}")
        
        return {'success': True, 'response_id': response_id}
        
    except Exception as e:
        logger.error(f"Failed to process LERS response {response_id}: {str(e)}")
        return {'success': False, 'error': str(e)}


@shared_task
def check_sla_breaches():
    """
    Check for SLA breaches and send notifications.
    Runs periodically (e.g., every hour).
    """
    from .models import LERSRequest
    
    logger.info("Checking for LERS SLA breaches...")
    
    # Get active requests past due date
    overdue_requests = LERSRequest.objects.filter(
        status__in=['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS'],
        sla_due_date__lt=timezone.now(),
        sla_breached=False,
        is_deleted=False
    )
    
    count = 0
    for request in overdue_requests:
        request.sla_breached = True
        request.save(update_fields=['sla_breached'])
        
        # Send notification
        from apps.notifications.tasks import send_sla_breach_notification
        send_sla_breach_notification.delay(str(request.id))
        
        count += 1
    
    logger.info(f"Found {count} LERS SLA breaches")
    
    return {'breaches_found': count}


@shared_task
def send_sla_reminders():
    """
    Send reminders for requests approaching SLA deadline.
    Runs periodically (e.g., every 4 hours).
    """
    from .models import LERSRequest
    from datetime import timedelta
    
    logger.info("Sending LERS SLA reminders...")
    
    # Get requests due within next 24 hours
    soon_due = timezone.now() + timedelta(hours=24)
    
    approaching_deadline = LERSRequest.objects.filter(
        status__in=['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS'],
        sla_due_date__lte=soon_due,
        sla_due_date__gt=timezone.now(),
        sla_breached=False,
        is_deleted=False
    )
    
    count = 0
    for request in approaching_deadline:
        # Send reminder notification
        from apps.notifications.tasks import send_sla_reminder_notification
        send_sla_reminder_notification.delay(str(request.id))
        count += 1
    
    logger.info(f"Sent {count} LERS SLA reminders")
    
    return {'reminders_sent': count}


@shared_task
def auto_submit_approved_requests():
    """
    Auto-submit approved requests to companies.
    Runs periodically (e.g., every 30 minutes).
    """
    from .models import LERSRequest
    
    logger.info("Auto-submitting approved LERS requests...")
    
    # Get approved requests not yet submitted
    approved_requests = LERSRequest.objects.filter(
        status='APPROVED',
        provider_tenant__isnull=False,  # Only if provider tenant is configured
        is_deleted=False
    )
    
    count = 0
    for request in approved_requests:
        try:
            request.status = 'SUBMITTED'
            request.submitted_at = timezone.now()
            request.save()
            
            # TODO: Send actual notification/API call to company
            
            count += 1
            logger.info(f"Auto-submitted request: {request.request_number}")
            
        except Exception as e:
            logger.error(f"Failed to auto-submit request {request.id}: {str(e)}")
    
    logger.info(f"Auto-submitted {count} LERS requests")
    
    return {'submitted': count}

