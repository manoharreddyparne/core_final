# Sprint 1 Summary: Auth & Multi-Tenancy

## Overview
Sprint 1 focused on building the foundational architecture for the AUIP Platform, specifically targeting multi-tenant isolation, secure institutional onboarding, and a state-driven student lifecycle.

## User Stories
### 1. Institutional Registration & Approval
**As an Institution Administrator**, I want to register my university on the platform so that I can manage my students and faculty.
- **Implementation**: `RegisterUniversity.tsx`, `SuperAdmin` approval dashboard, dynamic PostgreSQL schema creation (`CREATE SCHEMA inst_<name>`).

### 2. Multi-Tenant Data Isolation
**As a Super Admin**, I want to ensure that each institution's data is strictly isolated so that there is no data leakage between universities.
- **Implementation**: `schema_context` manager, custom middleware for routing queries to the correct schema based on user context.

### 3. State-Driven Student Seeding
**As an Institutional Admin**, I want to pre-seed my student database via CSV so that they can verify their identities later.
- **Implementation**: `BulkStudentUploadView`, `BulkSeedModal`. Students start in `SEEDED` state.

### 4. Secure Student Activation
**As a Student**, I want to activate my account using a secure link/OTP sent to my institutional email.
- **Implementation**: `ActivationService`, `Activate.tsx`. Account creation (`User`, `StudentProfile`) happens only on activation.

### 5. Password-less Student Login
**As a Student**, I want to log in using an OTP so that I don't have to manage another password.
- **Implementation**: OTP request/verify flow, transition from `VERIFIED` to `ACTIVE`.

## Architectural Decisions
- **Database**: PostgreSQL with schemas for multi-tenancy.
- **State Machine**: Student transitions: `SEEDED` -> `INVITED` -> `VERIFIED` -> `ACTIVE`.
- **Identity Model**: `STU_REF` (Roll Number) as the primary identity key.

## Security Protocols
- **Short-Lived Tokens**: Access tokens (5m), Refresh tokens (7d).
- **Silent Refresh**: Seamless access token renewal via HttpOnly refresh cookies.
- **Role-Based Access Control (RBAC)**: Strict permissions for Super Admin, Institutional Admin, Faculty, and Students.
- **Turnstile Integration**: Bot protection on all auth endpoints.
- **Postgres Schema Isolation**: No cross-tenant queries possible at the database level.
