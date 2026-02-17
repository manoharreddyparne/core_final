# AUIP Platform — Roadmap & Future Work

This document separates what has been **built and verified** from what is **planned or conceptual**. This is the source of truth for project status.

---

## 1. What Is Built (Sprint 1 — Complete)

The following features have been implemented, tested, and are running locally:

### ✅ Authentication & Session Management
- Super Admin login with email + password + OTP (multi-factor)
- Student login with OTP-based passwordless flow
- Faculty login
- JWT access token (5 min) + refresh token (7 days) with silent refresh
- Session tracking (`LoginSession` model with device, IP, user-agent, geolocation)
- WebSocket-based real-time session sync
- Token blacklisting on logout
- HMAC-hashed token storage (no plaintext tokens in DB)
- Brute-force protection via Redis rate limiting
- Cloudflare Turnstile bot protection on public endpoints
- Content Security Policy (CSP) middleware
- Remembered device tracking (adaptive 2FA foundation)

### ✅ Institution Management
- Public institution registration form with Turnstile protection
- Super Admin institution approval/rejection dashboard
- Institution lifecycle states: `PENDING` → `REVIEW` → `APPROVED` / `REJECTED` / `MORE_INFO`
- Email notifications on state changes

### ✅ Multi-Tenancy
- PostgreSQL schema-based data isolation via `django-tenants`
- Automatic schema creation on institution approval (`CREATE SCHEMA inst_<slug>`)
- Automatic migration of tenant apps into new schemas
- `schema_context()` utility for cross-schema operations

### ✅ Data Models
- `User` (custom `AbstractUser` with roles: SUPER_ADMIN, INST_ADMIN, ADMIN, TEACHER, STUDENT)
- `CoreStudent` (institution-seeded academic data with `STU_REF` primary key)
- `StudentProfile`, `TeacherProfile` (linked to User)
- `Institution`, `InstitutionAdmin`
- `RegistrationInvitation` (activation token model)
- `LoginSession`, `BlacklistedAccessToken`, `RememberedDevice`
- `PasswordResetRequest` (single-use, time-bound reset tokens)

### ✅ Password Management
- Password reset via secure email link
- Single-use, time-limited (24h) reset tokens
- Previous tokens invalidated on new request
- Expired link detection and user feedback

### ✅ Frontend Pages
- Landing page
- Super Admin login page (with Turnstile widget)
- Student login page
- Faculty login page
- University registration page
- Account activation page
- Admin recovery page
- Dashboard (main)
- Institution Hub (Super Admin)
- Core Student Admin (data management)

### ✅ Infrastructure
- Docker Compose setup (Redis, Backend, Frontend)
- Supabase PostgreSQL integration (dev)
- Dockerfiles for backend and frontend

---

## 2. What Is Scaffolded (Migrated But Not Actively Developed)

These apps were migrated from the old `exam_portal` project. The models and basic structure exist, but they are not wired into the current Sprint 1 flows:

### 📦 Academic Service (`backend/apps/academic/`)
- Course and Batch models exist
- ~11 files migrated
- **Not yet connected** to the tenant-aware student workflow

### 📦 Examination Service (`backend/apps/quizzes/`, `attempts/`, `anti_cheat/`)
- Quiz, Question, Answer, Attempt, and CheatDetection models exist
- ~32 files migrated
- Anti-cheat includes tab-switch detection
- **Not yet updated** for multi-tenant architecture

---

## 3. What Is Planned (Not Started)

The following features have **no code written yet**. Their directories are empty scaffolds.

### ⬜ Sprint 2: Student Pre-Seeding & Activation (Next)
- Bulk CSV upload endpoint for student data
- Activation invitation email system
- Student activation page (set password, link to `CoreStudent`)
- Admin dashboard for tracking `SEEDED` → `INVITED` → `ACTIVE` states
- Excel validation and error reporting

### ⬜ Sprint 3: Placement Management (`backend/apps/placement/`)
- Placement drive creation (company, role, package, deadline)
- Dynamic eligibility rule engine (AND/OR/nested logic)
- Student application flow
- One-student-one-job enforcement
- Automated shortlisting
- No-show penalty system

### ⬜ Sprint 4: Governance Brain (`backend/apps/governance/`)
- Placement readiness scoring (0-100)
  - Academic performance (30% weight)
  - Mock test performance (40% weight)
  - Interview performance (20% weight)
  - Projects/internships (10% weight)
