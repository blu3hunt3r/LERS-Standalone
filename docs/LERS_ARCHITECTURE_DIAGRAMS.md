# LERS STANDALONE - ARCHITECTURE DIAGRAMS

**Document:** Architecture & System Design
**Version:** 2.0
**Last Updated:** 2025-11-02

---

## TABLE OF CONTENTS

1. [High-Level System Architecture](#1-high-level-system-architecture)
2. [Request Lifecycle Workflow](#2-request-lifecycle-workflow)
3. [Backend Architecture](#3-backend-architecture)
4. [Database Schema](#4-database-schema)
5. [Real-time Communication Architecture](#5-real-time-communication-architecture)
6. [Security Architecture](#6-security-architecture)
7. [Deployment Architecture](#7-deployment-architecture)

---

## 1. HIGH-LEVEL SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      STANDALONE LERS PLATFORM                             │
│                   (Law Enforcement Request System)                        │
└──────────────────────────────────────────────────────────────────────────┘

                    ┌────────────────────────────┐
                    │   USERS (Authentication)   │
                    └────────────┬───────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │                               │
                 ▼                               ▼
    ┌─────────────────────────┐    ┌─────────────────────────┐
    │  LAW ENFORCEMENT PORTAL │    │    PROVIDER PORTAL      │
    │      (React + TS)       │    │      (React + TS)       │
    ├─────────────────────────┤    ├─────────────────────────┤
    │ - Create Requests       │    │ - Receive Requests      │
    │ - Approval Workflow     │    │ - Upload Responses      │
    │ - Track Status          │    │ - Chat Interface        │
    │ - Real-time Chat        │    │ - Catalog Management    │
    │ - SLA Monitoring        │    │ - Performance Metrics   │
    │ - Provider Catalog      │    │ - Service Profile       │
    └────────────┬────────────┘    └────────────┬────────────┘
                 │                               │
                 │      HTTPS (TLS 1.3)         │
                 │                               │
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────┐
                    │       NGINX REVERSE        │
                    │          PROXY             │
                    │  (Load Balancing + SSL)    │
                    └────────────┬───────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │                               │
                 ▼                               ▼
    ┌─────────────────────────┐    ┌─────────────────────────┐
    │   DJANGO REST BACKEND   │    │  SOCKET.IO SERVER       │
    │   (Python + DRF)        │    │  (Async Python)         │
    ├─────────────────────────┤    ├─────────────────────────┤
    │ - REST API Endpoints    │    │ - Real-time Chat        │
    │ - Request Management    │    │ - Presence Tracking     │
    │ - Approval Workflows    │    │ - Push Notifications    │
    │ - SLA Calculations      │    │ - Typing Indicators     │
    │ - Provider Catalog      │    │ - WebSocket Rooms       │
    │ - Audit Logging         │    └────────────┬────────────┘
    │ - Authentication (JWT)  │                 │
    └────────────┬────────────┘                 │
                 │                               │
                 │                               │
    ┌────────────┼───────────────────────────────┼────────────┐
    │            │                               │            │
    ▼            ▼                               ▼            ▼
┌─────────┐  ┌─────────┐                    ┌─────────┐  ┌─────────┐
│PostgreSQL│  │  Redis  │                    │  MinIO  │  │ Celery  │
│   15    │  │    7    │                    │ Object  │  │ Workers │
├─────────┤  ├─────────┤                    │ Storage │  ├─────────┤
│ - LERS  │  │ - Cache │                    │  (S3)   │  │- SLA    │
│   Requests│  │ - Sess │                    │         │  │  Monitor│
│ - Provider│  │ - Celery                    │ - Files │  │- Emails │
│   Catalog│  │   Broker│                    │ - Docs  │  │- Tasks  │
│ - Messages│  │ - Presence                  │ - Images│  │         │
│ - Users  │  │   Data  │                    │         │  │         │
└─────────┘  └─────────┘                    └─────────┘  └─────────┘
```

### Component Responsibilities

**Nginx:**
- SSL/TLS termination
- Load balancing across multiple backend instances
- Static file serving
- Request routing (API vs WebSocket)

**Django Backend:**
- Core business logic
- REST API for CRUD operations
- Authentication & authorization (JWT)
- Database ORM interactions
- Background task scheduling

**Socket.IO Server:**
- WebSocket connections for real-time features
- Chat room management
- Presence broadcasting
- Notification push

**PostgreSQL:**
- Primary data store
- Multi-tenant data isolation
- ACID compliance for critical operations
- Full-text search capabilities

**Redis:**
- Session storage
- API response caching
- Celery task queue broker
- Real-time presence data
- Rate limiting counters

**MinIO:**
- Legal mandate PDFs
- Response files from providers
- Evidence attachments
- Chat file attachments
- S3-compatible API

**Celery:**
- SLA monitoring (scheduled tasks)
- Email notifications
- Report generation
- Async file processing

---

## 2. REQUEST LIFECYCLE WORKFLOW

```
┌──────────────────────────────────────────────────────────────────────────┐
│                  LERS REQUEST LIFECYCLE (END-TO-END)                     │
└──────────────────────────────────────────────────────────────────────────┘

LAW ENFORCEMENT SIDE                      PROVIDER SIDE
═══════════════════════                   ═══════════════

┌──────────────────┐
│ 1. CREATE REQUEST│
│ - Select Provider│
│ - Request Type   │
│ - Upload Legal   │
│   Mandate        │
│ - Set Priority   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. STATUS: DRAFT │
│ - Editable       │
│ - Can Cancel     │
└────────┬─────────┘
         │
         │ Submit for Approval
         ▼
┌──────────────────┐
│ 3. PENDING       │
│    APPROVAL      │
│ - SHO Reviews    │
│ - Can Reject     │
│ - Can Request    │
│   Changes        │
└────────┬─────────┘
         │
         │ Approve
         ▼
┌──────────────────┐
│ 4. APPROVED      │
│ - Digital Sign   │
│ - Auto-submit    │
└────────┬─────────┘
         │
         │ Submit to Provider
         ▼
┌──────────────────┐                     ┌──────────────────┐
│ 5. SUBMITTED     │──────────────────► │  NEW REQUEST     │
│ - SLA Starts     │                     │  - Inbox Alert   │
│ - Waiting for    │                     │  - Push Notify   │
│   Acknowledgement│                     └────────┬─────────┘
└────────┬─────────┘                              │
         │                                        │
         │                                        │ Acknowledge
         │                                        ▼
         │                             ┌──────────────────┐
         │                             │ 6. ACKNOWLEDGED  │
         │◄────────────────────────────│  - Provider      │
         │                             │    confirms      │
         │                             │  - SLA clock ✓   │
         │                             └────────┬─────────┘
         │                                      │
         ▼                                      │
┌──────────────────┐                           │ Start Processing
│ REAL-TIME CHAT   │◄──────────────────────────┼────────────────┐
│ ENABLED          │                           │                │
│ - IO ↔ Provider  │                           ▼                │
│ - Clarifications │                 ┌──────────────────┐      │
│ - File Sharing   │                 │ 7. IN PROGRESS   │      │
│ - Typing Indica  │                 │  - Provider      │      │
└──────────────────┘                 │    working       │      │
         ▲                            │  - Can request   │      │
         │                            │    info via chat │──────┘
         │                            └────────┬─────────┘
         │                                     │
         │                                     │ Upload Response
         │                                     ▼
         │                            ┌──────────────────┐
         │                            │ 8. RESPONSE      │
         │◄───────────────────────────│    UPLOADED      │
         │    Notification            │  - Files ready   │
         │                            │  - Digital sign  │
         │                            └────────┬─────────┘
         │                                     │
         │                                     │ Mark Complete
         │                                     ▼
         │                            ┌──────────────────┐
         │                            │ 9. COMPLETED     │
         │◄───────────────────────────│  - Response sent │
         │    Download Response       │  - SLA met? ✓/✗  │
         ▼                            └──────────────────┘
┌──────────────────┐
│ 10. VIEW RESPONSE│
│  - Download Files│
│  - Verify Sign   │
│  - Accept/Reject │
│  - Rate Quality  │
└──────────────────┘

PARALLEL PROCESSES:
══════════════════

┌─────────────────────────────────┐
│  SLA MONITORING (Celery)        │
│  - Runs every 15 minutes        │
│  - Checks due dates             │
│  - Sends breach warnings (24h)  │
│  - Marks SLA breached           │
│  - Escalation notifications     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  AUDIT LOGGING                  │
│  - Every status change logged   │
│  - User attribution tracked     │
│  - Timestamp + IP address       │
│  - Hash chaining (tamper-proof) │
└─────────────────────────────────┘
```

### Status State Machine

```
DRAFT ──────────► PENDING_APPROVAL ──────────► APPROVED ──────────► SUBMITTED
  │                      │                         │                     │
  │                      │                         │                     │
  └─► CANCELLED          └─► REJECTED              └─► REJECTED          ▼
                                                                    ACKNOWLEDGED
                                                                         │
                                                                         ▼
                                                                    IN_PROGRESS
                                                                         │
                                                                         ▼
                                                                  RESPONSE_UPLOADED
                                                                         │
                                                                         ▼
                                                                     COMPLETED

Terminal States: COMPLETED, CANCELLED, REJECTED
```

---

## 3. BACKEND ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     DJANGO BACKEND ARCHITECTURE                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          API LAYER (Django REST Framework)               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  /api/v1/lers/requests/          [GET, POST]                            │
│  /api/v1/lers/requests/:id/      [GET, PUT, PATCH, DELETE]             │
│  /api/v1/lers/requests/:id/approve/       [POST]                        │
│  /api/v1/lers/requests/:id/reject/        [POST]                        │
│  /api/v1/lers/requests/:id/messages/      [GET, POST]                   │
│  /api/v1/lers/responses/         [POST]                                 │
│  /api/v1/lers/catalog/           [GET, POST]                            │
│  /api/v1/lers/presence/          [GET, POST]                            │
│  /api/v1/lers/notifications/     [GET, POST]                            │
│  /api/v1/auth/login/             [POST]                                 │
│  /api/v1/auth/token/refresh/     [POST]                                 │
│                                                                          │
└──────────────────────────┬───────────────────────────────────────────────┘
                          │
┌─────────────────────────┴────────────────────────────────────────────────┐
│                         BUSINESS LOGIC LAYER                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │  LERS Request    │  │  Provider        │  │  Real-time       │      │
│  │  Management      │  │  Catalog         │  │  Communication   │      │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤      │
│  │ - Create         │  │ - Browse Catalog │  │ - Chat Messages  │      │
│  │ - Update         │  │ - Provider       │  │ - Presence       │      │
│  │ - Approve/Reject │  │   Service        │  │ - Notifications  │      │
│  │ - Submit         │  │   Profile        │  │ - Typing         │      │
│  │ - Track Status   │  │ - SLA Metrics    │  │   Indicators     │      │
│  │ - SLA Calc       │  │ - Usage          │  └──────────────────┘      │
│  │ - Generate       │  │   Analytics      │                            │
│  │   Request Number │  └──────────────────┘                            │
│  └──────────────────┘                                                   │
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │  Approval        │  │  Response        │  │  Templates       │      │
│  │  Workflow        │  │  Management      │  │  Management      │      │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤      │
│  │ - Multi-level    │  │ - Upload         │  │ - Pre-defined    │      │
│  │   Approval       │  │ - Parse Files    │  │   Templates      │      │
│  │ - Digital        │  │ - Verify Sign    │  │ - Quick Create   │      │
│  │   Signatures     │  │ - Notify IO      │  │ - Usage Stats    │      │
│  │ - Rejection      │  └──────────────────┘  └──────────────────┘      │
│  │   Tracking       │                                                   │
│  └──────────────────┘                                                   │
│                                                                           │
└──────────────────────────┬────────────────────────────────────────────────┘
                          │
┌─────────────────────────┴────────────────────────────────────────────────┐
│                         DATA ACCESS LAYER (Django ORM)                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  LERSRequest    │  │  LERSResponse   │  │  LERSMessage    │         │
│  │  Model          │  │  Model          │  │  Model          │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ LERSApproval    │  │  Provider       │  │  UserPresence   │         │
│  │ Workflow        │  │  DataCatalog    │  │  Model          │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ LERSNotification│  │  LERSTemplate   │  │  User/Tenant    │         │
│  │ Model           │  │  Model          │  │  Models         │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                           │
└──────────────────────────┬────────────────────────────────────────────────┘
                          │
┌─────────────────────────┴────────────────────────────────────────────────┐
│                         MIDDLEWARE LAYER                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ JWT Auth        │  │ Audit Logging   │  │ Multi-tenant    │         │
│  │ Middleware      │  │ Middleware      │  │ Middleware      │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ CORS Middleware │  │ Rate Limiting   │  │ Error Handling  │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### Django Apps Structure

```
backend/
├── apps/
│   ├── authentication/      # User management, JWT auth
│   │   ├── models.py        # User, Role, Permission
│   │   ├── views.py         # Login, refresh token
│   │   └── serializers.py
│   │
│   ├── tenants/             # Multi-tenancy
│   │   ├── models.py        # Tenant (police stations, providers)
│   │   └── middleware.py    # Tenant isolation
│   │
│   ├── lers/                # Core LERS functionality
│   │   ├── models.py        # LERSRequest, LERSResponse
│   │   ├── models_provider_catalog.py  # Provider catalog
│   │   ├── views.py         # API endpoints
│   │   ├── serializers.py   # DRF serializers
│   │   ├── tasks.py         # Celery tasks (SLA monitoring)
│   │   └── permissions.py   # Access control
│   │
│   ├── audit/               # Audit trail
│   │   ├── models.py        # AuditLog
│   │   └── middleware.py    # Auto-logging
│   │
│   └── core/                # Shared utilities
│       ├── models.py        # BaseModel (timestamps, soft delete)
│       └── utils.py         # Helpers
│
└── cms_lers/                # Project settings
    ├── settings.py
    ├── urls.py
    └── wsgi.py
```

---

## 4. DATABASE SCHEMA

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     DATABASE SCHEMA (PostgreSQL)                         │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│      tenants            │
├─────────────────────────┤
│ id (UUID) PK            │
│ name VARCHAR            │
│ type VARCHAR            │  # 'LAW_ENFORCEMENT' or 'PROVIDER'
│ created_at TIMESTAMP    │
└───────────┬─────────────┘
            │
            │ 1:N
            ▼
┌─────────────────────────┐          ┌─────────────────────────┐
│   authentication_user   │          │   lers_requests         │
├─────────────────────────┤          ├─────────────────────────┤
│ id (UUID) PK            │          │ id (UUID) PK            │
│ email VARCHAR UNIQUE    │          │ request_number VARCHAR  │ UNIQUE
│ password_hash VARCHAR   │          │   UNIQUE                │
│ full_name VARCHAR       │          │ request_type VARCHAR    │
│ role VARCHAR            │◄────────┐│ provider VARCHAR        │
│ tenant_id UUID FK       │         ││ provider_tenant_id UUID │ FK
│ is_active BOOLEAN       │         ││ catalog_item_id UUID FK │
│ created_at TIMESTAMP    │         ││ identifiers JSONB       │ # {phone, pan, etc}
└───────────┬─────────────┘         ││ description TEXT        │
            │                       ││ date_range_from DATE    │
            │ 1:N                   ││ date_range_to DATE      │
            │                       ││ legal_mandate_type      │
            │                       ││ legal_mandate_file_id   │ FK
            │                       ││ court_order_number      │
            │                       ││ status VARCHAR          │ # DRAFT, PENDING, etc
            │                       ││ priority VARCHAR        │ # NORMAL, URGENT, CRITICAL
            │                       ││ created_by_id UUID FK   │──┘
            │                       ││ approved_by_id UUID FK  │
            │                       ││ assigned_to_company_id  │
            │                       ││ sla_due_date TIMESTAMP  │
            │                       ││ sla_breached BOOLEAN    │
            │                       ││ approved_at TIMESTAMP   │
            │                       ││ submitted_at TIMESTAMP  │
            │                       ││ completed_at TIMESTAMP  │
            │                       ││ notes TEXT              │
            │                       ││ rejection_reason TEXT   │
            │                       ││ metadata JSONB          │
            │                       ││ created_at TIMESTAMP    │
            │                       ││ updated_at TIMESTAMP    │
            │                       │└─────────────┬───────────┘
            │                       │              │
            │                       │              │ 1:N
            │                       │              ▼
            │                       │┌─────────────────────────┐
            │                       ││   lers_responses        │
            │                       │├─────────────────────────┤
            │                       ││ id (UUID) PK            │
            │                       ││ request_id UUID FK      │──┘
            │                       ││ response_number VARCHAR │ UNIQUE
            │                       ││ submitted_by_id UUID FK │
            │                       ││ submitted_at TIMESTAMP  │
            │                       ││ status VARCHAR          │ # RECEIVED, PARSED, etc
            │                       ││ parsed_data JSONB       │
            │                       ││ signature TEXT          │ # Digital signature
            │                       ││ signature_verified BOOL │
            │                       ││ response_text TEXT      │
            │                       ││ remarks TEXT            │
            │                       ││ metadata JSONB          │
            │                       ││ created_at TIMESTAMP    │
            │                       │└─────────────────────────┘
            │                       │
            │                       │┌─────────────────────────┐
            │                       ││ lers_approval_workflow  │
            │                       │├─────────────────────────┤
            │                       ││ id (UUID) PK            │
            │                       ││ request_id UUID FK      │
            │                       ││ approver_id UUID FK     │
            │                       ││ action VARCHAR          │ # APPROVE, REJECT
            │                       ││ comments TEXT           │
            │                       ││ signature_hash VARCHAR  │
            │                       ││ action_timestamp        │
            │                       ││ created_at TIMESTAMP    │
            │                       │└─────────────────────────┘
            │                       │
            │                       │┌─────────────────────────┐
            │                       ││   lers_messages         │
            │                       │├─────────────────────────┤
            │                       ││ id (UUID) PK            │
            │                       ││ request_id UUID FK      │
            │                       ││ sender_id UUID FK       │
            │                       ││ sender_type VARCHAR     │ # IO, PROVIDER, SYSTEM
            │                       ││ message_type VARCHAR    │ # TEXT, FILE
            │                       ││ message_text TEXT       │
            │                       ││ is_encrypted BOOLEAN    │
            │                       ││ encrypted_content TEXT  │
            │                       ││ encrypted_key TEXT      │
            │                       ││ encryption_algorithm    │
            │                       ││ encryption_iv VARCHAR   │
            │                       ││ encryption_auth_tag     │
            │                       ││ sender_key_fingerprint  │
            │                       ││ attachments JSONB       │ # [{url, filename}]
            │                       ││ read_by_receiver BOOL   │
            │                       ││ read_at TIMESTAMP       │
            │                       ││ metadata JSONB          │
            │                       ││ created_at TIMESTAMP    │
            │                       │└─────────────────────────┘
            │                       │
            │                       │┌─────────────────────────┐
            │                       ││   user_presence         │
            │                       │├─────────────────────────┤
            │                       ││ user_id UUID PK FK      │
            │                       ││ status VARCHAR          │ # ONLINE, AWAY, OFFLINE
            │                       ││ last_seen TIMESTAMP     │
            │                       ││ last_online TIMESTAMP   │
            │                       ││ socket_id VARCHAR       │
            │                       ││ metadata JSONB          │
            │                       │└─────────────────────────┘
            │                       │
            │                       │┌─────────────────────────┐
            │                       ││   lers_notifications    │
            │                       │├─────────────────────────┤
            │                       ││ id (UUID) PK            │
            │                       ││ user_id UUID FK         │
            │                       ││ request_id UUID FK      │
            │                       ││ type VARCHAR            │
            │                       ││ title VARCHAR           │
            │                       ││ message TEXT            │
            │                       ││ icon VARCHAR            │
            │                       ││ link VARCHAR            │
            │                       ││ priority VARCHAR        │
            │                       ││ read BOOLEAN            │
            │                       ││ read_at TIMESTAMP       │
            │                       ││ delivered BOOLEAN       │
            │                       ││ delivered_at TIMESTAMP  │
            │                       ││ email_sent BOOLEAN      │
            │                       ││ metadata JSONB          │
            │                       ││ created_at TIMESTAMP    │
            │                       │└─────────────────────────┘
            │                       │
            │                       └┐┌────────────────────────┐
            │                        ││ lers_provider_data_    │
            │                        ││    catalog             │
            │                        │├────────────────────────┤
            │                        ││ id (UUID) PK           │
            │                        ││ provider_tenant_id FK  │
            │                        ││ name VARCHAR           │
            │                        ││ description TEXT       │
            │                        ││ category VARCHAR       │
            │                        ││ sla_turnaround_hours   │ INT
            │                        ││ sla_business_hours_only│ BOOL
            │                        ││ actual_avg_turnaround  │ FLOAT
            │                        ││ actual_median          │
            │                        ││   _turnaround_hours    │ FLOAT
            │                        ││ sla_compliance_rate    │ FLOAT
            │                        ││ total_requests         │
            │                        ││   _fulfilled           │ INT
            │                        ││ required_fields JSONB  │
            │                        ││ required_legal_mandate │
            │                        ││ requires_court_order   │ BOOL
            │                        ││ output_format VARCHAR  │
            │                        ││ output_description     │
            │                        ││ sample_output_file     │
            │                        ││ is_active BOOLEAN      │
            │                        ││ is_featured BOOLEAN    │
            │                        ││ notes_for_law          │
            │                        ││   _enforcement TEXT    │
            │                        ││ created_at TIMESTAMP   │
            │                        │└────────────────────────┘
            │                        │
            │                        │┌────────────────────────┐
            │                        ││ lers_provider_service_ │
            │                        ││    profile             │
            │                        │├────────────────────────┤
            │                        ││ id (UUID) PK           │
            │                        ││ provider_tenant_id FK  │ UNIQUE
            │                        ││ service_hours VARCHAR  │
            │                        ││ holidays_affect_sla    │ BOOL
            │                        ││ nodal_officer_name     │
            │                        ││ nodal_officer_email    │
            │                        ││ nodal_officer_phone    │
            │                        ││ emergency_contact      │
            │                        ││ overall_sla_compliance │
            │                        ││   _rate FLOAT          │
            │                        ││ total_requests_received│ INT
            │                        ││ total_requests         │
            │                        ││   _completed INT       │
            │                        ││ avg_response_time_hours│ FLOAT
            │                        ││ rejection_rate FLOAT   │
            │                        ││ clarification_request  │
            │                        ││   _rate FLOAT          │
            │                        ││ iso_certified BOOLEAN  │
            │                        ││ data_security_certified│ BOOL
            │                        ││ service_commitment TEXT│
            │                        ││ metrics_last_updated   │
            │                        ││ created_at TIMESTAMP   │
            │                        │└────────────────────────┘
            │                        │
            └────────────────────────┘

INDEXES:
════════
- lers_requests: request_number, status, sla_due_date, created_by_id, provider_tenant_id
- lers_responses: request_id, submitted_at, status
- lers_messages: request_id + created_at, sender_id, read_by_receiver
- lers_notifications: user_id + read + created_at, priority
- user_presence: status, last_seen
- lers_provider_data_catalog: provider_tenant_id + category, sla_turnaround_hours
```

### Key Database Design Decisions

1. **UUID Primary Keys** - Better for distributed systems and security
2. **JSONB Fields** - Flexible schema for identifiers, metadata, attachments
3. **Soft Deletes** - is_deleted flag in BaseModel (not shown) for audit trail
4. **Timestamps** - created_at, updated_at on all tables
5. **Foreign Keys with SET_NULL** - Preserve data if user/tenant deleted
6. **Indexes on Query Patterns** - Optimized for dashboard queries and filtering

---

## 5. REAL-TIME COMMUNICATION ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│               REAL-TIME COMMUNICATION (SOCKET.IO)                        │
└──────────────────────────────────────────────────────────────────────────┘

LAW ENFORCEMENT CLIENT          SOCKET.IO SERVER          PROVIDER CLIENT
═══════════════════════         ═══════════════           ═══════════════

┌────────────────┐                                        ┌────────────────┐
│ Browser        │                                        │ Browser        │
│ (React + TS)   │                                        │ (React + TS)   │
└───────┬────────┘                                        └───────┬────────┘
        │                                                         │
        │ 1. Connect with JWT                                    │
        │ {token: 'eyJhbGc...'}                                  │
        │                                                         │
        ├──────────────────►┌────────────────────┐◄─────────────┤
        │                   │   SOCKET.IO        │              │
        │                   │   SERVER           │              │
        │                   │  (Async Python)    │              │
        │                   ├────────────────────┤              │
        │                   │ - Validate JWT     │              │
        │                   │ - Store sid→uid    │              │
        │                   │ - Update Presence  │              │
        │                   └────────┬───────────┘              │
        │                            │                          │
        │◄───────────────────────────┤                          │
        │ 2. Connection Accepted     │                          │
        │                            │                          │
        │ 3. join_chat({request_id}) │                          │
        ├────────────────────────────►                          │
        │                            │                          │
        │                   ┌────────┴───────────┐              │
        │                   │ Join Socket.IO Room│              │
        │                   │ `request_{id}`     │              │
        │                   └────────┬───────────┘              │
        │                            │                          │
        │                            │ 4. join_chat({request_id})
        │                            │◄─────────────────────────┤
        │                            │                          │
        │                   ┌────────┴───────────┐              │
        │                   │ Both users now in  │              │
        │                   │ same room          │              │
        │                   └────────┬───────────┘              │
        │                            │                          │
        │ 5. typing({is_typing:true})│                          │
        ├────────────────────────────►                          │
        │                            │                          │
        │                            ├──────────────────────────►
        │                            │ user_typing event        │
        │                            │                          │
        │ 6. send_message({msg_id})  │                          │
        ├────────────────────────────►                          │
        │                            │                          │
        │                   ┌────────┴───────────┐              │
        │                   │ Fetch message from │              │
        │                   │ database           │              │
        │                   └────────┬───────────┘              │
        │                            │                          │
        │◄───────────────────────────┼──────────────────────────►
        │ new_message event broadcast to room                   │
        │                            │                          │
        │                            │                          │
        │                            │ 7. PROVIDER uploads response
        │                            │                          │
        │                   ┌────────┴───────────┐              │
        │                   │ Create notification│              │
        │                   │ for IO             │              │
        │                   └────────┬───────────┘              │
        │                            │                          │
        │◄───────────────────────────┤                          │
        │ new_notification event     │                          │
        │ {type: 'RESPONSE_RECEIVED'}│                          │
        │                            │                          │
        │ 8. disconnect              │                          │
        ├────────────────────────────►                          │
        │                            │                          │
        │                   ┌────────┴───────────┐              │
        │                   │ Update presence    │              │
        │                   │ status: OFFLINE    │              │
        │                   │ Remove from rooms  │              │
        │                   └────────┬───────────┘              │
        │                            │                          │
        │                            ├──────────────────────────►
        │                            │ user_offline event       │
        │                            │                          │

SOCKET.IO EVENTS:
═════════════════

CLIENT → SERVER:
├─ connect (auth: {token})      # Initial connection
├─ join_chat (request_id)       # Join request chat room
├─ leave_chat (request_id)      # Leave request chat room
├─ send_message (msg_id)        # Broadcast new message
├─ typing (is_typing, request)  # Typing indicator
├─ update_presence (status)     # Change online status
└─ get_unread_count ()          # Fetch notification count

SERVER → CLIENT:
├─ user_online (user_id)        # User came online
├─ user_offline (user_id)       # User went offline
├─ user_joined_chat (user, req) # Someone joined chat
├─ user_left_chat (user, req)   # Someone left chat
├─ new_message (message)        # New chat message
├─ user_typing (user, is_typing)# Typing indicator
├─ new_notification (notif)     # Push notification
├─ presence_updated (user)      # Status changed
└─ unread_count (count)         # Notification count

REDIS INTEGRATION:
══════════════════

Socket.IO uses Redis for:
- Session storage (connected_users mapping)
- Presence data caching
- Pub/Sub for multi-instance scaling
- Room membership tracking
```

### WebSocket Connection Flow

1. **Authentication:**
   - Client sends JWT in connection handshake
   - Server validates token, extracts user_id
   - Creates user presence record (ONLINE status)

2. **Room Management:**
   - Each LERS request has its own Socket.IO room
   - Users join/leave rooms as they navigate
   - Messages broadcast only to room members

3. **Presence Tracking:**
   - Online/Away/Offline status in database
   - Last seen timestamp auto-updated
   - Broadcast presence changes to relevant users

4. **Message Delivery:**
   - Messages created via REST API first (stored in DB)
   - Socket.IO broadcasts message_id to room
   - Clients fetch full message details

5. **Notification Push:**
   - Background tasks create notifications in DB
   - Socket.IO pushes to online users
   - Offline users see notifications on next login

---

## 6. SECURITY ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     SECURITY ARCHITECTURE (LAYERED)                      │
└──────────────────────────────────────────────────────────────────────────┘

LAYER 1: NETWORK SECURITY
══════════════════════════

┌───────────────────────────────────────────────────────────────┐
│  INTERNET                                                      │
└─────────────────────────────┬─────────────────────────────────┘
                              │
                              │ HTTPS (TLS 1.3)
                              │ Strong Ciphers Only
                              │
                              ▼
                 ┌────────────────────────┐
                 │  FIREWALL / WAF        │
                 │  (DDoS Protection)     │
                 └────────────┬───────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  NGINX REVERSE PROXY   │
                 │  - SSL Termination     │
                 │  - Rate Limiting       │
                 │  - IP Whitelisting     │
                 └────────────┬───────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                                   │
            ▼                                   ▼
    ┌──────────────┐                  ┌──────────────┐
    │ Django       │                  │ Socket.IO    │
    │ Backend      │                  │ Server       │
    └──────────────┘                  └──────────────┘

LAYER 2: AUTHENTICATION & AUTHORIZATION
════════════════════════════════════════

┌────────────────────────────────────────────────────────────────┐
│  AUTHENTICATION FLOW                                           │
└────────────────────────────────────────────────────────────────┘

1. Login Request
   ├─ Email + Password
   ├─ Argon2 Password Verification
   ├─ MFA Check (Optional: TOTP)
   └─ Issue JWT Tokens (Access + Refresh)

2. JWT Structure:
   {
     "user_id": "uuid",
     "tenant_id": "uuid",
     "role": "IO" | "PROVIDER" | "APPROVER",
     "permissions": ["create_request", "approve", ...],
     "exp": timestamp,
     "iat": timestamp
   }

3. Request Authorization:
   ├─ Extract JWT from Authorization header
   ├─ Validate signature (SECRET_KEY)
   ├─ Check expiration
   ├─ Extract user + tenant
   ├─ Verify permissions
   └─ Allow/Deny request

┌────────────────────────────────────────────────────────────────┐
│  ROLE-BASED ACCESS CONTROL (RBAC)                             │
└────────────────────────────────────────────────────────────────┘

ROLES:
├─ SUPER_ADMIN (Platform Admin)
│  └─ Full access to all tenants
│
├─ IO (Investigating Officer)
│  ├─ Create LERS requests
│  ├─ View own requests
│  ├─ Chat with providers
│  └─ Download responses
│
├─ APPROVER (SHO/DSP/SP)
│  ├─ View pending approvals
│  ├─ Approve/Reject requests
│  ├─ Add approval notes
│  └─ Digital signature
│
└─ PROVIDER (Data Provider Staff)
   ├─ View assigned requests
   ├─ Upload responses
   ├─ Chat with IO
   ├─ Manage catalog
   └─ View performance metrics

LAYER 3: DATA ENCRYPTION
═════════════════════════

┌────────────────────────────────────────────────────────────────┐
│  ENCRYPTION AT REST                                            │
└────────────────────────────────────────────────────────────────┘

DATABASE ENCRYPTION:
├─ Sensitive Fields (AES-256-GCM):
│  ├─ Identifiers (phone, PAN, account number)
│  ├─ User passwords (Argon2 hash)
│  └─ Digital signatures
│
├─ Encryption Key Management:
│  ├─ Master key: EVIDENCE_ENCRYPTION_KEY (env var)
│  ├─ Key rotation support
│  └─ Hardware Security Module (HSM) in production
│
└─ Full Disk Encryption (Server Level):
   └─ LUKS or cloud provider encryption

FILE STORAGE ENCRYPTION:
├─ MinIO/S3 Server-Side Encryption (SSE-S3)
├─ Legal mandate PDFs encrypted
├─ Response files encrypted
└─ Evidence attachments encrypted

┌────────────────────────────────────────────────────────────────┐
│  ENCRYPTION IN TRANSIT                                         │
└────────────────────────────────────────────────────────────────┘

TLS 1.3 Configuration:
├─ Cipher Suites:
│  ├─ TLS_AES_256_GCM_SHA384
│  ├─ TLS_CHACHA20_POLY1305_SHA256
│  └─ TLS_AES_128_GCM_SHA256
│
├─ Certificate:
│  ├─ Let's Encrypt (auto-renewal)
│  └─ 2048-bit RSA or ECDSA
│
└─ HSTS Enabled (Strict-Transport-Security)

E2E CHAT ENCRYPTION (Optional):
├─ RSA-2048 Key Pair per user
├─ Hybrid Encryption:
│  ├─ AES-256-GCM for message content
│  └─ RSA for encrypting AES key
│
└─ Only sender and receiver can decrypt

LAYER 4: AUDIT & COMPLIANCE
════════════════════════════

┌────────────────────────────────────────────────────────────────┐
│  AUDIT TRAIL                                                   │
└────────────────────────────────────────────────────────────────┘

Every Action Logged:
├─ What: Event type (CREATE, UPDATE, DELETE, APPROVE, etc.)
├─ Who: User ID, email, role
├─ When: Precise timestamp (microsecond)
├─ Where: IP address, user agent
├─ Why: Context (request ID, notes, etc.)
└─ How: Action details (old vs new values)

Tamper-Proof Mechanism:
├─ Blockchain-style hash chaining
├─ Each log entry hashes: content + previous_hash
├─ Tampering breaks the chain
└─ Exportable for court evidence

Retention:
├─ Logs retained for 7 years (Indian legal requirement)
├─ Compressed after 1 year
└─ Archived to cold storage after 3 years

LAYER 5: VULNERABILITY PROTECTION
═══════════════════════════════════

SQL Injection:
└─ Django ORM (parameterized queries)

XSS (Cross-Site Scripting):
├─ React auto-escapes
└─ Content Security Policy (CSP) headers

CSRF (Cross-Site Request Forgery):
├─ CSRF tokens on all POST/PUT/DELETE
└─ SameSite cookies

Clickjacking:
└─ X-Frame-Options: DENY

DDoS Protection:
├─ Rate limiting (Redis-based)
├─ IP-based throttling
└─ Cloudflare/AWS Shield

API Abuse:
├─ Rate limits per user (100 req/min)
├─ JWT expiration (15 min access, 7 day refresh)
└─ Brute force protection (account lockout)

File Upload Security:
├─ Virus scanning (ClamAV)
├─ File type validation (magic bytes)
├─ Size limits (50MB max)
└─ Quarantine suspicious files
```

---

## 7. DEPLOYMENT ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                  PRODUCTION DEPLOYMENT ARCHITECTURE                      │
└──────────────────────────────────────────────────────────────────────────┘

CLOUD INFRASTRUCTURE (AWS Example)
═══════════════════════════════════

┌────────────────────────────────────────────────────────────────────┐
│  AWS REGION: ap-south-1 (Mumbai)                                   │
└────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────┐
                         │  ROUTE 53 (DNS) │
                         │  lers.police.gov│
                         └────────┬────────┘
                                  │
                                  ▼
                 ┌────────────────────────────┐
                 │  CLOUDFRONT (CDN)          │
                 │  - Static Assets           │
                 │  - DDoS Protection         │
                 └────────────┬───────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  APPLICATION LOAD BALANCER (ALB)       │
         │  - SSL Termination                     │
         │  - Health Checks                       │
         │  - Auto Scaling Integration            │
         └────────────┬───────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │                           │
        ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│  TARGET GROUP 1  │      │  TARGET GROUP 2  │
│  (Backend API)   │      │  (Socket.IO)     │
└────────┬─────────┘      └────────┬─────────┘
         │                         │
         │                         │
    ┌────┴────┐              ┌────┴────┐
    │         │              │         │
    ▼         ▼              ▼         ▼
┌──────┐  ┌──────┐      ┌──────┐  ┌──────┐
│ EC2  │  │ EC2  │      │ EC2  │  │ EC2  │
│ Inst │  │ Inst │      │ Inst │  │ Inst │
│  1   │  │  2   │      │  3   │  │  4   │
└──┬───┘  └──┬───┘      └──┬───┘  └──┬───┘
   │         │             │         │
   └─────────┴─────────────┴─────────┘
              │
              │ VPC Private Subnet
              │
   ┌──────────┼──────────────────────────────┐
   │          │                              │
   ▼          ▼                              ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  RDS PostgreSQL  │  │ ElastiCache      │  │  S3 Bucket       │
│  (Multi-AZ)      │  │ Redis (Cluster)  │  │  (Private)       │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ - Master + Read  │  │ - Redis Cluster  │  │ - Evidence Files │
│   Replicas       │  │ - 3 Nodes        │  │ - Legal Mandates │
│ - Auto Backups   │  │ - Automatic      │  │ - Responses      │
│ - Encryption     │  │   Failover       │  │ - Encrypted      │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  DOCKER DEPLOYMENT (EC2 Instances)                            │
└────────────────────────────────────────────────────────────────┘

EC2 Instance (Ubuntu 22.04 LTS):

├─ Docker Compose Stack:
│  ├─ backend (Django + Gunicorn)
│  │  ├─ 4 workers
│  │  ├─ Auto-restart
│  │  └─ Health check endpoint
│  │
│  ├─ celery_worker
│  │  ├─ 4 concurrent tasks
│  │  └─ SLA monitoring
│  │
│  ├─ celery_beat
│  │  └─ Scheduled tasks
│  │
│  └─ socket_server (Socket.IO)
│     ├─ Sticky sessions
│     └─ Redis pub/sub
│
├─ Monitoring:
│  ├─ CloudWatch Agent
│  ├─ Application logs → CloudWatch Logs
│  └─ Metrics → CloudWatch Metrics
│
└─ Security:
   ├─ IAM Role (no hardcoded credentials)
   ├─ Security Groups (firewall rules)
   └─ VPC Isolation (private subnets)

┌────────────────────────────────────────────────────────────────┐
│  AUTO SCALING CONFIGURATION                                    │
└────────────────────────────────────────────────────────────────┘

Backend Auto Scaling Group:
├─ Min Instances: 2
├─ Max Instances: 10
├─ Desired: 2
│
├─ Scale-Out Triggers:
│  ├─ CPU > 70% for 5 minutes
│  └─ Active Connections > 1000
│
└─ Scale-In Triggers:
   ├─ CPU < 30% for 15 minutes
   └─ Active Connections < 200

Socket.IO Auto Scaling Group:
├─ Min Instances: 2
├─ Max Instances: 6
├─ Desired: 2
│
└─ Scale-Out Triggers:
   └─ Active WebSocket Connections > 5000

┌────────────────────────────────────────────────────────────────┐
│  DISASTER RECOVERY & BACKUP                                    │
└────────────────────────────────────────────────────────────────┘

RDS Backups:
├─ Automated Daily Backups (7-day retention)
├─ Manual Snapshots before deployments
├─ Point-in-Time Recovery (PITR)
└─ Cross-Region Replication (DR)

S3 Backups:
├─ Versioning Enabled
├─ Cross-Region Replication
├─ Glacier Archival (old files)
└─ Lifecycle Policies

Application Backups:
├─ Database dump daily to S3
├─ Redis AOF persistence
└─ Configuration files in Git

Recovery Time Objective (RTO): 1 hour
Recovery Point Objective (RPO): 15 minutes

┌────────────────────────────────────────────────────────────────┐
│  MONITORING & ALERTING                                         │
└────────────────────────────────────────────────────────────────┘

Metrics Tracked:
├─ Application Metrics:
│  ├─ Request latency (p50, p95, p99)
│  ├─ Error rate (5xx responses)
│  ├─ Active requests
│  └─ Database query time
│
├─ Infrastructure Metrics:
│  ├─ CPU utilization
│  ├─ Memory usage
│  ├─ Disk I/O
│  └─ Network throughput
│
└─ Business Metrics:
   ├─ Requests created per hour
   ├─ SLA breach rate
   ├─ Average response time
   └─ Provider performance

Alerting:
├─ Critical Alerts → PagerDuty (24/7)
├─ Warning Alerts → Slack
├─ Email Reports → Daily/Weekly
└─ SLA Breaches → SMS to Approvers

Log Aggregation:
├─ All logs → CloudWatch Logs
├─ Searchable via CloudWatch Insights
├─ Retention: 90 days (hot), 7 years (cold)
└─ Export to S3 for compliance
```

---

**End of Architecture Diagrams Document**

**Next Documents:**
- Law Enforcement Portal Features (In-depth)
- Provider Portal Features (In-depth)
- LERS Workflows & Lifecycle Management
- Security Architecture (Extended)
- Deployment Guide (Step-by-step)
- Indian Compliance & Legal Requirements
