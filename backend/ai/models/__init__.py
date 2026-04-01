"""
Pydantic models for AI backend API
"""
from .requests import (
    ChatMessage,
    ChatRequest,
    TTSRequest,
    VoiceVerificationRequest,
    QRCodeProcessRequest,
)
from .responses import (
    ChatResponse,
    QRCodeProcessResponse,
    VoiceVerificationResponse,
    HealthResponse,
)

__all__ = [
    # Request models
    "ChatMessage",
    "ChatRequest",
    "TTSRequest",
    "VoiceVerificationRequest",
    "QRCodeProcessRequest",
    # Response models
    "ChatResponse",
    "QRCodeProcessResponse",
    "VoiceVerificationResponse",
    "HealthResponse",
]
