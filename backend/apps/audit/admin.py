"""
Admin configuration for audit app.
"""
from django.contrib import admin
from .models import AuditLog, AuditExport


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Admin interface for audit logs (read-only)."""
    
    list_display = ['action', 'resource_type', 'user', 'tenant', 'timestamp']
    list_filter = ['action', 'resource_type', 'timestamp']
    search_fields = ['user__email', 'resource_id', 'description']
    readonly_fields = [
        'id', 'user', 'tenant', 'action', 'resource_type', 'resource_id',
        'description', 'changes', 'ip_address', 'user_agent',
        'log_hash', 'previous_log_hash', 'timestamp'
    ]
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AuditExport)
class AuditExportAdmin(admin.ModelAdmin):
    """Admin interface for audit exports."""
    
    list_display = ['export_name', 'export_type', 'created_by', 'created_at']
    list_filter = ['export_type', 'created_at']
    search_fields = ['export_name']
    readonly_fields = ['created_at', 'file_hash', 'manifest_signature']

