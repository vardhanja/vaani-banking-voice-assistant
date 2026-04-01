"""
Text-to-Speech route

NOTE: This endpoint is for optional Azure TTS support (production use).
By default, the frontend uses Web Speech API (browser-based TTS).
Azure TTS is disabled by default (azure_tts_enabled=False in config).
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from services import get_azure_tts_service
from models.requests import TTSRequest
from utils import logger


router = APIRouter(prefix="/api", tags=["tts"])


@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using Azure TTS (optional, for production)
    
    NOTE: Frontend uses Web Speech API by default.
    This endpoint is only used when Azure TTS is enabled and requested.
    Returns 503 if Azure TTS not available, signaling frontend to use Web Speech API.
    """
    try:
        azure_tts = get_azure_tts_service()
        
        if not azure_tts.is_available() or not request.use_azure:
            raise HTTPException(
                status_code=503,
                detail="Azure TTS not available. Use Web Speech API on frontend."
            )
        
        logger.info(
            "tts_request",
            text_length=len(request.text),
            language=request.language
        )
        
        # Synthesize speech
        audio_data = await azure_tts.synthesize_text(
            text=request.text,
            language=request.language
        )
        
        # Return audio as response
        return Response(
            content=audio_data,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=speech.wav"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("tts_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
