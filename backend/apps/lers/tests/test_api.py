"""
Comprehensive API endpoint tests for LERS system.

Tests cover:
- Authentication and permissions
- CRUD operations
- Filtering and pagination
- Error handling
- Edge cases
"""

import pytest
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from apps.lers.models import (
    LERSRequest, LERSMessage, UserPresence, LERSNotification
)
from apps.authentication.models import User
from apps.tenants.models import Tenant
from apps.cases.models import Case


@pytest.mark.django_db
class TestLERSRequestAPI(TestCase):
    """Test LERS Request API endpoints"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.tenant = Tenant.objects.create(name="Test Station", tenant_type="POLICE_STATION")
        self.io_user = User.objects.create_user(
            email="io@test.com",
            password="testpass123",
            role="IO",
            tenant=self.tenant
        )
        self.approver_user = User.objects.create_user(
            email="approver@test.com",
            password="testpass123",
            role="SHO",
            tenant=self.tenant
        )
        self.case = Case.objects.create(
            case_number="CASE-001",
            fir_number="FIR-001",
            tenant=self.tenant,
            created_by=self.io_user
        )

    def test_create_lers_request_authenticated(self):
        """Test creating LERS request with authentication"""
        self.client.force_authenticate(user=self.io_user)
        
        data = {
            "case": str(self.case.id),
            "request_type": "CDR",
            "provider": "AIRTEL",
            "description": "CDR for suspect phone",
            "legal_mandate_type": "Section 91",
            "priority": "URGENT",
            "identifiers": {"phone": "9876543210"}
        }

        response = self.client.post('/api/investigation/lers/requests/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('request_number', response.data)
        self.assertEqual(response.data['status'], 'DRAFT')

    def test_create_lers_request_unauthenticated(self):
        """Test that unauthenticated users cannot create requests"""
        data = {
            "case": str(self.case.id),
            "request_type": "CDR",
            "provider": "AIRTEL",
            "description": "Test",
            "legal_mandate_type": "Section 91"
        }

        response = self.client.post('/api/investigation/lers/requests/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_lers_requests(self):
        """Test listing LERS requests"""
        self.client.force_authenticate(user=self.io_user)
        
        # Create test requests
        for i in range(3):
            LERSRequest.objects.create(
                request_number=f"LERS-2025-00{i+1}",
                case=self.case,
                request_type="CDR",
                provider="AIRTEL",
                description=f"Test {i}",
                legal_mandate_type="Section 91",
                created_by=self.io_user
            )

        response = self.client.get('/api/investigation/lers/requests/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)

    def test_get_single_lers_request(self):
        """Test retrieving a single LERS request"""
        self.client.force_authenticate(user=self.io_user)
        
        request = LERSRequest.objects.create(
            request_number="LERS-2025-001",
            case=self.case,
            request_type="CDR",
            provider="AIRTEL",
            description="Test",
            legal_mandate_type="Section 91",
            created_by=self.io_user
        )

        response = self.client.get(f'/api/investigation/lers/requests/{request.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['request_number'], "LERS-2025-001")

    def test_update_lers_request(self):
        """Test updating LERS request"""
        self.client.force_authenticate(user=self.io_user)
        
        request = LERSRequest.objects.create(
            request_number="LERS-2025-001",
            case=self.case,
            request_type="CDR",
            provider="AIRTEL",
            description="Original description",
            legal_mandate_type="Section 91",
            created_by=self.io_user
        )

        data = {"description": "Updated description"}
        response = self.client.patch(f'/api/investigation/lers/requests/{request.id}/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['description'], "Updated description")

    def test_filter_by_status(self):
        """Test filtering requests by status"""
        self.client.force_authenticate(user=self.io_user)
        
        LERSRequest.objects.create(
            request_number="LERS-001",
            case=self.case,
            request_type="CDR",
            provider="AIRTEL",
            description="Draft",
            legal_mandate_type="Section 91",
            created_by=self.io_user,
            status="DRAFT"
        )
        
        LERSRequest.objects.create(
            request_number="LERS-002",
            case=self.case,
            request_type="CDR",
            provider="AIRTEL",
            description="Approved",
            legal_mandate_type="Section 91",
            created_by=self.io_user,
            status="APPROVED"
        )

        response = self.client.get('/api/investigation/lers/requests/?status=DRAFT')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['status'], 'DRAFT')

    def test_filter_by_priority(self):
        """Test filtering requests by priority"""
        self.client.force_authenticate(user=self.io_user)
        
        LERSRequest.objects.create(
            request_number="LERS-001",
            case=self.case,
            request_type="CDR",
            provider="AIRTEL",
            description="Urgent",
            legal_mandate_type="Section 91",
            created_by=self.io_user,
            priority="URGENT"
        )
        
        LERSRequest.objects.create(
            request_number="LERS-002",
            case=self.case,
            request_type="CDR",
            provider="AIRTEL",
            description="Normal",
            legal_mandate_type="Section 91",
            created_by=self.io_user,
            priority="NORMAL"
        )

        response = self.client.get('/api/investigation/lers/requests/?priority=URGENT')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['priority'], 'URGENT')


@pytest.mark.django_db
class TestLERSMessageAPI(TestCase):
    """Test LERS Message API endpoints"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
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

    def test_get_messages(self):
        """Test retrieving messages for a request"""
        self.client.force_authenticate(user=self.io_user)
        
        # Create test messages
        LERSMessage.objects.create(
            request=self.request,
            sender=self.io_user,
            sender_type=LERSMessage.SenderType.IO,
            message_text="Message 1"
        )
        LERSMessage.objects.create(
            request=self.request,
            sender=self.provider_user,
            sender_type=LERSMessage.SenderType.PROVIDER,
            message_text="Message 2"
        )

        response = self.client.get(f'/api/investigation/lers/requests/{self.request.id}/messages/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_messages'], 2)
        self.assertEqual(len(response.data['messages']), 2)

    def test_send_message(self):
        """Test sending a message"""
        self.client.force_authenticate(user=self.io_user)
        
        data = {
            "message_type": "TEXT",
            "message_text": "Please expedite this request"
        }

        response = self.client.post(f'/api/investigation/lers/requests/{self.request.id}/messages/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message_text'], "Please expedite this request")
        self.assertEqual(response.data['sender_type'], "IO")

    def test_mark_messages_as_read(self):
        """Test auto-marking messages as read when retrieved"""
        self.client.force_authenticate(user=self.io_user)
        
        # Create unread message from provider
        message = LERSMessage.objects.create(
            request=self.request,
            sender=self.provider_user,
            sender_type=LERSMessage.SenderType.PROVIDER,
            message_text="Response from provider",
            read_by_receiver=False
        )

        self.assertFalse(message.read_by_receiver)
        
        # Get messages (should mark as read)
        response = self.client.get(f'/api/investigation/lers/requests/{self.request.id}/messages/')
        
        message.refresh_from_db()
        self.assertTrue(message.read_by_receiver)


