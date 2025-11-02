"""
Signals for LERS app.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import LERSRequest, LERSResponse
import logging

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=LERSRequest)
def generate_request_number(sender, instance, **kwargs):
    """Generate request number if not set."""
    if not instance.request_number:
        instance.request_number = instance.generate_request_number()


@receiver(pre_save, sender=LERSRequest)
def calculate_sla(sender, instance, **kwargs):
    """Calculate SLA due date if not set."""
    if not instance.sla_due_date and instance.status == 'SUBMITTED':
        instance.sla_due_date = instance.calculate_sla_due_date()


@receiver(post_save, sender=LERSRequest)
def request_status_changed(sender, instance, created, **kwargs):
    """Send notifications when request status changes."""
    if created:
        logger.info(f"LERS request created: {instance.request_number}")
        # TODO: Send notification to approver when pending approval
    else:
        # Check for status changes
        # TODO: Send notifications based on status
        pass


@receiver(post_save, sender=LERSResponse)
def response_received(sender, instance, created, **kwargs):
    """Handle response submission."""
    if created:
        logger.info(f"LERS response received: {instance.response_number}")
        
        # Trigger parser task if response has files
        if instance.evidence_files.exists():
            from .tasks import process_lers_response
            process_lers_response.delay(str(instance.id))

