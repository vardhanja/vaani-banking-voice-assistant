#!/bin/bash
# Vercel build helper that forces backend-only dependencies.
# Run as the buildCommand from repo root (Vercel default).

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"

cd "${REPO_ROOT}"

echo "🔧 Backend Vercel build script starting..."

if [ -f "pyproject.toml" ]; then
    echo "📦 Temporarily hiding pyproject.toml..."
    mv pyproject.toml pyproject.toml.backup
fi

if [ -f "uv.lock" ]; then
    echo "📦 Temporarily hiding uv.lock..."
    mv uv.lock uv.lock.backup
fi

if [ -f "requirements.txt" ]; then
    echo "💾 Backing up original requirements.txt..."
    mv requirements.txt requirements.txt.full
fi

echo "📋 Using backend/requirements.txt for Vercel deployment..."
cp "${BACKEND_DIR}/requirements.txt" requirements.txt

echo "✅ Build preparation complete"
echo "📝 Vercel will now install only backend dependencies"
