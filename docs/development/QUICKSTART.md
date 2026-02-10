# AUIP Platform - Quick Start Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- ✅ **Docker Desktop** (with Docker Compose)
- ✅ **Git**
- ✅ **Code Editor** (VS Code recommended)

---

## Setup Instructions

### Step 1: Clone Repository (if from GitHub)
```bash
git clone https://github.com/your-org/auip-platform.git
cd auip-platform
```

If working locally, just navigate to the folder:
```bash
cd c:\Manohar\AUIP\AUIP-Platform
```

---

### Step 2: Configure Environment Variables

#### Backend
```bash
cd backend
copy .env.example .env
```

Edit `backend/.env` with your settings:
- Update `DJANGO_SECRET_KEY`
- Update `DB_PASSWORD`
- Configure email settings (Gmail/SMTP)
- Generate `FERNET_KEY` using Python:
  ```python
  from cryptography.fernet import Fernet
  print(Fernet.generate_key().decode())
  ```

#### Frontend
```bash
cd frontend
copy .env.example .env
```

Edit `frontend/.env`:
- Update `VITE_API_URL` if needed (default: http://localhost:8000)

---

### Step 3: Start with Docker (Recommended)

#### Start all services
```bash
# From AUIP-Platform root directory
docker-compose up -d
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend (port 8000)
- Frontend (port 3000)

#### Check service status
```bash
docker-compose ps
```

#### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

### Step 4: Run Migrations & Create Superuser

```bash
# Run database migrations
docker-compose exec backend python manage.py migrate

# Create admin user
docker-compose exec backend python manage.py createsuperuser
```

---

### Step 5: Access the Platform

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin
- **API Docs**: http://localhost:8000/api/docs/

---

## Alternative: Manual Setup (Without Docker)

### Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure .env file (see Step 2)

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Configure .env file (see Step 2)

# Start development server
npm run dev
```

---

## Common Commands

### Docker Commands
```bash
# Stop all services
docker-compose down

# Rebuild containers (after code changes)
docker-compose up --build

# Remove all containers & volumes (CAUTION: deletes database)
docker-compose down -v

# Access backend shell
docker-compose exec backend python manage.py shell

# Access database
docker-compose exec postgres psql -U auip_user -d auip_db
```

### Django Commands
```bash
# Make migrations
docker-compose exec backend python manage.py makemigrations

# Run tests
docker-compose exec backend pytest

# Collect static files
docker-compose exec backend python manage.py collectstatic
```

### Frontend Commands
```bash
# Install new package
docker-compose exec frontend npm install <package-name>

# Build for production
docker-compose exec frontend npm run build

# Lint code
docker-compose exec frontend npm run lint
```

---

## Development Workflow

### 1. Daily Development
```bash
# Start services
docker-compose up -d

# View logs (in separate terminal)
docker-compose logs -f

# Make code changes (hot reload enabled)
# Backend: Changes auto-reload (Django dev server)
# Frontend: Changes auto-reload (Vite HMR)
```

### 2. Making Database Changes
```bash
# After modifying models
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

### 3. Adding Dependencies

**Backend (Python):**
1. Add package to `backend/requirements.txt`
2. Rebuild: `docker-compose up --build backend`

**Frontend (Node):**
1. `docker-compose exec frontend npm install <package>`
2. Package.json updated automatically

---

## First-Time Setup Checklist

- [ ] Install Docker Desktop
- [ ] Clone/navigate to AUIP-Platform folder
- [ ] Configure backend/.env
- [ ] Configure frontend/.env
- [ ] Start services: `docker-compose up -d`
- [ ] Run migrations
- [ ] Create superuser
- [ ] Access http://localhost:3000
- [ ] Test login with superuser

---

## Troubleshooting

### Port Already in Use
If ports 3000, 8000, 5432, or 6379 are in use:
```bash
# Check what's using the port
netstat -ano | findstr :8000  # Windows
lsof -i :8000                  # Linux/Mac

# Kill the process or change ports in docker-compose.yml
```

### Database Connection Error
```bash
# Ensure PostgreSQL is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Hot Reload Not Working
```bash
# Restart the service
docker-compose restart frontend  # or backend
```

---

## Next Steps

1. ✅ **Bulk seed students** (upload CSV)
2. ✅ **Send activation invitations**
3. ✅ **Create placement drives**
4. ✅ **Configure ML models** (governance brain)
5. ✅ **Deploy to staging/production**

---

**Need Help?** Check docs/ folder for detailed guides!
