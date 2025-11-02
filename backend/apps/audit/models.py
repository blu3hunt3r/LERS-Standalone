"""
Audit logging models (append-only, immutable).
"""
from django.db import models
from django.utils import timezone
import uuid
import hashlib
import json


class AuditLog(models.Model):
    """
    Append-only audit log for all system actions.
    """
    
    class Action(models.TextChoices):
        CREATE = 'CREATE', 'Create'
        UPDATE = 'UPDATE', 'Update'
        DELETE = 'DELETE', 'Delete'
        VIEW = 'VIEW', 'View'
        DOWNLOAD = 'DOWNLOAD', 'Download'
        APPROVE = 'APPROVE', 'Approve'
        REJECT = 'REJECT', 'Reject'
        LOGIN = 'LOGIN', 'Login'
        LOGOUT = 'LOGOUT', 'Logout'
        EXPORT = 'EXPORT', 'Export'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Actor
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.SET_NULL,
        null=True
    )
    
    # Action details
    action = models.CharField(max_length=20, choices=Action.choices)
    resource_type = models.CharField(max_length=50)  # Case, Evidence, LERSRequest, etc.
    resource_id = models.CharField(max_length=100)
    
    # Details
    description = models.TextField()
    changes = models.JSONField(default=dict, blank=True)  # Before/after values
    
    # Request details
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    
    # Integrity
    log_hash = models.CharField(max_length=64, unique=True, db_index=True)  # SHA-256
    previous_log_hash = models.CharField(max_length=64, blank=True, null=True)  # Chain
    
    # Timestamp
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['tenant', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.action} on {self.resource_type} by {self.user}"
    
    def save(self, *args, **kwargs):
        """Generate hash before saving."""
        if not self.log_hash:
            # Get previous log hash for chaining
            last_log = AuditLog.objects.order_by('-timestamp').first()
            self.previous_log_hash = last_log.log_hash if last_log else ''
            
            # Generate hash
            data = f"{self.user_id}:{self.action}:{self.resource_type}:{self.resource_id}:{self.timestamp.isoformat()}:{self.previous_log_hash}"
            self.log_hash = hashlib.sha256(data.encode()).hexdigest()
        
        super().save(*args, **kwargs)


class AuditExport(models.Model):
    """
    Audit log exports for legal/compliance.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Export details
    export_name = models.CharField(max_length=255)
    export_type = models.CharField(max_length=50)  # case_audit, user_audit, full_export
    
    # Filters
    date_from = models.DateTimeField()
    date_to = models.DateTimeField()
    filters = models.JSONField(default=dict, blank=True)
    
    # Generated file
    file_path = models.CharField(max_length=1000, blank=True, null=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    file_hash = models.CharField(max_length=64, blank=True, null=True)
    
    # Manifest
    manifest = models.JSONField(default=dict, blank=True)
    manifest_signature = models.TextField(blank=True, null=True)
    
    # Creator
    created_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True
    )
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'audit_exports'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.export_name} - {self.created_at}"

