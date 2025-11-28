#!/usr/bin/env bash
set -euo pipefail

# update_ai_proxy.sh
# Detect current backend.ai Docker container IP and write Dokku nginx include
# Intended to run on the Dokku host (requires sudo/root privileges)

APP_NAME=${1:-backend}
NGINX_CONF_DIR="/home/dokku/${APP_NAME}/nginx.conf.d"
POSTDEPLOY_DIR="/home/dokku/${APP_NAME}/postdeploy.d"
PROXY_CONF_FILE="${NGINX_CONF_DIR}/ai-proxy.conf"
POSTDEPLOY_HOOK="${POSTDEPLOY_DIR}/99_update_ai_proxy"

echo "[update_ai_proxy] app=${APP_NAME}"

# Find the AI container for this app
AI_ID=$(docker ps --filter "name=${APP_NAME}.ai" --format '{{.ID}}' | head -n1)
if [ -z "${AI_ID}" ]; then
  echo "[update_ai_proxy] No running container found for ${APP_NAME}.ai"
  exit 1
fi

AI_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "${AI_ID}")
if [ -z "${AI_IP}" ]; then
  echo "[update_ai_proxy] Could not determine IP for container ${AI_ID}"
  exit 1
fi

echo "[update_ai_proxy] AI container=${AI_ID} IP=${AI_IP}"

sudo mkdir -p "${NGINX_CONF_DIR}"

sudo tee "${PROXY_CONF_FILE}" > /dev/null <<NGINX
# filepath: ${PROXY_CONF_FILE}
location ^~ /api/chat {
    proxy_pass http://${AI_IP}:8001;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
    proxy_connect_timeout 60s;
    proxy_buffering off;
}

location ^~ /api/chat/stream {
    proxy_pass http://${AI_IP}:8001;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_http_version 1.1;
    proxy_set_header Connection "keep-alive";
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_connect_timeout 60s;
    proxy_buffering off;
}
NGINX

sudo chmod 644 "${PROXY_CONF_FILE}"
echo "[update_ai_proxy] wrote ${PROXY_CONF_FILE}"

# Create a postdeploy hook on Dokku host to regenerate after deploy
sudo mkdir -p "${POSTDEPLOY_DIR}"
sudo tee "${POSTDEPLOY_HOOK}" > /dev/null <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
# Regenerate ai-proxy.conf for the app (dokku host)
APP_NAME="backend"
AI_ID=$(docker ps --filter "name=${APP_NAME}.ai" --format '{{.ID}}' | head -n1)
AI_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "${AI_ID}")
NGINX_CONF_DIR="/home/dokku/${APP_NAME}/nginx.conf.d"
PROXY_CONF_FILE="${NGINX_CONF_DIR}/ai-proxy.conf"
mkdir -p "${NGINX_CONF_DIR}"
cat > "${PROXY_CONF_FILE}" <<NGINX
location ^~ /api/chat {
    proxy_pass http://${AI_IP}:8001;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
    proxy_connect_timeout 60s;
    proxy_buffering off;
}
location ^~ /api/chat/stream {
    proxy_pass http://${AI_IP}:8001;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_http_version 1.1;
    proxy_set_header Connection "keep-alive";
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_connect_timeout 60s;
    proxy_buffering off;
}
NGINX

chmod 644 "${PROXY_CONF_FILE}"
dokku ps:restart ${APP_NAME}
HOOK

sudo chmod +x "${POSTDEPLOY_HOOK}"
echo "[update_ai_proxy] created postdeploy hook ${POSTDEPLOY_HOOK}"

echo "[update_ai_proxy] restarting dokku app ${APP_NAME}"
sudo dokku ps:restart "${APP_NAME}" || true
echo "[update_ai_proxy] done"
