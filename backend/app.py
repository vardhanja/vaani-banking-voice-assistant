"""FastAPI application factory for Vaani backend."""

from __future__ import annotations

import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router as api_router


def setup_logging():
    """Configure logging for the application."""
    # Configure root logger to INFO level
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Remove existing handlers to avoid duplicates
    root_logger.handlers.clear()
    
    # Add console handler with formatting
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Explicitly set INFO level for voice verification loggers
    logging.getLogger("backend.db.services.auth").setLevel(logging.INFO)
    logging.getLogger("backend.db.services.ai_voice_verification").setLevel(logging.INFO)
    logging.getLogger("backend.db.services.voice_verification").setLevel(logging.INFO)
    
    # Reduce noise from other loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def create_app() -> FastAPI:
    # Setup logging first
    setup_logging()
    
    logger = logging.getLogger(__name__)
    logger.info("Logging configured - INFO level enabled for voice verification")
    
    app = FastAPI(
        title="Sun National Bank API",
        description="Voice-first banking backend for the Vaani assistant.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)
    
    @app.on_event("startup")
    async def startup_event():
        logger.info("Backend application started - voice verification logging enabled")
    
    return app


app = create_app()


__all__ = ["create_app", "app"]


