"""
Evidence management models with encryption and chain-of-custody.
"""
from django.db import models
from django.utils import timezone
from apps.core.models import BaseModel
import hashlib


class EvidenceFile(BaseModel):
    """
    Evidence file with encryption and chain-of-custody tracking.
    """
    
    class FileType(models.TextChoices):
        DOCUMENT = 'DOCUMENT', 'Document (PDF/DOC)'
        IMAGE = 'IMAGE', 'Image'
        VIDEO = 'VIDEO', 'Video'
        AUDIO = 'AUDIO', 'Audio'
        SPREADSHEET = 'SPREADSHEET', 'Spreadsheet'
        ARCHIVE = 'ARCHIVE', 'Archive (ZIP/RAR)'
        OTHER = 'OTHER', 'Other'
    
    class Source(models.TextChoices):
        MANUAL_UPLOAD = 'MANUAL_UPLOAD', 'Manual Upload'
        LERS_RESPONSE = 'LERS_RESPONSE', 'LERS Response'
        PARSER_OUTPUT = 'PARSER_OUTPUT', 'Parser Output'
        SYSTEM_GENERATED = 'SYSTEM_GENERATED', 'System Generated'
    
    # Case relationship
    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='evidence_files'
    )
    
    # File identification
    file_name = models.CharField(max_length=500)
    file_type = models.CharField(max_length=20, choices=FileType.choices)
    mime_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField()  # bytes
    
    # Storage
    storage_path = models.CharField(max_length=1000)  # MinIO/S3 path
    encrypted_path = models.CharField(max_length=1000, blank=True, null=True)
    
    # Integrity
    sha256_hash = models.CharField(max_length=64, unique=True, db_index=True)
    md5_hash = models.CharField(max_length=32, blank=True, null=True)
    
    # Metadata
    source = models.CharField(max_length=20, choices=Source.choices)
    uploaded_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='evidence_uploaded'
    )
    description = models.TextField(blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)
    
    # Parsing
    parsed = models.BooleanField(default=False)
    parser_version = models.CharField(max_length=50, blank=True, null=True)
    parser_output = models.JSONField(default=dict, blank=True, null=True)
    parser_confidence = models.FloatField(null=True, blank=True)  # 0.0 to 1.0
    
    # LERS relationship
    lers_response = models.ForeignKey(
        'lers.LERSResponse',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evidence_files'
    )
    
    # Encryption
    is_encrypted = models.BooleanField(default=True)
    encryption_algorithm = models.CharField(max_length=50, default='AES-256-GCM')
    encryption_key_id = models.CharField(max_length=100, blank=True, null=True)
    
    # Legal
    legal_hold = models.BooleanField(default=False)
    retention_until = models.DateField(null=True, blank=True)
    
    class Meta:
        db_table = 'evidence_files'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['case', '-created_at']),
            models.Index(fields=['sha256_hash']),
            models.Index(fields=['file_type']),
            models.Index(fields=['source']),
        ]
    
    def __str__(self):
        return f"{self.file_name} ({self.case.case_number})"
    
    def calculate_hash(self, file_content):
        """Calculate SHA-256 hash of file content."""
        return hashlib.sha256(file_content).hexdigest()


class ChainOfCustody(BaseModel):
    """
    Track chain-of-custody for evidence files.
    """
    
    class Action(models.TextChoices):
        UPLOADED = 'UPLOADED', 'Uploaded'
        VIEWED = 'VIEWED', 'Viewed'
        DOWNLOADED = 'DOWNLOADED', 'Downloaded'
        DOWNLOAD_URL_GENERATED = 'DOWNLOAD_URL_GENERATED', 'Download URL Generated'
        EDITED = 'EDITED', 'Edited'
        SHARED = 'SHARED', 'Shared'
        VERIFIED = 'VERIFIED', 'Integrity Verified'
        EXPORTED = 'EXPORTED', 'Exported to Bundle'
    
    evidence = models.ForeignKey(
        EvidenceFile,
        on_delete=models.CASCADE,
        related_name='custody_records'
    )
    
    action = models.CharField(max_length=30, choices=Action.choices)
    actor = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='custody_actions'
    )
    
    # Details
    description = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    
    # Verification
    file_hash_at_action = models.CharField(max_length=64, blank=True, null=True)
    integrity_verified = models.BooleanField(default=False)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    action_timestamp = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'chain_of_custody'
        ordering = ['-action_timestamp']
        indexes = [
            models.Index(fields=['evidence', '-action_timestamp']),
            models.Index(fields=['actor']),
        ]
    
    def __str__(self):
        return f"{self.get_action_display()} - {self.evidence.file_name}"


class EvidenceTag(BaseModel):
    """
    Custom tags for evidence categorization.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    color = models.CharField(max_length=7, default='#3B82F6')  # Hex color
    
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='evidence_tags'
    )
    
    class Meta:
        db_table = 'evidence_tags'
        unique_together = ['name', 'tenant']
        ordering = ['name']
    
    def __str__(self):
        return self.name


class CourtBundle(BaseModel):
    """
    Court bundle export with signed manifest.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        GENERATING = 'GENERATING', 'Generating'
        READY = 'READY', 'Ready'
        FAILED = 'FAILED', 'Failed'
    
    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='court_bundles'
    )
    
    # Bundle details
    bundle_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Evidence included
    evidence_files = models.ManyToManyField(EvidenceFile, related_name='court_bundles')
    
    # Generated bundle
    bundle_path = models.CharField(max_length=1000, blank=True, null=True)
    bundle_size = models.BigIntegerField(null=True, blank=True)
    bundle_hash = models.CharField(max_length=64, blank=True, null=True)
    
    # Manifest
    manifest = models.JSONField(default=dict, blank=True)
    manifest_signature = models.TextField(blank=True, null=True)
    
    # Creator
    created_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='court_bundles_created'
    )
    
    # Legal
    court_name = models.CharField(max_length=255, blank=True, null=True)
    case_reference = models.CharField(max_length=100, blank=True, null=True)
    
    # Metadata
    generated_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'court_bundles'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['case', '-created_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.bundle_name} - {self.case.case_number}"

