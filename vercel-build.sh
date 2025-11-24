#!/bin/bash
# Backwards-compatible shim. The real script lives in backend/deploy.

set -euo pipefail

exec bash backend/deploy/vercel-build.sh "$@"

