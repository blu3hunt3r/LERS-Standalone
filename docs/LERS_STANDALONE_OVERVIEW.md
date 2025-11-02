# STANDALONE LERS PLATFORM - PRODUCT DESIGN DOCUMENT

**Document Version:** 2.0
**Last Updated:** 2025-11-02
**Author:** Expert LERS Systems Architect
**Focus:** Standalone Data Requesting & Provider Platform (Excluding Case Management)

---

## EXECUTIVE SUMMARY

This document describes a **standalone Law Enforcement Request System (LERS)** designed specifically for streamlining data requests between law enforcement agencies and data providers (banks, telecom companies, payment platforms, etc.).

**Key Distinction:** This is a **standalone product** separate from case management and investigation systems. It focuses exclusively on:

1. **Law Enforcement Portal** - For creating, tracking, and managing data requests
2. **Provider Portal** - For data providers to receive, process, and respond to requests
3. **Real-time Communication** - Chat, notifications, and presence tracking
4. **SLA Transparency** - Provider performance tracking and compliance monitoring

**Future Integration:** While designed as standalone, the architecture supports future integration with case management systems.

---

## PRODUCT VISION

### The Problem

Law enforcement agencies in India face critical challenges when requesting data from private companies:

1. **Manual Process Overhead**
   - Email chains with attachments
   - Phone calls for status updates
   - Lost requests and missed deadlines
   - No centralized tracking

2. **Lack of Transparency**
   - Unknown turnaround times
   - No SLA commitments
   - Poor provider performance visibility
   - No accountability metrics

3. **Compliance Gaps**
   - Inconsistent legal mandate formats
   - Missing audit trails
   - Weak chain of custody
   - Limited digital signatures

4. **Communication Barriers**
   - Async email delays (48-72 hours per exchange)
   - No real-time clarifications
   - Provider contact information scattered
   - Emergency escalation unclear

### The Solution: Standalone LERS Platform

A **purpose-built digital platform** that:

✅ **Digitizes the entire request lifecycle** - From creation to response delivery
✅ **Provides SLA transparency** - Providers advertise turnaround times with historical performance
✅ **Enables real-time communication** - Chat between IO and provider for instant clarifications
✅ **Ensures compliance** - Digital signatures, audit trails, legal mandate validation
✅ **Tracks accountability** - Performance metrics, breach notifications, quality ratings

---

## CORE PRODUCT PHILOSOPHY

### 1. Standalone First, Integration Later

- **Self-contained** - All functionality works without external systems
- **Clean API boundaries** - RESTful APIs for future integration
- **Independent auth** - Separate user management for each portal
- **Modular architecture** - Easy to plug into existing systems later

### 2. SLA Transparency as Competitive Advantage

Unlike traditional systems where turnaround times are opaque, LERS makes provider performance **the primary feature**:

- Providers advertise their SLA commitments
- Historical performance data is visible
- Performance grades (A+, A, B, C, D) based on compliance
- Law enforcement can choose providers based on track record

### 3. Real-time Communication Over Email

Replace slow email chains with:

- Instant chat within each request
- Online/offline presence indicators
- Typing indicators
- File attachments in chat
- Push notifications

### 4. Indian Compliance by Design

Built specifically for Indian legal framework:

- CrPC Section 91 support
- IT Act Section 69 workflows
- DPDP Act 2023 considerations
- Court order validation
- Digital Evidence Act compliance

---

## SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────┐
│                     STANDALONE LERS PLATFORM                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐              ┌──────────────────────┐
│  LAW ENFORCEMENT     │              │   PROVIDER PORTAL    │
│      PORTAL          │◄────────────►│   (Data Companies)   │
│                      │              │                      │
│  - Create Requests   │              │  - Receive Requests  │
│  - Track Status      │              │  - Upload Responses  │
│  - Real-time Chat    │              │  - Chat with IO      │
│  - SLA Monitoring    │              │  - Manage Catalog    │
│  - Approval Workflow │              │  - Performance Stats │
└──────────────────────┘              └──────────────────────┘
           │                                     │
           │                                     │
           └────────────┬────────────────────────┘
                        │
                        ▼
           ┌─────────────────────────┐
           │   LERS CORE BACKEND     │
           │   (Django + DRF)        │
           │                         │
           │  - Request Management   │
           │  - Approval Workflows   │
           │  - SLA Calculations     │
           │  - Provider Catalog     │
           │  - Audit Logging        │
           │  - API Layer            │
           └─────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
    ┌─────────┐  ┌──────────┐  ┌─────────┐
    │PostgreSQL│  │  Redis   │  │  MinIO  │
    │         │  │  Cache   │  │ Object  │
    │ Primary │  │  Celery  │  │ Storage │
    │Database │  │  Broker  │  │ (S3)    │
    └─────────┘  └──────────┘  └─────────┘
                        │
                        ▼
           ┌─────────────────────────┐
           │  SOCKET.IO SERVER       │
           │  (Real-time Comms)      │
           │                         │
           │  - Chat Messages        │
           │  - Presence Tracking    │
           │  - Notifications        │
           │  - Typing Indicators    │
           └─────────────────────────┘
