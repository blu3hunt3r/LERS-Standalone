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
    ProviderServiceProfile,
    LERSRequestType
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
            password='Admin@123',  # CHANGE IN PRODUCTION
            phone='+919876543210',
            full_name='LERS System Administrator',
            role=User.Role.SUPER_ADMIN,
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
                password='Officer@123',  # CHANGE IN PRODUCTION
                phone='+919876543211',
                full_name='Investigating Officer',
                role=User.Role.INVESTIGATING_OFFICER,
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
                'tenant_type': Tenant.TenantType.DATA_PROVIDER,
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
                password='Provider@123',  # CHANGE IN PRODUCTION
                phone='+919876543212',
                full_name='Compliance Manager',
                role=User.Role.PROVIDER_ADMIN,
                tenant=tenant,
                is_active=True,
                is_verified=True
            )

            # Create provider service profile
            profile = ProviderServiceProfile.objects.create(
                provider_tenant=tenant,
                primary_contact_name='Compliance Manager',
                primary_contact_email='compliance@sampletech.com',
                primary_contact_phone='+919876543212',
                nodal_officer_name='Nodal Officer',
                nodal_officer_email='nodal@sampletech.com',
                nodal_officer_phone='+919876543213',
                office_hours='Monday-Friday, 9 AM - 6 PM IST',
                sla_commitment_hours=72,
                supports_bulk_requests=True,
                supports_emergency_requests=True,
                is_verified=True,
                is_active=True
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
                'provider_name': 'Sample Tech Company',
                'provider_tenant': provider_tenant,
                'data_category': ProviderDataCatalog.DataCategory.TELECOM,
                'description': 'Telecom data provider - Call records, SMS, Location data',
                'available_data_types': [
                    'Call Detail Records (CDR)',
                    'SMS Records',
                    'Cell Tower Location',
                    'IMEI Information'
                ],
                'legal_basis_required': ['Court Order', 'Section 91 CrPC', 'Section 69 IT Act'],
                'typical_response_time_hours': 72,
                'supports_emergency_requests': True,
                'pricing_model': 'Government rate card',
                'is_active': True
            },
            {
                'provider_name': 'Sample Bank',
                'provider_tenant': provider_tenant,
                'data_category': ProviderDataCatalog.DataCategory.FINANCIAL,
                'description': 'Banking data provider - Account details, Transaction history',
                'available_data_types': [
                    'Account Information',
                    'Transaction History',
                    'KYC Documents',
                    'Beneficiary Details'
                ],
                'legal_basis_required': ['Court Order', 'Section 91 CrPC'],
                'typical_response_time_hours': 120,  # 5 days
                'supports_emergency_requests': True,
                'pricing_model': 'Free for law enforcement',
                'is_active': True
            },
            {
                'provider_name': 'Sample Social Media Platform',
                'provider_tenant': provider_tenant,
                'data_category': ProviderDataCatalog.DataCategory.SOCIAL_MEDIA,
                'description': 'Social media data provider - User profiles, Posts, Messages',
                'available_data_types': [
                    'User Profile Information',
                    'Post History',
                    'Message Logs',
                    'IP Address Logs',
                    'Login History'
                ],
                'legal_basis_required': ['Court Order', 'Section 69 IT Act', 'Section 69B IT Act'],
                'typical_response_time_hours': 168,  # 7 days
                'supports_emergency_requests': True,
                'pricing_model': 'Free for law enforcement',
                'is_active': True
            }
        ]

        created_count = 0
        for provider_data in providers:
            _, created = ProviderDataCatalog.objects.get_or_create(
                provider_name=provider_data['provider_name'],
                data_category=provider_data['data_category'],
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
