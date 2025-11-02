"""
Feature 2 (Phase 4): Database Indexing Strategy

Add additional composite indexes for LERS query patterns.

Indexes added:
- Filtered index on sla_due_date for pending/submitted requests only
- Composite index on (case_id, provider_tenant_id, status) for case LERS tracking
- Composite index on (created_by_id, status) for user request tracking
- Composite index on (provider_tenant_id, sla_due_date) for company SLA monitoring
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lers', '0002_userpresence_lersnotification_lersmessage'),
    ]

    operations = [
        # Filtered index on SLA deadline for active requests only
        migrations.AddIndex(
            model_name='lersrequest',
            index=models.Index(
                fields=['sla_due_date'],
                name='idx_lers_sla_deadline',
                condition=models.Q(status__in=['PENDING_APPROVAL', 'SUBMITTED', 'IN_PROGRESS'])
            ),
        ),
        # Composite index for case LERS tracking
        migrations.AddIndex(
            model_name='lersrequest',
            index=models.Index(
                fields=['case', 'provider_tenant', 'status'],
                name='idx_lers_case_provider_status'
            ),
        ),
        # Composite index for user request tracking
        migrations.AddIndex(
            model_name='lersrequest',
            index=models.Index(
                fields=['created_by', 'status', '-created_at'],
                name='idx_lers_creator_status_date'
            ),
        ),
        # Composite index for provider SLA monitoring
        migrations.AddIndex(
            model_name='lersrequest',
            index=models.Index(
                fields=['provider_tenant', 'sla_due_date'],
                name='idx_lers_provider_sla',
                condition=models.Q(sla_due_date__isnull=False)
            ),
        ),
        # Composite index for request lifecycle tracking
        migrations.AddIndex(
            model_name='lersrequest',
            index=models.Index(
                fields=['status', 'priority', '-created_at'],
                name='idx_lers_status_priority_date'
            ),
        ),
    ]
