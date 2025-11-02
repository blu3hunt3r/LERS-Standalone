"""
Migration for Feature 9: Advanced Audit Logging

Adds enhanced fields for security analysis, anomaly detection, and comprehensive audit trails.

New Features:
- Extended action types (login failures, permission changes, security events)
- Request/response metadata (method, path, status code, duration)
- Security context (session ID, risk score, geolocation, device fingerprint)
- Searchable tags and flexible metadata
- Additional indexes for performance

Indexes optimized for:
- Time-series queries
- Security incident investigation
- User activity tracking
- Resource access patterns
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('audit', '0002_initial'),
    ]

    operations = [
        # Add request/response metadata fields
        migrations.AddField(
            model_name='auditlog',
            name='request_method',
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
        migrations.AddField(
            model_name='auditlog',
            name='request_path',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='auditlog',
            name='request_query',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='auditlog',
            name='response_status',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='auditlog',
            name='duration_ms',
            field=models.IntegerField(blank=True, null=True),
        ),

        # Add security context fields
        migrations.AddField(
            model_name='auditlog',
            name='session_id',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='auditlog',
            name='risk_score',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='auditlog',
            name='geolocation',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='auditlog',
            name='device_fingerprint',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),

        # Add additional metadata fields
        migrations.AddField(
            model_name='auditlog',
            name='metadata',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='auditlog',
            name='tags',
            field=models.JSONField(blank=True, default=list),
        ),

        # Add indexes for security analysis
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(
                fields=['action', '-timestamp'],
                name='audit_action_time_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(
                fields=['ip_address', '-timestamp'],
                name='audit_ip_time_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(
                fields=['response_status', '-timestamp'],
                name='audit_status_time_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(
                fields=['risk_score', '-timestamp'],
                name='audit_risk_time_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(
                fields=['-timestamp', 'action'],
                name='audit_time_action_idx'
            ),
        ),
    ]
