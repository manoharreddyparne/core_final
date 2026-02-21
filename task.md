# Task: Sprint 2 - Multi-Tenant Architecture & Segregated Auth

- [x] **Phase 1: Multi-Tenant Backend Core** <!-- id: 0 -->
    - [x] Install & Configure `django-tenants` <!-- id: 1 -->
    - [x] Create `auip_tenant` app (Shared Schema) <!-- id: 2 -->
    - [x] Implement `Client` & `Domain` Models <!-- id: 4 -->
    - [x] Configure `DATABASE_ROUTERS` and Middleware <!-- id: 6 -->
    - [x] Create Public Tenant (Superuser) <!-- id: 26 -->

- [x] **Phase 2: Tenant Schema Models (The 4 Tables)** <!-- id: 7 -->
    - [x] Create `auip_institution` app <!-- id: 3 -->
    - [x] Implement `AcademicRegistry` (Read-Only Source of Truth) <!-- id: 8 -->
    - [x] Implement `PreSeededRegistry` (Import Validation) <!-- id: 9 -->
    - [x] Implement `AuthorizedAccount` (Active Login) <!-- id: 10 -->
    - [x] Implement `FacultyProfile` (Staff Details) <!-- id: 11 -->

- [/] **Phase 3: Authentication Refactor** <!-- id: 12 -->
    - [ ] Create `InstitutionSelector` API (Public List) <!-- id: 13 -->
    - [ ] Implement Student Auth Flow (Link-based verification) <!-- id: 14 -->
    - [ ] Implement Faculty Auth Flow (OTP-based) <!-- id: 15 -->
    - [ ] Implement Super Admin Login (Hidden URL) <!-- id: 16 -->

- [ ] **Phase 4: Registration & State Management** <!-- id: 17 -->
    - [ ] Implement Bulk Import for Pre-seeding <!-- id: 18 -->
    - [ ] Implement Activation Link Generation with State Recovery <!-- id: 19 -->
    - [ ] Integrate Turnstile Persistence <!-- id: 20 -->

- [ ] **Phase 5: Frontend Integration** <!-- id: 21 -->
    - [ ] Build `InstitutionSelector` Component <!-- id: 22 -->
    - [ ] Create dedicated Student Login Page <!-- id: 23 -->
    - [ ] Create dedicated Faculty/Admin Login Page <!-- id: 24 -->
    - [ ] Update Dashboards to use new API endpoints <!-- id: 25 -->



