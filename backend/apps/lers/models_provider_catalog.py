"""
Provider Data Catalog Models

Allows providers to define what data they can provide,
with SLA transparency as the core feature for government procurement.
"""
from django.db import models
from django.utils import timezone
from apps.core.models import BaseModel
from datetime import timedelta


class ProviderDataCatalog(BaseModel):
    """
    Catalog of data types that a provider (bank/telco/merchant) can provide.

    Example: HDFC Bank can provide "Account Statement", "Cheque Images", etc.

    SLA TRANSPARENCY IS KEY: Every catalog item shows expected turnaround time.
    """

    class DataCategory(models.TextChoices):
        BANKING = 'BANKING', 'Banking & Financial Records'
        TELECOM = 'TELECOM', 'Telecom & CDR'
        PAYMENT = 'PAYMENT', 'Payment & UPI Transactions'
        IDENTITY = 'IDENTITY', 'KYC & Identity Documents'
        CREDIT = 'CREDIT', 'Credit Card & Loan Records'
        LOCATION = 'LOCATION', 'Location & Tower Data'
        DEVICE = 'DEVICE', 'Device & IMEI Information'
        ECOMMERCE = 'ECOMMERCE', 'E-commerce Orders & Delivery'
        SOCIAL = 'SOCIAL', 'Social Media Records'
        OTHER = 'OTHER', 'Other Data Types'

    class OutputFormat(models.TextChoices):
        PDF = 'PDF', 'PDF Document'
        EXCEL = 'EXCEL', 'Excel Spreadsheet'
        CSV = 'CSV', 'CSV File'
        JSON = 'JSON', 'JSON Data'
        SCANNED_PDF = 'SCANNED_PDF', 'Scanned PDF (Images)'
        MIXED = 'MIXED', 'Multiple Formats'

    # Provider who offers this data type
    provider_tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='data_catalog_items',
        help_text='The provider (bank/telco) offering this data'
    )

    # Catalog item details
    name = models.CharField(
        max_length=200,
        help_text='E.g., "Account Statement (6 months)", "CDR - Incoming/Outgoing"'
    )
    description = models.TextField(
        help_text='Detailed description of what data is included'
    )
    category = models.CharField(
        max_length=20,
        choices=DataCategory.choices,
        db_index=True
    )

    # SLA COMMITMENT (CORE FEATURE)
    sla_turnaround_hours = models.IntegerField(
        help_text='Committed turnaround time in hours (e.g., 48 for 2 days)'
    )
    sla_business_hours_only = models.BooleanField(
        default=True,
        help_text='If true, SLA counts only business hours (Mon-Fri 9AM-6PM)'
    )

    # ACTUAL PERFORMANCE (TRANSPARENCY)
    actual_avg_turnaround_hours = models.FloatField(
        null=True,
        blank=True,
        help_text='Actual average turnaround based on historical data'
    )
    actual_median_turnaround_hours = models.FloatField(
        null=True,
        blank=True,
        help_text='Median turnaround (more accurate than average)'
    )
    sla_compliance_rate = models.FloatField(
        null=True,
        blank=True,
        help_text='Percentage of requests delivered within SLA (e.g., 92.5)'
    )
    total_requests_fulfilled = models.IntegerField(
        default=0,
        help_text='Total number of requests fulfilled for this data type'
    )

    # Required information from law enforcement
    required_fields = models.JSONField(
        default=list,
        help_text='''
        List of fields required from law enforcement.
        Example:
        [
            {
                "field": "account_number",
                "label": "Account Number",
                "type": "text",
                "required": true,
                "placeholder": "Enter 16-digit account number",
                "validation": "^[0-9]{16}$",
                "help_text": "16-digit account number as printed on passbook"
            },
            {
                "field": "date_from",
                "label": "From Date",
                "type": "date",
                "required": true,
                "max_range_days": 180,
                "help_text": "Maximum 6 months of history per request"
            }
        ]
        '''
    )

    # Legal requirements
    required_legal_mandate = models.CharField(
        max_length=200,
        help_text='E.g., "Section 91 CrPC" or "Section 91 CrPC + Court Order"'
    )
    requires_court_order = models.BooleanField(default=False)
    requires_pan_verification = models.BooleanField(default=False)
    additional_requirements = models.TextField(
        blank=True,
        help_text='Any additional legal/procedural requirements'
    )

    # Output details
    output_format = models.CharField(
        max_length=20,
        choices=OutputFormat.choices
    )
    output_description = models.TextField(
        blank=True,
        help_text='Description of what the output will contain'
    )
    sample_output_file = models.FileField(
        upload_to='catalog_samples/',
        null=True,
        blank=True,
        help_text='Redacted sample output for reference'
    )

    # Status and visibility
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text='Whether this catalog item is currently available'
    )
    is_featured = models.BooleanField(
        default=False,
        help_text='Featured items shown prominently'
    )

    # Metadata
    notes_for_law_enforcement = models.TextField(
        blank=True,
        help_text='Important notes or tips for requesting this data'
    )
    internal_notes = models.TextField(
        blank=True,
        help_text='Internal notes for provider staff (not visible to law enforcement)'
    )

    class Meta:
        db_table = 'lers_provider_data_catalog'
        unique_together = [['provider_tenant', 'name']]
        ordering = ['provider_tenant', 'category', 'name']
        indexes = [
            models.Index(fields=['provider_tenant', 'category']),
            models.Index(fields=['is_active']),
            models.Index(fields=['sla_turnaround_hours']),
        ]

    def __str__(self):
        return f"{self.provider_tenant.name} - {self.name}"

    def get_sla_status_display(self):
        """Return SLA status with color coding"""
        if not self.sla_compliance_rate:
            return 'NEW'
        elif self.sla_compliance_rate >= 95:
            return 'EXCELLENT'
        elif self.sla_compliance_rate >= 85:
            return 'GOOD'
        elif self.sla_compliance_rate >= 75:
            return 'AVERAGE'
        else:
            return 'POOR'

    def update_sla_metrics(self):
        """Calculate and update SLA metrics based on historical requests"""
        from django.db.models import Avg, Count, Q
        from django.apps import apps
        LERSRequest = apps.get_model('lers', 'LERSRequest')

        # Get all requests for this catalog item
        requests = LERSRequest.objects.filter(
            provider_tenant=self.provider_tenant,
            catalog_item=self,
            status='COMPLETED'
        ).exclude(
            completed_at__isnull=True
        )

        if not requests.exists():
            return

        # Calculate metrics
        turnarounds = []
        sla_met_count = 0

        for request in requests:
            hours = (request.completed_at - request.created_at).total_seconds() / 3600
            turnarounds.append(hours)

            if hours <= self.sla_turnaround_hours:
                sla_met_count += 1

        # Update model
        self.total_requests_fulfilled = len(turnarounds)
        self.actual_avg_turnaround_hours = sum(turnarounds) / len(turnarounds)

        # Calculate median
        sorted_turnarounds = sorted(turnarounds)
        mid = len(sorted_turnarounds) // 2
        if len(sorted_turnarounds) % 2 == 0:
            self.actual_median_turnaround_hours = (sorted_turnarounds[mid-1] + sorted_turnarounds[mid]) / 2
        else:
            self.actual_median_turnaround_hours = sorted_turnarounds[mid]

        # SLA compliance rate
        self.sla_compliance_rate = (sla_met_count / len(turnarounds)) * 100

        self.save(update_fields=[
            'total_requests_fulfilled',
            'actual_avg_turnaround_hours',
            'actual_median_turnaround_hours',
            'sla_compliance_rate'
        ])


