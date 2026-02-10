# User Stories - AUIP Platform

## Epic 1: Identity & Access Management (Two-Database Architecture)

### User Story 1.1: Bulk Student Seeding
**As an** Admin/SPOC  
**I want to** upload student data via Excel/CSV  
**So that** I can pre-populate the core student database before students activate their accounts

**Acceptance Criteria:**
- [ ] Upload CSV with columns: stu_ref, roll_number, full_name, department, batch_year, email, CGPA, 10th%, 12th%
- [ ] System validates data (no duplicates, valid formats)
- [ ] Records created in `core_students` table with status="SEEDED"
- [ ] Displays summary: X students added, Y errors
- [ ] Download error report if validation fails

**Priority:** HIGH  
**Story Points:** 5

---

### User Story 1.2: Send Activation Invitations
**As a** TPO/Admin  
**I want to** send activation emails to selected students  
**So that** students can create their accounts

**Acceptance Criteria:**
- [ ] Select students from seeded list (status="SEEDED")
- [ ] System generates unique activation token for each
- [ ] Email sent with activation link (expires in 7 days)
- [ ] Token stored in `auth_registration_invitations` table
- [ ] Student status updated: SEEDED → INVITED
- [ ] Track who sent invitation and when

**Priority:** HIGH  
**Story Points:** 8

---

### User Story 1.3: Student Account Activation
**As a** Student  
**I want to** click the activation link and set my password  
**So that** I can access the AUIP platform

**Acceptance Criteria:**
- [ ] Click activation link validates token (not expired, not used)
- [ ] Form pre-fills: Name, Email, STU_REF (read-only)
- [ ] Student enters: Password (with strength validation)
- [ ] Optional: Add personal email
- [ ] System creates user in `auth_users` table
- [ ] Links to core_students via stu_ref
- [ ] Marks invitation as ACTIVATED
- [ ] Updates core_students.status: INVITED → ACTIVE
- [ ] Redirects to login page

**Priority:** HIGH  
**Story Points:** 13

---

### User Story 1.4: Secure Login
**As a** Student  
**I want to** login with email and password  
**So that** I can access my personalized dashboard

**Acceptance Criteria:**
- [ ] Enter email + password
- [ ] System validates credentials
- [ ] Issues JWT access token (5 min expiry)
- [ ] Issues refresh token (7 days expiry) in HTTPOnly cookie
- [ ] Tracks login session (IP, device, browser)
- [ ] Redirects to dashboard
- [ ] Shows last login time

**Priority:** HIGH  
**Story Points:** 8

---

## Epic 2: Placement Management

### User Story 2.1: Create Placement Drive
**As a** TPO  
**I want to** create a new placement drive  
**So that** companies can recruit students

**Acceptance Criteria:**
- [ ] Enter: Company name, role, package, deadline
- [ ] Set eligibility criteria (CGPA, branches, 10th%, 12th%)
- [ ] Support AND/OR logic for criteria
- [ ] Set application deadline
- [ ] Mark as active/inactive
- [ ] Email notification to eligible students

**Priority:** HIGH  
**Story Points:** 13

---

### User Story 2.2: Dynamic Eligibility Engine
**As a** TPO  
**I want to** define complex eligibility rules  
**So that** only qualified students are shortlisted automatically

**Acceptance Criteria:**
- [ ] Support expressions: CGPA ≥ 7.5 AND (10th% ≥ 60 OR 12th% ≥ 65)
- [ ] Support branch restrictions: (CS OR IT OR ECE)
- [ ] Support custom conditions: attendance ≥ 75%
- [ ] Validate at application time
- [ ] Show eligibility reason to students (why eligible/not eligible)

**Priority:** HIGH  
**Story Points:** 21

---

### User Story 2.3: Student Apply to Drive
**As a** Student  
**I want to** view eligible drives and apply  
**So that** I can participate in placement

**Acceptance Criteria:**
- [ ] See list of drives I'm eligible for
- [ ] See drives I'm NOT eligible for (with reasons)
- [ ] Click "Apply" to submit application
- [ ] System checks one-student-one-job rule
- [ ] Upload resume (PDF only, <2MB)
- [ ] Confirmation email sent

**Priority:** HIGH  
**Story Points:** 8

---

## Epic 3: Governance Brain (AI Core)

### User Story 3.1: Placement Readiness Scoring
**As the** Governance Brain  
**I want to** calculate each student's placement readiness score  
**So that** I can identify at-risk students

**Acceptance Criteria:**
- [ ] Calculate score based on:
  - Academic performance (CGPA weight: 30%)
  - Mock test performance (weight: 40%)
  - Interview performance (weight: 20%)
  - Project/internship (weight: 10%)
- [ ] Score range: 0-100
- [ ] Update daily
- [ ] Flag students with score < 40 as "at-risk"

**Priority:** MEDIUM  
**Story Points:** 13

---

### User Story 3.2: Personalized Mock Assignment
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

### User Story 3.3: Intervention Recommendations
**As a** TPO  
**I want to** see AI-recommended interventions for at-risk students  
**So that** I can provide targeted support

**Acceptance Criteria:**
- [ ] Dashboard shows at-risk students
- [ ] For each student, show:
  - Readiness score
  - Weak areas
  - Recommended actions (e.g., "Schedule 1-on-1 mentoring")
  - Predicted placement probability
- [ ] Filter by department, batch
- [ ] Export to Excel

**Priority:** MEDIUM  
**Story Points:** 13

---

## Epic 4: Student Experience

### User Story 4.1: Personalized Dashboard
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

### User Story 4.2: Mock Test Taking
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

## Epic 5: TPO/Admin Operations

### User Story 5.1: TPO Dashboard
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

### User Story 5.2: Student Search
**As a** TPO/Admin  
**I want to** search for any student  
**So that** I can view their complete profile

**Acceptance Criteria:**
- [ ] Search by: Name, STU_REF, Roll Number, Email
- [ ] View merged profile:
  - Core student data (CGPA, academics)
  - Auth data (last login, account status)
  - Placement data (applications, status)
  - Mock test history
- [ ] View detailed performance reports

**Priority:** HIGH  
**Story Points:** 8

---

## Backlog (Future Sprints)

- Resume parsing with NLP
- LLM-powered interview preparation chatbot
- Company-specific mock tests
- Peer comparison (anonymized)
- Mobile app (iOS/Android)

---

**Total Story Points (MVP):** ~200  
**Estimated Sprints:** 8-10 (2-week sprints)  
**Estimated Timeline:** 4-5 months
