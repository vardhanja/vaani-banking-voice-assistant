"""
Voice verification route
"""
from fastapi import APIRouter, HTTPException

from models.requests import VoiceVerificationRequest
from models.responses import VoiceVerificationResponse
from utils import logger


router = APIRouter(prefix="/api", tags=["voice"])


@router.post("/voice-verification", response_model=VoiceVerificationResponse)
async def voice_verification(request: VoiceVerificationRequest):
    """
    AI-enhanced voice verification endpoint
    
    Uses LLM to analyze voice verification context and provide enhanced decision
    """
    try:
        from services.ai_voice_verification import AIVoiceVerificationService
        
        service = AIVoiceVerificationService()
        result = await service.analyze_verification(
            similarity_score=request.similarity_score,
            threshold=request.threshold,
            user_context=request.user_context,
            analysis_prompt=request.analysis_prompt
        )
        
        return VoiceVerificationResponse(
            success=result.accept,
            confidence=result.confidence,
            reasoning=result.reasoning,
            fallback_to_basic=result.fallback_to_basic
        )
        
    except Exception as e:
        logger.error("voice_verification_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
