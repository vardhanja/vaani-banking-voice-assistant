#!/usr/bin/env bash
# Stop docker compose stack
set -euo pipefail
docker compose down
echo "Services stopped and networks removed."
