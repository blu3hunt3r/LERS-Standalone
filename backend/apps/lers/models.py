"""
LERS (Law Enforcement Request System) models.
"""
from django.db import models
from django.utils import timezone
from datetime import timedelta
from apps.core.models import BaseModel


class LERSRequest(BaseModel):
    """
    Law enforcement request to companies for data.
    """
    
    class RequestType(models.TextChoices):
        BANK_TX_HISTORY = 'BANK_TX_HISTORY', 'Bank Transaction History'
        BANK_ACCOUNT_DETAILS = 'BANK_ACCOUNT_DETAILS', 'Bank Account Details'
        CDR = 'CDR', 'Call Detail Records (CDR)'
        SIM_DETAILS = 'SIM_DETAILS', 'SIM Card Details'
        UPI_TX = 'UPI_TX', 'UPI Transaction History'
        WALLET_DETAILS = 'WALLET_DETAILS', 'Wallet Details'
        ECOMMERCE_ORDER = 'ECOMMERCE_ORDER', 'E-commerce Order Details'
        SOCIAL_PROFILE = 'SOCIAL_PROFILE', 'Social Media Profile'
        IP_LOGS = 'IP_LOGS', 'IP Access Logs'
        DEVICE_INFO = 'DEVICE_INFO', 'Device Information'
        KYC_DOCUMENTS = 'KYC_DOCUMENTS', 'KYC Documents'
        OTHER = 'OTHER', 'Other'
    
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        SUBMITTED = 'SUBMITTED', 'Submitted to Company'
        ACKNOWLEDGED = 'ACKNOWLEDGED', 'Acknowledged by Company'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        RESPONSE_UPLOADED = 'RESPONSE_UPLOADED', 'Response Uploaded'
        COMPLETED = 'COMPLETED', 'Completed'
        REJECTED = 'REJECTED', 'Rejected'
        CANCELLED = 'CANCELLED', 'Cancelled'
    
    class Priority(models.TextChoices):
        NORMAL = 'NORMAL', 'Normal'
        URGENT = 'URGENT', 'Urgent'
        CRITICAL = 'CRITICAL', 'Critical'
    
    # Core identification
    request_number = models.CharField(max_length=100, unique=True, db_index=True)
    
    # Case relationship (optional - for standalone requests)
    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lers_requests',
        help_text='Optional case link. Leave empty for standalone LERS requests.'
    )
    
    # Request details
    request_type = models.CharField(max_length=30, choices=RequestType.choices)
    provider = models.CharField(max_length=255)  # Company name (HDFC, Airtel, etc.)
    provider_tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lers_requests_received'
    )

    # Catalog item (what type of data is being requested)
    catalog_item = models.ForeignKey(
        'lers.ProviderDataCatalog',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requests',
        help_text='Provider catalog item selected for this request (if using catalog)'
    )

    # Target identifiers (what we're requesting data about)
    identifiers = models.JSONField(default=dict)  # {phone, pan_hash, email, account_number, etc.}
    
    # Request details
    description = models.TextField()
    date_range_from = models.DateField(null=True, blank=True)
    date_range_to = models.DateField(null=True, blank=True)
    
    # Legal mandate
    legal_mandate_type = models.CharField(max_length=50)  # Section 91, Section 176, etc.
    legal_mandate_file = models.ForeignKey(
        'evidence.EvidenceFile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lers_legal_mandates'
    )
    court_order_number = models.CharField(max_length=100, blank=True, null=True)
    
    # Status and workflow
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the request was completed (for SLA tracking)'
    )

    # Actors
    created_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='lers_requests_created'
    )
    approved_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lers_requests_approved'
    )
    assigned_to_company = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lers_requests_assigned'
    )
    
    # SLA
    sla_due_date = models.DateTimeField(null=True, blank=True)
    sla_breached = models.BooleanField(default=False)
    sla_breach_notified = models.BooleanField(default=False)
    
    # Dates
    approved_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Notes
    notes = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'lers_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['request_number']),
            models.Index(fields=['case', 'status']),
            models.Index(fields=['provider_tenant', 'status']),
            models.Index(fields=['status', 'sla_due_date']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.request_number} - {self.get_request_type_display()}"
    
    def generate_request_number(self):
        """Generate unique request number."""
        from datetime import datetime
        import re
        
        year = datetime.now().year
        case_code = self.case.case_number.split('-')[0] if self.case else 'REQ'
        
        # Find all existing request numbers with this prefix pattern
        prefix = f"{case_code}-LERS-{year}-"
        
        # Get all request numbers that match the pattern
        existing_requests = LERSRequest.objects.filter(
            request_number__startswith=prefix
        ).exclude(
            pk=self.pk  # Exclude self if updating
        ).values_list('request_number', flat=True)
        
        max_number = 0
        for req_num in existing_requests:
            # Extract the numeric part (e.g., "0001" from "PS001-LERS-2025-0001")
            match = re.search(r'-(\d+)$', req_num)
            if match:
                num = int(match.group(1))
                if num > max_number:
                    max_number = num
        
        next_number = max_number + 1
        return f"{prefix}{next_number:04d}"
    
    def calculate_sla_due_date(self):
        """Calculate SLA due date based on priority."""
        from django.conf import settings
        
        if self.priority == 'CRITICAL':
            hours = settings.URGENT_SLA_HOURS
        else:
            hours = settings.DEFAULT_SLA_HOURS
        
        return timezone.now() + timedelta(hours=hours)
    
    def check_sla_breach(self):
        """Check if SLA is breached."""
        if self.sla_due_date and timezone.now() > self.sla_due_date:
            if self.status not in ['COMPLETED', 'CANCELLED', 'REJECTED']:
                self.sla_breached = True
                self.save(update_fields=['sla_breached'])
                return True
        return False


