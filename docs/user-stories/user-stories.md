# User Stories — AUIP Platform

---

## Epic 1: Identity & Access Management

### US-1.1: Quantum Shield — Quad-Segment Cookie Architecture
**As the** Platform  
**I want to** split the refresh JWT into 4 separate cookies with different security levels  
**So that** a single XSS or CSRF attack cannot steal a complete session token

**Acceptance Criteria:**
- [x] Refresh JWT is split into 4 segments: `_auip_sh_t` (public), `_auip_sh_id` (HttpOnly), `_auip_sh_p` (HttpOnly), `_auip_sh_s` (HttpOnly)
- [x] Only Segment T is JS-accessible (contains TTL info for frontend refresh timer)
- [x] Segments ID, P, S are HttpOnly + SameSite=Strict
- [x] All 4 segments are required to reconstruct a valid JWT
- [x] Legacy `set_refresh_cookie()` is deprecated with logging warnings

**Priority:** CRITICAL  
**Story Points:** 13

---

### US-1.2: SafeJWT Triple-Check Authentication
**As the** Platform  
**I want to** validate every access token against 3 layers (JWT signature, DB whitelist, device fingerprint)  
**So that** stolen tokens are useless outside the original device context

**Acceptance Criteria:**
- [x] Layer 1: JWT cryptographic signature + expiry validation (SimpleJWT)
- [x] Layer 2: Active `LoginSession` must exist with matching JTI
- [x] Layer 3: Device fingerprint (SHA256 of IP + User-Agent + session salt) must match
- [x] Fingerprint mismatch → session killed + refresh blacklisted + WebSocket force_logout
- [x] Local dev IPs bypass fingerprint check (`is_local_dev()`)

**Priority:** CRITICAL  
**Story Points:** 8

---

### US-1.3: Silent Token Rotation
**As a** User  
**I want** my access token to be automatically renewed before expiry  
**So that** I never experience an unexpected logout during active use

**Acceptance Criteria:**
- [x] `SilentRotationMiddleware` checks access token expiry on every response
- [x] If < 15 seconds remaining, triggers `rotate_tokens_secure()`
- [x] New Quantum Shield cookies are attached to the response
- [x] New access token sent via `X-New-Access-Token` response header
- [x] Old refresh JTI is blacklisted
- [x] WebSocket `rotated` event notifies other tabs
- [x] Frontend `useSilentRefresh` hook intercepts the header

**Priority:** HIGH  
**Story Points:** 8

---

### US-1.4: Super Admin MFA Login
**As a** Super Admin  
**I want to** log in with email + password + OTP verification  
**So that** platform-level access requires multi-factor authentication

**Acceptance Criteria:**
- [x] Step 1: Email + password validated via `AdminTokenObtainPairSerializer`
- [x] Turnstile challenge required before submission
- [x] Brute-force check before credentials validation
- [x] OTP generated (6-digit, `secrets.randbelow()`) and sent via email
- [x] OTP stored as HMAC hash in Redis (not plaintext)
- [x] Step 2: OTP verification → JWT pair + Quantum Shield fragments issued
- [x] `LoginSession` created with device fingerprint + geo data

**Priority:** CRITICAL  
**Story Points:** 13

---

### US-1.5: Student Passwordless Login
**As a** Student  
**I want to** log in using OTP without needing a password  
**So that** I can access the platform without remembering credentials

**Acceptance Criteria:**
- [x] Student enters institution + email
- [x] System resolves email → CoreStudent.stu_ref
- [x] OTP generated and sent to student's email
- [x] OTP verified → JWT pair + Quantum Shield fragments issued
- [x] Session created with device binding

**Priority:** HIGH  
**Story Points:** 8

---

### US-1.6: Brute-Force Protection
**As the** Platform  
**I want to** rate-limit login attempts per (identifier, IP) pair  
**So that** automated attacks are blocked before reaching the authentication layer

**Acceptance Criteria:**
- [x] Failed attempts tracked in Redis with configurable cooldown (default 60s)
- [x] After 5 failures: account locked for 5 minutes
- [x] `locked_until` timestamp stored with block entry
- [x] Counter cleared on successful login
- [x] `get_block_info()` available for admin diagnostics

**Priority:** HIGH  
**Story Points:** 5

---