```

---

## KEY FEATURES BREAKDOWN

### Law Enforcement Portal Features

#### 1. Request Creation (3 Modes)

**A. Manual Creation**
- Form-based entry
- Provider selection from catalog
- Legal mandate upload
- Date range specification
- Priority selection (Normal/Urgent/Critical)

**B. Template-based Creation**
- Pre-defined templates for common requests
- Auto-fill based on request type
- Faster creation for routine requests

**C. Smart Creation (Advanced)**
- Entity-based auto-fill
- One-click request from known identifiers
- Historical context suggestions

#### 2. Approval Workflow

Multi-level approval hierarchy:

```
Draft → Pending Approval → Approved → Submitted
  ↓           ↓                ↓          ↓
Cancel   Reject/Changes   Reject    In Progress
```

**Approval Roles:**
- SHO (Station House Officer) - First level
- DSP/SP (Senior Officers) - Second level
- Digital signature support
- Rejection with reason tracking

#### 3. Request Tracking Dashboard

**Visual Status Indicators:**
- Color-coded status badges
- SLA countdown timers
- Breach warnings (red alerts)
- Response availability notifications

**Filtering & Search:**
- By status, provider, priority
- Date range filtering
- Request number search
- Provider filtering

#### 4. Real-time Chat

**Per-request chat room:**
- IO ↔ Provider direct communication
- File attachments in chat
- End-to-end encryption support
- Online/offline presence indicators
- Typing indicators
- Message read receipts

#### 5. SLA Monitoring

**Proactive tracking:**
- Due date calculations (priority-based)
- 24-hour breach warnings
- Email + push notifications
- Escalation triggers
- Historical performance view

#### 6. Provider Catalog Browser

**Transparency-first design:**
- Browse all providers and their capabilities
- See SLA commitments vs. actual performance
- Performance grades (A+/A/B/C/D)
- Success rate percentages
- Total requests fulfilled
- Required legal mandates clearly listed

**Example Catalog Entry:**
```
HDFC Bank - Account Statement (6 months)
├─ SLA Commitment: 48 hours
├─ Actual Avg: 38 hours ⭐
├─ Success Rate: 94.2% (Grade A)
├─ Requests Fulfilled: 1,247
├─ Requires: Section 91 CrPC
├─ Court Order: Not Required
└─ Output Format: PDF
```

---

### Provider Portal Features

#### 1. Request Inbox

**Smart prioritization:**
- SLA-based sorting (urgent first)
- Color-coded due dates
- Quick filters (Pending/In Progress/Completed)
- Bulk acknowledgement

**Request Card View:**
```
┌────────────────────────────────────────┐
│ REQ-LERS-2025-0042  [URGENT] 🔴       │
│ Bank Account Statement                 │
│ From: DCP Cyber Crime, Mumbai          │
│ Due: 18 hours remaining                │
│ Legal: Section 91 CrPC ✓               │
└────────────────────────────────────────┘
```

#### 2. Request Processing Workflow

```
New → Acknowledged → In Progress → Response Uploaded → Completed
 ↓         ↓              ↓              ↓
Reject  Request Info  Request Info   Revision
```

**Actions Available:**
- Acknowledge receipt (auto-starts SLA clock)
- Request additional information (via chat)
- Upload response files (PDFs, Excel, etc.)
- Add remarks/notes
- Digital signature on response
- Mark as completed

#### 3. Response Upload System

**Multi-file support:**
- Drag-and-drop interface
- Multiple file formats (PDF, Excel, CSV, images)
- File size validation (up to 50MB per file)
- Virus scanning integration
- Automatic parsing for structured data
- Digital signature attachment

**Response Metadata:**
- Response text/summary
- File descriptions
- Verification notes
- Officer name and designation

#### 4. Chat Interface

**Same real-time features as IO:**
- Instant messaging
- File sharing
- Typing indicators
- Read receipts
- Attachment preview

**Use cases:**
- Clarify ambiguous identifiers
- Request additional legal documents
- Coordinate emergency requests
- Provide status updates

#### 5. Service Catalog Management

**Providers advertise their capabilities:**

- **Data Types** - What data can be provided
- **SLA Commitments** - Promised turnaround times
- **Required Fields** - What information is needed from IO
- **Legal Requirements** - Section 91, court orders, etc.
- **Output Formats** - PDF, Excel, CSV, JSON
- **Sample Files** - Redacted samples for reference

**Example Catalog Item Creation:**
```
Name: CDR - Incoming & Outgoing Calls
Category: Telecom & CDR
SLA: 72 hours
Business Hours Only: Yes
Required Fields:
  - Mobile Number (10 digits)
  - From Date
  - To Date (max 6 months)
