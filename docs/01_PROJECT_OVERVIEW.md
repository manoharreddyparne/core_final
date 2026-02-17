# AUIP Platform — Project Overview

> **Adaptive University Intelligence Platform**
> A Governance-Brain Driven, Personalized, and Placement-Centric University Operating System

---

## 1. What Is AUIP?

AUIP is an enterprise-grade platform designed to replace the manual, Excel-heavy workflows that universities currently use to manage student identities, placement drives, and academic governance. It covers the entire lifecycle: from **institutional onboarding** and **student identity provisioning** to **AI-driven placement readiness scoring** and **automated eligibility filtering**.

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
| Uncontrolled student registration | Institution-driven pre-seeding — only invited students can register |
| Wasted resources on dormant accounts | Accounts and resources allocated only after activation |
| No data isolation between institutions | PostgreSQL schema-based multi-tenancy (`CREATE SCHEMA inst_<name>`) |
| Manual placement workflows | Dynamic eligibility rule engine with AND/OR/nested logic |
| No personalization | AI Governance Brain for readiness scoring |
| Weak authentication | Quantum Shield — Quad-Segment Cookie Fragmentation with HMAC rotation |

---

## 3. Technology Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Django | 5.x | Web framework |
| Django REST Framework | — | RESTful API layer |
| SimpleJWT | — | JWT access/refresh token infrastructure |
| PostgreSQL | 15 | Primary database (Supabase-hosted in dev) |
| Redis | 7 | Caching, OTP store, session store, rate limiting, brute-force counters |
| Django Channels | — | WebSocket support (real-time session sync, institutional hub) |
| django-tenants | — | Multi-tenant schema isolation |
| Python | 3.11+ | Language |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18+ | UI framework |
| TypeScript | — | Type safety |
| Vite | — | Build tool & dev server |
| Tailwind CSS | — | Styling |
| Axios | — | HTTP client with interceptors and silent refresh |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Docker + Docker Compose | Containerized development & deployment |
| Supabase (PostgreSQL) | Cloud database (development) |
| Cloudflare Turnstile | Bot protection on public endpoints |
| SMTP (Gmail) | OTP and activation email delivery |
| AWS (ECS, RDS, S3) | Production deployment |
| Terraform | Infrastructure as Code |
| GitHub Actions | CI/CD pipelines |

---

## 4. Project Structure

```
AUIP-Platform/
├── backend/                    # Django REST API
│   ├── auip_core/              # Django settings, URLs, ASGI/WSGI
│   │   └── settings/
│   │       └── base.py         # Centralized configuration
│   ├── apps/
│   │   ├── identity/           # Auth, users, sessions, institutions, Quantum Shield
│   │   │   ├── models/         # User, CoreStudent, LoginSession, Institution, etc.
│   │   │   ├── views/          # Admin, public, auth, password, profile, session views
│   │   │   ├── services/       # token_service, auth_service, quantum_shield, brute_force
│   │   │   ├── utils/          # security, cookie_utils, multitenancy, OTP, turnstile
│   │   │   ├── middleware.py   # AccessTokenSession + SilentRotation middleware
│   │   │   ├── consumers.py    # WebSocket session + institutional hub consumers
│   │   │   └── permissions.py  # 6 RBAC permission classes
│   │   ├── academic/           # Course & Batch management
│   │   ├── quizzes/            # Quiz engine
│   │   ├── attempts/           # Attempt tracking
│   │   ├── anti_cheat/         # Tab-switch detection, fullscreen enforcement
│   │   ├── auip_institution/   # Tenant institution model (PreSeededRegistry)
│   │   ├── auip_tenant/        # django-tenants Client/Domain models
│   │   ├── governance/         # AI Governance Brain (readiness scoring)
│   │   ├── intelligence/       # ML prediction models
│   │   ├── notifications/      # Push/email notification service
│   │   ├── placement/          # Eligibility engine, drive management
│   │   └── analytics/          # TPO dashboards and reporting
│   └── manage.py
│
├── frontend/                   # React + TypeScript SPA
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/           # Login, registration, activation, Turnstile
│   │   │   │   ├── pages/      # SuperAdminLogin, StudentLogin, RegisterUniversity, etc.
│   │   │   │   ├── hooks/      # useSilentRefresh, useSecureRotation
│   │   │   │   ├── context/    # AuthProvider + session WebSocket
│   │   │   │   └── components/ # TurnstileWidget
│   │   │   ├── dashboard/      # SuperAdmin hub, student admin, landing page
│   │   │   └── user/           # User profile components
│   │   ├── components/         # Shared UI components
│   │   └── lib/                # API client, utilities
│   └── public/
│
├── docs/                       # Documentation (you are here)
├── infrastructure/             # Terraform, Nginx configs
├── docker-compose.yml          # Dev environment orchestration
└── .github/                    # CI/CD workflows
```

---

## 5. Development Status by Sprint

### Sprint 1 — Authentication, Multi-Tenancy & Institutional Onboarding