class LERSResponse(BaseModel):
    """
    Response from company to LERS request.
    """
    
    class Status(models.TextChoices):
        RECEIVED = 'RECEIVED', 'Received'
        PROCESSING = 'PROCESSING', 'Processing'
        PARSED = 'PARSED', 'Parsed'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
    
    # Request relationship
    request = models.ForeignKey(
        LERSRequest,
        on_delete=models.CASCADE,
        related_name='responses'
    )
    
    # Response details
    response_number = models.CharField(max_length=100, unique=True, db_index=True)
    
    # Submitted by company
    submitted_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='lers_responses_submitted'
    )
    submitted_at = models.DateTimeField(default=timezone.now)
    
    # Files
    # Note: Evidence files will be linked via ForeignKey in EvidenceFile model
    
    # Parsing status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RECEIVED)
    parsed_data = models.JSONField(default=dict, blank=True)  # Canonical parsed output
    
    # Verification
    signature = models.TextField(blank=True, null=True)  # Digital signature
    signature_verified = models.BooleanField(default=False)
    
    # Response content
    response_text = models.TextField(blank=True, null=True)  # Company's textual response
    remarks = models.TextField(blank=True, null=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'lers_responses'
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['request', '-submitted_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Response to {self.request.request_number}"


class LERSApprovalWorkflow(BaseModel):
    """
    Approval workflow for LERS requests.
    """
    
    class Action(models.TextChoices):
        APPROVE = 'APPROVE', 'Approved'
        REJECT = 'REJECT', 'Rejected'
        REQUEST_CHANGES = 'REQUEST_CHANGES', 'Request Changes'
    
    request = models.ForeignKey(
        LERSRequest,
        on_delete=models.CASCADE,
        related_name='approval_workflow'
    )
    
    # Approver
    approver = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='lers_approvals'
    )
    
    # Action
    action = models.CharField(max_length=20, choices=Action.choices)
    comments = models.TextField(blank=True, null=True)
    
    # Digital signature (for legal validity)
    signature_hash = models.CharField(max_length=64, blank=True, null=True)
    
    # Timestamps
    action_timestamp = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'lers_approval_workflow'
        ordering = ['-action_timestamp']
        indexes = [
            models.Index(fields=['request', '-action_timestamp']),
        ]
    
    def __str__(self):
        return f"{self.get_action_display()} by {self.approver.full_name if self.approver else 'Unknown'}"


class LERSTemplate(BaseModel):
    """
    Templates for LERS requests (pre-defined request formats).
    """
    name = models.CharField(max_length=255)
    request_type = models.CharField(max_length=30, choices=LERSRequest.RequestType.choices)
    description = models.TextField()
    
    # Template fields
    template_fields = models.JSONField(default=dict)  # Field definitions
    
    # Tenant-specific
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='lers_templates',
        null=True,
        blank=True
    )
    
    # Usage
    is_active = models.BooleanField(default=True)
    usage_count = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'lers_templates'
        ordering = ['name']
        indexes = [
            models.Index(fields=['request_type', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_request_type_display()})"


class LERSMessage(BaseModel):
    """
    Real-time chat messages between IO and Provider for a LERS request.
    Enables async communication without email/phone chains.
    """
    
    class SenderType(models.TextChoices):
        IO = 'IO', 'Investigating Officer'
        PROVIDER = 'PROVIDER', 'Data Provider'
        SYSTEM = 'SYSTEM', 'System Generated'
    
    class MessageType(models.TextChoices):
        TEXT = 'TEXT', 'Text Message'
        FILE = 'FILE', 'File Attachment'
        SYSTEM = 'SYSTEM', 'System Message'
    
    # Relationships
    request = models.ForeignKey(
        LERSRequest,
        on_delete=models.CASCADE,
        related_name='messages',
        help_text='LERS request this message belongs to'
    )
    sender = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='lers_messages_sent',
        help_text='User who sent this message'
    )
    
    # Message content
    sender_type = models.CharField(
        max_length=20,
        choices=SenderType.choices,
        help_text='Type of sender (IO, Provider, or System)'
    )
    message_type = models.CharField(
        max_length=20,
        default=MessageType.TEXT,
        choices=MessageType.choices,
        help_text='Type of message'
    )
    message_text = models.TextField(help_text='Message content (plain text for non-encrypted messages)')

    # End-to-End Encryption fields
    is_encrypted = models.BooleanField(
        default=False,
        help_text='Whether this message is end-to-end encrypted'
    )
    encrypted_content = models.TextField(
        blank=True,
        null=True,
        help_text='Encrypted message content (base64 encoded ciphertext)'
    )
    encrypted_key = models.TextField(
        blank=True,
        null=True,
        help_text='Encrypted symmetric key for decrypting message (RSA encrypted, base64 encoded)'
    )
    encryption_algorithm = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text='Encryption algorithm used (e.g., AES-256-GCM)'
    )
    encryption_iv = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Initialization vector for encryption (base64 encoded)'
    )
    encryption_auth_tag = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Authentication tag for AES-GCM (base64 encoded)'
    )
    sender_key_fingerprint = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text='Fingerprint of sender public key used for signing'
    )

    # File attachments
    attachments = models.JSONField(
        default=list,
        blank=True,
        help_text='Array of file URLs: [{url, filename, size, type}]'
    )
    
    # Read status
    read_by_receiver = models.BooleanField(
        default=False,
        db_index=True,
        help_text='Whether the recipient has read this message'
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when message was read'
    )
    
    # Metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional metadata (typing indicators, reactions, etc.)'
    )
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['request', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['read_by_receiver']),
        ]
    
    def __str__(self):
        return f"{self.request.request_number} - {self.sender_type} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def mark_as_read(self):
        """Mark message as read by receiver"""
        if not self.read_by_receiver:
            self.read_by_receiver = True
            self.read_at = timezone.now()
            self.save(update_fields=['read_by_receiver', 'read_at', 'updated_at'])