### US-1.7: Global IP Lockout with Incident Reports
**As the** Platform  
**I want to** lockout IP addresses with sustained failures across all endpoints  
**So that** platform-wide attacks are neutralized and administrators are alerted

**Acceptance Criteria:**
- [x] After 5 global failures from same IP: IP blocked for 10 minutes
- [x] All auth endpoints (Login, Registration, JIT) revoked for blocked IPs
- [x] Email incident report sent to Super Admin with: IP, target account, user-agent, timestamp
- [x] `AccessTokenSessionMiddleware` checks `is_ip_blocked()` on every request
- [x] `get_remaining_attempts()` available for frontend countdown

**Priority:** HIGH  
**Story Points:** 8

---

### US-1.8: WebSocket Real-Time Session Sync
**As a** User  
**I want** all my devices to be notified in real-time when I log in/out or my session changes  
**So that** I can manage my security across all devices

**Acceptance Criteria:**
- [x] `SessionConsumer` WebSocket consumer with `user_sessions_{user_id}` groups
- [x] Events: `force_logout`, `rotated`, `new_session`, `location_update`
- [x] "Logout all other devices" sends `force_logout` to all sessions except origin
- [x] Session location updates broadcast to all devices
- [x] Super Admins join `superadmin_updates` group for institutional hub

**Priority:** HIGH  
**Story Points:** 13

---

### US-1.9: RBAC Permission System
**As an** Admin  
**I want** role-based access control on all API endpoints  
**So that** users can only access resources appropriate to their role

**Acceptance Criteria:**
- [x] 6 permission classes: `IsSuperAdmin`, `IsInstitutionAdmin`, `IsAdminRole`, `IsTeacherRole`, `IsStudentRole`, `IsAdminOrTeacher`
- [x] All admin endpoints require `IsSuperAdmin` or `IsAdminRole`
- [x] Student endpoints require `IsStudentRole`
- [x] Each permission checks `request.user.role`

**Priority:** HIGH  
**Story Points:** 3

---

### US-1.10: HMAC Token Hashing with Key Rotation
**As the** Platform  
**I want** all stored tokens to be HMAC-hashed with rotatable keys  
**So that** a database breach does not expose raw tokens

**Acceptance Criteria:**
- [x] Storage format: `<key_id>$<hmac_sha256_hex>`
- [x] Key ring configurable via `SECURITY_HMAC_KEYS` setting
- [x] Current key selected via `SECURITY_HMAC_CURRENT`
- [x] Verification accepts any key in the ring (backward compat)
- [x] `rotate_hmac_key()` adds new key at runtime
- [x] Fallback to plain SHA256 if HMAC keys not configured

**Priority:** CRITICAL  
**Story Points:** 5

---

## Epic 2: Institution Registration & Multi-Tenancy

### US-2.1: Public Institution Registration
**As a** University Representative  
**I want to** register my institution on AUIP through a public form  
**So that** my institution can begin using the platform

**Acceptance Criteria:**
- [x] Registration form: institution name, domain, admin name, email, phone, designation
- [x] Cloudflare Turnstile challenge required
- [x] Backend checks for name/domain conflicts
- [x] Institution created with `status=PENDING`
- [x] Django signal broadcasts to Super Admin WebSocket group
- [x] Registration data stored in JSON field

**Priority:** HIGH  
**Story Points:** 5

---

### US-2.2: Institution Approval & Schema Provisioning
**As a** Super Admin  
**I want to** review and approve/reject institution registrations  
**So that** only legitimate institutions are onboarded

**Acceptance Criteria:**
- [x] Super Admin dashboard shows all institutions with status filters
- [x] Approve: creates PostgreSQL schema `inst_<slug>`, runs migrations, creates Client + Domain
- [x] Reject: updates status with reason
- [x] Status lifecycle: PENDING → APPROVED / REJECTED → SUSPENDED
- [x] Real-time WebSocket updates on status changes

**Priority:** HIGH  
**Story Points:** 13

---

### US-2.3: PostgreSQL Schema Isolation
**As the** Platform  
**I want** each institution's data to live in a separate PostgreSQL schema  
**So that** data isolation is enforced at the database level

**Acceptance Criteria:**
- [x] `django-tenants` configured with `TenantSyncRouter`
- [x] Shared models (User, Institution, LoginSession) in `public` schema
- [x] Tenant models (CoreStudent, PreSeededRegistry) in `inst_<slug>` schema
- [x] `schema_context()` utility for explicit schema switching
- [x] Cross-tenant queries are physically impossible

