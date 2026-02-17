# AUIP Platform — Registration & Onboarding Lifecycle

This document covers the full lifecycle from **institutional registration** through **student identity provisioning** to **account activation**.

---

## 1. Overview: The Two-Phase Identity Model

AUIP's identity model is fundamentally different from typical platforms. There is no "Sign Up" button for students. Identity flows through two controlled phases:

```mermaid
graph LR
    subgraph "Phase 1: Institution Onboarding"
        A["University Registers"] --> B["Super Admin Reviews"]
        B --> C["Approval → Schema Created"]
    end
    subgraph "Phase 2: Student Identity"
        D["Admin Seeds Students<br/>(CSV Upload)"] --> E["Invitation Sent<br/>(Signed Token)"]
        E --> F["Student Activates<br/>(Sets Password)"]
    end
    C --> D
```

---

## 2. Institution Registration & Approval

### 2a. Public Registration (Turnstile-Protected)

When a university representative visits the registration page:

```mermaid
sequenceDiagram
    participant REP as University Rep
    participant FE as Frontend (RegisterUniversity.tsx)
    participant CF as Cloudflare Turnstile
    participant BE as Backend (InstitutionRegistrationView)
    participant PG as PostgreSQL
    participant WS as WebSocket

    REP->>FE: Fill registration form (name, domain, admin name, email, phone)
    FE->>CF: Render Turnstile challenge
    CF-->>FE: Turnstile token
    FE->>BE: POST /api/users/public/register/ (data + turnstile token)
    BE->>CF: Verify Turnstile token
    BE->>PG: Check for name/domain conflicts
    BE->>PG: INSERT Institution (status=PENDING)
    BE->>WS: Signal → institution_update (type=registration) → superadmin_updates group
    WS-->>SA: Real-time notification on Super Admin dashboard
    BE-->>FE: 201 Created + success message
```

**Registration data stored in the `Institution` model:**

| Field | Example |
|-------|---------|
| `name` | "MIT Pune" |
| `domain` | "mitpune.edu.in" |
| `slug` | "mit-pune" |
| `status` | "PENDING" |
| `registration_data` (JSON) | Admin name, email, phone, designation |
| `schema_name` | NULL (until approved) |

### 2b. Super Admin Review & Approval

The Super Admin dashboard (`InstitutionAdmin.tsx`) shows all institutions with their status:

```mermaid
stateDiagram-v2
    [*] --> PENDING: Institution registers
    PENDING --> APPROVED: Super Admin approves
    PENDING --> REJECTED: Super Admin rejects
    REJECTED --> PENDING: Re-application
    APPROVED --> SUSPENDED: Violation/deactivation
    SUSPENDED --> APPROVED: Reinstatement
```

**On Approval:**

1. `create_institution_schema(institution)` is called
2. PostgreSQL: `CREATE SCHEMA inst_<slug>`
3. Django-tenants runs all `TENANT_APPS` migrations in the new schema
4. `Client` and `Domain` records are created
5. `Institution.schema_name` is updated
6. WebSocket broadcasts the status change to all connected Super Admins

---

## 3. Student Identity Lifecycle

Students go through a 4-state lifecycle within their institution's tenant schema:

```mermaid
stateDiagram-v2
    [*] --> SEEDED: Admin uploads CSV
    SEEDED --> INVITED: Admin sends activation email
    INVITED --> VERIFIED: Student clicks link + verifies OTP
    VERIFIED --> ACTIVE: Student sets password + account created
    ACTIVE --> INACTIVE: Admin deactivates
    INACTIVE --> ACTIVE: Admin reactivates
```

### 3a. Seeding (CSV Upload)

The Admin/SPOC uploads a CSV file containing student records:

| CSV Column | Maps To | Required |
|------------|---------|----------|
| stu_ref | `PreSeededRegistry.stu_ref` | ✅ |
| roll_number | `PreSeededRegistry.roll_number` | ✅ |
| full_name | `PreSeededRegistry.full_name` | ✅ |
| department | `PreSeededRegistry.department` | ✅ |
| email | `PreSeededRegistry.email` | ✅ |
| batch_year | `PreSeededRegistry.batch_year` | ✅ |
| cgpa | `PreSeededRegistry.cgpa` | ❌ |
| tenth_percent | `PreSeededRegistry.tenth_percent` | ❌ |
| twelfth_percent | `PreSeededRegistry.twelfth_percent` | ❌ |

