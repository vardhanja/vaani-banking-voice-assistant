#!/usr/bin/env bash
# Start docker compose stack
set -euo pipefail
docker compose up -d --build
echo "Services started. Use 'docker compose ps' to check status."
