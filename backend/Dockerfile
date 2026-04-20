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

# Ensure startup script is executable
RUN chmod +x start_cloud.sh

# Default environment variables
ENV PORT=8000
ENV SERVICE_TYPE=api

# Collect static files (for production)
RUN DJANGO_SETTINGS_MODULE=auip_core.settings.development python manage.py collectstatic --noinput || true

# Expose port
EXPOSE 8000

# Universal entrypoint
CMD ["./start_cloud.sh"]
