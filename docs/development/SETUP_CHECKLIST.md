# Sprint 1 - Core Student Model Setup

## Quick Setup Checklist

Before running migrations, you need to:

### 1. Get Supabase Connection Details

1. Open your Supabase Dashboard.
2. Select your project.
3. Go to **Settings** (gear icon in the sidebar) -> **Database**.
4. Scroll down to the **Connection Info** section.

### 2. Update backend/.env

Open `backend/.env` and update these values:

- **DB_HOST**: Copy the value from **Host** in Supabase (e.g., `db.xxxxxxxxxxxxx.supabase.co`).
- **DB_PASSWORD**: Enter the password you used when creating the project.
- **DB_NAME**: Usually `postgres`.
- **DB_USER**: Usually `postgres`.
- **DB_PORT**: `5432`.

### 3. Generate a Secret FERNET_KEY

You'll need this for certain security features. Run this in your terminal:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Copy the output and paste it into the `FERNET_KEY=` line in your `backend/.env`.

### 4. Apply Database Migrations

Once the `.env` is updated, run:

```bash
cd backend
python manage.py makemigrations identity
python manage.py migrate
python manage.py createsuperuser
```

---

## What We've Built So Far

✅ **CoreStudent Model**: A professional-grade model for institution-controlled data (CGPA, attendance, etc.).
✅ **Serializers**: Optimized for read-only access for students and secure bulk-upload validation.
✅ **Admin Integration**: A customized dashboard to manage students.

**Next Task**: Implementing the bulk upload API so we can seed thousands of students at once.
