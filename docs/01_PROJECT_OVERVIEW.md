# AUIP Platform — Project Overview

> **Adaptive University Intelligence Platform**
> A Governance-Brain Driven, Personalized, and Placement-Centric University Operating System

---

## 1. What Is AUIP?

AUIP is an enterprise-grade platform designed to replace the manual, Excel-heavy workflows that universities currently use to manage student placements. It covers the entire lifecycle: from **institutional onboarding** and **student identity provisioning** to (planned) **AI-driven placement readiness scoring** and **automated eligibility filtering**.

The platform's core philosophy is: **Identity is institution-provisioned, not user-created.** Students do not "create accounts" — they confirm identities that have been pre-seeded by their institution. This ensures zero wasted resources on dormant accounts.

---

## 2. Core Problem Statement

In traditional university placement systems:

- Students directly register on a portal, creating accounts immediately — even if they never use the system.
- No strict institutional control over who can register.
- No separation between students who are merely eligible and those who are actually active.
- Placement management is done via Excel spreadsheets and manual coordination.
- No data isolation between institutions.

**AUIP solves this with:**

| Problem | AUIP Solution |
|---------|---------------|
| Uncontrolled student registration | Institution-driven pre-seeding (only invited students can register) |
| Wasted resources on dormant accounts | Accounts and resources allocated only after activation |
| No data isolation between institutions | PostgreSQL schema-based multi-tenancy (`CREATE SCHEMA inst_<name>`) |
| Manual placement workflows | Dynamic eligibility rule engine (planned) |
| No personalization | AI Governance Brain for readiness scoring (planned) |

---

## 3. Technology Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Django | 5.x | Web framework |
| Django REST Framework | — | RESTful API layer |
| PostgreSQL | 15 | Primary database (Supabase-hosted in dev) |
| Redis | 7 | Caching, session store, rate limiting |
| Django Channels | — | WebSocket support (session sync) |
| django-tenants | — | Multi-tenant schema isolation |
| Python | 3.11+ | Language |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18+ | UI framework |
| TypeScript | — | Type safety |
| Vite | — | Build tool & dev server |
| Tailwind CSS | — | Styling |
| Axios | — | HTTP client with interceptors |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Docker + Docker Compose | Containerized development & deployment |
| Supabase (PostgreSQL) | Cloud database (development) |
| AWS (planned) | Production deployment (ECS, RDS, S3) |
| Terraform (planned) | Infrastructure as Code |
| GitHub Actions (planned) | CI/CD pipelines |

---

## 4. Project Structure

```
AUIP-Platform/
├── backend/                    # Django REST API
│   ├── auip_core/              # Django settings, URLs, ASGI/WSGI
│   │   └── settings/
│   │       └── base.py         # Centralized configuration
│   ├── apps/
│   │   ├── identity/           # ✅ IMPLEMENTED — Auth, users, sessions, institutions
│   │   ├── academic/           # 📦 SCAFFOLDED — Course & batch models
│   │   ├── quizzes/            # 📦 SCAFFOLDED — Quiz models (from old exam_portal)
│   │   ├── attempts/           # 📦 SCAFFOLDED — Attempt tracking
│   │   ├── anti_cheat/         # 📦 SCAFFOLDED — Tab-switch detection
│   │   ├── auip_institution/   # ✅ IMPLEMENTED — Tenant institution model
│   │   ├── auip_tenant/        # ✅ IMPLEMENTED — django-tenants Client/Domain
│   │   ├── governance/         # ⬜ NOT STARTED — AI governance brain (empty dir)
│   │   ├── intelligence/       # ⬜ NOT STARTED — ML models (empty dir)
│   │   ├── notifications/      # ⬜ NOT STARTED — Push/email notifications (empty dir)
│   │   └── placement/          # ⬜ NOT STARTED — Eligibility engine (empty dir)
│   └── manage.py
│
├── frontend/                   # React + TypeScript SPA
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/           # ✅ IMPLEMENTED — Login, registration, activation pages
│   │   │   ├── dashboard/      # ✅ IMPLEMENTED — SuperAdmin hub, student admin
│   │   │   └── user/           # ✅ IMPLEMENTED — User profile components
│   │   ├── components/         # Shared UI components
│   │   └── lib/                # API client, utilities
│   └── public/
│
├── docs/                       # Documentation (you are here)
├── infrastructure/             # Terraform, Nginx configs (scaffolded)
├── docker-compose.yml          # Dev environment orchestration
└── .github/                    # CI/CD workflows (scaffolded)
```

---

## 5. Current Sprint & Development Status

