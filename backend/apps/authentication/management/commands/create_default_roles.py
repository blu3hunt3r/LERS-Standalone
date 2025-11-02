"""
Management command to create default users and tenants for testing.
"""
from django.core.management.base import BaseCommand
from apps.authentication.models import User
from apps.tenants.models import Tenant
from django.db import transaction


class Command(BaseCommand):
    help = 'Create default roles, tenants, and sample users'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('Creating default setup...')
        
        # Create police station tenant
        police_station, _ = Tenant.objects.get_or_create(
            code='PS001',
            defaults={
                'name': 'Cyber Crime Police Station - Mumbai',
                'tenant_type': 'POLICE_STATION',
                'state': 'Maharashtra',
                'district': 'Mumbai',
                'email': 'station001@police.gov.in',
                'phone': '+912212345678'
            }
        )
        self.stdout.write(f'Police station: {police_station.name}')
        
        # Create company tenant (HDFC Bank)
        hdfc_bank, _ = Tenant.objects.get_or_create(
            code='HDFC',
            defaults={
                'name': 'HDFC Bank',
                'tenant_type': 'COMPANY',
                'company_type': 'Bank',
                'email': 'lers@hdfcbank.com',
                'registration_number': 'HDFC001'
            }
        )
        self.stdout.write(f'Company: {hdfc_bank.name}')
        
        # Create police users
        io_user, created = User.objects.get_or_create(
            email='io@station001.police.in',
            defaults={
                'username': 'io001',
                'full_name': 'Inspector Rajesh Kumar',
                'role': 'IO',
                'tenant': police_station,
                'is_active': True,
                'is_verified': True,
                'employee_id': 'IO001',
                'designation': 'Inspector'
            }
        )
        if created:
            io_user.set_password('TestPass123!')
            io_user.save()
            self.stdout.write(f'✅ Created IO: {io_user.email}')
        
        approver_user, created = User.objects.get_or_create(
            email='sp@station001.police.in',
            defaults={
                'username': 'sp001',
                'full_name': 'Superintendent Priya Sharma',
                'role': 'APPROVER',
                'tenant': police_station,
                'is_active': True,
                'is_verified': True,
                'employee_id': 'SP001',
                'designation': 'Superintendent'
            }
        )
        if created:
            approver_user.set_password('TestPass123!')
            approver_user.save()
            self.stdout.write(f'✅ Created Approver: {approver_user.email}')
        
        # Create company user
        company_agent, created = User.objects.get_or_create(
            email='agent@hdfc.com',
            defaults={
                'username': 'hdfc_agent',
                'full_name': 'HDFC LERS Agent',
                'role': 'COMPANY_AGENT',
                'tenant': hdfc_bank,
                'is_active': True,
                'is_verified': True
            }
        )
        if created:
            company_agent.set_password('TestPass123!')
            company_agent.save()
            self.stdout.write(f'✅ Created Company Agent: {company_agent.email}')
        
        self.stdout.write(self.style.SUCCESS('\n✅ Default setup complete!'))
        self.stdout.write('\nYou can now login with:')
        self.stdout.write('  IO: io@station001.police.in / TestPass123!')
        self.stdout.write('  Approver: sp@station001.police.in / TestPass123!')
        self.stdout.write('  Company: agent@hdfc.com / TestPass123!')

