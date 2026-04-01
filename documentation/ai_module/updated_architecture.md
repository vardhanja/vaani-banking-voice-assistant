# Updated AI Module Architecture

> **Version**: 1.1.0  
> **Last Updated**: December 2024  
> **Status**: Refactored - Modular Structure

## Overview

This document describes the updated architecture of the AI module (`backend/ai`) after the refactoring improvements. The module now follows a cleaner modular structure with separated concerns.

## Directory Structure

```
backend/ai/
├── main.py                  # FastAPI app with router registration
├── config.py                # Pydantic settings with security checks
│
├── models/                  # NEW: Pydantic models package
│   ├── __init__.py
│   ├── requests.py          # ChatRequest, TTSRequest, QRCodeRequest, etc.
│   └── responses.py         # ChatResponse, HealthResponse, etc.
│
├── routes/                  # NEW: API route handlers
│   ├── __init__.py
│   ├── health.py            # GET /health
│   ├── chat.py              # POST /api/chat, /api/chat/stream
│   ├── tts.py               # POST /api/tts
│   ├── qr_code.py           # POST /api/qr-code/process
│   └── voice.py             # POST /api/voice-verification
│
├── agents/                  # Agent implementations
│   ├── agent_graph.py       # Main process_message entry point
│   ├── banking_agent.py     # Banking operations
│   ├── upi_agent.py         # UPI payments
│   ├── rag_agent.py         # RAG supervisor with sub-agents
│   ├── intent_classifier.py # Intent classification
│   └── rag_agents/          # RAG sub-agents
│       ├── loan_agent.py
│       ├── investment_agent.py
│       └── customer_support_agent.py
│
├── services/                # Business logic services
│   ├── llm_service.py       # LLM provider abstraction
│   ├── rag_service.py       # RAG with ChromaDB (enhanced cache)
│   ├── guardrail_service.py # Security guardrails (improved PII)
│   ├── azure_tts_service.py # Text-to-speech
│   └── ...
│
├── tools/                   # LangChain tools
│   ├── banking_tools.py     # Account/transaction tools
│   └── upi_tools.py         # UPI payment tools
│
├── utils/                   # Shared utilities
│   ├── logging.py           # Structured logging
│   ├── db_helper.py         # Database session management
│   └── demo_logging.py      # Demo-specific logging
│
└── orchestrator/            # Request orchestration
    ├── router.py
    ├── state.py
    └── supervisor.py
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FastAPI Application                       │
│                           (main.py)                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  health  │ │   chat   │ │   tts    │ │ qr_code  │ │ voice  │ │
│  │  router  │ │  router  │ │  router  │ │  router  │ │ router │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
│       │            │            │            │           │      │
│       └────────────┴────────────┴────────────┴───────────┘      │
│                              │                                   │
├──────────────────────────────┼───────────────────────────────────┤
│                     models/ (Pydantic)                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  requests.py: ChatRequest, TTSRequest, QRCodeProcessRequest │ │
│  │  responses.py: ChatResponse, HealthResponse, QRCodeResponse │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      services/ Layer                             │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│ llm_service │ rag_service │  guardrail  │  azure_tts  │  ...    │
│             │ (1024 cache)│  (improved) │             │         │
└─────────────┴──────┬──────┴─────────────┴─────────────┴─────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       agents/ Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   agent_graph.py                          │   │
│  │              (process_message entry point)                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Banking   │     │     UPI     │     │     RAG     │       │
│  │    Agent    │     │    Agent    │     │  Supervisor │       │
│  └─────────────┘     └─────────────┘     └──────┬──────┘       │
│                                                  │               │
│                    ┌─────────────────────────────┼──────────┐   │
│                    ▼                             ▼          ▼   │
│             ┌───────────┐              ┌───────────┐ ┌────────┐ │
│             │   Loan    │              │Investment │ │Customer│ │
│             │   Agent   │              │   Agent   │ │Support │ │
│             └───────────┘              └───────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Key Improvements Made

### 1. Modular Route Structure
- **Before**: Monolithic `main.py` (~500 lines) with all endpoints
- **After**: Separated into `routes/` package with focused modules
  - `health.py` - Health check endpoint
  - `chat.py` - Chat and streaming endpoints
  - `tts.py` - Text-to-speech endpoint
  - `qr_code.py` - QR code processing
  - `voice.py` - Voice verification

### 2. Separated Pydantic Models
- **Before**: Models defined inline in `main.py`
- **After**: Clean `models/` package
  - `requests.py` - All request models
  - `responses.py` - All response models

### 3. Dead Code Removal
- Deleted `agent_graph_old.py` (deprecated)
- Deleted `banking_tools.py.backup` (backup file)

### 4. Security Improvements

#### PII Detection (guardrail_service.py)
```python
# Before: Only space-separated
"aadhaar": re.compile(r'\b\d{4}\s?\d{4}\s?\d{4}\b')

