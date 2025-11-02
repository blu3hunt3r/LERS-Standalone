"""
Feature 2 (Phase 4): Database Indexing Strategy

Add composite indexes for common evidence query patterns.

Indexes added:
- Composite index on (case_id, file_type) for filtered evidence queries
- Composite index on (uploaded_by_id, created_at) for user activity tracking
- Index on sha256_hash already exists, verify it's being used
- Composite index on (case_id, legal_hold) for legal hold queries
- Composite index on (parsed, file_type) for data extraction pipeline
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('evidence', '0003_add_digital_signatures'),
    ]

    operations = [
        # Composite index for case + file_type filtering
        migrations.AddIndex(
            model_name='evidencefile',
            index=models.Index(
                fields=['case', 'file_type'],
                name='idx_evidence_case_type'
            ),
        ),
        # Composite index for user upload history
        migrations.AddIndex(
            model_name='evidencefile',
            index=models.Index(
                fields=['uploaded_by', '-created_at'],
                name='idx_evidence_uploader_date'
            ),
        ),
        # Index on legal_hold for compliance queries
        migrations.AddIndex(
            model_name='evidencefile',
            index=models.Index(
                fields=['legal_hold'],
                name='idx_evidence_legal_hold',
                condition=models.Q(legal_hold=True)
            ),
        ),
        # Composite index for data extraction pipeline queries
        migrations.AddIndex(
            model_name='evidencefile',
            index=models.Index(
                fields=['parsed', 'file_type'],
                name='idx_evidence_parsed_type'
            ),
        ),
        # Composite index for case evidence dashboard
        migrations.AddIndex(
            model_name='evidencefile',
            index=models.Index(
                fields=['case', 'source', '-created_at'],
                name='idx_evidence_case_source'
            ),
        ),
    ]
