"""
Celery tasks for audit operations.
"""
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task
def cleanup_old_logs():
    """
    Clean up old audit logs based on retention policy.
    Runs daily.
    """
    from .models import AuditLog
    from django.utils import timezone
    from datetime import timedelta
    
    # Keep logs for 7 years (default retention)
    retention_days = 2555
    cutoff_date = timezone.now() - timedelta(days=retention_days)
    
    deleted_count = AuditLog.objects.filter(
        timestamp__lt=cutoff_date
    ).delete()[0]
    
    logger.info(f"Cleaned up {deleted_count} old audit logs")
    
    return {'deleted': deleted_count}

