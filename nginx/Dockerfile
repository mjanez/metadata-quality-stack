FROM nginx:stable-alpine

ENV API_BACKEND_LOCATION=/api \
    MQA_FRONTEND_LOCATION=/mqa \
    OPENAPI_LOCATION=/docs

ENV API_BACKEND_PORT=5000
ENV MQA_FRONTEND_PORT=8501
ENV API_BACKEND_COMPOSE_SERVICE=api
ENV MQA_FRONTEND_COMPOSE_SERVICE=frontend
ENV PROXY_SERVER_NAME=localhost
ENV PROXY_API_BACKEND_PROXY_PASS=http://${API_BACKEND_COMPOSE_SERVICE}:${API_BACKEND_PORT}
ENV PROXY_MQA_FRONTEND_PROXY_PASS=http://${MQA_FRONTEND_COMPOSE_SERVICE}:${MQA_FRONTEND_PORT}

ENV NGINX_PORT=80
ENV NGINX_SSLPORT=443
ENV NGINX_LOG_DIR=/var/log/nginx
ENV NGINX_DIR=/etc/nginx
ENV NGINX_SHARE_HTML_DIR=/usr/share/nginx/html

RUN mkdir -p ${NGINX_LOG_DIR} \
    && mkdir -p ${NGINX_DIR}/certs

# Copy configuration and static files
COPY ./nginx/setup/nginx.conf ${NGINX_DIR}/nginx.conf
COPY ./nginx/setup/default.conf.template ${NGINX_DIR}/templates/default.conf.template
COPY ./nginx/setup/metadata-quality-stack_local.* ${NGINX_DIR}/certs/
COPY ./nginx/setup/html/ ${NGINX_SHARE_HTML_DIR}/
COPY ./nginx/setup/html/ ${NGINX_SHARE_HTML_DIR}/
COPY ./nginx/setup/css/ ${NGINX_SHARE_HTML_DIR}/css/
COPY ./nginx/setup/img/ ${NGINX_SHARE_HTML_DIR}/img/
COPY ./nginx/setup/js/ ${NGINX_SHARE_HTML_DIR}/js/

# Replace $API_BACKEND_LOCATION, $MQA_FRONTEND_LOCATION and $OPENAPI_LOCATION in index.html
RUN sed -i "s|<a href=\"/api\">|<a href=\"${API_BACKEND_LOCATION}\">|g; s|<a href=\"/mqa\">|<a href=\"${MQA_FRONTEND_LOCATION}\">|g; s|<a href=\"/docs\">|<a href=\"${OPENAPI_LOCATION}\">|g" ${NGINX_SHARE_HTML_DIR}/index.html

EXPOSE ${NGINX_PORT}