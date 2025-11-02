"""
Management command to monitor SLA breaches and send notifications.

Run periodically via cron:
*/15 * * * * cd /app && python manage.py monitor_sla_breaches
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from apps.lers.models import LERSRequest, LERSNotification
from datetime import timedelta


class Command(BaseCommand):
    help = 'Monitor SLA deadlines and send breach notifications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be notified without actually sending'
        )
        parser.add_argument(
            '--warning-hours',
            type=int,
            default=2,
            help='Send warning notifications X hours before SLA breach (default: 2)'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        warning_hours = options['warning_hours']
        now = timezone.now()
        warning_threshold = now + timedelta(hours=warning_hours)

        self.stdout.write(self.style.WARNING(f'\n🔍 SLA Monitor Running at {now.strftime("%Y-%m-%d %H:%M:%S")}'))
        self.stdout.write(f'Warning threshold: {warning_hours} hours before deadline\n')

        # ====================
        # 1. Check for breached SLAs
        # ====================
        breached_requests = LERSRequest.objects.filter(
            sla_due_date__lt=now,
            sla_breached=False,
            status__in=['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS']
        ).select_related('created_by', 'case')

        breach_count = breached_requests.count()
        self.stdout.write(f'📛 Found {breach_count} SLA breached request(s)')

        for request in breached_requests:
            hours_overdue = int((now - request.sla_due_date).total_seconds() / 3600)

            if dry_run:
                self.stdout.write(
                    f'  [DRY RUN] Would mark {request.request_number} as breached '
                    f'({hours_overdue}h overdue)'
                )
            else:
                # Mark as breached
                request.sla_breached = True
                request.save(update_fields=['sla_breached', 'updated_at'])

                # Notify IO
                if request.created_by:
                    LERSNotification.create_notification(
                        user=request.created_by,
                        notification_type=LERSNotification.NotificationType.REQUEST_OVERDUE,
                        title=f'⚠️ SLA Breach: {request.request_number}',
                        message=f'Request is overdue by {hours_overdue} hours. '
                                f'Provider: {request.provider}. Immediate action required.',
                        request=request,
                        priority=LERSNotification.Priority.URGENT,
                        link=f'/lers/requests/{request.id}',
                        icon='alert-triangle'
                    )

                    self.stdout.write(
                        self.style.ERROR(
                            f'  ✅ Marked {request.request_number} as breached '
                            f'and notified {request.created_by.email}'
                        )
                    )

        # ====================
        # 2. Check for approaching deadlines (warnings)
        # ====================
        warning_requests = LERSRequest.objects.filter(
            sla_due_date__lt=warning_threshold,
            sla_due_date__gt=now,
            sla_breach_notified=False,  # Only notify once
            status__in=['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS']
        ).select_related('created_by', 'case')

        warning_count = warning_requests.count()
        self.stdout.write(f'\n⚠️  Found {warning_count} approaching deadline(s)')

        for request in warning_requests:
            hours_remaining = int((request.sla_due_date - now).total_seconds() / 3600)
            minutes_remaining = int(((request.sla_due_date - now).total_seconds() % 3600) / 60)

            if dry_run:
                self.stdout.write(
                    f'  [DRY RUN] Would warn about {request.request_number} '
                    f'({hours_remaining}h {minutes_remaining}m remaining)'
                )
            else:
                # Mark as notified to prevent spam
                request.sla_breach_notified = True
                request.save(update_fields=['sla_breach_notified', 'updated_at'])

                # Notify IO
                if request.created_by:
                    LERSNotification.create_notification(
                        user=request.created_by,
                        notification_type=LERSNotification.NotificationType.DEADLINE_APPROACHING,
                        title=f'⏰ Deadline Approaching: {request.request_number}',
                        message=f'SLA deadline in {hours_remaining}h {minutes_remaining}m. '
                                f'Provider: {request.provider}. Please follow up.',
                        request=request,
                        priority=LERSNotification.Priority.HIGH,
                        link=f'/lers/requests/{request.id}',
                        icon='clock'
                    )

                    self.stdout.write(
                        self.style.WARNING(
                            f'  ✅ Sent warning for {request.request_number} to {request.created_by.email}'
                        )
                    )

        # ====================
        # 3. Summary
        # ====================
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(f'✅ SLA Monitor Complete'))
        self.stdout.write(f'   - Breached: {breach_count}')
        self.stdout.write(f'   - Warnings: {warning_count}')
        if dry_run:
            self.stdout.write(self.style.WARNING('   - [DRY RUN] No changes made'))
        self.stdout.write('='*60 + '\n')

        # ====================
        # 4. Check for completed requests that beat SLA
        # ====================
        recently_completed = LERSRequest.objects.filter(
            status='COMPLETED',
            completed_at__gte=now - timedelta(hours=24),  # Last 24 hours
            sla_breached=False
        ).select_related('created_by')

        if recently_completed.count() > 0:
            self.stdout.write(f'\n🎉 {recently_completed.count()} request(s) completed within SLA (last 24h)')
            for req in recently_completed[:5]:  # Show first 5
                self.stdout.write(f'  - {req.request_number} ({req.provider})')



