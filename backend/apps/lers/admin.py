"""
Admin configuration for LERS app.
"""
from django.contrib import admin
from .models import (
    LERSRequest, LERSResponse, LERSApprovalWorkflow, LERSTemplate,
    ProviderDataCatalog, ProviderServiceProfile, CatalogUsageAnalytics
)


class LERSApprovalWorkflowInline(admin.TabularInline):
    """Inline for approval workflow."""
    model = LERSApprovalWorkflow
    extra = 0
    readonly_fields = ['approver', 'action', 'action_timestamp']
    can_delete = False


class LERSResponseInline(admin.TabularInline):
    """Inline for responses."""
    model = LERSResponse
    extra = 0
    readonly_fields = ['response_number', 'submitted_by', 'submitted_at', 'status']
    fields = ['response_number', 'submitted_by', 'submitted_at', 'status']


@admin.register(LERSRequest)
class LERSRequestAdmin(admin.ModelAdmin):
    """Admin interface for LERS requests."""
    
    list_display = [
        'request_number', 'request_type', 'provider', 'status',
        'priority', 'sla_due_date', 'sla_breached', 'created_at'
    ]
    list_filter = [
        'request_type', 'status', 'priority', 'sla_breached',
        'provider_tenant', 'created_at'
    ]
    search_fields = [
        'request_number', 'provider', 'description',
        'case__case_number'
    ]
    readonly_fields = [
        'request_number', 'created_by', 'approved_by', 'sla_breached',
        'approved_at', 'submitted_at', 'completed_at', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('Request Information', {
            'fields': ('request_number', 'case', 'request_type', 'provider', 'provider_tenant')
        }),
        ('Request Details', {
            'fields': ('identifiers', 'description', 'date_range_from', 'date_range_to')
        }),
        ('Legal Mandate', {
            'fields': ('legal_mandate_type', 'legal_mandate_file', 'court_order_number')
        }),
        ('Status & Priority', {
            'fields': ('status', 'priority', 'sla_due_date', 'sla_breached')
        }),
        ('Workflow', {
            'fields': (
                'created_by', 'approved_by', 'assigned_to_company',
                'approved_at', 'submitted_at', 'completed_at'
            )
        }),
        ('Additional Info', {
            'fields': ('notes', 'rejection_reason', 'metadata'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [LERSApprovalWorkflowInline, LERSResponseInline]


@admin.register(LERSResponse)
class LERSResponseAdmin(admin.ModelAdmin):
    """Admin interface for LERS responses."""
    
    list_display = [
        'response_number', 'request', 'submitted_by',
        'submitted_at', 'status', 'signature_verified'
    ]
    list_filter = ['status', 'signature_verified', 'submitted_at']
    search_fields = [
        'response_number', 'request__request_number',
        'response_text'
    ]
    readonly_fields = [
        'response_number', 'submitted_by', 'submitted_at', 'created_at'
    ]


@admin.register(LERSApprovalWorkflow)
class LERSApprovalWorkflowAdmin(admin.ModelAdmin):
    """Admin interface for approval workflow."""
    
    list_display = [
        'request', 'approver', 'action', 'action_timestamp'
    ]
    list_filter = ['action', 'action_timestamp']
    search_fields = ['request__request_number', 'approver__full_name']
    readonly_fields = ['action_timestamp']


@admin.register(LERSTemplate)
class LERSTemplateAdmin(admin.ModelAdmin):
    """Admin interface for LERS templates."""
    
    list_display = [
        'name', 'request_type', 'tenant', 'is_active', 'usage_count'
    ]
    list_filter = ['request_type', 'is_active', 'tenant']
    search_fields = ['name', 'description']



# ==========================================
# PROVIDER DATA CATALOG ADMIN
# ==========================================

@admin.register(ProviderDataCatalog)
class ProviderDataCatalogAdmin(admin.ModelAdmin):
    """Admin interface for Provider Data Catalog."""
    
    list_display = [
        'name', 'provider_tenant', 'category', 'sla_turnaround_hours',
        'sla_compliance_rate', 'total_requests_fulfilled', 'is_active', 'is_featured'
    ]
    list_filter = [
        'category', 'is_active', 'is_featured', 'provider_tenant',
        'requires_court_order', 'output_format'
    ]
    search_fields = [
        'name', 'description', 'provider_tenant__name'
    ]
    readonly_fields = [
        'actual_avg_turnaround_hours', 'actual_median_turnaround_hours',
        'sla_compliance_rate', 'total_requests_fulfilled', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('provider_tenant', 'name', 'description', 'category')
        }),
        ('SLA Commitment', {
            'fields': (
                'sla_turnaround_hours', 'sla_business_hours_only'
            )
        }),
        ('Actual Performance (Auto-calculated)', {
            'fields': (
                'actual_avg_turnaround_hours', 'actual_median_turnaround_hours',
                'sla_compliance_rate', 'total_requests_fulfilled'
            ),
            'classes': ('collapse',)
        }),
        ('Required Information', {
            'fields': ('required_fields',)
        }),
        ('Legal Requirements', {
            'fields': (
                'required_legal_mandate', 'requires_court_order',
                'requires_pan_verification', 'additional_requirements'
            )
        }),
        ('Output Details', {
            'fields': ('output_format', 'output_description', 'sample_output_file')
        }),
        ('Status & Visibility', {
            'fields': ('is_active', 'is_featured')
        }),
        ('Notes', {
            'fields': ('notes_for_law_enforcement', 'internal_notes'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['update_sla_metrics', 'mark_as_featured', 'mark_as_not_featured']
    
    def update_sla_metrics(self, request, queryset):
        """Update SLA metrics for selected catalog items."""
        for item in queryset:
            item.update_sla_metrics()
        self.message_user(request, f'Updated SLA metrics for {queryset.count()} items')
    update_sla_metrics.short_description = 'Update SLA metrics'
    
    def mark_as_featured(self, request, queryset):
        """Mark selected items as featured."""
        queryset.update(is_featured=True)
        self.message_user(request, f'Marked {queryset.count()} items as featured')
    mark_as_featured.short_description = 'Mark as featured'
    
    def mark_as_not_featured(self, request, queryset):
        """Remove featured status from selected items."""
        queryset.update(is_featured=False)
        self.message_user(request, f'Removed featured status from {queryset.count()} items')
    mark_as_not_featured.short_description = 'Remove featured status'


@admin.register(ProviderServiceProfile)
class ProviderServiceProfileAdmin(admin.ModelAdmin):
    """Admin interface for Provider Service Profiles."""
    
    list_display = [
        'provider_tenant', 'overall_sla_compliance_rate',
        'total_requests_received', 'total_requests_completed',
        'avg_response_time_hours', 'get_performance_grade'
    ]
    list_filter = [
        'iso_certified', 'data_security_certified', 'govt_empaneled'
    ]
    search_fields = [
        'provider_tenant__name', 'nodal_officer_name', 'nodal_officer_email'
    ]
    readonly_fields = [
        'overall_sla_compliance_rate', 'total_requests_received',
        'total_requests_completed', 'avg_response_time_hours',
        'rejection_rate', 'clarification_request_rate',
        'metrics_last_updated', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('Provider', {
            'fields': ('provider_tenant',)
        }),
        ('Service Hours', {
            'fields': ('service_hours', 'holidays_affect_sla')
        }),
        ('Contact Information', {
            'fields': (
                'nodal_officer_name', 'nodal_officer_designation',
                'nodal_officer_email', 'nodal_officer_phone',
                'emergency_contact'
            )
        }),
        ('Overall Performance (Auto-calculated)', {
            'fields': (
                'overall_sla_compliance_rate', 'total_requests_received',
                'total_requests_completed', 'avg_response_time_hours'
            )
        }),
        ('Quality Metrics', {
            'fields': ('rejection_rate', 'clarification_request_rate')
        }),
        ('Certifications', {
            'fields': (
                'iso_certified', 'iso_certificate_number',
                'data_security_certified', 'govt_empaneled'
            )
        }),
        ('Public Statement', {
            'fields': ('service_commitment',)
        }),
        ('Metadata', {
            'fields': ('metrics_last_updated', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['update_overall_metrics']
    
    def update_overall_metrics(self, request, queryset):
        """Update overall metrics for selected profiles."""
        for profile in queryset:
            profile.update_overall_metrics()
        self.message_user(request, f'Updated metrics for {queryset.count()} profiles')
    update_overall_metrics.short_description = 'Update overall metrics'


@admin.register(CatalogUsageAnalytics)
class CatalogUsageAnalyticsAdmin(admin.ModelAdmin):
    """Admin interface for Catalog Usage Analytics."""
    
    list_display = [
        'catalog_item', 'period_start', 'period_end',
        'requests_received', 'requests_completed', 'avg_turnaround_hours',
        'sla_met_count', 'sla_missed_count'
    ]
    list_filter = ['period_start', 'period_end']
    search_fields = ['catalog_item__name', 'catalog_item__provider_tenant__name']
    readonly_fields = ['created_at', 'updated_at']
    
    date_hierarchy = 'period_start'
