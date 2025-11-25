#!/usr/bin/env bash
# Rebuild images and restart stack
set -euo pipefail
docker compose build --no-cache
docker compose up -d
echo "Rebuilt and started containers."
