"""
Admin configuration for tenants app.
"""
from django.contrib import admin
from .models import Tenant, TenantSettings, TenantRelationship


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    """Admin interface for Tenant model."""
    
    list_display = ['code', 'name', 'tenant_type', 'state', 'district', 'is_active', 'created_at']
    list_filter = ['tenant_type', 'is_active', 'state']
    search_fields = ['name', 'code', 'email']
    ordering = ['name']
    
    fieldsets = (
        ('Basic Info', {'fields': ('name', 'code', 'tenant_type', 'parent')}),
        ('Contact', {'fields': ('email', 'phone', 'address')}),
        ('Location (Police)', {'fields': ('district', 'state', 'pin_code', 'jurisdiction')}),
        ('Company Info', {'fields': ('company_type', 'registration_number')}),
        ('Status', {'fields': ('is_active', 'verified_at')}),
        ('Configuration', {'fields': ('settings',)}),
    )


@admin.register(TenantSettings)
class TenantSettingsAdmin(admin.ModelAdmin):
    """Admin interface for TenantSettings model."""
    
    list_display = ['tenant', 'default_sla_hours', 'urgent_sla_hours', 'lers_api_enabled']
    list_filter = ['lers_api_enabled', 'sla_alert_enabled']
    search_fields = ['tenant__name', 'tenant__code']


@admin.register(TenantRelationship)
class TenantRelationshipAdmin(admin.ModelAdmin):
    """Admin interface for TenantRelationship model."""
    
    list_display = ['from_tenant', 'to_tenant', 'relation_type', 'approved_at', 'created_at']
    list_filter = ['relation_type', 'approved_at']
    search_fields = ['from_tenant__name', 'to_tenant__name']

