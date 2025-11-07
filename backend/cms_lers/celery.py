"""
Celery configuration for CMS + LERS project.
"""
import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cms_lers.settings')

app = Celery('cms_lers')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Periodic tasks configuration
app.conf.beat_schedule = {
    'check-sla-violations-every-15-minutes': {
        'task': 'apps.notifications.tasks.check_sla_violations',
        'schedule': crontab(minute='*/15'),
    },
    'send-pending-notifications-every-5-minutes': {
        'task': 'apps.notifications.tasks.send_pending_notifications',
        'schedule': crontab(minute='*/5'),
    },
    'cleanup-old-logs-daily': {
        'task': 'apps.audit.tasks.cleanup_old_logs',
        'schedule': crontab(hour=2, minute=0),  # 2 AM daily
    },
}

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery setup."""
    print(f'Request: {self.request!r}')

