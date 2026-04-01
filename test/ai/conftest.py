"""
Pytest configuration for AI tests
"""
import sys
from pathlib import Path

# Add backend/ai to path for imports
backend_ai_path = Path(__file__).parent.parent.parent / "backend" / "ai"
sys.path.insert(0, str(backend_ai_path))
