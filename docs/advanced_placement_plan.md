# AUIP Advanced Placement & AI Engine — Audited Implementation Plan

## 💎 Current State (Audited & Verified)
- ✅ **Phase 1: Neural Expertise Extraction** (Live)
  - Distinguishes **60% UG vs 6.0 CGPA** accurately.
  - No placeholders ("CTC string") — uses **"Not Specified"** fallbacks.
  - **Neural Archetype Summary**: Descriptive textual role essence.
  - **Dynamic Ad-hoc Discovery**: Auto-extracts Bond, Shifts, Travel into editable ledger.
  - **Manual Intervention**: Admin can manually edit or delete AI-generated Criteria.
- ✅ **Phase 1.5: Pre-Broadcast Eligibility Engine** (In Development)
  - **Cross-Registry Evaluation**: Scans `studentpreseededregistry`, `studentauthorizedregistry`, and `studentacademicregistry` to find ALL eligible students before finalizing the drive.
  - **Excel UI Data Table**: Displays the list of eligible students (Activated vs. Not Activated) directly in the UI for admin review prior to saving.
  - **Targeted Communications**: 
    - *Activated Students*: Receive immediate UI notifications (with premium animations) and Email alerts with full drive details.
    - *Unactivated (Preseeded) Students*: Receive a teaser Email ("You are eligible for a new placement drive, activate your account to apply!") and their UI notifications are placed on HOLD until activation.

---

- ✅ **Phase 2: High-Fidelity Intelligence UI** (Live)
  - **Paginated Manifest**: Scalable verification of 1000+ eligible students with word-order independent search.
  - **Student Detail Modal**: Immersive, card-to-modal transition for careers hub with AI-extracted insights.
  - **Live Preview System**: Strategic simulation of student perspective for admins.
- ✅ **Phase 3: Secure Broadcast & Communication Hub** (Live)
  - **Rich HTML Notifications**: Premium dark-themed automated matching emails.
  - **Join-Gate Verification**: Bilateral security check — only eligible/applied students can join secure drive chats.
  - **Persistence & Governance**: Full history for late joiners and admin-controlled 'Announcement' modes (Read-Only) for students.
  - **Orchestration Dashboard**: Admins can audit and purge participants from recruitment channels in real-time.
  - **Deep-Linked Hub**: Instant navigation from placement cards to dedicated secure chat infrastructure.

---

## Upcoming Phases
1. **Phase 4: AI Student Risk Scoring** (Next)
2. **Phase 6: Advanced ML Models** (Match scoring & Resume analysis)

---

## Phase 2: Smart AI Document Processor & Expertise Engine (Sprint 8)
> JD/Brochure/Image → AI Analysis → Expertise Extraction → Feed Post

### Backend: `apps/placement/services/jd_parser.py` (Upgraded)

```
INPUT: PDF / DOCX / Image (brochure, JD, company info)
    ↓
STAGE 1: Document Processor (Text/OCR)
    - PDF/DOCX Parsing
    - Image OCR for physical brochures
    ↓
STAGE 2: Neural Expertise Engine
    - Skill Graph: Extract Primary vs. Secondary tech stacks
    - Categorization: Is it Deep Tech, Management, or Sales?
    - Difficulty Score: AI evaluates role complexity (1-10)
    - Drive Tiering: Auto-classify as PREMIUM or GENERAL
    ↓
STAGE 3: Social & Template Hub
    - Auto-generate social catchphrases (blurbs)
    - Pre-fill recruitment modal with expertise metrics
```

### Frontend: Expertise-Ready Recruitment Modal
- **Dynamic Skill Chips**: Auto-populated primary/secondary skills
- **Smart Badges**: Show "Premium" or "Mass Recruiter" labels automatically
- **Difficulty Meter**: Visual indicator of role complexity
- **AI Social Preview**: Edit auto-generated blurbs before posting
- One-click "Create Drive + Broadcast" capability

---

## Phase 3: Placement Group Communication Hub (Sprint 8)
> WhatsApp-like groups per drive — no manual group creation needed

### What already exists:
- `ChatSession` model with `is_group`, `participants`, `invite_link_token`
- `ChatMessage` model with attachments, read/delivered tracking
- WebSocket consumer for real-time messaging

### What to build:

#### Backend additions:
1. **Auto-group on broadcast** ✅ DONE (implemented in eligibility_engine.py)
2. **Group message API** — POST messages to drive groups
3. **Pin messages** — TPO can pin important messages (add `is_pinned` to ChatMessage)
4. **Shared links & media** — Upload docs/links to group
5. **Group notifications** — New message → push notification to all participants
6. **Auto-archive** — Groups auto-archive 30 days after drive closes

