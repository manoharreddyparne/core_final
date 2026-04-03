# Verification Scratchpad - 2026-04-03

## Scope
- Exam backend/frontend parity fixes
- Nexora branding cleanup for visible product copy
- Docker runtime smoke validation

## Backend
- `python manage.py check` passed under the local backend virtualenv.
- `python manage.py test --settings=auip_core.settings.testing` starts discovery (`123` tests found) but fails while building the SQLite test database because the repo still contains PostgreSQL-only migrations using `ArrayField` defaults.
- Runtime backend containers became healthy under Docker Compose.

## Frontend
- `npm run build` passed after repairing a syntax regression in `CertificateVerify.tsx`.
- Frontend dev server responded on `http://localhost:3000`.
- Served HTML confirms the updated title and favicon path:
  - `Nexora Portal`
  - `/nexora-logo.svg`

## Docker Compose
- `docker compose up -d --build redis migrate backend nginx frontend` completed successfully.
- Healthy/running services observed:
  - `redis`
  - `backend` replicas `1..3`
  - `nginx`
  - `frontend`
  - `celery-worker`
  - `celery-beat`

## Endpoint Smoke Checks
- `GET /` on frontend returned `200`.
- `GET /api/users/public/institutions/` returned `200`.
- `GET /api/exams/eligible/` returned `403` without auth, which is expected for a student-protected endpoint.
- `GET /api/users/public/site-config/` returned `403` from terminal probes because the backend security middleware flags PowerShell requests as headless/bot traffic.

## Notes
- Visible Nexora branding was updated in the landing fallback content, certificate verification page copy, certificate PDF/email templates, favicon path, and docs touched in this pass.
- Internal package/module names such as `auip_core` and tenant app labels were intentionally left unchanged to avoid breaking the codebase.
