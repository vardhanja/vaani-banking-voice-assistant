"""
Request models for AI backend API
"""
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field, ConfigDict


class ChatMessage(BaseModel):
    """Single chat message"""
    role: str = Field(..., description="Message role: user or assistant")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Request for chat completion"""
    model_config = ConfigDict(populate_by_name=True)
    
    message: str = Field(..., description="User's message")
    user_id: Optional[str] = Field(default=None, description="User ID (UUID string)")
    session_id: str = Field(..., description="Session ID")
    language: str = Field(default="en-IN", description="Language code")
    user_context: Optional[Dict[str, Any]] = Field(default=None, description="User context")
    message_history: Optional[List[ChatMessage]] = Field(default=None, description="Conversation history")
    voice_mode: bool = Field(default=False, description="Whether in voice mode (use fast model)")
    upi_mode: Optional[bool] = Field(default=None, description="Whether UPI mode is active (from frontend state)")


class TTSRequest(BaseModel):
    """Request for text-to-speech"""
    text: str = Field(..., description="Text to synthesize")
    language: str = Field(default="en-IN", description="Language code")
    use_azure: bool = Field(default=False, description="Use Azure TTS if available")


class VoiceVerificationRequest(BaseModel):
    """Request for AI-enhanced voice verification"""
    similarity_score: float = Field(..., description="Cosine similarity score from base verifier")
    threshold: float = Field(..., description="Base threshold value")
    user_context: Dict[str, Any] = Field(default_factory=dict, description="User context for analysis")
    analysis_prompt: Optional[str] = Field(default=None, description="Optional custom analysis prompt")


class QRCodeProcessRequest(BaseModel):
    """Request for QR code processing"""
    image_base64: str = Field(..., description="Base64 encoded image of QR code")
    language: str = Field(default="en-IN", description="Language code")
