"""
Signals for authentication app.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .models import User
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def user_created(sender, instance, created, **kwargs):
    """
    Signal handler when a new user is created.
    """
    if created:
        logger.info(f"New user created: {instance.email} with role {instance.role}")
        
        # Send welcome email (if email is configured)
        if settings.EMAIL_BACKEND != 'django.core.mail.backends.console.EmailBackend':
            try:
                send_mail(
                    subject='Welcome to CMS + LERS Platform',
                    message=f'Hello {instance.full_name},\n\nYour account has been created successfully.',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[instance.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.error(f"Failed to send welcome email to {instance.email}: {str(e)}")

