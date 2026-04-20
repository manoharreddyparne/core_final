#!/bin/bash

echo "🌐 Starting AUIP Cloud Node..."
echo "🛠️ Service Type: $SERVICE_TYPE"

# Run Init/Migrations only if it's the API node
if [ "$SERVICE_TYPE" = "api" ]; then
    echo "⚙️ Running Production Init..."
    python initialize_prod.py
fi

if [ "$SERVICE_TYPE" = "api" ]; then
    echo "🚀 Starting Daphne (ASGI)..."
    exec daphne -b 0.0.0.0 -p $PORT auip_core.asgi:application

elif [ "$SERVICE_TYPE" = "worker" ]; then
    echo "👷 Starting Celery Worker..."
    exec celery -A auip_core worker --loglevel=info

elif [ "$SERVICE_TYPE" = "beat" ]; then
    echo "⏰ Starting Celery Beat..."
    exec celery -A auip_core beat --loglevel=info

else
    echo "❓ Unknown SERVICE_TYPE: $SERVICE_TYPE"
    echo "Defaulting to API mode..."
    exec daphne -b 0.0.0.0 -p $PORT auip_core.asgi:application
fi
