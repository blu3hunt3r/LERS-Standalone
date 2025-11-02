# Generated migration for E2E encryption keys

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0004_add_performance_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='public_key',
            field=models.TextField(
                blank=True,
                null=True,
                help_text='RSA public key for E2E encryption (PEM format)'
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='public_key_fingerprint',
            field=models.CharField(
                max_length=64,
                blank=True,
                null=True,
                db_index=True,
                help_text='SHA-256 fingerprint of public key for verification'
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='key_created_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='When the encryption key pair was generated'
            ),
        ),
    ]
