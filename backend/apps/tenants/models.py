"""
Multi-tenant models for police stations and companies.
"""
from django.db import models
from apps.core.models import BaseModel


class Tenant(BaseModel):
    """
    Tenant model representing either a police station or a company.
    """
    
    class TenantType(models.TextChoices):
        POLICE_STATION = 'POLICE_STATION', 'Police Station'
        COMPANY = 'COMPANY', 'Company'
        STATE_UNIT = 'STATE_UNIT', 'State Unit'
        NATIONAL_UNIT = 'NATIONAL_UNIT', 'National Unit'
    
    # Basic info
    name = models.CharField(max_length=255, db_index=True)
    code = models.CharField(max_length=50, unique=True, db_index=True)  # e.g., PS001, HDFC
    tenant_type = models.CharField(max_length=20, choices=TenantType.choices)
    
    # Hierarchical structure (for police)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children'
    )
    
    # Contact details
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    # Geographic info (for police stations)
    district = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    pin_code = models.CharField(max_length=10, blank=True, null=True)
    jurisdiction = models.JSONField(default=dict, blank=True)  # GeoJSON or coverage areas
    
    # Company-specific fields
    company_type = models.CharField(max_length=50, blank=True, null=True)  # Bank, Telecom, Payment, Social
    registration_number = models.CharField(max_length=100, blank=True, null=True)
    
    # Configuration
    settings = models.JSONField(default=dict, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'tenants'
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['tenant_type', 'is_active']),
            models.Index(fields=['state', 'district']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def get_hierarchy_path(self):
        """Get full hierarchy path."""
        path = [self.name]
        current = self.parent
        while current:
            path.insert(0, current.name)
            current = current.parent
        return ' > '.join(path)


class TenantSettings(BaseModel):
    """
    Configurable settings per tenant.
    """
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='tenant_settings')
    
    # SLA configurations
    default_sla_hours = models.IntegerField(default=72)
    urgent_sla_hours = models.IntegerField(default=24)
    
    # Data retention
    evidence_retention_days = models.IntegerField(default=2555)  # 7 years
    log_retention_days = models.IntegerField(default=2555)
    
    # Feature flags
    features_enabled = models.JSONField(default=dict)  # e.g., {"graph_analysis": true}
    
    # Notification preferences
    notification_email = models.EmailField(blank=True, null=True)
    notification_phone = models.CharField(max_length=20, blank=True, null=True)
    sla_alert_enabled = models.BooleanField(default=True)
    
    # LERS integration (for companies)
    lers_api_enabled = models.BooleanField(default=False)
    lers_webhook_url = models.URLField(blank=True, null=True)
    lers_api_key = models.CharField(max_length=255, blank=True, null=True)
    
    # Rate limiting
    api_rate_limit = models.IntegerField(default=1000)  # requests per hour
    
    class Meta:
        db_table = 'tenant_settings'
        verbose_name = 'Tenant Settings'
        verbose_name_plural = 'Tenant Settings'
    
    def __str__(self):
        return f"Settings for {self.tenant.name}"


class TenantRelationship(BaseModel):
    """
    Relationships between tenants (e.g., station federation, company partnerships).
    """
    
    class RelationType(models.TextChoices):
        FEDERATION = 'FEDERATION', 'Federation (Share Cases)'
        PARTNER = 'PARTNER', 'Partner'
        APPROVED_PROVIDER = 'APPROVED_PROVIDER', 'Approved Data Provider'
    
    from_tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='relationships_from'
    )
    to_tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='relationships_to'
    )
    
    relation_type = models.CharField(max_length=30, choices=RelationType.choices)
    
    # Permissions
    can_view_cases = models.BooleanField(default=False)
    can_request_data = models.BooleanField(default=True)
    
    # Metadata
    approved_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='approved_relationships'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'tenant_relationships'
        unique_together = ['from_tenant', 'to_tenant', 'relation_type']
        indexes = [
            models.Index(fields=['from_tenant', 'relation_type']),
        ]
    
    def __str__(self):
        return f"{self.from_tenant.code} -> {self.to_tenant.code} ({self.relation_type})"

