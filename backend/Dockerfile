# Backend Dockerfile for Nexora
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs /app/media /app/static

# Collect static files (for production)
RUN DJANGO_SETTINGS_MODULE=auip_core.settings.development python manage.py collectstatic --noinput || true

# Expose port
EXPOSE 8000

# High-Performance Entrypoint: PID 1 signal propagation enabled.
# Migrations must be run once via 'docker compose run backend python manage.py migrate'
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "auip_core.asgi:application"]
