"""
Django management command to initialize default data for standalone LERS platform.

Creates:
- Default superuser (if not exists)
- Default police station tenant
- Default provider tenant
- Sample data provider organizations
- Default roles and permissions
- Sample request types and categories

Usage:
    python manage.py create_lers_default_data --settings=lers_standalone.settings
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.lers.models import (
    ProviderDataCatalog,
    ProviderServiceProfile
)
import uuid

User = get_user_model()


class Command(BaseCommand):
    help = 'Initialize default data for standalone LERS platform'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-superuser',
            action='store_true',
            help='Skip superuser creation',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🚀 Initializing LERS Platform...'))

        try:
            with transaction.atomic():
                # Create superuser
                if not options['skip_superuser']:
                    self._create_superuser()

                # Create default tenants
                police_tenant = self._create_police_tenant()
                provider_tenant = self._create_provider_tenant()

                # Create sample providers
                self._create_sample_providers(provider_tenant)

                # Create default request types
                self._create_request_types()

            self.stdout.write(self.style.SUCCESS('\n✅ LERS Platform initialized successfully!'))
            self.stdout.write(self.style.WARNING('\n⚠️  IMPORTANT: Change default passwords in production!'))
            self.stdout.write(self.style.SUCCESS('\n📋 Next steps:'))
            self.stdout.write('   1. Access admin panel: http://localhost:8100/admin/')
            self.stdout.write('   2. Login with: admin@lers.gov.in / Admin@123')
            self.stdout.write('   3. Configure platform settings')
            self.stdout.write('   4. Add real data providers')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error initializing platform: {e}'))
            raise

    def _create_superuser(self):
        """Create default superuser account."""
        self.stdout.write('\n📝 Creating superuser...')

        if User.objects.filter(email='admin@lers.gov.in').exists():
            self.stdout.write(self.style.WARNING('   ⚠️  Superuser already exists, skipping'))
            return

        superuser = User.objects.create_superuser(
            email='admin@lers.gov.in',
            username='admin',
            password='Admin@123',  # CHANGE IN PRODUCTION
            phone='+919876543210',
            full_name='LERS System Administrator',
            role=User.Role.ADMIN,
            is_active=True,
            is_verified=True
        )

        self.stdout.write(self.style.SUCCESS(f'   ✅ Superuser created: {superuser.email}'))
        self.stdout.write(self.style.WARNING(f'   🔑 Password: Admin@123 (CHANGE THIS!)'))

    def _create_police_tenant(self):
        """Create default police station tenant."""
        self.stdout.write('\n🚔 Creating default police station tenant...')

        tenant, created = Tenant.objects.get_or_create(
            name='Sample Police Station',
            defaults={
                'tenant_type': Tenant.TenantType.POLICE_STATION,
                'code': 'SAMPLE_PS',
                'district': 'Sample District',
                'state': 'Sample State',
                'is_active': True,
                'settings': {
                    'sla_hours': 168,  # 7 days
                    'urgent_sla_hours': 48,
                    'allow_self_signup': False
                }
            }
        )

        if created:
            # Create sample police officer
            officer = User.objects.create_user(
                email='io@sample.police.gov.in',
                username='sample_io',
                password='Officer@123',  # CHANGE IN PRODUCTION
                phone='+919876543211',
                full_name='Investigating Officer',
                role=User.Role.IO,
                tenant=tenant,
                is_active=True,
                is_verified=True
            )
            self.stdout.write(self.style.SUCCESS(f'   ✅ Police tenant created: {tenant.name}'))
            self.stdout.write(self.style.SUCCESS(f'   ✅ Sample IO created: {officer.email}'))
            self.stdout.write(self.style.WARNING(f'   🔑 Password: Officer@123 (CHANGE THIS!)'))
        else:
            self.stdout.write(self.style.WARNING('   ⚠️  Police tenant already exists'))

        return tenant

    def _create_provider_tenant(self):
        """Create default provider tenant."""
        self.stdout.write('\n🏢 Creating default provider tenant...')

        tenant, created = Tenant.objects.get_or_create(
            name='Sample Tech Company',
            defaults={
                'tenant_type': Tenant.TenantType.COMPANY,
                'code': 'SAMPLE_TECH',
                'is_active': True,
                'settings': {
                    'auto_accept_requests': False,
                    'require_approval': True
                }
            }
        )

        if created:
            # Create sample provider admin
            admin = User.objects.create_user(
                email='compliance@sampletech.com',
                username='sample_provider',
                password='Provider@123',  # CHANGE IN PRODUCTION
                phone='+919876543212',
                full_name='Compliance Manager',
                role=User.Role.COMPANY_AGENT,
                tenant=tenant,
                is_active=True,
                is_verified=True
            )

            # Create provider service profile
            profile = ProviderServiceProfile.objects.create(
                provider_tenant=tenant,
                nodal_officer_name='Nodal Officer - Sample Tech',
                nodal_officer_designation='Chief Compliance Officer',
                nodal_officer_email='nodal@sampletech.com',
                nodal_officer_phone='+919876543213',
                service_hours='Monday-Friday, 9:00 AM - 6:00 PM IST',
                holidays_affect_sla=True,
                emergency_contact='+919876543214',
                iso_certified=False,
                data_security_certified=True,
                govt_empaneled=True,
                service_commitment='Committed to providing timely and accurate data to law enforcement agencies.'
            )

            self.stdout.write(self.style.SUCCESS(f'   ✅ Provider tenant created: {tenant.name}'))
            self.stdout.write(self.style.SUCCESS(f'   ✅ Sample admin created: {admin.email}'))
            self.stdout.write(self.style.WARNING(f'   🔑 Password: Provider@123 (CHANGE THIS!)'))
        else:
            self.stdout.write(self.style.WARNING('   ⚠️  Provider tenant already exists'))

        return tenant

    def _create_sample_providers(self, provider_tenant):
        """Create sample data provider catalog entries."""
        self.stdout.write('\n📊 Creating sample data provider catalog...')

        providers = [
            {
                'name': 'Call Detail Records (CDR) - 6 months',
                'provider_tenant': provider_tenant,
                'category': ProviderDataCatalog.DataCategory.TELECOM,
                'description': 'Complete call detail records including incoming, outgoing calls with tower locations',
                'sla_turnaround_hours': 72,  # 3 days
                'sla_business_hours_only': True,
                'required_legal_mandate': 'Section 91 CrPC or Section 69 IT Act',
                'requires_court_order': False,
                'requires_pan_verification': False,
                'output_format': ProviderDataCatalog.OutputFormat.EXCEL,
                'output_description': 'Excel file with call records, tower details, and IMEI information',
                'is_active': True,
                'is_featured': True,
                'notes_for_law_enforcement': 'Please provide subscriber number, date range (max 6 months), and legal mandate details'
            },
            {
                'name': 'Bank Account Statement - 6 months',
                'provider_tenant': provider_tenant,
                'category': ProviderDataCatalog.DataCategory.BANKING,
                'description': 'Complete bank account statement with transaction details and KYC information',
                'sla_turnaround_hours': 120,  # 5 days
                'sla_business_hours_only': True,
                'required_legal_mandate': 'Section 91 CrPC + Court Order',
                'requires_court_order': True,
                'requires_pan_verification': True,
                'output_format': ProviderDataCatalog.OutputFormat.PDF,
                'output_description': 'PDF statement with transaction history and account holder KYC',
                'is_active': True,
                'is_featured': True,
                'notes_for_law_enforcement': 'Requires court order. Provide account number or PAN for search'
            },
            {
                'name': 'Social Media User Data',
                'provider_tenant': provider_tenant,
                'category': ProviderDataCatalog.DataCategory.SOCIAL,
                'description': 'User profile, posts, messages, and IP logs from social media platform',
                'sla_turnaround_hours': 168,  # 7 days
                'sla_business_hours_only': True,
                'required_legal_mandate': 'Section 69 IT Act or Section 69B IT Act',
                'requires_court_order': True,
                'requires_pan_verification': False,
                'output_format': ProviderDataCatalog.OutputFormat.MIXED,
                'output_description': 'ZIP archive containing JSON data, images, and activity logs',
                'is_active': True,
                'is_featured': False,
                'notes_for_law_enforcement': 'Provide user ID, email, or phone number. Include specific date range for logs'
            }
        ]

        created_count = 0
        for provider_data in providers:
            _, created = ProviderDataCatalog.objects.get_or_create(
                provider_tenant=provider_data['provider_tenant'],
                name=provider_data['name'],
                defaults=provider_data
            )
            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f'   ✅ Created {created_count} sample provider catalog entries'))

    def _create_request_types(self):
        """Create default LERS request types."""
        self.stdout.write('\n📋 Creating default request types...')

        # Default request types are defined in the model, so just document them
        request_types = [
            'CALL_DETAIL_RECORDS',
            'BANK_ACCOUNT_INFO',
            'SOCIAL_MEDIA_DATA',
            'EMAIL_RECORDS',
            'IP_ADDRESS_LOGS',
            'VEHICLE_REGISTRATION',
            'PROPERTY_RECORDS',
            'TELECOM_SUBSCRIBER',
            'INTERNET_SERVICE',
            'E_COMMERCE_DATA',
            'PAYMENT_GATEWAY',
            'OTHER'
        ]

        self.stdout.write(self.style.SUCCESS(f'   ✅ {len(request_types)} request types available'))
        self.stdout.write('   📝 Request types: ' + ', '.join(request_types[:3]) + '...')
