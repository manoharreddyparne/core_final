# Architecture V2: Multi-Tenant Schema & Segregated Auth Plan

## 1. Multi-Tenant Database Architecture
We will implement **Schema-per-Tenant** isolation. This matches your "X*4 tables" requirement perfectly.
- **Global Schema (`public`)**: Stores only Super Admin & Institution Registry.
- **Tenant Schemas (`inst_<slug>`)**: Created automatically upon Institution Approval.

### 1.1 Global Database (`public` schema)
- **Table: `GlobalUsers`** (Super Admins ONLY)
  - Secured, isolated. No other users here.
- **Table: `Institutions`**
  - Name, Domain, Status, Schema Name (`inst_stanford`).
- **Table: `GlobalSettings`**

### 1.2 Tenant Database (`inst_stanford` schema)
When Super Admin approves an institution, the server auto-creates these **4 Isolated Tables**:

#### 1. `AcademicRegistry` (The "Secured" Table)
- **Role**: Read-Only Source of Truth.
- **Data**: Student Roll No, CGPA, Verified Degree Info.
- **Access**: Only System Admin / Automated Import. No direct user write access.

#### 2. `PreSeededRegistry` (The "Import" Table)
- **Role**: Validates who *can* register.
- **Data**: Email, Roll No, Role (Student/Faculty), Invitation Status.
- **Logic**: Used to verify identity during public registration.

#### 3. `AuthorizedAccounts` (The "Active" Table)
- **Role**: Live user accounts for Login.
- **Data**: Username/Email, Hashed Password, MFA Secret, Last Login.
- **Link**: Linked 1-to-1 with `PreSeededRegistry` & `AcademicRegistry`.

#### 4. `FacultyProfiles` (The "Staff" Table)
- **Role**: Dedicated storage for Educators/Admins.
- **Data**: Designation, Department, Permissions.

---

## 2. Authentication & Registration Flows

### 2.1 Student Registration (Public)
1. **Inst Selection**: Select "Stanford" from dropdown.
2. **Identity Check**: Input Roll No + Email.
   - System checks `inst_stanford.PreSeededRegistry`.
   - If valid -> Sends **Activation Link** (No OTP).
3. **Activation**:
   - Click Link -> **State Captured** (Token verified).
   - Set Password (Modal).
   - **Resume Capability**: If stopped here, re-clicking link resumes at "Set Password".
4. **Completion**: Record created in `AuthorizedAccounts`.

### 2.2 Student Login (Public)
1. **Step 1**: Select Institution ("Stanford").
2. **Step 2**: Enter Roll No/Email + Password.
3. **Step 3**: **No OTP** (Direct Dashboard Access).
   - *Reason*: Low security risk, strictly read-only academic data.

### 2.3 Faculty/Admin Registration (Private-ish)
1. **Pre-requisite**: Must be in `PreSeededRegistry` (added by Inst Admin).
2. **Flow**: Select Inst -> Enter Email.
3. **Verification**: System sends **Activation Link**.
4. **Setup**: Click Link -> Verify -> Set Password + **Setup MFA/OTP**.

### 2.4 Faculty/Admin Login (Secured)
1. **Step 1**: Select Institution.
2. **Step 2**: Enter Email + Password.
3. **Step 3**: System validates credentials.
4. **Step 4**: **OTP Challenge** (Email/Authenticator).
   - *State*: "Password Verified, Pending OTP".
   - *Security*: Dashboard NOT loaded until OTP valid.

### 2.5 Super Admin Login (Hidden)
- **URL**: Custom hidden path (e.g., `/sys-admin/secure/`).
- **Auth**: Email + Password + **OTP**.
- **Access**: Global control.

---

## 3. UI/UX & State Management
- **Loading States**: Full-screen "Processing..." modal for async requests.
- **Error Toasts**: Specific messages ("Wrong Password", "User Not Found in Registry"). Use persistent IDs to prevent duplicate toasts.
- **Toasts Auto-Dismiss**: 5 seconds timer.
- **Turnstile Persistence**:
  - `is_human` flag stored in HttpOnly session.
  - Verified once -> No more checkboxes for that session.
- **Registration State Recovery**:
  - Activation tokens store "Current Step" status.
  - Returning users pick up exactly where they left off (e.g., "Set Password").

## 4. Next Steps for Implementation
1. **Backend**: Setup `django-tenant-schemas`.
2. **Models**: Create the 4-table structure in a new `tenant_apps` module.
3. **API**: Create `public/tenants/list` endpoint for the dropdown.
4. **Frontend**: Build `InstitutionSelector` and separate Login forms.

once the super user approves the institution, the system will create a new database schema for the institution and populate the 4 tables with the data from the pre-seeded registry. Then the institution admin will be able to login and add more users to the pre-seeded registry. 