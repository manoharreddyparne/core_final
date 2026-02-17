# AUIP Platform — Roadmap & Sprint Plan

This document outlines the full development roadmap for the AUIP platform across all planned sprints.

---

## Sprint 1 — Authentication, Multi-Tenancy & Institutional Onboarding

**Goal:** Build the core identity and security backbone. Everything else depends on this.

| Feature | Description |
|---------|-------------|
| Super Admin MFA Login | Email + password + OTP verification with Quantum Shield |
| Student Passwordless Login | OTP-based login — no passwords stored for students |
| Faculty Login | Role-based authentication for teachers |
| Quantum Shield | Quad-Segment Cookie Fragmentation — refresh token split across 4 cookies |
| SafeJWT Triple-Check | JWT signature + DB session whitelist + device fingerprint validation |
| Silent Token Rotation | Auto-renewal when access token is within 15 seconds of expiry |
| Device Fingerprinting | SHA256(IP + User-Agent + random salt) bound to every session |
| HMAC Token Hashing | Key-rotatable HMAC-SHA256 for all stored tokens (format: `key_id$hash`) |
| Brute-Force Protection | Redis-backed rate limiting per (identifier, IP) pair |
| Global IP Lockout | Platform-wide IP blocking with email incident reports to Super Admin |
| Institution Registration | Public Turnstile-protected registration with name/domain conflict detection |
| Institution Approval | Super Admin approve/reject with dynamic PostgreSQL schema creation |
| Multi-Tenancy | PostgreSQL schema isolation via django-tenants (`inst_<slug>`) |
| Session Management | LoginSession model with device tracking, geo, remote deactivation |
| WebSocket Session Sync | Real-time force_logout, token rotation, location updates across devices |
| Institutional Hub | Django signals broadcast institution changes to all Super Admin clients |
| Cloudflare Turnstile | Bot protection on public endpoints (configurable on/off) |
| Content Security Policy | Strict CSP headers via middleware |
| Password Reset | Single-use, time-limited, hash-stored tokens with previous-token invalidation |
| RBAC | 6 permission classes (SuperAdmin, InstitutionAdmin, Admin, Teacher, Student, AdminOrTeacher) |
| Activation Tokens | Django TimestampSigner for cryptographic activation links |
| OTP System | User-based and identifier-based OTP with HMAC Redis storage |
| Remembered Devices | Adaptive 2FA via trusted device tracking |

---

## Sprint 2 — Student Pre-Seeding & Activation

**Goal:** Complete the student identity lifecycle — from bulk upload to active accounts.

| Feature | Description |
|---------|-------------|
| CSV Upload Engine | Admin uploads student data (STU_REF, roll, name, dept, CGPA, marks) |
| Data Validation | Duplicate detection, format validation, error reports |
| Batch Invitation | Select seeded students → generate signed activation tokens → send emails |
| Activation Page | Student clicks link → verifies identity → sets password → account created |
| State Dashboard | Admin tracks SEEDED → INVITED → VERIFIED → ACTIVE transitions |
| Pre-Seeded Registry | Tenant-scoped model with full academic data (10th%, 12th%, CGPA) |
| Identifier-Based OTP | OTP verification for students who don't have User accounts yet |

---

## Sprint 3 — Placement Management

**Goal:** Replace Excel-based placement workflows with a dynamic eligibility engine.

| Feature | Description |
|---------|-------------|
| Placement Drive CRUD | Create drives with company, role, package, deadline |
| Dynamic Eligibility Engine | AND/OR/nested logic — `CGPA ≥ 7.5 AND (branch IN [CS, IT] OR 12th% ≥ 65)` |
| Student Application Flow | View eligible drives, apply with resume upload |
| One-Student-One-Job Rule | Prevent multiple active placements per student |
| Drive Status Management | Draft → Active → Closed → Results |
| Eligibility Feedback | Students see *why* they're eligible/not eligible for each drive |

---

## Sprint 4 — Governance Brain (AI Core)

**Goal:** AI-driven decision support for placement offices.

