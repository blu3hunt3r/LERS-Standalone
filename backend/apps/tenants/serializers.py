"""
Serializers for tenant management.
"""
from rest_framework import serializers
from .models import Tenant, TenantSettings, TenantRelationship


class TenantSerializer(serializers.ModelSerializer):
    """Serializer for Tenant model."""
    
    tenant_type_display = serializers.CharField(source='get_tenant_type_display', read_only=True)
    hierarchy_path = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'code', 'tenant_type', 'tenant_type_display',
            'parent', 'hierarchy_path', 'email', 'phone', 'address',
            'district', 'state', 'pin_code', 'jurisdiction',
            'company_type', 'registration_number',
            'settings', 'is_active', 'verified_at',
            'user_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_hierarchy_path(self, obj):
        """Get tenant hierarchy path."""
        return obj.get_hierarchy_path()
    
    def get_user_count(self, obj):
        """Get number of users in this tenant."""
        return obj.users.filter(is_active=True).count()


class TenantSettingsSerializer(serializers.ModelSerializer):
    """Serializer for TenantSettings model."""
    
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    
    class Meta:
        model = TenantSettings
        fields = [
            'id', 'tenant', 'tenant_name',
            'default_sla_hours', 'urgent_sla_hours',
            'evidence_retention_days', 'log_retention_days',
            'features_enabled', 'notification_email', 'notification_phone',
            'sla_alert_enabled', 'lers_api_enabled', 'lers_webhook_url',
            'api_rate_limit', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TenantRelationshipSerializer(serializers.ModelSerializer):
    """Serializer for TenantRelationship model."""
    
    from_tenant_name = serializers.CharField(source='from_tenant.name', read_only=True)
    to_tenant_name = serializers.CharField(source='to_tenant.name', read_only=True)
    relation_type_display = serializers.CharField(source='get_relation_type_display', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)
    
    class Meta:
        model = TenantRelationship
        fields = [
            'id', 'from_tenant', 'from_tenant_name', 'to_tenant', 'to_tenant_name',
            'relation_type', 'relation_type_display', 'can_view_cases', 'can_request_data',
            'approved_by', 'approved_by_name', 'approved_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'approved_at']

