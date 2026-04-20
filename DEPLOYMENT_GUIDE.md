# 🚀 AUIP Deployment Guide: Production Ready

This document outlines the final steps to deploy the **Adaptive University Intelligence Platform (AUIP)** to Hugging Face, Netlify, and Render using **Upstash Redis** and **Supabase (or Render DB)**.

## 1. Redis: Upstash Setup
AUIP now supports **Upstash Redis** for serverless scaling.
1. Create a database at [upstash.com](https://upstash.com/).
2. Copy the **Redis URL** (should start with `rediss://`).
3. Set the `REDIS_URL` environment variable on your hosting platforms (Render, HF).

## 2. Backend: Render Deployment
We use **Render** for the core API and Celery workers.
1. Connect your Github repository to [Render](https://render.com/).
2. Render will automatically detect the `render.yaml` file and create the Blueprint.
3. **Environment Variables needed in Render:**
   - `REDIS_URL`: Your Upstash URL.
   - `DATABASE_URL`: Your Supabase or Render Postgres URL.
   - `DJANGO_SECRET_KEY`: A long random string.
   - `ALLOWED_HOSTS`: `auip-backend.onrender.com` (or your domain).
   - `SECURE_SSL_REDIRECT`: `True`.

## 3. Frontend: Netlify Deployment
**Netlify** handles the high-performance React/Vite frontend.
1. Connect the `frontend/` directory to Netlify.
2. Build Command: `npm run build`
3. Publish Directory: `dist`
4. **Environment Variables:**
   - `VITE_API_URL`: The URL of your Render backend API.

## 4. AI Node: Hugging Face Spaces
To host the backend or a specific AI module on **Hugging Face**:
1. Create a **New Space** on Hugging Face.
2. Select **Docker** as the SDK.
3. You can use the existing `backend/Dockerfile`.
   - **Note:** Hugging Face expects the container to listen on port **7860** by default.
   - **Action:** In your HF Space settings, either set `ENV PORT=7860` or update the CMD to `-p 7860`.

## 5. Local Docker with External Redis
To test Upstash locally using Docker:
```bash
# In your .env file
REDIS_URL=rediss://:your_password@your_endpoint:6379

# Then run:
docker compose up backend celery-worker
```
The system will bypass the local Redis container and use Upstash automatically.
