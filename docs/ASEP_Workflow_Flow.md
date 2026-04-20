# ASEP: Secure Exam Workflow & Step Flow

This document details the operational flow of a secure examination session within the AUIP Platform.

## Phase 1: Preparation (Faculty/Admin)
1.  **Exam Definition**: Faculty creates an exam entry with security parameters (Lockdown: ON, Proctoring: ON, Device Restriction: LAPTOP_ONLY).
2.  **AI Question Generation**:
    *   Faculty clicks "Neural Mapping" (Zap icon).
    *   System calls `ExamAIArchitect` (Gemini API).
    *   AI generates scenario-based MCQs/Coding questions.
    *   System saves questions to `QuestionBank` and links them to the Exam via `ExamSection`.

## Phase 2: Session Initiation (Student)
1.  **Eligibility Check**: Student views available exams in `MockTestHub`.
2.  **Device Gate**: `DeviceGate` component checks User-Agent. Access denied if on Mobile/Tablet.
3.  **Secure Launch**: Student clicks "Launch Portal".
4.  **Lockdown Activation**: 
    *   `useExamLockdown` hook forces Fullscreen mode.
    *   Keyboard listeners block F12, Ctrl+C, Ctrl+V, PrintScreen.
    *   Right-click context menu is disabled.
5.  **Proctor Initialization**: `ProctorSentinel` activates webcam and begins BlazeFace tracking.

## Phase 3: Active Examination
1.  **Interface**: Main `ExamPortalPage` displays questions section-by-section.
2.  **Coding Arena**: For coding questions, `CodeArena` (Monaco Editor) provides a professional IDE experience with language selection.
3.  **Security Monitoring**:
    *   If student exits fullscreen or switches tabs, `EventSentinel` logs a violation.
    *   If proctoring detects multiple faces or no face, a `SNAPSHOT_AI_VIOLATION` is logged.
    *   Violation score increases. In "Strict Mode", exceeding the threshold auto-blocks the session.
4.  **Auto-Save**: Answers are synced to the backend every 30 seconds and on every selection.

## Phase 4: Termination & Submission
1.  **Timer Expiry**: If time runs out, the portal triggers `handleSubmit` automatically.
2.  **Manual Finish**: Student confirms submission.
3.  **Result Concealment**: Score is calculated but held (withheld) if the exam settings specify delayed results.
4.  **Portal Exit**: Fullscreen mode is released, and the student is redirected to the dashboard.

---

## Technical Stack Summary
- **Backend**: Django REST Framework, PostgreSQL, Redis (Celery).
- **Core Security**: React Hooks (Visibility API, Fullscreen API), CSS Media Print blocks.
- **AI Engine**: Google Gemini Pro (Questions), TensorFlow.js BlazeFace (Proctoring).
- **Editor**: Monaco Editor (@monaco-editor/react).
