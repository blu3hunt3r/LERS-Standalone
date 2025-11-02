"""
Feature 2 (Phase 4): Database Indexing Strategy

Add composite indexes for authentication query patterns.

Indexes added:
- Composite index on (tenant_id, role, is_active) for user management queries
- Composite index on (is_active, last_login) for activity tracking
- Composite index on (tenant_id, is_active) for tenant user lists
- Index on employee_id for police officer lookups
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0003_add_mfa_fields'),
    ]

    operations = [
        # Composite index for tenant user management
        migrations.AddIndex(
            model_name='user',
            index=models.Index(
                fields=['tenant', 'role', 'is_active'],
                name='idx_user_tenant_role_active'
            ),
        ),
        # Index on employee_id for police officer lookups
        migrations.AddIndex(
            model_name='user',
            index=models.Index(
                fields=['employee_id'],
                name='idx_user_employee_id',
                condition=models.Q(employee_id__isnull=False)
            ),
        ),
        # Composite index for user activity tracking
        migrations.AddIndex(
            model_name='user',
            index=models.Index(
                fields=['is_active', '-last_login'],
                name='idx_user_active_login'
            ),
        ),
        # Composite index for tenant active users
        migrations.AddIndex(
            model_name='user',
            index=models.Index(
                fields=['tenant', 'is_active', '-created_at'],
                name='idx_user_tenant_active_date'
            ),
        ),
        # LoginHistory: Add index on success flag
        migrations.AddIndex(
            model_name='loginhistory',
            index=models.Index(
                fields=['success', '-created_at'],
                name='idx_login_success_date'
            ),
        ),
        # APIKey: Add composite index for active keys lookup
        migrations.AddIndex(
            model_name='apikey',
            index=models.Index(
                fields=['user', 'is_active'],
                name='idx_apikey_user_active'
            ),
        ),
    ]