Legal Mandate: Section 91 CrPC + Court Order
Output Format: Excel (.xlsx)
```

#### 6. Performance Dashboard

**Provider's own report card:**

- Overall SLA compliance rate (%)
- Total requests received/completed
- Average response time
- Rejection rate
- Clarification request rate
- Performance grade (A+/A/B/C/D)
- Trending graphs (monthly)

**Quality Metrics:**
```
┌─────────────────────────────────────┐
│  Your Performance - Last 30 Days   │
├─────────────────────────────────────┤
│  Requests Completed: 247            │
│  SLA Compliance: 92.3% (Grade A)    │
│  Avg Response Time: 36 hours        │
│  Rejection Rate: 3.2%               │
│  Clarifications: 8.5%               │
└─────────────────────────────────────┘
```

---

## TECHNOLOGY STACK

### Backend
- **Framework:** Django 4.2 + Django REST Framework
- **Database:** PostgreSQL 15 (multi-tenant architecture)
- **Cache:** Redis 7 (caching + Celery broker)
- **Task Queue:** Celery (async tasks, SLA monitoring)
- **Storage:** MinIO (S3-compatible object storage)
- **Real-time:** Socket.IO (async Python implementation)

### Frontend (Law Enforcement Portal)
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **State Management:** Zustand
- **UI Components:** Custom design system (Tailwind CSS)
- **Real-time:** Socket.IO Client
- **Charts:** Recharts

### Frontend (Provider Portal)
- **Framework:** React 18 + TypeScript + Vite
- **State Management:** Zustand
- **UI:** Tailwind CSS
- **Real-time:** Socket.IO Client

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Reverse Proxy:** Nginx
- **SSL/TLS:** Let's Encrypt (production)
- **Monitoring:** Prometheus + Grafana (optional)

---

## COMPLIANCE & SECURITY

### Legal Compliance

**Indian Laws Supported:**
1. **CrPC Section 91** - Production of documents
2. **CrPC Section 176** - Inquiry by Magistrate
3. **IT Act Section 69** - Interception/monitoring
4. **IT Act Section 91** - Clarifications by intermediaries
5. **DPDP Act 2023** - Data protection considerations

**Audit Trail Features:**
- Every action logged with timestamp
- User attribution (who did what)
- IP address tracking
- Blockchain-style hash chaining (tamper-proof)
- Export audit logs for court evidence

### Security Architecture

**Authentication:**
- JWT-based authentication
- Role-based access control (RBAC)
- Multi-factor authentication (MFA) support
- Password: Argon2 hashing

**Data Encryption:**
- **At Rest:** AES-256-GCM for sensitive fields
- **In Transit:** TLS 1.3 (HTTPS)
- **E2E Chat:** Optional RSA + AES hybrid encryption

**Access Control:**
- Multi-tenant isolation (providers can't see each other)
- Row-level security in database
- API rate limiting
- IP whitelisting support

---

## WHAT'S EXCLUDED (Case Management)

To maintain focus on standalone LERS, the following are **NOT included**:

❌ Case file management
❌ Evidence cataloging and linking
❌ Investigation timeline/whiteboard
❌ Entity relationship graphs
❌ FIR/Chargesheet creation
❌ Court hearing management
❌ Suspect/witness databases

**Note:** These can be integrated later when connecting LERS to a full CMS.

---

## NEXT SECTIONS

This overview is followed by detailed documents:

1. **Architecture Diagrams** - Visual system design
2. **Law Enforcement Portal Guide** - Feature deep-dive
3. **Provider Portal Guide** - Provider-specific features
4. **LERS Workflows** - Request lifecycle in depth
5. **Database Schema** - Data model documentation
6. **Security Architecture** - Security in depth
7. **Deployment Guide** - Production deployment
8. **Indian Compliance** - Legal compliance features

---

**End of Overview Document**
