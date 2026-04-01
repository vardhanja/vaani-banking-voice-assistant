"""
API Routes for AI backend
"""
from .chat import router as chat_router
from .health import router as health_router
from .tts import router as tts_router
from .qr_code import router as qr_code_router
from .voice import router as voice_router

__all__ = [
    "chat_router",
    "health_router",
    "tts_router",
    "qr_code_router",
    "voice_router",
]
