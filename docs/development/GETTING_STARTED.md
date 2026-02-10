# AUIP Development - Getting Started Guide

## You're Starting Sprint 1: Authentication! 🚀

### Why Start with Authentication?
In Agile development, **authentication is always Sprint 1** because:
- ✅ Every feature needs user context
- ✅ It's the foundation for all other work
- ✅ You can test end-to-end flow early
- ✅ Industry-standard approach

---

## Step 1: Set Up Supabase (5 minutes)

### Why Supabase?
- ✅ **Free PostgreSQL** database (industry-standard)
- ✅ **Easy migration to AWS RDS** later (just change .env)
- ✅ **No local DB setup** needed
- ✅ **Automatic backups**

### Create Your Supabase Project

1. **Go to Supabase**
   - Visit: https://supabase.com
   - Sign up with GitHub/Google

2. **Create New Project**
   ```
   - Click "New Project"
   - Organization: Create new or use existing
   - Name: auip-dev
   - Database Password: [SAVE THIS! You'll need it]
   - Region: Choose closest to you
   - Click "Create new project"
   - Wait 2 minutes for provisioning
   ```

3. **Get Connection Details**
   ```
   - Go to Settings (⚙️) → Database
   - Find "Connection string"
   - Select: "URI" tab
   - Copy the connection string
   ```

   It will look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```

   **Extract:**
   - Host: `db.xxxxxxxxxxxxx.supabase.co`
   - Password: (the one you set)
   - Database: `postgres`
   - User: `postgres`
   - Port: `5432`

---

## Step 2: Configure Your Local Environment

### Backend Configuration

Navigate to backend folder:
```bash
cd c:\Manohar\AUIP\AUIP-Platform\backend
```

Create `.env` from template:
```bash
copy .env.example .env
```

Edit `backend/.env` with your details:
```bash
# ============================================
# DATABASE (Supabase PostgreSQL)
# ============================================
DB_ENGINE=django.db.backends.postgresql
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[YOUR-SUPABASE-PASSWORD-HERE]
DB_HOST=[YOUR-SUPABASE-HOST].supabase.co
DB_PORT=5432

# ============================================
# DJANGO SETTINGS
# ============================================
DJANGO_SECRET_KEY=django-insecure-local-dev-only-will-change-in-prod
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# ============================================
# REDIS (Use local for now)
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379/0

# ============================================
# EMAIL (Gmail for testing)
# ============================================
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your.email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password-here
DEFAULT_FROM_EMAIL=noreply@auip-platform.com

# ============================================
# FRONTEND
# ============================================
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# ============================================
# SECURITY KEYS
# ============================================
SEC_HMAC_K1=old-key-for-rotation-change-me
SEC_HMAC_K2=current-key-CHANGE-THIS-TO-RANDOM
SEC_HMAC_CURRENT_KEYID=k2

# Generate FERNET_KEY using Python:
# from cryptography.fernet import Fernet
# print(Fernet.generate_key().decode())
FERNET_KEY=your-fernet-key-here
```

### Generate FERNET_KEY

Open Python:
```python
python
>>> from cryptography.fernet import Fernet
>>> print(Fernet.generate_key().decode())
# Copy this key to your .env file
>>> exit()
```

---

## Step 3: Test Database Connection

```bash
# Navigate to backend
cd c:\Manohar\AUIP\AUIP-Platform\backend

# Activate virtual environment (if not using Docker)
# On Windows:
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Test Django setup
python manage.py check

# Run initial migrations
python manage.py migrate

# Create superuser (admin account)
python manage.py createsuperuser
```

**If successful**, you'll see:
```
Operations to perform:
  Apply all migrations: ...
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying auth.0001_initial... OK
  ...
```

---

## Step 4: Start Development Server

### Option A: Using Docker (Recommended)
```bash
cd c:\Manohar\AUIP\AUIP-Platform
docker-compose up -d
```

### Option B: Manual (Without Docker)

**Terminal 1 - Backend:**
```bash
cd backend
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Terminal 3 - Redis (if needed):**
```bash
# Install Redis or use Docker:
docker run -d -p 6379:6379 redis:7-alpine
```

---

## Step 5: Verify Everything Works

Open your browser:

1. **Frontend**: http://localhost:3000
   - Should load React app

2. **Backend API**: http://localhost:8000
   - Should show Django welcome or API root

3. **Admin Panel**: http://localhost:8000/admin
   - Login with superuser credentials
   - Should see Django admin

4. **Supabase Dashboard**: https://app.supabase.com
   - Go to your project
   - Click "Table Editor"
   - You should see Django's default tables (auth_user, etc.)

---

## Next Steps: Start Building!

Now that your environment is ready, you'll:

1. **Create Core Student Model** (Day 1-2)
   - Two-database architecture
   - Bulk upload functionality

2. **Build Activation Link System** (Day 3-5)
   - Email service
   - Token generation
   - Invitation tracking

3. **Student Activation Flow** (Day 6-8)
   - Activation page
   - Password creation
   - Account linking

4. **Login System** (Day 9-10)
   - JWT authentication
   - Session management

---

## Environment-Based Development Workflow

### Local Development (.env)
```
DB_HOST=your-supabase-host.supabase.co  # Free tier
DEBUG=True
```

### Production (.env - later)
```
DB_HOST=your-rds-endpoint.amazonaws.com  # AWS RDS
DEBUG=False
ALLOWED_HOSTS=auip.youruniversity.edu
```

**Same code, different .env = Different environments!** This is industry-standard. ✅

---

## Troubleshooting

### Can't connect to database?
- Check Supabase is running (sometimes pauses on free tier)
- Verify password in .env matches Supabase
- Check host is correct

### Email not sending?
- Use Gmail App Password (not regular password)
- Enable "Less secure app access" or use App Password
- For testing, can use console backend:
  ```python
  EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
  ```

### Redis connection error?
- Start Redis: `docker run -d -p 6379:6379 redis:7-alpine`
- Or install locally

---

**Ready to code! Your next step: Create the Core Student model.** 🚀

Check `implementation_plan.md` for detailed Sprint 1 tasks!
