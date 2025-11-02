"""
Migration to add Multi-Factor Authentication fields.

Feature 11: MFA/2FA Implementation
- Backup codes for account recovery
- Setup timestamp tracking
- Last verification timestamp
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='mfa_backup_codes',
            field=models.JSONField(
                blank=True,
                null=True,
                default=list,
                help_text='Hashed backup codes for account recovery'
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='mfa_setup_at',
            field=models.DateTimeField(
                blank=True,
                help_text='When MFA was first enabled',
                null=True
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='mfa_last_verified_at',
            field=models.DateTimeField(
                blank=True,
                help_text='Last successful MFA verification',
                null=True
            ),
        ),
    ]