@pytest.mark.django_db
class TestNotificationAPI(TestCase):
    """Test Notification API endpoints"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(email="user@test.com", password="test", role="IO")

    def test_get_notifications(self):
        """Test retrieving notifications"""
        self.client.force_authenticate(user=self.user)
        
        # Create test notifications
        for i in range(3):
            LERSNotification.create_notification(
                user=self.user,
                notification_type=LERSNotification.NotificationType.NEW_MESSAGE,
                title=f"Notification {i+1}",
                message="Test message"
            )

        response = self.client.get('/api/investigation/lers/requests/notifications/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 3)
        self.assertEqual(len(response.data['notifications']), 3)

    def test_get_unread_count(self):
        """Test getting unread notification count"""
        self.client.force_authenticate(user=self.user)
        
        # Create 2 unread, 1 read
        LERSNotification.create_notification(
            user=self.user,
            notification_type=LERSNotification.NotificationType.NEW_MESSAGE,
            title="Unread 1",
            message="Test"
        )
        LERSNotification.create_notification(
            user=self.user,
            notification_type=LERSNotification.NotificationType.NEW_MESSAGE,
            title="Unread 2",
            message="Test"
        )
        notif = LERSNotification.create_notification(
            user=self.user,
            notification_type=LERSNotification.NotificationType.NEW_MESSAGE,
            title="Read",
            message="Test"
        )
        notif.mark_as_read()

        response = self.client.get('/api/investigation/lers/requests/notifications/unread-count/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 2)

    def test_mark_notification_read(self):
        """Test marking a notification as read"""
        self.client.force_authenticate(user=self.user)
        
        notification = LERSNotification.create_notification(
            user=self.user,
            notification_type=LERSNotification.NotificationType.NEW_MESSAGE,
            title="Test",
            message="Test message"
        )

        self.assertFalse(notification.read)
        
        response = self.client.post(f'/api/investigation/lers/requests/notifications/{notification.id}/mark-read/')
        
        self.assertEqual(response.status.HTTP_200_OK)
        
        notification.refresh_from_db()
        self.assertTrue(notification.read)

    def test_mark_all_notifications_read(self):
        """Test marking all notifications as read"""
        self.client.force_authenticate(user=self.user)
        
        # Create multiple unread notifications
        for i in range(5):
            LERSNotification.create_notification(
                user=self.user,
                notification_type=LERSNotification.NotificationType.NEW_MESSAGE,
                title=f"Notification {i+1}",
                message="Test"
            )

        response = self.client.post('/api/investigation/lers/requests/notifications/mark-all-read/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['marked_read'], 5)
        
        # Verify all are marked read
        unread_count = LERSNotification.objects.filter(user=self.user, read=False).count()
        self.assertEqual(unread_count, 0)


@pytest.mark.django_db
class TestPresenceAPI(TestCase):
    """Test User Presence API endpoints"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(email="user@test.com", password="test", role="IO")

    def test_get_presence(self):
        """Test getting user presence"""
        self.client.force_authenticate(user=self.user)
        
        # Create presence
        UserPresence.objects.create(user=self.user, status=UserPresence.Status.OFFLINE)

        response = self.client.get('/api/investigation/lers/requests/presence/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'OFFLINE')

    def test_update_presence_online(self):
        """Test setting presence to online"""
        self.client.force_authenticate(user=self.user)
        
        UserPresence.objects.create(user=self.user)

        data = {"status": "ONLINE", "socket_id": "socket-123"}
        response = self.client.post('/api/investigation/lers/requests/presence/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ONLINE')
        self.assertEqual(response.data['socket_id'], 'socket-123')

    def test_update_presence_offline(self):
        """Test setting presence to offline"""
        self.client.force_authenticate(user=self.user)
        
        presence = UserPresence.objects.create(
            user=self.user,
            status=UserPresence.Status.ONLINE,
            socket_id="socket-123"
        )

        data = {"status": "OFFLINE"}
        response = self.client.post('/api/investigation/lers/requests/presence/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'OFFLINE')
        
        presence.refresh_from_db()
        self.assertEqual(presence.socket_id, '')