- At-risk student detection (score < 40)
- Personalized mock test assignment
- Intervention recommendations for TPO
- Dynamic feature activation per student

### ⬜ Sprint 5: Intelligence Service (`backend/apps/intelligence/`)
- ML prediction models (placement readiness)
- Anomaly detection with autoencoders
- NLP for resume parsing
- LLM-powered decision explanations
- AI-assisted governance (advisory only, never overrides)

### ⬜ Sprint 6: Notifications & Analytics (`backend/apps/notifications/`, `analytics/`)
- Real-time push notifications
- Email notification service
- TPO dashboards and analytics
- Company-wise placement stats
- Department-wise analytics
- Student progress tracking
- PDF/Excel report export

### ⬜ Future Backlog
- Mobile apps (iOS & Android)
- LLM-powered interview preparation chatbot
- Resume parsing with NLP
- Peer comparison (anonymized)
- Company-specific mock tests
- AWS production deployment (ECS, RDS, S3, CloudFront)
- Terraform Infrastructure as Code
- GitHub Actions CI/CD pipelines

---

## 4. Sprint Timeline Estimate

| Sprint | Focus | Status | Estimated Duration |
|--------|-------|--------|--------------------|
| Sprint 1 | Authentication & Multi-Tenancy | ✅ Complete | ~4 weeks |
| Sprint 2 | Student Pre-Seeding & Activation | ⬜ Next | ~3 weeks |
| Sprint 3 | Placement Management | ⬜ Planned | ~4 weeks |
| Sprint 4 | Governance Brain (AI Core) | ⬜ Planned | ~4 weeks |
| Sprint 5 | Intelligence Service (ML/AI) | ⬜ Planned | ~5 weeks |
| Sprint 6 | Notifications & Analytics | ⬜ Planned | ~3 weeks |
| Sprint 7–8 | Mobile Apps, Deployment, Polish | ⬜ Planned | ~4 weeks |

**Total estimated timeline:** 5–6 months for full MVP.
**Total story points (from user stories):** ~200

---

## 5. User Stories Reference

Detailed user stories with acceptance criteria are documented in:
- [user-stories.md](file:///c:/Manohar/AUIP/AUIP-Platform/docs/user-stories/user-stories.md)

### Epic Summary

| Epic | User Stories | Status |
|------|-------------|--------|
| Epic 1: Identity & Access Management | 4 stories (1.1–1.4) | ✅ Mostly implemented |
| Epic 2: Placement Management | 3 stories (2.1–2.3) | ⬜ Not started |
| Epic 3: Governance Brain (AI Core) | 3 stories (3.1–3.3) | ⬜ Not started |
| Epic 4: Student Experience | 2 stories (4.1–4.2) | ⬜ Not started |
| Epic 5: TPO/Admin Operations | 2 stories (5.1–5.2) | ⬜ Not started |

---

## 6. Known Limitations & Technical Debt

| Item | Detail |
|------|--------|
| No automated test suite for Sprint 1 | Test files exist (13 files) but need to be updated for current architecture |
| Examination apps not tenant-aware | Migrated from old project; need schema routing updates |
| No production deployment config | Docker Compose is development-only; AWS/Terraform not configured |
| CSP in development mode | `'unsafe-inline'` and `'unsafe-eval'` are used; must be tightened for production |
| No email queue | Emails are sent synchronously; should use Celery for production |
| Student seeding not wired end-to-end | `CoreStudent` model exists but bulk upload API and UI are Sprint 2 work |

---

## 7. Documentation Index

| # | Document | Description |
|---|----------|-------------|
| 01 | [Project Overview](01_PROJECT_OVERVIEW.md) | Problem statement, tech stack, project structure |
| 02 | [System Architecture](02_SYSTEM_ARCHITECTURE.md) | Backend/frontend architecture, data models, API map |
| 03 | [Security & Authentication](03_SECURITY_AND_AUTHENTICATION.md) | Token lifecycle, session management, threat model |
| 04 | [Multi-Tenancy & Data Isolation](04_MULTITENANCY_AND_DATA_ISOLATION.md) | Schema isolation, tenant provisioning |
| 05 | [Registration & Onboarding Lifecycle](05_REGISTRATION_AND_ONBOARDING_LIFECYCLE.md) | Institution → Student registration flow |
| 06 | **Roadmap & Future Work** (this document) | Sprint plan, backlog, known limitations |
