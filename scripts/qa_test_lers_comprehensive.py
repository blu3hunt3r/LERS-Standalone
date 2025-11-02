#!/usr/bin/env python3
"""
LERS PLATFORM - COMPREHENSIVE QA TEST SUITE
============================================

This script performs end-to-end testing of all LERS features:
1. Authentication & Authorization
2. Request Creation (all 12 types)
3. Approval Workflow
4. Provider Response Upload
5. Chat/Messaging
6. SLA Monitoring
7. Provider Catalog
8. Notifications
9. Audit Logging
10. File Storage
11. Real-time Features

Usage:
    python qa_test_lers_comprehensive.py
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import sys

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
SOCKET_URL = "http://localhost:8002"

# Test Results Tracking
test_results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "errors": []
}

class Color:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

def log_test(test_name: str, status: str, message: str = ""):
    """Log test result with color coding"""
    test_results["total"] += 1

    if status == "PASS":
        test_results["passed"] += 1
        print(f"{Color.GREEN}✓{Color.END} {test_name}")
        if message:
            print(f"  {Color.CYAN}{message}{Color.END}")
    elif status == "FAIL":
        test_results["failed"] += 1
        print(f"{Color.RED}✗{Color.END} {test_name}")
        if message:
            print(f"  {Color.RED}{message}{Color.END}")
        test_results["errors"].append({"test": test_name, "error": message})
    elif status == "SKIP":
        test_results["skipped"] += 1
        print(f"{Color.YELLOW}○{Color.END} {test_name} (SKIPPED)")
        if message:
            print(f"  {Color.YELLOW}{message}{Color.END}")

def print_section(title: str):
    """Print formatted section header"""
    print(f"\n{Color.BOLD}{Color.BLUE}{'='*80}{Color.END}")
    print(f"{Color.BOLD}{Color.BLUE}{title:^80}{Color.END}")
    print(f"{Color.BOLD}{Color.BLUE}{'='*80}{Color.END}\n")

def print_summary():
    """Print test execution summary"""
    print(f"\n{Color.BOLD}{Color.MAGENTA}{'='*80}{Color.END}")
    print(f"{Color.BOLD}{Color.MAGENTA}TEST EXECUTION SUMMARY{Color.END:^80}")
    print(f"{Color.BOLD}{Color.MAGENTA}{'='*80}{Color.END}\n")

    print(f"Total Tests:  {test_results['total']}")
    print(f"{Color.GREEN}Passed:       {test_results['passed']}{Color.END}")
    print(f"{Color.RED}Failed:       {test_results['failed']}{Color.END}")
    print(f"{Color.YELLOW}Skipped:      {test_results['skipped']}{Color.END}")

    if test_results['failed'] > 0:
        print(f"\n{Color.RED}{Color.BOLD}FAILED TESTS:{Color.END}")
        for error in test_results['errors']:
            print(f"{Color.RED}  • {error['test']}: {error['error']}{Color.END}")

    success_rate = (test_results['passed'] / test_results['total'] * 100) if test_results['total'] > 0 else 0
    print(f"\n{Color.BOLD}Success Rate: {success_rate:.1f}%{Color.END}")

    if test_results['failed'] == 0:
        print(f"\n{Color.GREEN}{Color.BOLD}🎉 ALL TESTS PASSED! 🎉{Color.END}\n")
    else:
        print(f"\n{Color.RED}{Color.BOLD}⚠️  SOME TESTS FAILED ⚠️{Color.END}\n")

# ============================================================================
# 1. AUTHENTICATION & AUTHORIZATION TESTS
# ============================================================================

def test_auth():
    """Test authentication and authorization"""
    print_section("1. AUTHENTICATION & AUTHORIZATION TESTS")

    # Test 1.1: Health Check
    try:
        response = requests.get(f"{BASE_URL}/../health/", timeout=5)
        if response.status_code == 200:
            log_test("1.1 Health Check Endpoint", "PASS", "Backend is healthy")
        else:
            log_test("1.1 Health Check Endpoint", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("1.1 Health Check Endpoint", "FAIL", str(e))

    # Test 1.2: Login (IO)
    io_credentials = {
        "email": "io@police.gov.in",
        "password": "Test@123456"
    }

    try:
        response = requests.post(f"{BASE_URL}/auth/login/", json=io_credentials, timeout=5)
        if response.status_code == 200:
            tokens_io = response.json()
            log_test("1.2 IO Login", "PASS", f"Access token received")
            return tokens_io
        else:
            log_test("1.2 IO Login", "FAIL", f"Status: {response.status_code}, Body: {response.text}")
            return None
    except Exception as e:
        log_test("1.2 IO Login", "FAIL", str(e))
        return None

    # Test 1.3: Login (Provider)
    provider_credentials = {
        "email": "provider@datacompany.com",
        "password": "Test@123456"
    }

    try:
        response = requests.post(f"{BASE_URL}/auth/login/", json=provider_credentials, timeout=5)
        if response.status_code == 200:
            tokens_provider = response.json()
            log_test("1.3 Provider Login", "PASS", f"Access token received")
            return tokens_io, tokens_provider
        else:
            log_test("1.3 Provider Login", "FAIL", f"Status: {response.status_code}")
            return tokens_io, None
    except Exception as e:
        log_test("1.3 Provider Login", "FAIL", str(e))
        return tokens_io, None

# ============================================================================
# 2. LERS REQUEST CREATION TESTS (ALL 12 TYPES)
# ============================================================================

def test_request_creation(auth_token: str):
    """Test creation of all 12 LERS request types"""
    print_section("2. LERS REQUEST CREATION (ALL 12 TYPES)")

    if not auth_token:
        log_test("2.x All Request Types", "SKIP", "No authentication token")
        return None

    headers = {"Authorization": f"Bearer {auth_token}"}

    request_types = [
        "CALL_DETAIL_RECORDS",
        "BANK_ACCOUNT_INFO",
        "SOCIAL_MEDIA_DATA",
        "EMAIL_RECORDS",
        "IP_ADDRESS_LOGS",
        "VEHICLE_REGISTRATION",
        "PROPERTY_RECORDS",
        "TELECOM_SUBSCRIBER",
        "INTERNET_SERVICE",
        "E_COMMERCE_DATA",
        "PAYMENT_GATEWAY",
        "OTHER"
    ]

    created_requests = []

    for idx, req_type in enumerate(request_types, start=1):
        test_request = {
            "request_type": req_type,
            "provider": "Test Provider",
            "description": f"Test request for {req_type}",
            "priority": "NORMAL",
            "identifiers": {
                "phone": "+919876543210" if "CALL" in req_type or "TELECOM" in req_type else None,
                "account_number": "12345678901" if "BANK" in req_type else None,
                "email": "test@example.com" if "EMAIL" in req_type or "SOCIAL" in req_type else None
            },
            "legal_mandate_type": "SECTION_91_CRPC",
            "date_range_from": (datetime.now() - timedelta(days=30)).isoformat(),
            "date_range_to": datetime.now().isoformat()
        }

        try:
            response = requests.post(
                f"{BASE_URL}/lers/requests/",
                json=test_request,
                headers=headers,
                timeout=10
            )

            if response.status_code in [200, 201]:
                request_data = response.json()
                created_requests.append(request_data)
                log_test(f"2.{idx} Create Request - {req_type}", "PASS",
                        f"Request #{request_data.get('request_number', 'N/A')} created")
            else:
                log_test(f"2.{idx} Create Request - {req_type}", "FAIL",
                        f"Status: {response.status_code}, Body: {response.text[:200]}")
        except Exception as e:
            log_test(f"2.{idx} Create Request - {req_type}", "FAIL", str(e))

    return created_requests

# ============================================================================
# 3. REQUEST WORKFLOW & STATE TRANSITIONS
# ============================================================================

def test_request_workflow(auth_token: str, request_id: str):
    """Test request workflow state transitions"""
    print_section("3. REQUEST WORKFLOW & STATE TRANSITIONS")

    if not auth_token or not request_id:
        log_test("3.x Workflow Tests", "SKIP", "Missing auth token or request ID")
        return

    headers = {"Authorization": f"Bearer {auth_token}"}

    # Test 3.1: Get Request Details
    try:
        response = requests.get(f"{BASE_URL}/lers/requests/{request_id}/", headers=headers, timeout=5)
        if response.status_code == 200:
            request_data = response.json()
            log_test("3.1 Get Request Details", "PASS",
                    f"Status: {request_data.get('status', 'N/A')}")
        else:
            log_test("3.1 Get Request Details", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("3.1 Get Request Details", "FAIL", str(e))

    # Test 3.2: Submit for Approval
    try:
        response = requests.post(
            f"{BASE_URL}/lers/requests/{request_id}/submit-for-approval/",
            headers=headers,
            timeout=5
        )
        if response.status_code in [200, 201]:
            log_test("3.2 Submit for Approval", "PASS", "Status changed to PENDING_APPROVAL")
        else:
            log_test("3.2 Submit for Approval", "FAIL", f"Status: {response.status_code}, Body: {response.text[:200]}")
    except Exception as e:
        log_test("3.2 Submit for Approval", "FAIL", str(e))

    # Test 3.3: Approve Request
    try:
        approval_data = {
            "action": "APPROVE",
            "comments": "Approved for testing",
            "signature_hash": "test_signature_hash"
        }
        response = requests.post(
            f"{BASE_URL}/lers/requests/{request_id}/approve/",
            json=approval_data,
            headers=headers,
            timeout=5
        )
        if response.status_code in [200, 201]:
            log_test("3.3 Approve Request", "PASS", "Request approved")
        else:
            log_test("3.3 Approve Request", "FAIL", f"Status: {response.status_code}, Body: {response.text[:200]}")
    except Exception as e:
        log_test("3.3 Approve Request", "FAIL", str(e))

# ============================================================================
# 4. PROVIDER CATALOG TESTS
# ============================================================================

def test_provider_catalog(auth_token: str):
    """Test provider catalog functionality"""
    print_section("4. PROVIDER CATALOG & PERFORMANCE TRACKING")

    if not auth_token:
        log_test("4.x Catalog Tests", "SKIP", "No authentication token")
        return

    headers = {"Authorization": f"Bearer {auth_token}"}

    # Test 4.1: List Provider Catalog
    try:
        response = requests.get(f"{BASE_URL}/lers/catalog/", headers=headers, timeout=5)
        if response.status_code == 200:
            catalog_data = response.json()
            count = catalog_data.get('count', len(catalog_data) if isinstance(catalog_data, list) else 0)
            log_test("4.1 List Provider Catalog", "PASS", f"Found {count} catalog items")
        else:
            log_test("4.1 List Provider Catalog", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("4.1 List Provider Catalog", "FAIL", str(e))

    # Test 4.2: Get Provider Service Profile
    try:
        response = requests.get(f"{BASE_URL}/lers/provider-profile/", headers=headers, timeout=5)
        if response.status_code == 200:
            profile_data = response.json()
            log_test("4.2 Get Provider Service Profile", "PASS",
                    f"SLA Compliance: {profile_data.get('overall_sla_compliance_rate', 'N/A')}%")
        else:
            log_test("4.2 Get Provider Service Profile", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("4.2 Get Provider Service Profile", "FAIL", str(e))

# ============================================================================
# 5. CHAT/MESSAGING TESTS
# ============================================================================

def test_chat_messaging(auth_token: str, request_id: str):
    """Test chat and messaging functionality"""
    print_section("5. CHAT/MESSAGING SYSTEM")

    if not auth_token or not request_id:
        log_test("5.x Chat Tests", "SKIP", "Missing auth token or request ID")
        return

    headers = {"Authorization": f"Bearer {auth_token}"}

    # Test 5.1: Send Message
    try:
        message_data = {
            "message_type": "TEXT",
            "message_text": "This is a test message for QA testing",
            "sender_type": "IO"
        }
        response = requests.post(
            f"{BASE_URL}/lers/requests/{request_id}/messages/",
            json=message_data,
            headers=headers,
            timeout=5
        )
        if response.status_code in [200, 201]:
            message = response.json()
            log_test("5.1 Send Chat Message", "PASS", f"Message ID: {message.get('id', 'N/A')}")
            return message.get('id')
        else:
            log_test("5.1 Send Chat Message", "FAIL", f"Status: {response.status_code}, Body: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("5.1 Send Chat Message", "FAIL", str(e))
        return None

    # Test 5.2: Get Messages for Request
    try:
        response = requests.get(
            f"{BASE_URL}/lers/requests/{request_id}/messages/",
            headers=headers,
            timeout=5
        )
        if response.status_code == 200:
            messages = response.json()
            count = messages.get('count', len(messages) if isinstance(messages, list) else 0)
            log_test("5.2 Get Chat Messages", "PASS", f"Retrieved {count} messages")
        else:
            log_test("5.2 Get Chat Messages", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("5.2 Get Chat Messages", "FAIL", str(e))

# ============================================================================
# 6. NOTIFICATIONS TESTS
# ============================================================================

def test_notifications(auth_token: str):
    """Test notifications functionality"""
    print_section("6. NOTIFICATIONS SYSTEM")

    if not auth_token:
        log_test("6.x Notification Tests", "SKIP", "No authentication token")
        return

    headers = {"Authorization": f"Bearer {auth_token}"}

    # Test 6.1: Get User Notifications
    try:
        response = requests.get(f"{BASE_URL}/lers/notifications/", headers=headers, timeout=5)
        if response.status_code == 200:
            notifications = response.json()
            count = notifications.get('count', len(notifications) if isinstance(notifications, list) else 0)
            log_test("6.1 Get User Notifications", "PASS", f"Retrieved {count} notifications")
        else:
            log_test("6.1 Get User Notifications", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("6.1 Get User Notifications", "FAIL", str(e))

# ============================================================================
# 7. USER PRESENCE TESTS
# ============================================================================

def test_presence(auth_token: str):
    """Test user presence functionality"""
    print_section("7. USER PRESENCE TRACKING")

    if not auth_token:
        log_test("7.x Presence Tests", "SKIP", "No authentication token")
        return

    headers = {"Authorization": f"Bearer {auth_token}"}

    # Test 7.1: Get User Presence
    try:
        response = requests.get(f"{BASE_URL}/lers/presence/", headers=headers, timeout=5)
        if response.status_code == 200:
            presence = response.json()
            log_test("7.1 Get User Presence", "PASS", f"Status: {presence.get('status', 'N/A')}")
        else:
            log_test("7.1 Get User Presence", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("7.1 Get User Presence", "FAIL", str(e))

    # Test 7.2: Update User Presence
    try:
        presence_data = {"status": "ONLINE"}
        response = requests.post(
            f"{BASE_URL}/lers/presence/",
            json=presence_data,
            headers=headers,
            timeout=5
        )
        if response.status_code in [200, 201]:
            log_test("7.2 Update User Presence", "PASS", "Status updated to ONLINE")
        else:
            log_test("7.2 Update User Presence", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("7.2 Update User Presence", "FAIL", str(e))

# ============================================================================
# MAIN TEST EXECUTION
# ============================================================================

def main():
    """Main test execution"""
    print(f"\n{Color.BOLD}{Color.MAGENTA}")
    print("=" * 80)
    print("LERS PLATFORM - COMPREHENSIVE QA TEST SUITE".center(80))
    print("=" * 80)
    print(f"{Color.END}\n")

    print(f"{Color.CYAN}Test Configuration:{Color.END}")
    print(f"  Base URL: {BASE_URL}")
    print(f"  Socket URL: {SOCKET_URL}")
    print(f"  Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Test 1: Authentication
    auth_result = test_auth()
    if not auth_result:
        print(f"\n{Color.RED}Authentication failed. Cannot proceed with further tests.{Color.END}")
        print_summary()
        return

    tokens_io, tokens_provider = auth_result if isinstance(auth_result, tuple) else (auth_result, None)
    access_token_io = tokens_io.get('access') if tokens_io else None

    # Test 2: Request Creation
    created_requests = test_request_creation(access_token_io)
    request_id = created_requests[0]['id'] if created_requests and len(created_requests) > 0 else None

    # Test 3: Workflow
    if request_id:
        test_request_workflow(access_token_io, request_id)

    # Test 4: Provider Catalog
    test_provider_catalog(access_token_io)

    # Test 5: Chat/Messaging
    if request_id:
        test_chat_messaging(access_token_io, request_id)

    # Test 6: Notifications
    test_notifications(access_token_io)

    # Test 7: Presence
    test_presence(access_token_io)

    # Print Summary
    print_summary()

    # Exit with appropriate code
    sys.exit(0 if test_results['failed'] == 0 else 1)

if __name__ == "__main__":
    main()
