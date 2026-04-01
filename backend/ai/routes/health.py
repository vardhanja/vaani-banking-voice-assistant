"""
Health check route
"""
from fastapi import APIRouter

from config import settings
from services import get_llm_service, get_azure_tts_service
from models.responses import HealthResponse


router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint
    
    Note: azure_tts_available indicates if Azure TTS is configured.
    Frontend uses Web Speech API by default; Azure TTS is optional for production.
    """
    llm = get_llm_service()
    azure_tts = get_azure_tts_service()
    
    llm_healthy = await llm.health_check()
    
    return HealthResponse(
        status="healthy" if llm_healthy else "degraded",
        version=settings.app_version,
        ollama_status=llm_healthy,  # Keep field name for backward compatibility
        azure_tts_available=azure_tts.is_available()  # False by default, optional for production
    )