The project follows Agile methodology. As of February 2026, the team is in **Sprint 1**.

### Sprint 1 — Authentication & Multi-Tenancy (✅ Active)

| Feature | Status | Key Files |
|---------|--------|-----------|
| Super Admin login (email + password + OTP) | ✅ Working | `SuperAdminLogin.tsx`, `admin_auth_views.py` |
| Institution public registration | ✅ Working | `RegisterUniversity.tsx`, `registration.py` |
| Institution approval/rejection by Super Admin | ✅ Working | `InstitutionAdmin.tsx`, `institution_views.py` |
| Dynamic PostgreSQL schema creation on approval | ✅ Working | `multitenancy.py`, `auip_tenant/` |
| JWT access/refresh token authentication | ✅ Working | `token_service.py`, `authentication.py` |
| Session management (login sessions, device tracking) | ✅ Working | `auth_models.py`, `device_sessions.py` |
| Silent token refresh | ✅ Working | `useSilentRefresh.ts` |
| Password reset flow | ✅ Working | `password_service.py`, `reset_service.py` |
| Cloudflare Turnstile bot protection | ✅ Working | `turnstile.py`, `TurnstileWidget.tsx` |
| Role-Based Access Control (RBAC) | ✅ Working | `permissions.py`, `middleware.py` |
| Student login (OTP-based) | ✅ Working | `StudentLogin.tsx` |
| Content Security Policy middleware | ✅ Working | `middleware_csp.py` |
| Brute-force protection | ✅ Working | `brute_force_service.py` |

### Future Sprints (⬜ Not Started)

| Sprint | Planned Focus |
|--------|--------------|
| Sprint 2 | Student pre-seeding (bulk CSV upload), activation link system |
| Sprint 3 | Placement drives, dynamic eligibility engine |
| Sprint 4 | Governance Brain (AI readiness scoring) |
| Sprint 5 | Intelligence Service (ML prediction models) |
| Sprint 6 | Real-time notifications, analytics dashboards |

---

## 6. User Roles

| Role | Description | Access Level |
|------|-------------|-------------|
| **Super Admin** | Platform owner/developer. Manages all institutions. | Full platform access |
| **Institution Admin** | University representative. Manages their institution's data. | Institution-scoped access |
| **Faculty / Teacher** | Manages students within their department. | Department-scoped access |
| **Student** | End user. Views their academic data, applies to placements. | Read-only academic, self-service auth |
| **SPOC** | Single Point of Contact at each institution. | Similar to Institution Admin |

---

## 7. Key Design Principles

1. **Identity is institution-owned.** Students are identified by `STU_REF` (e.g., `STU_2025_0142`), not by email.
2. **Registration ≠ Account Creation.** Pre-seeding creates an identity record; account creation happens only after activation.
3. **Resources are allocated post-activation only.** No database rows, dashboards, or services are provisioned for non-activated students.
4. **Multi-tenant data isolation.** Each approved institution gets its own PostgreSQL schema (`inst_<slug>`). Cross-tenant queries are impossible at the database level.
5. **Security-first.** JWT tokens, HMAC hashing, Cloudflare Turnstile, rate limiting, CSP headers, and brute-force protection are all in place.

---

## 8. How to Run Locally

See [GETTING_STARTED.md](development/GETTING_STARTED.md) and [QUICKSTART.md](development/QUICKSTART.md) for detailed instructions.

**Quick version:**
```bash
cd c:\Manohar\AUIP\AUIP-Platform
docker-compose up -d
# Then: http://localhost:3000 (frontend) | http://localhost:8000 (backend API)
```

---

## 9. Related Documentation

| Document | Path | Description |
|----------|------|-------------|
| System Architecture | [02_SYSTEM_ARCHITECTURE.md](02_SYSTEM_ARCHITECTURE.md) | Full technical architecture with diagrams |
| Security & Auth | [03_SECURITY_AND_AUTHENTICATION.md](03_SECURITY_AND_AUTHENTICATION.md) | Token lifecycle, session management, threat model |
| Multi-Tenancy | [04_MULTITENANCY_AND_DATA_ISOLATION.md](04_MULTITENANCY_AND_DATA_ISOLATION.md) | Schema isolation, tenant provisioning |
| Registration Lifecycle | [05_REGISTRATION_AND_ONBOARDING_LIFECYCLE.md](05_REGISTRATION_AND_ONBOARDING_LIFECYCLE.md) | Institution → Student registration flow |
| Roadmap | [06_ROADMAP_AND_FUTURE_WORK.md](06_ROADMAP_AND_FUTURE_WORK.md) | Sprint plan, planned features, backlog |
