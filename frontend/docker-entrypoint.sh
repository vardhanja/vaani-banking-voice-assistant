#!/bin/sh
# runtime entrypoint: generate dist/env.js from environment variables and start serve
set -e

DIST_DIR="/app/dist"
ENV_FILE="$DIST_DIR/env.js"

echo "// Runtime environment injected by container" > "$ENV_FILE"
echo "window.__env = {" >> "$ENV_FILE"
echo "  VITE_API_BASE_URL: \"${VITE_API_BASE_URL:-http://localhost:8000}\"," >> "$ENV_FILE"
echo "  VITE_AI_API_BASE_URL: \"${VITE_AI_API_BASE_URL:-http://localhost:8001}\"" >> "$ENV_FILE"
echo "};" >> "$ENV_FILE"

echo "Wrote runtime env to $ENV_FILE"

# If PORT is set (Dokku provides it), use it; otherwise default to 3000
PORT_TO_USE="${PORT:-3000}"

exec serve -s "$DIST_DIR" -l "$PORT_TO_USE"
