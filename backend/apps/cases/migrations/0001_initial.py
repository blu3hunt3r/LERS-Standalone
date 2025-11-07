# Generated migration for stub cases app in LERS Standalone
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tenants', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Case',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('case_number', models.CharField(max_length=100, unique=True)),
                ('ack_number', models.CharField(blank=True, max_length=100, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cases', to='tenants.tenant')),
            ],
            options={
                'verbose_name': 'Case (Stub)',
                'verbose_name_plural': 'Cases (Stub)',
                'db_table': 'cases_case',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='CaseTimeline',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(max_length=50)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='case_timeline_events', to=settings.AUTH_USER_MODEL)),
                ('case', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='timeline_events', to='cases.case')),
            ],
            options={
                'verbose_name': 'Case Timeline (Stub)',
                'verbose_name_plural': 'Case Timelines (Stub)',
                'db_table': 'cases_casetimeline',
                'ordering': ['-timestamp'],
            },
        ),
        migrations.CreateModel(
            name='CaseParticipant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(max_length=50)),
                ('case', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='participants', to='cases.case')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Case Participant (Stub)',
                'verbose_name_plural': 'Case Participants (Stub)',
                'db_table': 'cases_caseparticipant',
                'unique_together': {('case', 'user')},
            },
        ),
    ]
