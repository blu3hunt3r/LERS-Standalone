"""
Admin configuration for evidence app.
"""
from django.contrib import admin
from .models import EvidenceFile, ChainOfCustody, EvidenceTag, CourtBundle


class ChainOfCustodyInline(admin.TabularInline):
    """Inline for chain of custody."""
    model = ChainOfCustody
    extra = 0
    readonly_fields = ['action', 'actor', 'action_timestamp', 'integrity_verified']
    can_delete = False


@admin.register(EvidenceFile)
class EvidenceFileAdmin(admin.ModelAdmin):
    """Admin interface for EvidenceFile model."""
    
    list_display = [
        'file_name', 'file_type', 'case', 'uploaded_by',
        'file_size', 'is_encrypted', 'legal_hold', 'created_at'
    ]
    list_filter = ['file_type', 'source', 'is_encrypted', 'legal_hold', 'parsed', 'created_at']
    search_fields = ['file_name', 'description', 'case__case_number', 'sha256_hash']
    readonly_fields = [
        'storage_path', 'sha256_hash', 'md5_hash', 'file_size',
        'is_encrypted', 'encryption_algorithm', 'uploaded_by', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('File Information', {
            'fields': ('case', 'file_name', 'file_type', 'mime_type', 'file_size')
        }),
        ('Storage', {
            'fields': ('storage_path', 'sha256_hash', 'md5_hash', 'is_encrypted', 'encryption_algorithm')
        }),
        ('Upload Details', {
            'fields': ('source', 'uploaded_by', 'description', 'tags')
        }),
        ('Parsing', {
            'fields': ('parsed', 'parser_version', 'parser_output', 'parser_confidence'),
            'classes': ('collapse',)
        }),
        ('Legal', {
            'fields': ('legal_hold', 'retention_until')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [ChainOfCustodyInline]


@admin.register(ChainOfCustody)
class ChainOfCustodyAdmin(admin.ModelAdmin):
    """Admin interface for ChainOfCustody model."""
    
    list_display = [
        'evidence', 'action', 'actor', 'integrity_verified', 'action_timestamp'
    ]
    list_filter = ['action', 'integrity_verified', 'action_timestamp']
    search_fields = ['evidence__file_name', 'actor__full_name', 'description']
    readonly_fields = ['created_at']


@admin.register(EvidenceTag)
class EvidenceTagAdmin(admin.ModelAdmin):
    """Admin interface for EvidenceTag model."""
    
    list_display = ['name', 'tenant', 'color', 'created_at']
    list_filter = ['tenant', 'created_at']
    search_fields = ['name', 'description']


@admin.register(CourtBundle)
class CourtBundleAdmin(admin.ModelAdmin):
    """Admin interface for CourtBundle model."""
    
    list_display = [
        'bundle_name', 'case', 'status', 'created_by',
        'bundle_size', 'generated_at'
    ]
    list_filter = ['status', 'created_at', 'generated_at']
    search_fields = ['bundle_name', 'description', 'case__case_number']
    readonly_fields = [
        'bundle_path', 'bundle_size', 'bundle_hash',
        'manifest', 'manifest_signature', 'generated_at', 'created_at'
    ]

