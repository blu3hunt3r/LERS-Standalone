# LERS Standalone - Login Credentials

## Access URLs

- **LERS Portal (Law Enforcement)**: http://localhost:3100/lers/portal/login
- **Provider Portal (Companies)**: http://localhost:3100/lers/provider/login
- **Django Admin**: http://localhost:8100/admin/

---

## Working Demo Credentials

### LERS Portal (Law Enforcement)
Login at: http://localhost:3100/lers/portal/login

```
Email: io@sample.police.gov.in
Password: TestPass123
Role: Investigating Officer (IO)
```

### Provider Portal (Service Providers)
Login at: http://localhost:3100/lers/provider/login

```
Email: nodal.officer@airtel.in
Password: AirtelPass123
Role: Company Agent (LERS)
Company: Airtel India
```

### Django Admin Portal
Login at: http://localhost:8100/admin/

```
Email: admin@lers.gov.in
Password: AdminPass123
Role: Admin
```

---

## Notes

- All credentials have been reset and verified working
- The LERS Portal is for law enforcement officers to create and manage LERS requests
- The Provider Portal is for companies (Airtel, Jio, etc.) to respond to LERS requests
- Use Django Admin to manage users, view database records, and system configuration

---

## Architecture

This is a **standalone LERS (Law Enforcement Request System)** with:
- ✅ LERS Portal for Law Enforcement
- ✅ Provider Portal for Data Providers
- ❌ NO CMS (Case Management System) - removed completely

The backend contains stub models for cases/evidence but they exist only for database compatibility and have NO functionality or routes.