| Feature | Description |
|---------|-------------|
| Readiness Scoring (0-100) | Weighted: Academic 30%, Mock 40%, Interview 20%, Projects 10% |
| At-Risk Detection | Flag students with score < 40 for intervention |
| Personalized Mock Assignment | Auto-assign mocks based on weak areas (max 2/week) |
| Intervention Recommendations | AI-suggested actions for TPO (mentoring, extra mocks, etc.) |
| Daily Score Updates | Recalculate scores based on latest performance data |

---

## Sprint 5 — Intelligence Service (ML/AI)

**Goal:** Advanced ML models for prediction and analysis.

| Feature | Description |
|---------|-------------|
| Placement Prediction | ML model predicting placement probability per student |
| Anomaly Detection | Autoencoders for unusual performance patterns |
| Resume NLP | Extract skills, projects, and experience from uploaded resumes |
| LLM Explanations | Natural language explanations for governance decisions |
| Chat Interface | LLM-powered interview preparation chatbot |

---

## Sprint 6 — Notifications & Communication

**Goal:** Push notifications and automated communication.

| Feature | Description |
|---------|-------------|
| Push Notifications | Real-time WebSocket + browser push notifications |
| Email Automation | Drive deadlines, eligibility updates, placement results |
| Notification Preferences | Students configure which notifications they want |
| Admin Announcements | Broadcast messages to all students in an institution |

---

## Sprint 7 — Analytics & Reporting

**Goal:** Data-driven dashboards for TPOs and admins.

| Feature | Description |
|---------|-------------|
| TPO Dashboard | Placement stats, company-wise, department-wise, package distribution |
| PDF/Excel Export | Downloadable reports for management and accreditation |
| Student Analytics | Individual performance trends, mock history, improvement areas |
| Comparative Analytics | Department-wise and batch-wise placement comparisons |
| At-Risk Heatmaps | Visual representation of at-risk students by department |

---

## Sprint 8 — Mock Tests & Anti-Cheat

**Goal:** Full quiz engine with proctoring.

| Feature | Description |
|---------|-------------|
| Question Bank | Category-wise question management (Aptitude, Coding, Verbal) |
| Timed Mock Tests | Configurable duration, auto-submit on timeout |
| Anti-Cheat | Tab-switch detection, fullscreen enforcement, copy-paste blocking |
| Instant Results | Score breakdown, correct/wrong analysis, solution explanations |
| Performance Tracking | Historical mock performance per student |

---

## Backlog (Future Sprints)

| Feature | Description |
|---------|-------------|
| Company-Specific Mocks | Mock tests tailored to specific company hiring patterns |
| Peer Comparison | Anonymized ranking within department/batch |
| Mobile App | iOS/Android native app (React Native) |
| Social Auth | Google OAuth integration for faculty |
| Advanced RBAC | Fine-grained permission policies per institution |
| Audit Logging | Complete audit trail of all admin/system actions |

---

## Development Timeline

| Sprint | Duration | Focus |
|--------|----------|-------|
| Sprint 1 | 2 weeks | ✅ Authentication, Multi-Tenancy, Security |
| Sprint 2 | 2 weeks | Student Pre-Seeding & Activation |
| Sprint 3 | 2 weeks | Placement Management |
| Sprint 4 | 3 weeks | Governance Brain (AI) |
| Sprint 5 | 3 weeks | Intelligence Service (ML) |
| Sprint 6 | 2 weeks | Notifications & Communication |
| Sprint 7 | 2 weeks | Analytics & Reporting |
| Sprint 8 | 2 weeks | Mock Tests & Anti-Cheat |

**Total Estimated Story Points:** ~200  
**Estimated Timeline:** 4-5 months (2-week sprints)

---

## Known Limitations & Technical Debt

| Item | Description | Priority |
|------|-------------|----------|
| SMS OTP | Currently email-only — SMS integration pending for mobile users | Medium |
| Rate Limiter Tuning | Brute-force thresholds are hardcoded (5 attempts, 60s cooldown, 5m lockout) — should be config-driven | Low |
| Legacy Cookie Compat | `set_refresh_cookie()` is deprecated but still exists for backward compatibility | Low |
| Schema Cleanup | No automated cleanup of orphaned schemas when institutions are deleted | Medium |
| Test Coverage | Identity service has 13 test files but coverage is not comprehensive | High |
| Frontend Error Boundaries | Missing error boundaries on some pages | Medium |
