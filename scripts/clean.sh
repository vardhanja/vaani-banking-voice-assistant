#!/usr/bin/env bash
# Safe cleanup script for developer worktrees
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running safe cleanup in: $ROOT_DIR"

echo "1) Removing .DS_Store files..."
find . -type f -name .DS_Store -print -delete || true

echo "2) Removing Python bytecode caches (__pycache__, .pyc, .pyo)..."
find . -type d -name "__pycache__" -print -exec rm -rf {} + || true
find . -type f -name "*.py[co]" -print -delete || true

echo "3) Removing old log files (older than 30 days) under backend/ and backend/ai/..."
find backend -type f -path '*/logs/*' -mtime +30 -print -delete || true
find backend/ai -type f -path '*/logs/*' -mtime +30 -print -delete || true

echo "4) Checking for obvious large folders you may want to remove manually:"
du -sh frontend/node_modules 2>/dev/null || true
du -sh .venv 2>/dev/null || true
du -sh backend/ai/chroma_db 2>/dev/null || true

echo "Cleanup complete. Review the output above for removed files."

echo "If you want to remove node_modules, venv, or vector DBs, run these manually (destructive):"
echo "  rm -rf frontend/node_modules"
echo "  rm -rf .venv"
echo "  rm -rf backend/ai/chroma_db/*"

exit 0
