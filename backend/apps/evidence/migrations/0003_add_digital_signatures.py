"""
Migration to add digital signature fields to EvidenceFile and CourtBundle.

Feature 6: Signature Verification System
- Adds RSA-4096 digital signatures to evidence files
- Adds Ed25519 signatures to court bundles
- Adds signature verification tracking fields
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('evidence', '0002_initial'),
    ]

    operations = [
        # Add signature fields to EvidenceFile
        migrations.AddField(
            model_name='evidencefile',
            name='digital_signature',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='RSA-4096 digital signature for evidence integrity'
            ),
        ),
        migrations.AddField(
            model_name='evidencefile',
            name='signature_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='evidencefile',
            name='last_signature_check',
            field=models.DateTimeField(blank=True, null=True),
        ),

        # Update CourtBundle manifest_signature to JSONField
        migrations.AlterField(
            model_name='courtbundle',
            name='manifest_signature',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Ed25519 digital signature for bundle manifest'
            ),
        ),

        # Add signature algorithm field to CourtBundle
        migrations.AddField(
            model_name='courtbundle',
            name='signature_algorithm',
            field=models.CharField(
                blank=True,
                default='Ed25519',
                max_length=50
            ),
        ),

        # Add signature verification tracking to CourtBundle
        migrations.AddField(
            model_name='courtbundle',
            name='signature_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='courtbundle',
            name='signed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),

        # Add indexes for signature verification queries
        migrations.AddIndex(
            model_name='evidencefile',
            index=models.Index(
                fields=['signature_verified', '-last_signature_check'],
                name='evidence_sig_verified_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='courtbundle',
            index=models.Index(
                fields=['signature_verified', '-signed_at'],
                name='bundle_sig_verified_idx'
            ),
        ),
    ]