# After: Space OR dash separated
"aadhaar": re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b')
"card_number": re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b')
```

#### JWT Secret Validation (config.py)
```python
# Production warning for default JWT secret
if settings.is_production and settings.jwt_secret_key == "dev-secret-key-change-in-production":
    warnings.warn("SECURITY WARNING: Default JWT secret key is being used in production...")
```

### 5. Performance Improvements

#### RAG Cache (rag_service.py)
```python
# Before
self._cache_max_size = 128
self._cache_ttl_seconds = 120

# After
self._cache_max_size = 1024   # 8x increase
self._cache_ttl_seconds = 300  # 5 minutes TTL
```

### 6. Test Configuration
Added `test/ai/conftest.py` to properly configure Python path for tests.

## Text-to-Speech (TTS)

The application uses a hybrid TTS approach:

| Component | TTS Method | Status |
|-----------|-----------|--------|
| **Frontend** | Web Speech API (browser) | **Active (Default)** |
| **Backend** | Azure TTS (`/api/tts`) | Optional (for production) |

### Current Setup (Development/Local)
- Frontend uses `window.speechSynthesis` (Web Speech API)
- Voices: Microsoft Swara (Hindi), Microsoft Neerja (English-India)
- No backend API calls for TTS

### Production Setup (Optional)
- Enable Azure TTS: `AZURE_TTS_ENABLED=true`
- Set credentials: `AZURE_TTS_KEY`, `AZURE_TTS_REGION`
- Frontend can then call `/api/tts` for higher quality voices

```python
# config.py - Azure TTS is disabled by default
azure_tts_enabled: bool = False  # Set to True for production
```

## Request Flow

```
HTTP Request
     │
     ▼
┌─────────────┐
│   FastAPI   │──── CORS Middleware
│    App      │──── Logging Middleware
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Router    │──── /health → health_router
│  Dispatch   │──── /api/chat → chat_router
│             │──── /api/tts → tts_router
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Guardrail  │──── Input validation
│   Check     │──── PII detection
│             │──── Jailbreak detection
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Agent     │──── Intent classification
│   Graph     │──── Agent routing
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Output    │──── Response validation
│  Guardrail  │──── Language consistency
└──────┬──────┘
       │
       ▼
  HTTP Response
```

## Configuration

### Environment Variables
```bash
# LLM Provider
LLM_PROVIDER=ollama              # or "openai"
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_FAST_MODEL=llama3.2:3b

# Security
JWT_SECRET_KEY=your-secure-secret  # REQUIRED in production
ENVIRONMENT=production             # Triggers security checks

# Guardrails
ENABLE_INPUT_GUARDRAILS=true
ENABLE_OUTPUT_GUARDRAILS=true
GUARDRAIL_RATE_LIMIT_PER_MINUTE=30
```

## API Endpoints

| Endpoint | Method | Router | Description |
|----------|--------|--------|-------------|
| `/health` | GET | health | Health check |
| `/api/chat` | POST | chat | Process chat message |
| `/api/chat/stream` | POST | chat | Streaming chat |
| `/api/tts` | POST | tts | Text-to-speech (Azure, optional - frontend uses Web Speech API by default) |
| `/api/qr-code/process` | POST | qr_code | QR code processing |
| `/api/voice-verification` | POST | voice | Voice verification |

## Technical Debt (Documented)

### sys.path Manipulation
Several files still use `sys.path.insert()` to import from `backend/` directory:
- `utils/db_helper.py`
- `tools/banking_tools.py`
- `tools/upi_tools.py`
- `agents/upi_agent.py`

**Reason**: The `backend/ai` module needs access to `backend/db` for database operations. Fixing this would require restructuring the entire project to make `backend/ai` a proper subpackage.

### Query Signal Detection
The `_detect_query_signals()` function in `rag_agent.py` is large (~450 lines) but is domain-specific and only used in one place, so extraction was deferred.

## Testing

```bash
# Run AI tests
cd vaani-banking-voice-assistant
source .venv/bin/activate
python -m pytest test/ai/ -v

# Quick validation
cd backend/ai
python -c "from main import app; print('OK')"
```

## Files Changed in Refactor

| File | Change |
|------|--------|
| `main.py` | Reduced from ~500 to ~100 lines, uses routers |
| `models/__init__.py` | NEW - Models package |
| `models/requests.py` | NEW - Request models |
| `models/responses.py` | NEW - Response models |
| `routes/__init__.py` | NEW - Routes package |
| `routes/health.py` | NEW - Health endpoint |
| `routes/chat.py` | NEW - Chat endpoints |
| `routes/tts.py` | NEW - TTS endpoint |
| `routes/qr_code.py` | NEW - QR code endpoint |
| `routes/voice.py` | NEW - Voice verification |
| `config.py` | Added JWT production warning |
| `services/guardrail_service.py` | Improved PII patterns |
| `services/rag_service.py` | Increased cache settings |
| `agents/agent_graph_old.py` | DELETED |
| `tools/banking_tools.py.backup` | DELETED |
| `test/ai/conftest.py` | NEW - Test configuration |
