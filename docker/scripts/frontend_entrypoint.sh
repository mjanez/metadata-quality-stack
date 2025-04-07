#!/bin/bash
PROXY_SERVER_NAME=${PROXY_SERVER_NAME:-"localhost"}
API_BASE_URL=${API_BASE_URL:-"http://${PROXY_SERVER_NAME}/api"}

# Executa streamlit con las variables sustituidas
exec streamlit run src/frontend/app.py \
    --server.port=${MQA_FRONTEND_PORT} \
    --server.address=0.0.0.0 \
    --server.baseUrlPath=/${MQA_FRONTEND_LOCATION}