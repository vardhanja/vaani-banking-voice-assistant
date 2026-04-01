"""
Chat routes for AI backend
"""
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from config import settings
from services import get_llm_service, get_guardrail_service
from agents.agent_graph import process_message
from models.requests import ChatRequest
from models.responses import ChatResponse
from utils import logger
from utils.demo_logging import demo_logger


router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process a chat message through the agent system
    
    This endpoint:
    1. Classifies user intent
    2. Routes to appropriate agent
    3. Executes banking tools if needed
    4. Returns AI-generated response
    """
    try:
        # Demo logging: User message received
        demo_logger.chat_request(
            user_id=request.user_id,
            session_id=request.session_id,
            message=request.message,
            language=request.language,
            voice_mode=request.voice_mode,
            upi_mode=request.upi_mode,
        )
        
        # State transition: User speaking -> Processing
        demo_logger.state_transition(
            from_state="USER SPEAKING",
            to_state="PROCESSING",
            reason="Message received, routing to agent"
        )
        
        logger.info(
            "chat_request",
            user_id=request.user_id,
            session_id=request.session_id,
            language=request.language,
            voice_mode=request.voice_mode,
            upi_mode=request.upi_mode  # Log UPI mode from request
        )
        
        # Input Guardrails: Check user input before processing
        guardrail_service = get_guardrail_service()
        input_check = await guardrail_service.check_input(
            message=request.message,
            language=request.language,
            user_id=request.user_id
        )
        
        if not input_check.passed:
            # Log guardrail violation
            logger.warning(
                "guardrail_violation_input",
                user_id=request.user_id,
                violation_type=input_check.violation_type,
                language=request.language,
                message_preview=request.message[:100]
            )
            
            # Return appropriate error message based on language
            error_message = input_check.message
            if not error_message:
                # Fallback error messages
                if request.language == "hi-IN":
                    error_message = "मुझे खेद है, आपका संदेश संसाधित नहीं किया जा सका। कृपया अपना प्रश्न दोबारा बताएं।"
                else:
                    error_message = "I'm sorry, your message could not be processed. Please rephrase your question."
            
            return ChatResponse(
                success=False,
                response=error_message,
                language=request.language,
                timestamp=datetime.now().isoformat()
            )
        
        # Convert message history
        history = []
        if request.message_history:
            history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.message_history
            ]
        
        # Process through agent graph
        result = await process_message(
            message=request.message,
            user_id=request.user_id,
            session_id=request.session_id,
            language=request.language,
            user_context=request.user_context,
            message_history=history,
            upi_mode=request.upi_mode  # Pass UPI mode from frontend
        )
        
        # Output Guardrails: Check AI response before sending
        # Pass intent to allow guardrail to skip language check for language_change
        output_check = await guardrail_service.check_output(
            response=result.get("response", ""),
            language=result.get("language", request.language),  # Use updated language from result
            original_query=request.message,
            intent=result.get("intent")  # Pass intent to skip language check for language_change
        )
        
        if not output_check.passed:
            # Log guardrail violation
            logger.warning(
                "guardrail_violation_output",
                user_id=request.user_id,
                violation_type=output_check.violation_type,
                language=request.language,
                response_preview=result.get("response", "")[:100]
            )
            
            # Replace with safe fallback message
            if request.language == "hi-IN":
                fallback_message = "मुझे खेद है, मुझे आपकी मदद करने में समस्या हो रही है। कृपया पुनः प्रयास करें।"
            else:
                fallback_message = "I'm sorry, I'm having trouble helping you right now. Please try again."
            
            result["response"] = fallback_message
        
        # Demo logging: AI response
        demo_logger.ai_response(
            response=result.get("response", ""),
            agent=result.get("intent", "unknown"),
            language=request.language,
        )
        
        # State transition: Processing -> AI speaking
        demo_logger.state_transition(
            from_state="PROCESSING",
            to_state="AI SPEAKING",
            reason="Response generated, sending to user"
        )
        
        return ChatResponse(**result)
        
    except Exception as e:
        logger.error("chat_endpoint_error", error=str(e))
        demo_logger.error("Chat endpoint error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Stream chat response for real-time updates
    
    Returns Server-Sent Events (SSE) stream
    """
    try:
        logger.info(
            "chat_stream_request",
            user_id=request.user_id,
            session_id=request.session_id
        )
        
        async def generate():
            """Generate streaming response"""
            llm = get_llm_service()
            
            # Build messages
            messages = [
                {
                    "role": "system",
                    "content": f"You are Vaani, a banking assistant. Respond in {request.language}."
                }
            ]
            
            if request.message_history:
                for msg in request.message_history:
                    messages.append({"role": msg.role, "content": msg.content})
            
            messages.append({"role": "user", "content": request.message})
            
            # Stream response
            async for chunk in llm.chat_stream(
                messages,
                use_fast_model=request.voice_mode
            ):
                yield f"data: {chunk}\n\n"
            
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
        
    except Exception as e:
        logger.error("chat_stream_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
