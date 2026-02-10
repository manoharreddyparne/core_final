# AUIP Platform - Migration Tracking Document

## Migration Date
**Started**: February 10, 2026  
**Status**: In Progress

---

## Migration Overview

This document tracks the migration from the old `exam_portal/` structure to the new industry-standard `AUIP-Platform/` structure.

### Migration Goals
1. ✅ Complete backend/frontend separation
2. ✅ Production-ready Docker configuration
3. ✅ AWS deployment readiness
4. ✅ Industry-standard project organization
5. ✅ Comprehensive documentation

---

## Directory Structure Changes

### Old Structure (exam_portal/)
```
exam_portal/
├── secure_exam/          # Django core
├── users/                # User management
├── courses/              # Courses
├── quizzes/              # Quizzes
├── attempts/             # Exam attempts
├── anti_cheat/           # Anti-cheat
├── reports/              # Reports
└── exam-portal-frontend/ # Frontend (mixed)
```

### New Structure (AUIP-Platform/)
```
AUIP-Platform/
├── backend/
│   ├── auip_core/        # Django core (split settings)
│   ├── apps/
│   │   ├── identity/     # From users/
│   │   ├── academic/     # From courses/
│   │   ├── examination/  # From quizzes/attempts/anti_cheat/
│   │   ├── analytics/    # From reports/
│   │   ├── placement/    # NEW
│   │   ├── governance/   # NEW
│   │   ├── intelligence/ # NEW
│   │   └── notifications/# NEW
│   └── shared/           # Shared utilities
├── frontend/             # Separate React app
├── infrastructure/       # Docker, Terraform, Nginx
├── docs/                 # All documentation
├── .github/              # CI/CD workflows
└── scripts/              # Automation scripts
```

---

## File Mapping (Old → New)

### Backend Apps

#### Identity Service (from users/)
| Old Path | New Path |
|----------|----------|
| `exam_portal/users/` | `AUIP-Platform/backend/apps/identity/` |
| `exam_portal/users/models/core_models.py` | `backend/apps/identity/models/user.py` |
| `exam_portal/users/models/auth_models.py` | `backend/apps/identity/models/tokens.py` |
| `exam_portal/users/views/auth/login.py` | `backend/apps/identity/views/auth.py` |
| `exam_portal/users/serializers/` | `backend/apps/identity/serializers/` |
| `exam_portal/users/services/` | `backend/apps/identity/services/` |
| `exam_portal/users/tests/` | `backend/apps/identity/tests/` |

#### Academic Service (from courses/)
| Old Path | New Path |
|----------|----------|
| `exam_portal/courses/` | `AUIP-Platform/backend/apps/academic/` |
| `exam_portal/courses/models.py` | `backend/apps/academic/models/course.py` |
| `exam_portal/courses/views.py` | `backend/apps/academic/views/course.py` |
| `exam_portal/courses/serializers.py` | `backend/apps/academic/serializers/` |

#### Examination Service (from quizzes/attempts/anti_cheat/)
| Old Path | New Path |
|----------|----------|
| `exam_portal/quizzes/` | `backend/apps/examination/models/quiz.py` |
| `exam_portal/attempts/` | `backend/apps/examination/models/attempt.py` |
| `exam_portal/anti_cheat/` | `backend/apps/examination/models/cheat_detection.py` |

#### Analytics Service (from reports/)
| Old Path | New Path |
|----------|----------|
| `exam_portal/reports/` | `AUIP-Platform/backend/apps/analytics/` |

### Django Core

| Old Path | New Path |
|----------|----------|
| `exam_portal/secure_exam/settings.py` | `backend/auip_core/settings/base.py` |
| - | `backend/auip_core/settings/development.py` (NEW) |
| - | `backend/auip_core/settings/production.py` (NEW) |
| `exam_portal/secure_exam/urls.py` | `backend/auip_core/urls.py` |
| `exam_portal/secure_exam/wsgi.py` | `backend/auip_core/wsgi.py` |
| `exam_portal/secure_exam/asgi.py` | `backend/auip_core/asgi.py` |
| `exam_portal/manage.py` | `backend/manage.py` |

### Frontend

| Old Path | New Path |
|----------|----------|
| `exam_portal/exam-portal-frontend/` | `AUIP-Platform/frontend/` |
| `exam-portal-frontend/src/` | `frontend/src/` |

---

## Configuration Changes

### Environment Variables
- Split into `.env.development` and `.env.production`
- Centralized in root and each service

### Settings
- Django settings split into:
  - `base.py` - Common settings
  - `development.py` - Dev overrides
  - `production.py` - Production with security
  - `testing.py` - Test configuration

---

## New Features Added

### 1. Docker Support
- ✅ `backend/Dockerfile`
- ✅ `frontend/Dockerfile`
- ✅ `docker-compose.yml` (local dev)
- ✅ `docker-compose.prod.yml` (production)

### 2. CI/CD Pipelines
- ✅ `.github/workflows/backend-ci.yml`
- ✅ `.github/workflows/frontend-ci.yml`
- ✅ `.github/workflows/deploy-staging.yml`
- ✅ `.github/workflows/deploy-production.yml`

### 3. Infrastructure as Code
- ✅ `infrastructure/terraform/` - AWS configuration
- ✅ `infrastructure/nginx/` - Web server configs

### 4. Documentation
- ✅ `docs/user-stories/` - Agile user stories
- ✅ `docs/api/` - API documentation
- ✅ `docs/architecture/` - System architecture
- ✅ `docs/deployment/` - Deployment guides
- ✅ `docs/development/` - Dev setup guides

---

## Migration Steps Completed

- [x] Create new AUIP-Platform/ root directory
- [x] Create backend/, frontend/, infrastructure/, docs/ structure
- [x] Create .gitignore
- [x] Create README.md
- [/] Copy existing code from exam_portal/
- [ ] Update all import paths
- [ ] Test backend
- [ ] Test frontend
- [ ] Create Docker images
- [ ] Initialize Git repository
- [ ] First commit: "Initial industry-standard structure"

---

## Post-Migration Tasks

1. **Testing**
   - [ ] Run backend tests: `pytest backend/`
   - [ ] Run frontend tests: `npm test`
   - [ ] Test Docker builds
   - [ ] Test docker-compose orchestration

2. **Documentation**
   - [ ] Update API documentation
   - [ ] Document new services
   - [ ] Create deployment runbooks

3. **Deployment**
   - [ ] Set up AWS infrastructure
   - [ ] Configure CI/CD pipelines
   - [ ] Deploy to staging
   - [ ] Production deployment

---

## Archive Plan

### exam_portal/ Folder
- **Action**: Rename to `exam_portal_backup/`
- **Keep Until**: Migration fully validated (2 weeks)
- **Then**: Archive to ZIP and store separately

---

## Contact & Support

**Migration Lead**: Development Team  
**Documentation**: This file tracks all changes  
**Questions**: Refer to docs/ folder for detailed guides