| Feature | Key Files |
|---------|-----------|
| Super Admin login (email + password + OTP + Quantum Shield) | `SuperAdminLogin.tsx`, `admin_auth_views.py` |
| Student OTP-based passwordless login | `StudentLogin.tsx`, `otp_utils.py` |
| Faculty login | `FacultyLogin.tsx` |
| Institution public registration (Turnstile-protected) | `RegisterUniversity.tsx`, `registration.py` |
| Institution approval/rejection by Super Admin | `InstitutionAdmin.tsx`, `institution_views.py` |
| Dynamic PostgreSQL schema creation on approval | `multitenancy.py`, `auip_tenant/models.py` |
| Quantum Shield — Quad-Segment Cookie Fragmentation | `quantum_shield.py`, `cookie_utils.py` |
| Silent Token Rotation (15s threshold auto-renewal) | `middleware.py` → `SilentRotationMiddleware` |
| SafeJWT triple-check (signature + DB whitelist + fingerprint) | `authentication.py`, `token_service.py` |
| Device fingerprinting (IP + UA + salt binding) | `device_utils.py`, `token_service.py` |
| HMAC token hashing with key rotation | `security.py` |
| Brute-force protection (per identifier + IP, Redis-backed) | `brute_force_service.py` |
| Global IP lockout with email incident reports | `security_service.py` |
| Session management (login sessions, device tracking, geo) | `auth_models.py`, `device_sessions.py` |
| WebSocket real-time session sync | `consumers.py`, `middleware_jwt.py` |
| Real-time institutional hub broadcasts | `signals.py`, `consumers.py` |
| Content Security Policy middleware | `middleware_csp.py` |
| Role-Based Access Control (6 permission classes) | `permissions.py` |
| Password reset (single-use, time-limited, hash-stored) | `reset_service.py`, `PasswordResetRequest` |
| Cloudflare Turnstile bot protection | `turnstile.py`, `TurnstileWidget.tsx` |
| Activation token generation (Django TimestampSigner) | `activation.py` |
| Silent refresh on frontend | `useSilentRefresh.ts` |

### Sprint 2 — Student Pre-Seeding & Activation

| Feature | Description |
|---------|-------------|
| Bulk CSV upload | Admin uploads student data (STU_REF, roll, name, dept, CGPA) |
| Activation invitation system | System generates signed tokens, sends email links |
| Student activation page | Student clicks link → sets password → account created |
| Admin state tracking dashboard | Track SEEDED → INVITED → ACTIVE transitions |

### Sprint 3 — Placement Management

| Feature | Description |
|---------|-------------|
| Create placement drive | Company, role, package, deadline, eligibility criteria |
| Dynamic eligibility engine | AND/OR/nested logic (CGPA ≥ 7.5 AND branch IN [CS, IT]) |
| Student application flow | View eligible drives, apply, upload resume |
| One-student-one-job enforcement | Prevent multiple active placements |

### Sprint 4 — Governance Brain (AI Core)

| Feature | Description |
|---------|-------------|
| Placement readiness scoring (0-100) | Weighted: Academic 30%, Mock 40%, Interview 20%, Projects 10% |
| At-risk student detection | Flag students with score < 40 |
| Personalized mock assignment | Auto-assign mocks based on weak areas |
| Intervention recommendations | AI-suggested actions for TPO |

### Sprint 5 — Intelligence Service (ML/AI)

| Feature | Description |
|---------|-------------|
| ML prediction models | Placement readiness prediction |
| Anomaly detection | Autoencoders for unusual patterns |
| NLP resume parsing | Extract skills, experience from resumes |
| LLM-powered explanations | Decision transparency for governance |

### Sprint 6 — Notifications & Analytics

| Feature | Description |
|---------|-------------|
| Push notifications | Real-time alerts for students and admins |
| TPO analytics dashboards | Placement stats, department-wise, package distribution |
| PDF/Excel report export | Downloadable reports for management |

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
5. **Quantum Shield.** Refresh tokens are never stored as a single cookie — they are fragmented into 4 segments across separate cookies with varying security levels.
6. **Defense in depth.** JWT validation + DB session whitelist + device fingerprint + brute-force + IP lockout + Turnstile.

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
| Security & Auth | [03_SECURITY_AND_AUTHENTICATION.md](03_SECURITY_AND_AUTHENTICATION.md) | Quantum Shield, token lifecycle, session management |
| Multi-Tenancy | [04_MULTITENANCY_AND_DATA_ISOLATION.md](04_MULTITENANCY_AND_DATA_ISOLATION.md) | Schema isolation, tenant provisioning |
| Registration Lifecycle | [05_REGISTRATION_AND_ONBOARDING_LIFECYCLE.md](05_REGISTRATION_AND_ONBOARDING_LIFECYCLE.md) | Institution → Student registration flow |
| Roadmap | [06_ROADMAP_AND_FUTURE_WORK.md](06_ROADMAP_AND_FUTURE_WORK.md) | Sprint plan, features, backlog |
| User Stories | [user-stories/user-stories.md](user-stories/user-stories.md) | All epics with acceptance criteria |
