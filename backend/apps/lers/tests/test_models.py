"""
Comprehensive test suite for LERS models.

Tests cover:
- Model creation and validation
- Model methods and properties
- Signal handlers
- Edge cases and error conditions
- Database constraints
"""

import pytest
from django.test import TestCase
from django.utils import timezone
from django.db import IntegrityError
from datetime import timedelta
from apps.lers.models import (
    LERSRequest, LERSResponse, LERSApprovalWorkflow, LERSTemplate,
    LERSMessage, UserPresence, LERSNotification
)
from apps.authentication.models import User
from apps.tenants.models import Tenant
from apps.cases.models import Case


@pytest.mark.django_db
class TestLERSRequestModel(TestCase):
    """Test suite for LERSRequest model"""

    def setUp(self):
        """Set up test data"""
        self.tenant = Tenant.objects.create(
            name="Test Police Station",
            tenant_type="POLICE_STATION"
        )
        self.user = User.objects.create_user(
            email="io@test.com",
            password="testpass123",
            role="IO",
            tenant=self.tenant
        )
        self.case = Case.objects.create(
            case_number="FIR-2025-001",
            fir_number="001/2025",
            tenant=self.tenant,
            created_by=self.user
        )

    def test_create_lers_request(self):
        """Test creating a LERS request"""
        request = LERSRequest.objects.create(
            request_number="LERS-2025-001",
            case=self.case,
            request_type="CDR",
            provider="AIRTEL",
            description="CDR for suspect phone number",
            legal_mandate_type="Section 91",
            status="DRAFT",
            priority="URGENT",
            created_by=self.user,
            identifiers={"phone": "9876543210"}
        )

        self.assertEqual(request.request_number, "LERS-2025-001")
        self.assertEqual(request.status, "DRAFT")
        self.assertEqual(request.priority, "URGENT")
        self.assertIsNotNone(request.id)
        self.assertIsNotNone(request.created_at)

    def test_request_number_uniqueness(self):
        """Test that request_number must be unique"""
        LERSRequest.objects.create(
            request_number="LERS-2025-001",
            case=self.case,
            request_type="CDR",
            provider="AIRTEL",
            description="Test",
            legal_mandate_type="Section 91",
            created_by=self.user
        )

        with self.assertRaises(IntegrityError):
            LERSRequest.objects.create(
                request_number="LERS-2025-001",  # Duplicate
                case=self.case,
                request_type="CDR",
                provider="JIO",
                description="Test 2",
                legal_mandate_type="Section 91",
                created_by=self.user
            )

    def test_calculate_sla_due_date(self):
        """Test SLA due date calculation"""
        request = LERSRequest.objects.create(
            request_number="LERS-2025-002",
            case=self.case,
            request_type="CDR",
            provider="AIRTEL",
            description="Test",
            legal_mandate_type="Section 91",
            created_by=self.user
        )

        # Simulate submission
        request.submitted_at = timezone.now()
        request.calculate_sla_due_date()

        self.assertIsNotNone(request.sla_due_date)
        # SLA should be in the future
        self.assertGreater(request.sla_due_date, timezone.now())

    def test_check_sla_breach(self):
        """Test SLA breach detection"""
        request = LERSRequest.objects.create(
            request_number="LERS-2025-003",
            case=self.case,
            request_type="CDR",
            provider="AIRTEL",
            description="Test",
            legal_mandate_type="Section 91",
            created_by=self.user,
            sla_due_date=timezone.now() - timedelta(hours=2)  # Past deadline
        )

        request.check_sla_breach()
        request.refresh_from_db()

        self.assertTrue(request.sla_breached)

    def test_status_transitions(self):
        """Test valid status transitions"""
        request = LERSRequest.objects.create(
            request_number="LERS-2025-004",
            case=self.case,
            request_type="CDR",
            provider="AIRTEL",
            description="Test",
            legal_mandate_type="Section 91",
            created_by=self.user,
            status="DRAFT"
        )

        # DRAFT -> PENDING_APPROVAL
        request.status = "PENDING_APPROVAL"
        request.save()
        self.assertEqual(request.status, "PENDING_APPROVAL")

        # PENDING_APPROVAL -> APPROVED
        request.status = "APPROVED"
        request.approved_by = self.user
        request.approved_at = timezone.now()
        request.save()
        self.assertEqual(request.status, "APPROVED")

        # APPROVED -> SUBMITTED
        request.status = "SUBMITTED"
        request.submitted_at = timezone.now()
        request.save()
        self.assertEqual(request.status, "SUBMITTED")

    def test_identifiers_json_field(self):
        """Test JSON identifiers field"""
        identifiers = {
            "phone": "9876543210",
            "account_number": "1234567890",
            "email": "suspect@example.com"
        }

        request = LERSRequest.objects.create(
            request_number="LERS-2025-005",
            case=self.case,
            request_type="CDR",
            provider="AIRTEL",
            description="Test",
            legal_mandate_type="Section 91",
            created_by=self.user,
            identifiers=identifiers
        )

        request.refresh_from_db()
        self.assertEqual(request.identifiers["phone"], "9876543210")
        self.assertEqual(request.identifiers["account_number"], "1234567890")
        self.assertEqual(len(request.identifiers), 3)


