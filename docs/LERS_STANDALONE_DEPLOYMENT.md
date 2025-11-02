# LERS Standalone Platform - Deployment Guide

**Complete guide for deploying the Law Enforcement Request System as an independent platform**

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Deployment Steps](#detailed-deployment-steps)
5. [Configuration](#configuration)
6. [Post-Deployment Setup](#post-deployment-setup)
7. [Running Alongside CMS](#running-alongside-cms)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

---

## Overview

The standalone LERS platform is a completely independent deployment separate from the case management system. It provides:

- **Independent Infrastructure**: Separate databases, Redis, MinIO, and all services
- **Different Ports**: No conflicts with existing CMS deployment
- **Isolated Data**: Complete data separation for security and compliance
- **Scalable Architecture**: Can be deployed on separate servers or cloud infrastructure

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    LERS STANDALONE PLATFORM                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │LE Portal    │  │Provider     │  │   Nginx     │             │
│  │(Port 3100)  │  │Portal       │  │(Ports 8080/ │             │
│  │             │  │(Port 3101)  │  │     8443)   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                 │                 │                     │
│         └─────────────────┴─────────────────┘                     │
│                           │                                       │
│                ┌──────────┴──────────┐                           │
│                │                     │                           │
│         ┌──────▼──────┐      ┌──────▼──────┐                    │
│         │ Backend API │      │  Socket.IO  │                    │
│         │(Port 8100)  │      │ (Port 8102) │                    │
│         └──────┬──────┘      └──────┬──────┘                    │
│                │                     │                           │
│         ┌──────┴──────┬──────────────┴──────┬──────────┐        │
│         │             │                     │          │        │
│    ┌────▼─────┐  ┌───▼────┐  ┌──────▼──────┐  ┌──────▼──────┐ │
│    │PostgreSQL│  │ Redis  │  │   MinIO     │  │   Celery    │ │
│    │(Port     │  │(Port   │  │(Ports 9002/ │  │  Workers    │ │
│    │ 5434)    │  │ 6380)  │  │     9003)   │  │   & Beat    │ │
│    └──────────┘  └────────┘  └─────────────┘  └─────────────┘ │
│                                                                   │
│               Network: lers_network (172.28.0.0/16)              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### System Requirements

- **OS**: Ubuntu 20.04+ / Debian 11+ / RHEL 8+ (or compatible Linux)
- **RAM**: Minimum 8GB (16GB recommended for production)
- **CPU**: 4 cores minimum (8+ recommended for production)
- **Disk**: 50GB minimum (SSD recommended)
- **Ports**: 3100, 3101, 5434, 6380, 8080, 8100, 8102, 8443, 9002, 9003

### Software Prerequisites

```bash
# Docker Engine 20.10+
docker --version

# Docker Compose 2.0+
docker-compose --version

# Git (for cloning repository)
git --version
```

### Install Docker (Ubuntu/Debian)

```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker-compose --version
```

---

## Quick Start

For users who want to get up and running immediately:

```bash
# 1. Navigate to project directory
cd "/home/arun/Downloads/Stealth Project"

# 2. Generate secure secrets (IMPORTANT!)
./scripts/generate-secrets.sh

# 3. Configure environment (edit .env.lers-standalone)
nano .env.lers-standalone

# 4. Start the platform
docker-compose -f docker-compose.lers-standalone.yml up -d

# 5. Wait for services to start (2-3 minutes)
docker-compose -f docker-compose.lers-standalone.yml logs -f

# 6. Initialize database and default data
docker exec lers_backend python manage.py migrate --settings=lers_standalone.settings
docker exec lers_backend python manage.py create_lers_default_data --settings=lers_standalone.settings

# 7. Access the platform
# Law Enforcement Portal: http://localhost:3100
# Provider Portal: http://localhost:3101
# Admin Panel: http://localhost:8100/admin/
# API Docs: http://localhost:8100/api/docs/
```

**Default Credentials** (CHANGE IMMEDIATELY):
- **Admin**: admin@lers.gov.in / Admin@123
- **IO**: io@sample.police.gov.in / Officer@123
- **Provider**: compliance@sampletech.com / Provider@123

---

## Detailed Deployment Steps

### Step 1: Prepare Environment

```bash
# Clone or navigate to project
cd "/home/arun/Downloads/Stealth Project"

# Verify file structure
ls -la
# Should see:
# - docker-compose.lers-standalone.yml
# - .env.lers-standalone
# - backend/
# - nginx/
# - scripts/
```

### Step 2: Generate Secrets

**CRITICAL**: Never use default secrets in production!

```bash
# Generate secure random secrets
./scripts/generate-secrets.sh
```

This script generates:
- `SECRET_KEY`: Django secret key (64 characters)
- `JWT_SECRET_KEY`: JWT signing key (64 characters)
- `EVIDENCE_ENCRYPTION_KEY`: Base64-encoded 32-byte key
- `POSTGRES_PASSWORD`: Database password
- `REDIS_PASSWORD`: Redis password
- `MINIO_ROOT_PASSWORD`: MinIO admin password

### Step 3: Configure Environment

Edit `.env.lers-standalone`:

```bash
nano .env.lers-standalone
```

**Required Configuration**:

```bash
# ═══════════════════════════════════════════════════════════════════
# ENVIRONMENT
# ═══════════════════════════════════════════════════════════════════

ENVIRONMENT=production
DEBUG=False

# ═══════════════════════════════════════════════════════════════════
# SECURITY (CHANGE THESE!)
# ═══════════════════════════════════════════════════════════════════

SECRET_KEY=your-secret-key-here-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-here-change-in-production
EVIDENCE_ENCRYPTION_KEY=your-encryption-key-here-base64-encoded

# ═══════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════

POSTGRES_DB=lers_db
POSTGRES_USER=lers_admin
POSTGRES_PASSWORD=lers_secure_pass_2025_change_this
POSTGRES_PORT=5434

# ═══════════════════════════════════════════════════════════════════
# CORS & ALLOWED HOSTS (Update with your domain)
# ═══════════════════════════════════════════════════════════════════

ALLOWED_HOSTS=localhost,127.0.0.1,lers.yourdomain.com
CORS_ALLOWED_ORIGINS=https://lers.yourdomain.com,https://provider.lers.yourdomain.com

# ═══════════════════════════════════════════════════════════════════
# EMAIL (Optional - for notifications)
# ═══════════════════════════════════════════════════════════════════

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@domain.com
EMAIL_HOST_PASSWORD=your-email-password

# ═══════════════════════════════════════════════════════════════════
# PLATFORM BRANDING
# ═══════════════════════════════════════════════════════════════════

PLATFORM_NAME=LERS Platform
PLATFORM_TAGLINE=Law Enforcement Request System
SUPPORT_EMAIL=support@lers.yourdomain.com
```

### Step 4: Build and Start Services

```bash
# Build images (first time only, or after code changes)
docker-compose -f docker-compose.lers-standalone.yml build

# Start all services in detached mode
docker-compose -f docker-compose.lers-standalone.yml up -d

# Verify all services are running
docker-compose -f docker-compose.lers-standalone.yml ps
```

Expected output:
```
NAME                      STATUS              PORTS
lers_backend              Up                  0.0.0.0:8100->8000/tcp
lers_celery_beat          Up
lers_celery_worker        Up
lers_le_portal            Up                  0.0.0.0:3100->3000/tcp
lers_minio                Up                  0.0.0.0:9002->9000/tcp, 0.0.0.0:9003->9001/tcp
lers_nginx                Up                  0.0.0.0:8080->80/tcp, 0.0.0.0:8443->443/tcp
lers_postgres             Up                  0.0.0.0:5434->5432/tcp
lers_provider_portal      Up                  0.0.0.0:3101->3001/tcp
lers_redis                Up                  0.0.0.0:6380->6379/tcp
lers_socket_server        Up                  0.0.0.0:8102->8001/tcp
```

### Step 5: Monitor Startup

```bash
# Watch logs from all services
docker-compose -f docker-compose.lers-standalone.yml logs -f

# Watch specific service
docker-compose -f docker-compose.lers-standalone.yml logs -f lers_backend

# Check backend health
curl http://localhost:8100/api/v1/health/
```

### Step 6: Database Initialization

```bash
# Run database migrations
docker exec lers_backend python manage.py migrate --settings=lers_standalone.settings

# Create default data (tenants, users, providers)
docker exec lers_backend python manage.py create_lers_default_data --settings=lers_standalone.settings

# (Optional) Create superuser manually
docker exec -it lers_backend python manage.py createsuperuser --settings=lers_standalone.settings
```

### Step 7: Verify Deployment

```bash
# Check service health
curl http://localhost:8100/api/v1/health/

# Test Socket.IO connection
curl http://localhost:8102/socket.io/

# Access MinIO console
# URL: http://localhost:9003
# Username: lers_minio_admin
# Password: (from .env.lers-standalone)

# Test database connection
docker exec lers_postgres psql -U lers_admin -d lers_db -c "SELECT version();"

# Test Redis connection
docker exec lers_redis redis-cli -a lers_redis_pass_2025 ping
```

---

## Configuration

### Frontend Configuration

**Law Enforcement Portal** (`frontend_lers_le/.env`):

```bash
REACT_APP_API_URL=http://localhost:8100/api/v1
REACT_APP_SOCKET_URL=http://localhost:8102
REACT_APP_PLATFORM_NAME=LERS Law Enforcement Portal
```

**Provider Portal** (`frontend_lers_provider/.env`):

```bash
VITE_API_URL=http://localhost:8100/api/v1
VITE_SOCKET_URL=http://localhost:8102
VITE_PLATFORM_NAME=LERS Provider Portal
```

### Database Configuration

PostgreSQL runs on port **5434** (not default 5432) to avoid conflicts.

```bash
# Connect to database
docker exec -it lers_postgres psql -U lers_admin -d lers_db

# Backup database
docker exec lers_postgres pg_dump -U lers_admin lers_db > lers_backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i lers_postgres psql -U lers_admin lers_db < lers_backup_20250102.sql
```

### Redis Configuration

Redis runs on port **6380** (not default 6379) to avoid conflicts.

```bash
# Connect to Redis
docker exec -it lers_redis redis-cli -a lers_redis_pass_2025

# Monitor Redis activity
docker exec lers_redis redis-cli -a lers_redis_pass_2025 MONITOR

# Check Redis info
docker exec lers_redis redis-cli -a lers_redis_pass_2025 INFO
```

### MinIO Configuration

MinIO S3-compatible object storage:
- **API Port**: 9002
- **Console Port**: 9003

```bash
# Access MinIO console
http://localhost:9003

# Create bucket via CLI
docker exec lers_minio mc alias set lers http://localhost:9000 lers_minio_admin lers_minio_pass_2025
docker exec lers_minio mc mb lers/lers-evidence
docker exec lers_minio mc policy set download lers/lers-evidence
```

---

## Post-Deployment Setup

### 1. Change Default Passwords

```bash
# Change superuser password
docker exec -it lers_backend python manage.py changepassword admin@lers.gov.in --settings=lers_standalone.settings
```

### 2. Configure Email Notifications

Edit `.env.lers-standalone`:

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=notifications@yourdomain.com
EMAIL_HOST_PASSWORD=your-app-password
```

Restart backend:
```bash
docker-compose -f docker-compose.lers-standalone.yml restart lers_backend
```

### 3. Add Data Providers

Via Admin Panel (http://localhost:8100/admin/):
1. Login with superuser credentials
2. Navigate to "LERS" → "Provider Data Catalogs"
3. Add real provider information

Or via Django shell:
```bash
docker exec -it lers_backend python manage.py shell --settings=lers_standalone.settings
```

```python
from apps.lers.models import ProviderDataCatalog
from apps.tenants.models import Tenant

# Get provider tenant
provider = Tenant.objects.get(tenant_type='DATA_PROVIDER')

# Create catalog entry
ProviderDataCatalog.objects.create(
    provider_name='Real Company Name',
    provider_tenant=provider,
    data_category='TELECOM',
    description='Telecom data provider',
    available_data_types=['CDR', 'SMS', 'Location'],
    typical_response_time_hours=72,
    is_active=True
)
```

### 4. Configure SLA Settings

```bash
# Default SLA hours (7 days)
DEFAULT_SLA_HOURS=168

# Urgent SLA hours (2 days)
URGENT_SLA_HOURS=48

# Critical SLA hours (1 day)
CRITICAL_SLA_HOURS=24
```

---

## Running Alongside CMS

The standalone LERS platform can run simultaneously with the existing CMS deployment:

### Port Mapping Comparison

| Service | CMS Port | LERS Port |
|---------|----------|-----------|
| Backend API | 8000 | **8100** |
| Socket.IO | 8002 | **8102** |
| Frontend (LE) | 3000 | **3100** |
| Frontend (Provider) | 3001 | **3101** |
| PostgreSQL | 5433 | **5434** |
| Redis | 6379 | **6380** |
| MinIO API | 9000 | **9002** |
| MinIO Console | 9001 | **9003** |
| Nginx HTTP | 80 | **8080** |
| Nginx HTTPS | 443 | **8443** |

### Start Both Systems

```bash
# Start CMS
docker-compose up -d

# Start LERS (different ports)
docker-compose -f docker-compose.lers-standalone.yml up -d

# Verify both running
docker ps | grep -E "cms_|lers_"
```

### Resource Considerations

Running both systems requires adequate resources:
- **RAM**: 16GB minimum, 32GB recommended
- **CPU**: 8 cores minimum
- **Disk**: 100GB minimum

---

## Production Deployment

### 1. SSL/TLS Configuration

Generate SSL certificates (Let's Encrypt recommended):

```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d lers.yourdomain.com -d provider.lers.yourdomain.com

# Copy certificates to nginx/ssl/
sudo cp /etc/letsencrypt/live/lers.yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/lers.yourdomain.com/privkey.pem nginx/ssl/key.pem
```

Update `nginx/lers-conf.d/default.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name lers.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # ... rest of configuration
}
```

### 2. Firewall Configuration

```bash
# Allow LERS ports
sudo ufw allow 8080/tcp comment "LERS HTTP"
sudo ufw allow 8443/tcp comment "LERS HTTPS"
sudo ufw allow 3100/tcp comment "LERS LE Portal"
sudo ufw allow 3101/tcp comment "LERS Provider Portal"

# Block direct access to internal services
sudo ufw deny 5434/tcp comment "Block PostgreSQL"
sudo ufw deny 6380/tcp comment "Block Redis"
sudo ufw deny 8100/tcp comment "Block Backend API (use Nginx)"
```

### 3. Performance Tuning

**Docker Compose** (`docker-compose.lers-standalone.yml`):

```yaml
lers_backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 4G
      reservations:
        cpus: '1'
        memory: 2G
```

**PostgreSQL Tuning**:

```bash
# Edit postgresql.conf
docker exec -it lers_postgres bash
vi /var/lib/postgresql/data/postgresql.conf

# Recommended settings for 8GB RAM
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 32MB
max_connections = 200
```

### 4. Monitoring

**Health Check Endpoints**:

```bash
# Backend health
curl http://localhost:8100/api/v1/health/

# Database health
docker exec lers_postgres pg_isready -U lers_admin

# Redis health
docker exec lers_redis redis-cli -a lers_redis_pass_2025 ping

# Celery worker health
docker exec lers_celery_worker celery -A lers_standalone inspect ping
```

**Log Monitoring**:

```bash
# View all logs
docker-compose -f docker-compose.lers-standalone.yml logs -f

# Export logs
docker-compose -f docker-compose.lers-standalone.yml logs --no-color > lers_logs_$(date +%Y%m%d).log

# Monitor specific service
docker logs -f lers_backend
```

### 5. Backup Strategy

**Daily Automated Backup Script**:

```bash
#!/bin/bash
# /opt/lers/backup.sh

BACKUP_DIR="/opt/lers/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker exec lers_postgres pg_dump -U lers_admin lers_db | gzip > "$BACKUP_DIR/lers_db_$DATE.sql.gz"

# Backup MinIO data
docker exec lers_minio mc mirror lers/lers-evidence "$BACKUP_DIR/minio_$DATE/"

# Backup Redis data
docker exec lers_redis redis-cli -a lers_redis_pass_2025 --rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Rotate old backups (keep last 7 days)
find "$BACKUP_DIR" -name "lers_db_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "minio_*" -mtime +7 -exec rm -rf {} \;
find "$BACKUP_DIR" -name "redis_*.rdb" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Add to crontab:
```bash
# Daily at 2 AM
0 2 * * * /opt/lers/backup.sh >> /var/log/lers_backup.log 2>&1
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error**: `bind: address already in use`

**Solution**:
```bash
# Check what's using the port
sudo lsof -i :8100

# Stop conflicting service or change LERS port
# Edit .env.lers-standalone:
BACKEND_PORT=8200  # Use different port
```

#### 2. Database Connection Failed

**Error**: `could not connect to server: Connection refused`

**Solution**:
```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.lers-standalone.yml ps lers_postgres

# Check PostgreSQL logs
docker logs lers_postgres

# Restart PostgreSQL
docker-compose -f docker-compose.lers-standalone.yml restart lers_postgres

# Wait for health check
docker-compose -f docker-compose.lers-standalone.yml logs -f lers_postgres
```

#### 3. Frontend Cannot Connect to Backend

**Error**: `Network Error` or `CORS Error`

**Solution**:
```bash
# Verify CORS_ALLOWED_ORIGINS in .env.lers-standalone
CORS_ALLOWED_ORIGINS=http://localhost:3100,http://localhost:3101

# Restart backend
docker-compose -f docker-compose.lers-standalone.yml restart lers_backend

# Check backend logs
docker logs -f lers_backend
```

#### 4. Socket.IO Connection Failed

**Error**: `WebSocket connection failed`

**Solution**:
```bash
# Check Socket.IO server
docker logs lers_socket_server

# Verify JWT_SECRET_KEY matches between backend and socket server
# Both should use same .env.lers-standalone

# Restart socket server
docker-compose -f docker-compose.lers-standalone.yml restart lers_socket_server
```

#### 5. Celery Workers Not Processing Tasks

**Solution**:
```bash
# Check Celery worker status
docker exec lers_celery_worker celery -A lers_standalone inspect active

# Check Celery logs
docker logs -f lers_celery_worker

# Restart Celery worker
docker-compose -f docker-compose.lers-standalone.yml restart lers_celery_worker

# Check Celery Beat scheduler
docker logs -f lers_celery_beat
```

### Debug Mode

Enable debug mode for detailed error messages:

```bash
# Edit .env.lers-standalone
DEBUG=True
LOG_LEVEL=DEBUG

# Restart services
docker-compose -f docker-compose.lers-standalone.yml restart lers_backend lers_socket_server

# View debug logs
docker logs -f lers_backend
```

### Reset and Start Fresh

```bash
# Stop all services
docker-compose -f docker-compose.lers-standalone.yml down

# Remove all data (CAUTION: This deletes everything!)
docker-compose -f docker-compose.lers-standalone.yml down -v

# Remove images
docker-compose -f docker-compose.lers-standalone.yml down --rmi all

# Start fresh
docker-compose -f docker-compose.lers-standalone.yml up -d --build
```

---

## Maintenance

### Regular Maintenance Tasks

#### Weekly

```bash
# Check disk usage
df -h
docker system df

# Clean up unused Docker resources
docker system prune -a

# Check logs for errors
docker-compose -f docker-compose.lers-standalone.yml logs --tail=1000 | grep -i error

# Update provider performance metrics
docker exec lers_backend python manage.py shell --settings=lers_standalone.settings <<EOF
from apps.lers.tasks import calculate_all_provider_grades
calculate_all_provider_grades()
EOF
```

#### Monthly

```bash
# Update Docker images
docker-compose -f docker-compose.lers-standalone.yml pull
docker-compose -f docker-compose.lers-standalone.yml up -d

# Vacuum database
docker exec lers_postgres psql -U lers_admin -d lers_db -c "VACUUM ANALYZE;"

# Check database size
docker exec lers_postgres psql -U lers_admin -d lers_db -c "SELECT pg_size_pretty(pg_database_size('lers_db'));"

# Rotate logs
docker-compose -f docker-compose.lers-standalone.yml logs --no-color > "lers_logs_archive_$(date +%Y%m).log"
```

### Updating the Platform

```bash
# 1. Backup first
/opt/lers/backup.sh

# 2. Pull latest code
git pull origin main

# 3. Rebuild images
docker-compose -f docker-compose.lers-standalone.yml build

# 4. Stop services
docker-compose -f docker-compose.lers-standalone.yml down

# 5. Start with new images
docker-compose -f docker-compose.lers-standalone.yml up -d

# 6. Run migrations
docker exec lers_backend python manage.py migrate --settings=lers_standalone.settings

# 7. Collect static files
docker exec lers_backend python manage.py collectstatic --noinput --settings=lers_standalone.settings

# 8. Verify deployment
curl http://localhost:8100/api/v1/health/
```

### Scaling Services

**Horizontal Scaling** (multiple instances):

```yaml
# docker-compose.lers-standalone.yml

lers_backend:
  # ... existing config
  deploy:
    replicas: 3  # Run 3 backend instances

lers_celery_worker:
  # ... existing config
  deploy:
    replicas: 4  # Run 4 worker instances
```

**Vertical Scaling** (more resources):

```yaml
lers_backend:
  # ... existing config
  deploy:
    resources:
      limits:
        cpus: '4'      # Increase CPU
        memory: 8G     # Increase RAM
```

---

## Support

For issues, questions, or contributions:

- **Documentation**: `/docs/` directory
- **API Docs**: http://localhost:8100/api/docs/
- **Admin Panel**: http://localhost:8100/admin/
- **Support Email**: support@lers.yourdomain.com

---

## Appendix: Complete File Structure

```
/home/arun/Downloads/Stealth Project/
├── .env.lers-standalone                 # Environment configuration
├── docker-compose.lers-standalone.yml   # Docker Compose config
├── backend/
│   ├── Dockerfile.lers-standalone       # Backend Dockerfile
│   ├── lers_standalone/                 # Django settings package
│   │   ├── __init__.py
│   │   ├── settings.py                  # Django settings
│   │   ├── urls.py                      # URL routing
│   │   ├── wsgi.py                      # WSGI application
│   │   └── celery.py                    # Celery configuration
│   ├── socket_server_lers.py            # Socket.IO server
│   └── apps/
│       └── lers/
│           └── management/
│               └── commands/
│                   └── create_lers_default_data.py
├── scripts/
│   └── init-lers-db.sql                 # Database initialization
├── nginx/
│   ├── lers-nginx.conf                  # Main Nginx config
│   └── lers-conf.d/
│       └── default.conf                 # Server blocks
└── docs/
    └── LERS_STANDALONE_DEPLOYMENT.md   # This file
```

---

**End of Deployment Guide**

*Last updated: 2025-01-02*
