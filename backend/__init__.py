"""Backend package exposing FastAPI app factory for imports."""

from .app import app, create_app

__all__ = ["app", "create_app"]