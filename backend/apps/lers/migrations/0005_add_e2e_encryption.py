# Generated migration for E2E encryption in LERS messages

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lers', '0004_remove_lersrequest_idx_lers_sla_deadline_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='lersmessage',
            name='encrypted_content',
            field=models.TextField(
                blank=True,
                null=True,
                help_text='Encrypted message content (base64 encoded)'
            ),
        ),
        migrations.AddField(
            model_name='lersmessage',
            name='encrypted_key',
            field=models.TextField(
                blank=True,
                null=True,
                help_text='Encrypted symmetric key for decrypting message (base64 encoded)'
            ),
        ),
        migrations.AddField(
            model_name='lersmessage',
            name='encryption_algorithm',
            field=models.CharField(
                max_length=50,
                blank=True,
                null=True,
                help_text='Encryption algorithm used (e.g., AES-256-GCM)'
            ),
        ),
        migrations.AddField(
            model_name='lersmessage',
            name='encryption_iv',
            field=models.CharField(
                max_length=255,
                blank=True,
                null=True,
                help_text='Initialization vector for encryption (base64 encoded)'
            ),
        ),
        migrations.AddField(
            model_name='lersmessage',
            name='encryption_auth_tag',
            field=models.CharField(
                max_length=255,
                blank=True,
                null=True,
                help_text='Authentication tag for AES-GCM (base64 encoded)'
            ),
        ),
        migrations.AddField(
            model_name='lersmessage',
            name='sender_key_fingerprint',
            field=models.CharField(
                max_length=64,
                blank=True,
                null=True,
                help_text='Fingerprint of sender public key used for signing'
            ),
        ),
        migrations.AddField(
            model_name='lersmessage',
            name='is_encrypted',
            field=models.BooleanField(
                default=False,
                help_text='Whether this message is end-to-end encrypted'
            ),
        ),
    ]
