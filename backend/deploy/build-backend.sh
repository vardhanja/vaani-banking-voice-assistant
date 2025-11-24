#!/bin/bash
# Backend build script for hosted deployments (Vercel, Dokku, etc.)
# Installs ONLY the backend dependencies to keep slug size small.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

echo "🔧 Installing backend-only dependencies..."
pip install -r "${BACKEND_DIR}/requirements.txt"

echo "✅ Backend dependencies installed successfully"
