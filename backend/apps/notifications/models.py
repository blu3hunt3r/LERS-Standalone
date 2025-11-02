"""
Notification models for SLA alerts, system notifications.
"""
from django.db import models
from django.utils import timezone
from apps.core.models import BaseModel


class Notification(BaseModel):
    """
    System notifications for users.
    """
    
    class NotificationType(models.TextChoices):
        SLA_BREACH = 'SLA_BREACH', 'SLA Breach'
        SLA_REMINDER = 'SLA_REMINDER', 'SLA Reminder'
        REQUEST_APPROVED = 'REQUEST_APPROVED', 'Request Approved'
        REQUEST_REJECTED = 'REQUEST_REJECTED', 'Request Rejected'
        RESPONSE_RECEIVED = 'RESPONSE_RECEIVED', 'Response Received'
        CASE_ASSIGNED = 'CASE_ASSIGNED', 'Case Assigned'
        EVIDENCE_UPLOADED = 'EVIDENCE_UPLOADED', 'Evidence Uploaded'
        SYSTEM = 'SYSTEM', 'System Notification'
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SENT = 'SENT', 'Sent'
        FAILED = 'FAILED', 'Failed'
        READ = 'READ', 'Read'
    
    # Recipient
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    # Notification details
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Related objects
    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    lers_request = models.ForeignKey(
        'lers.LERSRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Delivery channels
    send_email = models.BooleanField(default=True)
    send_sms = models.BooleanField(default=False)
    send_push = models.BooleanField(default=False)
    
    # Status
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Delivery details
    email_sent = models.BooleanField(default=False)
    sms_sent = models.BooleanField(default=False)
    push_sent = models.BooleanField(default=False)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status', '-created_at']),
            models.Index(fields=['notification_type', 'status']),
        ]
    
    def __str__(self):
        return f"{self.title} for {self.user.email}"
    
    def mark_as_read(self):
        """Mark notification as read."""
        self.status = 'READ'
        self.read_at = timezone.now()
        self.save(update_fields=['status', 'read_at'])


class NotificationTemplate(BaseModel):
    """
    Templates for notifications.
    """
    name = models.CharField(max_length=255, unique=True)
    notification_type = models.CharField(max_length=30, choices=Notification.NotificationType.choices)
    
    # Templates
    subject_template = models.CharField(max_length=500)
    email_template = models.TextField()
    sms_template = models.TextField(blank=True, null=True)
    
    # Settings
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'notification_templates'
    
    def __str__(self):
        return self.name