class UserPresence(models.Model):
    """
    Tracks real-time online/offline status of users.
    Used for presence indicators in chat and notification delivery.
    """
    
    class Status(models.TextChoices):
        ONLINE = 'ONLINE', 'Online'
        AWAY = 'AWAY', 'Away'
        OFFLINE = 'OFFLINE', 'Offline'
    
    # User relationship (one-to-one)
    user = models.OneToOneField(
        'authentication.User',
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='presence',
        help_text='User this presence belongs to'
    )
    
    # Presence status
    status = models.CharField(
        max_length=20,
        default=Status.OFFLINE,
        choices=Status.choices,
        help_text='Current online status'
    )
    
    # Timestamps
    last_seen = models.DateTimeField(
        auto_now=True,
        help_text='Last activity timestamp (auto-updated)'
    )
    last_online = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Last time user was online'
    )
    
    # WebSocket connection tracking
    socket_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='Current WebSocket connection ID'
    )
    
    # Metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional metadata (device, browser, etc.)'
    )
    
    class Meta:
        verbose_name_plural = 'User Presences'
    
    def __str__(self):
        return f"{self.user.email} - {self.status}"
    
    def set_online(self, socket_id=None):
        """Set user as online"""
        self.status = self.Status.ONLINE
        self.last_online = timezone.now()
        if socket_id:
            self.socket_id = socket_id
        self.save()
    
    def set_away(self):
        """Set user as away"""
        self.status = self.Status.AWAY
        self.save()
    
    def set_offline(self):
        """Set user as offline"""
        self.status = self.Status.OFFLINE
        self.socket_id = ''
        self.save()
    
    @property
    def is_online(self):
        """Check if user is currently online"""
        return self.status == self.Status.ONLINE
    
    @property
    def time_since_last_seen(self):
        """Get time since last seen as human-readable string"""
        if not self.last_seen:
            return "Never"
        
        delta = timezone.now() - self.last_seen
        
        if delta.seconds < 60:
            return "Just now"
        elif delta.seconds < 3600:
            minutes = delta.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif delta.seconds < 86400:
            hours = delta.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        else:
            days = delta.days
            return f"{days} day{'s' if days != 1 else ''} ago"