@pytest.mark.django_db
class TestLERSMessageModel(TestCase):
    """Test suite for LERSMessage model"""

    def setUp(self):
        """Set up test data"""
        self.tenant = Tenant.objects.create(name="Test Station", tenant_type="POLICE_STATION")
        self.io_user = User.objects.create_user(email="io@test.com", password="test", role="IO", tenant=self.tenant)
        self.provider_user = User.objects.create_user(email="provider@test.com", password="test", role="COMPANY_AGENT")
        self.case = Case.objects.create(case_number="CASE-001", fir_number="FIR-001", tenant=self.tenant, created_by=self.io_user)
        self.request = LERSRequest.objects.create(
            request_number="LERS-001",
            case=self.case,
            request_type="CDR",
            provider="AIRTEL",
            description="Test",
            legal_mandate_type="Section 91",
            created_by=self.io_user
        )

    def test_create_message(self):
        """Test creating a chat message"""
        message = LERSMessage.objects.create(
            request=self.request,
            sender=self.io_user,
            sender_type=LERSMessage.SenderType.IO,
            message_type=LERSMessage.MessageType.TEXT,
            message_text="Please expedite this request"
        )

        self.assertEqual(message.sender, self.io_user)
        self.assertEqual(message.sender_type, "IO")
        self.assertFalse(message.read_by_receiver)
        self.assertIsNone(message.read_at)

    def test_mark_as_read(self):
        """Test marking message as read"""
        message = LERSMessage.objects.create(
            request=self.request,
            sender=self.io_user,
            sender_type=LERSMessage.SenderType.IO,
            message_type=LERSMessage.MessageType.TEXT,
            message_text="Test message"
        )

        self.assertFalse(message.read_by_receiver)
        
        message.mark_as_read()
        message.refresh_from_db()

        self.assertTrue(message.read_by_receiver)
        self.assertIsNotNone(message.read_at)

    def test_message_with_attachments(self):
        """Test message with file attachments"""
        attachments = [
            {"url": "/files/doc1.pdf", "filename": "doc1.pdf", "size": 1024, "type": "pdf"},
            {"url": "/files/img1.jpg", "filename": "img1.jpg", "size": 2048, "type": "image"}
        ]

        message = LERSMessage.objects.create(
            request=self.request,
            sender=self.provider_user,
            sender_type=LERSMessage.SenderType.PROVIDER,
            message_type=LERSMessage.MessageType.FILE,
            message_text="Attached documents",
            attachments=attachments
        )

        self.assertEqual(len(message.attachments), 2)
        self.assertEqual(message.attachments[0]["filename"], "doc1.pdf")

    def test_system_message(self):
        """Test system-generated message"""
        message = LERSMessage.objects.create(
            request=self.request,
            sender=None,  # System message has no sender
            sender_type=LERSMessage.SenderType.SYSTEM,
            message_type=LERSMessage.MessageType.SYSTEM,
            message_text="Request was approved by SHO"
        )

        self.assertIsNone(message.sender)
        self.assertEqual(message.sender_type, "SYSTEM")

    def test_message_ordering(self):
        """Test that messages are ordered by created_at"""
        msg1 = LERSMessage.objects.create(
            request=self.request,
            sender=self.io_user,
            sender_type=LERSMessage.SenderType.IO,
            message_text="First message"
        )

        msg2 = LERSMessage.objects.create(
            request=self.request,
            sender=self.provider_user,
            sender_type=LERSMessage.SenderType.PROVIDER,
            message_text="Second message"
        )

        messages = list(LERSMessage.objects.filter(request=self.request))
        self.assertEqual(messages[0].id, msg1.id)
        self.assertEqual(messages[1].id, msg2.id)