Each record is created with `status = SEEDED`. No `User` account, no `LoginSession`, no resources allocated.

### 3b. Activation Invitation

When the Admin selects students and sends invitations:

1. System generates a **signed activation token** using Django's `TimestampSigner`:

```python
# activation.py
signer = TimestampSigner(salt="activation-salt")

def generate_activation_token(institution_id, identifier, role):
    data = f"{institution_id}:{identifier}:{role}"
    return signer.sign(data)
```

2. The token encodes: `institution_id:stu_ref:role`
3. An email is sent with the activation URL: `{FRONTEND_URL}/auth/activate?token=<signed_token>`
4. Student status: `SEEDED → INVITED`
5. Token is time-limited (default: 24 hours)

### 3c. Student Activation

When the student clicks the activation link:

```mermaid
sequenceDiagram
    participant ST as Student
    participant FE as Frontend (Activate.tsx)
    participant BE as Backend
    participant PG as PostgreSQL

    ST->>FE: Click activation link (?token=xyz)
    FE->>BE: POST /auth/activate/validate-token/
    BE->>BE: TimestampSigner.unsign(token, max_age=86400)
    BE-->>FE: Token valid → institution name, student name (read-only)
    ST->>FE: Set password (strength validated)
    FE->>BE: POST /auth/activate/complete/
    BE->>PG: Create User in public schema (email, role=STUDENT)
    BE->>PG: Link User.core_student → PreSeededRegistry.stu_ref
    BE->>PG: Update PreSeededRegistry.status = ACTIVE
    BE->>BE: handle_login() → JWT + Quantum Shield
    BE-->>FE: Redirect to dashboard
```

### Why This Design?

| Design Choice | Rationale |
|---------------|-----------|
| **No self-registration** | Prevents phantom accounts. Institution controls who can join. |
| **Pre-seeded identity** | `STU_REF` is the canonical identifier, set by the institution. |
| **Resources allocated post-activation only** | `User`, `LoginSession`, Quantum Shield cookies — all created only when a student actually activates. |
| **Signed tokens** | Django `TimestampSigner` provides cryptographic integrity + time-based expiry. No random tokens stored in the DB. |

---

## 4. OTP Flows for Account Operations

Two OTP paths are implemented:

### User-Based OTP (Existing Users)

Used for Super Admin login MFA and student login:

```python
# send_otp_secure(user)
otp = generate_otp()  # 6-digit via secrets.randbelow()
key = make_cache_key("otp", str(user.id), ip="SEC_GATE")
cache_set(key, hash_token_secure(otp), timeout=OTP_TTL_SECONDS)
send_otp_to_user(user, otp)
```

### Identifier-Based OTP (Pre-Activation)

Used when a student hasn't activated yet and there's no `User` object:

```python
# send_otp_to_identifier(identifier, email)
otp = generate_otp()
key = make_cache_key("otp", str(identifier), ip="SEC_GATE")
cache_set(key, hash_token_secure(otp), timeout=OTP_TTL_SECONDS)
send_mail("Your Verification Code", f"Code: {otp}", settings.DEFAULT_FROM_EMAIL, [email])
```

Both paths:
- Store OTPs as **HMAC hashes** in Redis (never plaintext)
- Delete cache entry after successful verification (single-use)
- Log OTP values in debug mode only

---

## 5. Password Reset Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant PG as PostgreSQL

    U->>FE: Click "Forgot Password"
    FE->>BE: POST /auth/password/reset/
    BE->>PG: Create PasswordResetRequest (token_hash, single_use, expires_at)
    BE->>PG: Invalidate all previous reset tokens for this user
    BE->>SMTP: Send reset email with link
    U->>FE: Click reset link
    FE->>BE: POST /auth/password/reset/confirm/ (token + new password)
    BE->>PG: Verify token hash, check expiry, check not used
    BE->>PG: Update password → mark token as used
    BE-->>FE: Success → redirect to login
```

Key security properties:
- Token is hashed using `hash_token_secure()` before storage
- New request **invalidates all existing tokens** for the user
- Tokens expire after configurable TTL (default 24 hours)
- Used tokens are marked → cannot be reused
- "Expired Link" page shown if token is invalid/used