**Priority:** CRITICAL  
**Story Points:** 13

---

## Epic 3: Student Identity Lifecycle

### US-3.1: Bulk Student Seeding
**As an** Admin/SPOC  
**I want to** upload student data via CSV  
**So that** I can pre-populate the student registry before students activate their accounts

**Acceptance Criteria:**
- [ ] Upload CSV with columns: stu_ref, roll_number, full_name, department, batch_year, email, CGPA, 10th%, 12th%
- [ ] System validates data (no duplicates, valid formats)
- [ ] Records created in `PreSeededRegistry` with status=SEEDED
- [ ] Summary displayed: X students added, Y errors
- [ ] Downloadable error report for failed rows

**Priority:** HIGH  
**Story Points:** 5

---

### US-3.2: Send Activation Invitations
**As a** TPO/Admin  
**I want to** send activation emails to selected seeded students  
**So that** students can create their accounts

**Acceptance Criteria:**
- [ ] Select students from seeded list (status=SEEDED)
- [ ] System generates signed activation token (Django `TimestampSigner`)
- [ ] Token encodes: `institution_id:stu_ref:role`
- [ ] Email sent with activation link (configurable expiry, default 24h)
- [ ] Student status: SEEDED → INVITED

**Priority:** HIGH  
**Story Points:** 8

---

### US-3.3: Student Account Activation
**As a** Student  
**I want to** click the activation link and set my password  
**So that** I can access the AUIP platform

**Acceptance Criteria:**
- [ ] Click activation link → token validated (signature + expiry)
- [ ] Form pre-fills: Name, Email, STU_REF (read-only)
- [ ] Student enters password (strength validation)
- [ ] User created in `public` schema, linked to `CoreStudent` via `stu_ref`
- [ ] PreSeededRegistry status: INVITED → ACTIVE
- [ ] `handle_login()` → JWT + Quantum Shield issued
- [ ] Redirect to dashboard

**Priority:** HIGH  
**Story Points:** 13

---

## Epic 4: Placement Management

### US-4.1: Create Placement Drive
**As a** TPO  
**I want to** create a new placement drive  
**So that** companies can recruit students

**Acceptance Criteria:**
- [ ] Enter: Company name, role, package, deadline
- [ ] Set eligibility criteria (CGPA, branches, 10th%, 12th%)
- [ ] Support AND/OR/nested logic for criteria
- [ ] Set application deadline
- [ ] Mark as active/inactive
- [ ] Email notification to eligible students

**Priority:** HIGH  
**Story Points:** 13

---

### US-4.2: Dynamic Eligibility Engine
**As a** TPO  
**I want to** define complex eligibility rules  
**So that** only qualified students are shortlisted automatically

**Acceptance Criteria:**
- [ ] Support expressions: `CGPA ≥ 7.5 AND (10th% ≥ 60 OR 12th% ≥ 65)`
- [ ] Support branch restrictions: `branch IN [CS, IT, ECE]`
- [ ] Support custom conditions: `attendance ≥ 75%`
- [ ] Validate at application time
- [ ] Show eligibility reason to students (why eligible/not eligible)

**Priority:** HIGH  
**Story Points:** 21

---

### US-4.3: Student Apply to Drive
**As a** Student  
**I want to** view eligible drives and apply  
**So that** I can participate in placement

**Acceptance Criteria:**
- [ ] See list of drives I'm eligible for
- [ ] See drives I'm NOT eligible for (with reasons)
- [ ] Click "Apply" to submit application
- [ ] System enforces one-student-one-job rule
- [ ] Upload resume (PDF only, <2MB)
- [ ] Confirmation email sent

**Priority:** HIGH  
**Story Points:** 8

---

## Epic 5: Governance Brain (AI Core)

### US-5.1: Placement Readiness Scoring
**As the** Governance Brain  
**I want to** calculate each student's placement readiness score  
**So that** I can identify at-risk students

**Acceptance Criteria:**
- [ ] Calculate score based on: Academic (30%), Mock (40%), Interview (20%), Project (10%)
- [ ] Score range: 0-100
- [ ] Update daily
- [ ] Flag students with score < 40 as "at-risk"

**Priority:** MEDIUM  
**Story Points:** 13

---