class LERSNotification(BaseModel):
    """
    In-app notifications for users regarding LERS requests.
    Supports real-time delivery via WebSocket and email for high priority.
    """
    
    class NotificationType(models.TextChoices):
        NEW_MESSAGE = 'NEW_MESSAGE', 'New Message'
        RESPONSE_RECEIVED = 'RESPONSE_RECEIVED', 'Response Received'
        APPROVAL_NEEDED = 'APPROVAL_NEEDED', 'Approval Needed'
        REQUEST_APPROVED = 'REQUEST_APPROVED', 'Request Approved'
        REQUEST_REJECTED = 'REQUEST_REJECTED', 'Request Rejected'
        CHANGES_REQUESTED = 'CHANGES_REQUESTED', 'Changes Requested'
        DEADLINE_APPROACHING = 'DEADLINE_APPROACHING', 'Deadline Approaching'
        REQUEST_OVERDUE = 'REQUEST_OVERDUE', 'Request Overdue'
        REQUEST_SUBMITTED = 'REQUEST_SUBMITTED', 'Request Submitted'
        PROVIDER_ACKNOWLEDGED = 'PROVIDER_ACKNOWLEDGED', 'Provider Acknowledged'
    
    class Priority(models.TextChoices):
        NORMAL = 'NORMAL', 'Normal'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'
    
    # User relationship
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='lers_notifications',
        help_text='User who will receive this notification'
    )
    
    # Related LERS request
    request = models.ForeignKey(
        LERSRequest,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        help_text='LERS request this notification is about'
    )
    
    # Notification content
    type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        help_text='Type of notification'
    )
    title = models.CharField(
        max_length=255,
        help_text='Notification title'
    )
    message = models.TextField(
        help_text='Notification message body'
    )
    
    # UI metadata
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text='Icon name for UI (e.g., "bell", "check", "alert")'
    )
    link = models.CharField(
        max_length=255,
        blank=True,
        help_text='Deep link URL to navigate to (e.g., /lers/requests/123)'
    )
    
    # Priority
    priority = models.CharField(
        max_length=20,
        default=Priority.NORMAL,
        choices=Priority.choices,
        help_text='Notification priority level'
    )
    
    # Read status
    read = models.BooleanField(
        default=False,
        db_index=True,
        help_text='Whether user has read this notification'
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when notification was read'
    )
    
    # Delivery tracking
    delivered = models.BooleanField(
        default=False,
        help_text='Whether notification was delivered via WebSocket'
    )
    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when notification was delivered'
    )
    email_sent = models.BooleanField(
        default=False,
        help_text='Whether email notification was sent (for high priority)'
    )
    
    # Additional data
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional metadata (action buttons, data for rendering, etc.)'
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'read', 'created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['request', 'created_at']),
            models.Index(fields=['priority', 'read']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.title}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.read:
            self.read = True
            self.read_at = timezone.now()
            self.save(update_fields=['read', 'read_at', 'updated_at'])
    
    def mark_as_delivered(self):
        """Mark notification as delivered via WebSocket"""
        if not self.delivered:
            self.delivered = True
            self.delivered_at = timezone.now()
            self.save(update_fields=['delivered', 'delivered_at', 'updated_at'])
    
    @classmethod
    def create_notification(cls, user, notification_type, title, message, request=None, priority='NORMAL', link='', icon='', metadata=None):
        """
        Helper method to create a notification
        
        Args:
            user: User to notify
            notification_type: Type of notification (from NotificationType choices)
            title: Notification title
            message: Notification message
            request: Related LERS request (optional)
            priority: Priority level (default: NORMAL)
            link: Deep link URL (optional)
            icon: Icon name (optional)
            metadata: Additional metadata (optional)
        
        Returns:
            Created LERSNotification instance
        """
        return cls.objects.create(
            user=user,
            request=request,
            type=notification_type,
            title=title,
            message=message,
            priority=priority,
            link=link,
            icon=icon,
            metadata=metadata or {}
        )


# Import provider catalog models to make them discoverable by Django
from .models_provider_catalog import (
    ProviderDataCatalog,
    ProviderServiceProfile,
    CatalogUsageAnalytics
)

__all__ = [
    'LERSRequest',
    'LERSResponse',
    'LERSApprovalWorkflow',
    'LERSTemplate',
    'LERSMessage',
    'UserPresence',
    'LERSNotification',
    'ProviderDataCatalog',
    'ProviderServiceProfile',
    'CatalogUsageAnalytics',
]

