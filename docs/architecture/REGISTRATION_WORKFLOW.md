# AUIP Institution Registration & Approval Workflow

This document details the technical implementation of the institution initialization lifecycle.

## 1. Overview
AUIP follows an **Institution-Controlled, State-Driven** model. Institutions must be approved by Platform Super Admins before they can access features or seed student data.

## 2. Lifecycle States
- **PENDING**: Initial state after public registration.
- **REVIEW**: Flagged by Super Admin for manual inspection.
- **MORE_INFO**: Super Admin requested more details from the institution.
- **APPROVED**: Multi-tenant environment provisioned; institution active.
- **REJECTED**: Access denied.

## 3. Technical Flow

### A. Public Registration
- **Endpoint**: `POST /api/users/public/register/`
- **UI**: `/register-university`
- **Actions**: Creates an `Institution` record in the `public` schema with `status=PENDING`. The full application data is stored in `registration_data` (JSONB).

### B. Super Admin Approval
- **UI**: `/superadmin/institutions`
- **Actions**: 
  1. Super Admin reviews the application card.
  2. Clicks **'Set to Approved'**.
  3. Backend triggers `approve()` action on `InstitutionViewSet`.
  4. **Dynamic Schema Creation**: `create_institution_schema()` runs `CREATE SCHEMA inst_<slug>`.
  5. Institution status transitions to `APPROVED`.

### C. Multi-Tenant Isolation
- **Base Architecture**: PostgreSQL Schemas.
- **Utility**: `apps.identity.utils.multitenancy` provides a `schema_context` manager to switch `search_path` dynamically.
- **Tenant Routing**: Future requests from institutional users will be routed to their specific schema.

## 4. Components Involved
- **Backend Model**: `apps.identity.models.institution.Institution`
- **Backend View**: `apps.identity.views.public.registration.InstitutionRegistrationView`
- **Backend View**: `apps.identity.views.admin.institution_views.InstitutionViewSet`
- **Frontend Page**: `src/features/auth/pages/RegisterUniversity.tsx`
- **Frontend Page**: `src/features/dashboard/pages/InstitutionAdmin.tsx`