### US-5.2: Personalized Mock Assignment
**As the** Governance Brain  
**I want to** assign targeted mocks to each student  
**So that** weak students get focused preparation

**Acceptance Criteria:**
- [ ] Analyze past mock performance
- [ ] Identify weak topics (e.g., weak in Aptitude, strong in Coding)
- [ ] Auto-assign mocks in weak areas
- [ ] Limit to 2 mocks/week (avoid overload)
- [ ] Send notification with mock link

**Priority:** MEDIUM  
**Story Points:** 21

---

### US-5.3: Intervention Recommendations
**As a** TPO  
**I want to** see AI-recommended interventions for at-risk students  
**So that** I can provide targeted support

**Acceptance Criteria:**
- [ ] Dashboard shows at-risk students
- [ ] For each student, show: Readiness score, weak areas, recommended actions, predicted placement probability
- [ ] Filter by department, batch
- [ ] Export to Excel

**Priority:** MEDIUM  
**Story Points:** 13

---

## Epic 6: Student Experience

### US-6.1: Personalized Dashboard
**As a** Student  
**I want to** see my personalized dashboard  
**So that** I know my status and next steps

**Acceptance Criteria:**
- [ ] Show placement readiness score
- [ ] Show eligible drives (countdown to deadline)
- [ ] Show assigned mocks
- [ ] Show placement status (Applied, Shortlisted, Placed)
- [ ] Show academic summary (CGPA, attendance)

**Priority:** HIGH  
**Story Points:** 13

---

### US-6.2: Mock Test Taking
**As a** Student  
**I want to** take assigned mock tests  
**So that** I can improve my skills

**Acceptance Criteria:**
- [ ] Start mock (timer starts)
- [ ] Questions randomized
- [ ] Anti-cheat: Tab switch detection, fullscreen mode
- [ ] Auto-submit on timeout
- [ ] Immediate results (score, correct/wrong breakdown)
- [ ] Show detailed solutions

**Priority:** HIGH  
**Story Points:** 21

---

## Epic 7: TPO/Admin Operations

### US-7.1: TPO Analytics Dashboard
**As a** TPO  
**I want to** see overall placement analytics  
**So that** I can track progress

**Acceptance Criteria:**
- [ ] Show: Total students, Placed students, Placement %
- [ ] Show company-wise placement count
- [ ] Show department-wise stats
- [ ] Show package distribution (histogram)
- [ ] Filter by batch, department
- [ ] Export to PDF

**Priority:** MEDIUM  
**Story Points:** 13

---

### US-7.2: Student Search
**As a** TPO/Admin  
**I want to** search for any student  
**So that** I can view their complete profile

**Acceptance Criteria:**
- [ ] Search by: Name, STU_REF, Roll Number, Email
- [ ] View merged profile: Core data + Auth data + Placement data + Mock history
- [ ] View detailed performance reports

**Priority:** HIGH  
**Story Points:** 8

---

## Epic 8: Password & Account Security

### US-8.1: Password Reset with Token Invalidation
**As a** User  
**I want to** reset my password using a secure email link  
**So that** I can regain access to my account

**Acceptance Criteria:**
- [x] Reset link sends HMAC-hashed token
- [x] New request invalidates all previous tokens for the user
- [x] Token is single-use (marked as used after consumption)
- [x] Token has configurable TTL (default 24 hours)
- [x] Expired/used links show "Expired Link" page
- [x] Password strength validation on new password

**Priority:** HIGH  
**Story Points:** 8

---

### US-8.2: Remembered Devices (Adaptive 2FA)
**As a** User  
**I want** the platform to remember my trusted devices  
**So that** I don't need OTP verification on every login from the same machine

**Acceptance Criteria:**
- [x] `RememberedDevice` model stores device hash, IP, geolocation
- [x] Trusted devices skip OTP on re-login
- [x] Admin can revoke trusted devices

**Priority:** MEDIUM  
**Story Points:** 5

---

## Backlog (Future Sprints)

- Resume parsing with NLP
- LLM-powered interview preparation chatbot
- Company-specific mock tests
- Peer comparison (anonymized)
- Mobile app (iOS/Android)
- Google OAuth for faculty
- Advanced audit logging

---

**Total Story Points (All Epics):** ~290  
**Estimated Sprints:** 8-10 (2-week sprints)  
**Estimated Timeline:** 4-5 months
