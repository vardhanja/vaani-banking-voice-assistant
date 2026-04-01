"""
Response models for AI backend API
"""
from typing import Optional, Dict, Any

from pydantic import BaseModel


class ChatResponse(BaseModel):
    """Response from chat completion"""
    success: bool
    response: str
    intent: Optional[str] = None
    language: str
    timestamp: str
    statement_data: Optional[Dict[str, Any]] = None  # Account statement data for download
    structured_data: Optional[Dict[str, Any]] = None  # Structured data for UI components


class QRCodeProcessResponse(BaseModel):
    """Response from QR code processing"""
    success: bool
    upi_address: Optional[str] = None
    amount: Optional[float] = None
    merchant_name: Optional[str] = None
    message: str
    error: Optional[str] = None


class VoiceVerificationResponse(BaseModel):
    """Response from voice verification"""
    success: bool
    confidence: float
    reasoning: str
    fallback_to_basic: bool = False


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    ollama_status: bool
    azure_tts_available: bool