#### Frontend: Group Chat Panel in Placement Hub
- Group list sidebar (per drive)
- Real-time messaging with WebSocket
- File/link sharing
- Pinned messages at top
- "New messages" badge on sidebar
- Export chat history as PDF

---

## Phase 4: AI-Powered Student Performance Analysis (Sprint 9)
> Automated scoring, risk detection, placement readiness

### Backend: `apps/governance/services/student_analyzer.py`

```
INPUT: StudentAcademicRegistry data
    ↓
ANALYSIS LAYERS:
1. Academic Score → CGPA trend, backlog history, semester-wise progression
2. Skill Mapping → Branch alignment with market demand (AI-scored)
3. Placement Readiness → Resume completeness, mock interview scores
4. Risk Scoring → Low CGPA + backlogs + inactive account = HIGH RISK
5. Recommendation Engine → "Student X should focus on DSA, apply to Y companies"
    ↓
OUTPUT: StudentIntelligenceProfile (auto-computed)
    - readiness_score (0-100)
    - behavior_score (0-100)  
    - risk_factor (0.0-1.0)
    - interest_matrix (JSON)
    - ai_recommendations (text)
```

### Auto-compute triggers:
- On student registration/CSV upload
- On CGPA update
- On placement application status change
- On-demand via "Recompute Matrix" button

---

## Phase 5: Feed & Social Integration (Sprint 9)
> Placement opportunities as LinkedIn-style posts viewable by students

### How it works:
1. TPO creates drive (manually or via AI document processor)
2. System auto-generates a SocialPost:
   - Company logo/banner (from brochure or generated)
   - Role, Package, Deadline
   - Eligibility criteria summary
   - "Apply Now" button (only visible if student is eligible)
   - "Not Eligible" label (if student doesn't meet criteria)
3. Students see these in their Professional Hub feed
4. Apply button → creates PlacementApplication
5. Comments section for Q&A about the opportunity

### Database: Add `drive_id` field to SocialPost
```python
# In SocialPost model
drive_id = models.IntegerField(null=True, blank=True)  # Links to PlacementDrive
post_type = models.CharField(choices=[('GENERAL','General'),('PLACEMENT','Placement')], default='GENERAL')
```

---

## Phase 6: Advanced NLP/ML Models (Sprint 10)
> Neural schemas for deep document understanding

### Model 1: JD Similarity Scorer
- Input: Student resume + JD text
- Output: Match score (0-100) + skill gap analysis
- Tech: Sentence transformers (all-MiniLM-L6-v2) or Gemini embeddings
- Use case: Auto-rank applicants by fit score

### Model 2: Resume Quality Analyzer
- Input: Student resume PDF
- Output: Quality score + improvement suggestions
- Tech: Custom prompt engineering with Gemini/Groq
- Use case: Students get feedback before applying

### Model 3: Image/Brochure OCR Pipeline
- Input: Company brochure image (JPG/PNG)
- Output: Extracted text → structured JD data
- Tech: Tesseract OCR → Gemini for structure extraction
- Use case: TPO photographs a physical brochure, system extracts everything

### Model 4: Placement Prediction Engine
- Input: Historical placement data + student profile
- Output: Probability of placement + recommended companies
- Tech: Logistic regression / XGBoost on historical enrollment data
- Use case: "Student X has 78% chance of placement at Service companies"

---

## Implementation Order

| Sprint | What | Priority |
|--------|------|----------|
| **NOW** | Test e2e flow: Create drive → broadcast → verify | 🔴 |
| **S8-A** | Document Intelligence (PDF/DOCX/Image → AI) | 🔴 |
| **S8-B** | Group chat UI in Placement Hub | 🔴 |
| **S9-A** | Auto SocialPost from PlacementDrive | 🟡 |
| **S9-B** | Student Performance Auto-Analysis | 🟡 |
| **S10** | ML Models (similarity, prediction, OCR) | 🟢 |

---

## Files to Create/Modify

### New files:
- `backend/apps/placement/services/document_intelligence.py` — Multi-format AI processor
- `backend/apps/placement/services/resume_scorer.py` — Resume vs JD matching
- `backend/apps/governance/services/student_analyzer.py` — Auto intelligence profiling
- `frontend/src/features/placement/components/DriveGroupChat.tsx` — Group chat UI
- `frontend/src/features/placement/components/AIDocumentUploader.tsx` — Smart upload

### Modified files:
- `backend/apps/social/models.py` — Add `drive_id`, `post_type` to SocialPost
- `backend/apps/placement/views.py` — Add document_intelligence endpoint
- `frontend/src/features/placement/pages/AdminPlacementHub.tsx` — AI upload + group panel
- `frontend/src/features/placement/pages/PlacementHub.tsx` — Feed-style drive cards
