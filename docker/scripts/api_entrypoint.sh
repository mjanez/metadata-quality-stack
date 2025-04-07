#!/bin/bash
PORT=${API_BACKEND_PORT:-5000}

# Ejecuta gunicorn con las variables sustituidas
exec gunicorn src.api.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind "0.0.0.0:$PORT" \
    --workers 4 \
    --threads 2 \
    --worker-connections 1000 \
    --backlog 2048 \
    --log-level info \
    --keep-alive 5 \
    --timeout 120