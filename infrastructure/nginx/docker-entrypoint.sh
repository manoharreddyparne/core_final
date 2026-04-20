#!/bin/sh
# Render the nginx template with environment variables and start nginx
envsubst '${BACKEND_PORT} ${SERVER_NAME}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
exec nginx -g 'daemon off;'
