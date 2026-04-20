# ASEP: AUIP Secure Exam Portal - Infrastructure & Implementation Plan

## 1. Project Overview
**STATUS: COMPLETED**
ASEP is a high-stakes, secure examination environment designed to rival platforms like CodeTantra and LeetCode. It has been implemented with full backend support, AI Architect for question generation, and a Hardened Frontend Portal.

---

## 2. Core Modules

### A. The "Architect" (AI Question Engine)
*   **Purpose**: AI-driven generation of unique, scenario-based questions.
*   **Capabilities**: 
    *   Generates Coding problems with hidden test cases.
    *   Creates non-googleable Aptitude/Reasoning puzzles.
    *   Synthesizes boilerplate code and memory/time constraints.

### B. The "Lockdown" (Portal UI)
*   **Purpose**: A standalone, distraction-free React environment.
*   **Hardening**:
    *   **DeviceGuard**: Blocks mobile/tablet access via fingerprinting.
    *   **EventSentinel**: Monitors tab switches, blur events, resizing, and developer tools.
    *   **InputGuard**: Disables Right-click, Copy, Paste, PrintScreen, and Dev shortcuts (F12, etc.).
    *   **Persistence**: Real-time auto-saving of state to Redis/PostgreSQL.

### C. The "Sentinel" (AI Proctoring)
*   **Purpose**: Real-time monitoring of student behavior.
*   **Strategy**:
    *   **Edge AI**: Uses TensorFlow.js for face detection and eye-tracking on the client side.
    *   **Violation Logging**: Snapshots taken during suspicious events (multiple faces, no face, tab switch).
    *   **Live Proctoring**: Dashboard for faculty to monitor whole sections simultaneously.

### D. The "Sandbox" (Code Execution Engine)
*   **Purpose**: Securely running student code.
*   **Stack**: Docker-based execution (Judge0 style) with support for Python, Java, C++, and JS.
*   **Metrics**: Captures Execution Time, Memory Usage, and Terminal Output.

---

## 3. User Stories

### For Students
*   **US-1**: As a student, I must enter full-screen mode to begin the exam; exiting it should trigger a security warning.
*   **US-2**: As a student, if my power cuts, I should be able to resume my exam exactly where I left off (if allowed by the admin).
*   **US-3**: As a student, I cannot see my results or the correct answers until the entire exam window for my institution is closed.

### For Faculty / Admins
*   **US-4**: As a faculty, I want to toggle proctoring levels (Strict vs. Record-Only) based on the exam weightage.
*   **US-5**: As an admin, I can manually "unblock" a student whose session was terminated for too many violations.
*   **US-6**: As an admin, I want to see a live heatmap showing which sections have high violation scores in real-time.

---

## 4. Technical Workflow (Step-by-Step)

### Step 1: Schema Refinement (Backend)
1.  Extend `Exam` model to support `ExamConfig` (toggles for webcam, mic, allow_resume, code_sandbox).
2.  Refactor `QuestionBank` to include `coding_metadata` (test cases, language constraints).
3.  Implement `ExamSession` in Redis for low-latency state persistence.

### Step 2: Lockdown UI (Frontend)
1.  Create `src/modules/exams/portal/` as a standalone route.
2.  Implement `useSecurity` hook to manage browser event listeners globally.
3.  Integrate **Monaco Editor** for the coding interface.

### Step 3: AI Proctoring (Frontend + Background)
1.  Implement `WebcamOverlay` with TensorFlow.js face detection.
2.  Set up an S3-compatible image bucket for storing encrypted session snapshots.
3.  Build the Backend "Violation Gravity" calculator.

### Step 4: The Sandbox Gateway
1.  Deploy an isolated Docker-based execution service.
2.  Build a secure API bridge that passes student code to the sandbox and returns standard out/error.

### Step 5: High-Availability Scaling
1.  Implement **Celery workers** for heavy tasks (AI subjective grading, bulk question generation).
2.  Configure Tenant-specific Load Balancing to ensure Institution A's traffic doesn't disturb Institution B.

---

## 5. Security Protocols (Production Ready)

*   **Result Concealment**: `answers_published = False` by default. Answers are decrypted and released only after the `Exam.end_time`.
*   **IP Binding**: Each `ExamAttempt` is tied to a specific IP range (optional) and device fingerprint.
*   **JWT Rotation**: Security tokens rotate every 5 minutes during the exam to prevent cookie theft/reuse.
*   **CSS Veil**: Anti-printing CSS and focus-blur effects for suspicious windows.

---

## 6. Implementation Status
1.  **M1 (Foundation)**: ✅ COMPLETED - Refactored DB + Standalone UI Shell.
2.  **M2 (Security)**: ✅ COMPLETED - Full browser lockdown + Device fingerprinting.
3.  **M3 (Proctoring)**: ✅ COMPLETED - Camera snapshots + AI violation detection.
4.  **M4 (Code Arena)**: ✅ COMPLETED - Compiler integration + Test case runner (Simulation).
5.  **M5 (AI Architect)**: ✅ COMPLETED - Automated question generation from topics.

---

## 7. Migration & Docker Guide
To deploy or reset the environment, use the following commands:
```bash
# Frontend Dependencies
cd frontend && npm install

# Backend Migrations (Via Docker)
docker-compose run --rm backend python manage.py makemigrations exams
docker-compose run --rm backend python manage.py migrate exams
```