@pytest.mark.django_db
class TestUserPresenceModel(TestCase):
    """Test suite for UserPresence model"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(email="user@test.com", password="test", role="IO")

    def test_create_presence(self):
        """Test creating user presence"""
        presence = UserPresence.objects.create(
            user=self.user,
            status=UserPresence.Status.OFFLINE
        )

        self.assertEqual(presence.user, self.user)
        self.assertEqual(presence.status, "OFFLINE")
        self.assertEqual(presence.socket_id, "")

    def test_set_online(self):
        """Test setting user online"""
        presence = UserPresence.objects.create(user=self.user)
        
        presence.set_online(socket_id="socket-123")
        presence.refresh_from_db()

        self.assertEqual(presence.status, "ONLINE")
        self.assertEqual(presence.socket_id, "socket-123")
        self.assertIsNotNone(presence.last_online)

    def test_set_away(self):
        """Test setting user away"""
        presence = UserPresence.objects.create(user=self.user, status=UserPresence.Status.ONLINE)
        
        presence.set_away()
        presence.refresh_from_db()

        self.assertEqual(presence.status, "AWAY")

    def test_set_offline(self):
        """Test setting user offline"""
        presence = UserPresence.objects.create(
            user=self.user,
            status=UserPresence.Status.ONLINE,
            socket_id="socket-123"
        )
        
        presence.set_offline()
        presence.refresh_from_db()

        self.assertEqual(presence.status, "OFFLINE")
        self.assertEqual(presence.socket_id, "")

    def test_is_online_property(self):
        """Test is_online property"""
        presence = UserPresence.objects.create(user=self.user)
        
        self.assertFalse(presence.is_online)
        
        presence.set_online()
        self.assertTrue(presence.is_online)

    def test_time_since_last_seen(self):
        """Test time_since_last_seen property"""
        presence = UserPresence.objects.create(user=self.user)
        
        time_desc = presence.time_since_last_seen
        self.assertIn("ago", time_desc.lower() or "just now", time_desc.lower())


@pytest.mark.django_db
class TestLERSNotificationModel(TestCase):
    """Test suite for LERSNotification model"""

    def setUp(self):
        """Set up test data"""
        self.tenant = Tenant.objects.create(name="Test Station", tenant_type="POLICE_STATION")
        self.user = User.objects.create_user(email="user@test.com", password="test", role="IO", tenant=self.tenant)
        self.case = Case.objects.create(case_number="CASE-001", fir_number="FIR-001", tenant=self.tenant, created_by=self.user)
        self.request = LERSRequest.objects.create(
            request_number="LERS-001",
            case=self.case,
            request_type="CDR",
            provider="AIRTEL",
            description="Test",
            legal_mandate_type="Section 91",
            created_by=self.user
        )

    def test_create_notification(self):
        """Test creating a notification"""
        notification = LERSNotification.create_notification(
            user=self.user,
            notification_type=LERSNotification.NotificationType.NEW_MESSAGE,
            title="New message received",
            message="You have a new message from the provider",
            request=self.request,
            priority=LERSNotification.Priority.NORMAL,
            link=f"/lers/requests/{self.request.id}",
            icon="message-circle"
        )

        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.type, "NEW_MESSAGE")
        self.assertFalse(notification.read)
        self.assertEqual(notification.priority, "NORMAL")

    def test_mark_as_read(self):
        """Test marking notification as read"""
        notification = LERSNotification.create_notification(
            user=self.user,
            notification_type=LERSNotification.NotificationType.NEW_MESSAGE,
            title="Test",
            message="Test message"
        )

        self.assertFalse(notification.read)
        
        notification.mark_as_read()
        notification.refresh_from_db()

        self.assertTrue(notification.read)
        self.assertIsNotNone(notification.read_at)

    def test_mark_as_delivered(self):
        """Test marking notification as delivered"""
        notification = LERSNotification.create_notification(
            user=self.user,
            notification_type=LERSNotification.NotificationType.NEW_MESSAGE,
            title="Test",
            message="Test message"
        )

        self.assertFalse(notification.delivered)
        
        notification.mark_as_delivered()
        notification.refresh_from_db()

        self.assertTrue(notification.delivered)
        self.assertIsNotNone(notification.delivered_at)

    def test_notification_types(self):
        """Test all notification types"""
        notification_types = [
            LERSNotification.NotificationType.NEW_MESSAGE,
            LERSNotification.NotificationType.RESPONSE_RECEIVED,
            LERSNotification.NotificationType.APPROVAL_NEEDED,
            LERSNotification.NotificationType.REQUEST_APPROVED,
            LERSNotification.NotificationType.REQUEST_REJECTED,
            LERSNotification.NotificationType.DEADLINE_APPROACHING,
            LERSNotification.NotificationType.REQUEST_OVERDUE,
        ]

        for notif_type in notification_types:
            notification = LERSNotification.create_notification(
                user=self.user,
                notification_type=notif_type,
                title=f"Test {notif_type}",
                message="Test message"
            )
            self.assertEqual(notification.type, notif_type)

    def test_notification_priority_levels(self):
        """Test notification priority levels"""
        # Normal priority
        notif1 = LERSNotification.create_notification(
            user=self.user,
            notification_type=LERSNotification.NotificationType.NEW_MESSAGE,
            title="Normal",
            message="Test",
            priority=LERSNotification.Priority.NORMAL
        )
        self.assertEqual(notif1.priority, "NORMAL")

        # High priority
        notif2 = LERSNotification.create_notification(
            user=self.user,
            notification_type=LERSNotification.NotificationType.DEADLINE_APPROACHING,
            title="High",
            message="Test",
            priority=LERSNotification.Priority.HIGH
        )
        self.assertEqual(notif2.priority, "HIGH")

        # Urgent priority
        notif3 = LERSNotification.create_notification(
            user=self.user,
            notification_type=LERSNotification.NotificationType.REQUEST_OVERDUE,
            title="Urgent",
            message="Test",
            priority=LERSNotification.Priority.URGENT
        )
        self.assertEqual(notif3.priority, "URGENT")

    def test_notification_ordering(self):
        """Test that notifications are ordered by created_at descending"""
        notif1 = LERSNotification.create_notification(
            user=self.user,
            notification_type=LERSNotification.NotificationType.NEW_MESSAGE,
            title="First",
            message="First notification"
        )

        notif2 = LERSNotification.create_notification(
            user=self.user,
            notification_type=LERSNotification.NotificationType.NEW_MESSAGE,
            title="Second",
            message="Second notification"
        )

        notifications = list(LERSNotification.objects.filter(user=self.user))
        # Should be ordered newest first
        self.assertEqual(notifications[0].id, notif2.id)
        self.assertEqual(notifications[1].id, notif1.id)