class ProviderServiceProfile(BaseModel):
    """
    Overall service profile and SLA dashboard for a provider.
    This is the "report card" shown to law enforcement.
    """

    provider_tenant = models.OneToOneField(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='service_profile'
    )

    # Service hours
    service_hours = models.CharField(
        max_length=200,
        default='Monday-Friday, 9:00 AM - 6:00 PM',
        help_text='When the provider processes LERS requests'
    )
    holidays_affect_sla = models.BooleanField(
        default=True,
        help_text='Whether public holidays extend SLA deadlines'
    )

    # Contact information
    nodal_officer_name = models.CharField(max_length=200)
    nodal_officer_designation = models.CharField(max_length=100)
    nodal_officer_email = models.EmailField()
    nodal_officer_phone = models.CharField(max_length=20)
    emergency_contact = models.CharField(
        max_length=100,
        blank=True,
        help_text='Emergency contact for urgent/critical requests'
    )

    # Overall SLA metrics (aggregated from all catalog items)
    overall_sla_compliance_rate = models.FloatField(
        null=True,
        blank=True,
        help_text='Overall SLA compliance across all data types'
    )
    total_requests_received = models.IntegerField(default=0)
    total_requests_completed = models.IntegerField(default=0)
    avg_response_time_hours = models.FloatField(
        null=True,
        blank=True,
        help_text='Average response time across all requests'
    )

    # Quality metrics
    rejection_rate = models.FloatField(
        null=True,
        blank=True,
        help_text='Percentage of requests rejected due to incomplete information'
    )
    clarification_request_rate = models.FloatField(
        null=True,
        blank=True,
        help_text='Percentage of requests requiring clarification'
    )

    # Certifications and compliance
    iso_certified = models.BooleanField(default=False)
    iso_certificate_number = models.CharField(max_length=100, blank=True)
    data_security_certified = models.BooleanField(default=False)
    govt_empaneled = models.BooleanField(default=False)

    # Public statement
    service_commitment = models.TextField(
        blank=True,
        help_text='Public commitment statement to law enforcement'
    )

    # Last metrics update
    metrics_last_updated = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'lers_provider_service_profile'

    def __str__(self):
        return f"Service Profile - {self.provider_tenant.name}"

    def update_overall_metrics(self):
        """Update overall metrics from all catalog items and requests"""
        from django.db.models import Avg, Count, Q
        from django.apps import apps
        LERSRequest = apps.get_model('lers', 'LERSRequest')

        # Get all requests for this provider
        all_requests = LERSRequest.objects.filter(
            provider_tenant=self.provider_tenant
        )

        self.total_requests_received = all_requests.count()
        self.total_requests_completed = all_requests.filter(
            status='COMPLETED'
        ).count()

        # Calculate average response time
        completed_requests = all_requests.filter(
            status='COMPLETED',
            completed_at__isnull=False
        )

        if completed_requests.exists():
            total_hours = 0
            sla_met_count = 0

            for request in completed_requests:
                hours = (request.completed_at - request.created_at).total_seconds() / 3600
                total_hours += hours

                if request.catalog_item and hours <= request.catalog_item.sla_turnaround_hours:
                    sla_met_count += 1

            self.avg_response_time_hours = total_hours / completed_requests.count()

            if request.catalog_item:  # Only if requests have catalog items
                self.overall_sla_compliance_rate = (sla_met_count / completed_requests.count()) * 100

        # Calculate rejection and clarification rates
        total = all_requests.count()
        if total > 0:
            rejected = all_requests.filter(status='REJECTED').count()
            self.rejection_rate = (rejected / total) * 100

        self.metrics_last_updated = timezone.now()
        self.save()

    def get_performance_grade(self):
        """Get overall performance grade"""
        if not self.overall_sla_compliance_rate:
            return 'N/A'
        elif self.overall_sla_compliance_rate >= 95:
            return 'A+'
        elif self.overall_sla_compliance_rate >= 90:
            return 'A'
        elif self.overall_sla_compliance_rate >= 85:
            return 'B+'
        elif self.overall_sla_compliance_rate >= 80:
            return 'B'
        elif self.overall_sla_compliance_rate >= 75:
            return 'C+'
        elif self.overall_sla_compliance_rate >= 70:
            return 'C'
        else:
            return 'D'


class CatalogUsageAnalytics(BaseModel):
    """
    Track which catalog items are most requested.
    Helps providers optimize their services.
    """

    catalog_item = models.ForeignKey(
        ProviderDataCatalog,
        on_delete=models.CASCADE,
        related_name='usage_analytics'
    )

    # Time period
    period_start = models.DateField()
    period_end = models.DateField()

    # Metrics for this period
    requests_received = models.IntegerField(default=0)
    requests_completed = models.IntegerField(default=0)
    requests_rejected = models.IntegerField(default=0)
    avg_turnaround_hours = models.FloatField(null=True, blank=True)
    sla_met_count = models.IntegerField(default=0)
    sla_missed_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'lers_catalog_usage_analytics'
        unique_together = [['catalog_item', 'period_start', 'period_end']]
        ordering = ['-period_start']
