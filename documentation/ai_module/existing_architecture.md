# Vaani AI Module - Existing Architecture

> **Document Version:** 1.0  
> **Date:** December 2024  
> **Status:** Pre-Refactor Snapshot

This document captures the existing architecture of the `backend/ai` module before the code improvement refactor.

---

## Table of Contents

1. [Overview](#overview)
2. [Directory Structure](#directory-structure)
3. [High-Level Architecture](#high-level-architecture)
4. [Request Flow](#request-flow)
5. [Component Details](#component-details)
6. [External Dependencies](#external-dependencies)
7. [Known Issues](#known-issues)

---

## Overview

The AI module powers Vaani, a voice-enabled banking assistant. It handles:
- Natural language understanding and intent classification
- Multi-agent orchestration for banking operations
- RAG (Retrieval-Augmented Generation) for product information
- UPI payment flows
- Multi-language support (English, Hindi)
- Security guardrails (PII detection, prompt injection prevention)

---

## Directory Structure

```
backend/ai/
│
├── main.py                          # FastAPI application (monolithic)
├── config.py                        # Pydantic settings
├── run.sh / start.sh                # Startup scripts
├── requirements.txt                 # Dependencies
│
├── agents/                          # Agent layer
│   ├── __init__.py
│   ├── agent_graph.py               # Entry point (delegates to supervisor)
│   ├── agent_graph_old.py           # ⚠️ DEPRECATED - dead code
│   ├── intent_classifier.py         # Intent classification logic
│   ├── router.py                    # Intent → Agent routing
│   ├── banking_agent.py             # Banking operations
│   ├── upi_agent.py                 # UPI payments
│   ├── rag_agent.py                 # RAG supervisor
│   ├── greeting_agent.py            # Greetings
│   ├── feedback_agent.py            # Feedback handling
│   └── rag_agents/                  # RAG specialists
│       ├── loan_agent.py
│       ├── investment_agent.py
│       └── customer_support_agent.py
│
├── services/                        # Service layer
│   ├── __init__.py
│   ├── llm_service.py               # Unified LLM interface
│   ├── ollama_service.py            # Ollama provider
│   ├── openai_service.py            # OpenAI provider
│   ├── rag_service.py               # Vector DB operations
│   ├── guardrail_service.py         # Security guardrails
│   ├── semantic_chunker.py          # Document chunking
│   ├── azure_tts_service.py         # Text-to-speech
│   └── langsmith_ollama_service.py  # LangSmith tracing
│
├── orchestrator/                    # Orchestration layer
│   ├── __init__.py
│   ├── supervisor.py                # HybridSupervisor
│   ├── state.py                     # ConversationState
│   └── router.py                    # IntentRouter
│
├── tools/                           # Banking tools
│   ├── __init__.py
│   ├── banking_tools.py             # Account/balance/transactions
│   ├── banking_tools.py.backup      # ⚠️ DEAD CODE - backup file
│   └── upi_tools.py                 # UPI resolution/payments
│
├── utils/                           # Utilities
│   ├── __init__.py
│   ├── logging.py                   # Structured logging
│   ├── exceptions.py                # Custom exceptions
│   ├── db_helper.py                 # Database sessions
│   └── demo_logging.py              # Demo/debug logging
│
├── chroma_db/                       # Vector database storage
│   ├── loan_products/
│   ├── loan_products_hindi/
│   ├── investment_schemes/
│   └── investment_schemes_hindi/
│
└── logs/                            # Application logs
```

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              FASTAPI APPLICATION (main.py)                               │
│                                                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │  GET /health │ │ POST        │ │ POST         │ │ POST         │ │ POST         │   │
│  │              │ │ /api/chat   │ │ /api/stream  │ │ /api/tts     │ │ /api/qr-code │   │
│  └──────┬───────┘ └──────┬──────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘   │
│         │                │               │                │                │            │
│         │                │               │                │                │            │
│  ┌──────┴────────────────┴───────────────┴────────────────┴────────────────┴──────────┐ │
│  │                               MIDDLEWARE LAYER                                      │ │
│  │                                                                                     │ │
│  │  • CORS (localhost:3000/5173/5174, sunnationalbank.online)                          │ │
│  │  • Request Logging (duration tracking)                                              │ │
│  │  • Validation Error Handler                                                         │ │
│  └─────────────────────────────────────┬───────────────────────────────────────────────┘ │
│                                        │                                                 │
└────────────────────────────────────────┼─────────────────────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            GUARDRAIL SERVICE (Input Check)                              │
│                                                                                         │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐           │
│  │ Jailbreak      │ │ Topic          │ │ PII            │ │ Rate           │           │
│  │ Detection      │ │ Filtering      │ │ Detection      │ │ Limiting       │           │
│  └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘           │
│                                                                                         │
│  ┌────────────────┐ ┌────────────────┐                                                  │
│  │ Gibberish      │ │ Toxicity       │                                                  │
│  │ Detection      │ │ Check          │                                                  │
│  └────────────────┘ └────────────────┘                                                  │
└────────────────────────────────────────┬────────────────────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              ORCHESTRATOR LAYER                                         │
│                                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                          HybridSupervisor                                         │  │
│  │                                                                                   │  │
│  │  Entry: process(message, user_id, session_id, language, context, history)        │  │
│  │                                                                                   │  │
│  │  1. Build ConversationState                                                       │  │
│  │  2. Validate input via guardrails                                                 │  │
│  │  3. Route to specialist agent                                                     │  │
│  │  4. Sanitize output                                                               │  │
│  │  5. Return response                                                               │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌─────────────────────────────────┐    ┌─────────────────────────────────────────┐    │
│  │      ConversationState          │    │         IntentRouter                    │    │
│  │                                 │    │                                         │    │
│  │  • messages                     │    │  ┌─────────────────────────────────┐    │    │
│  │  • user_id, session_id          │◄───┤  │    IntentClassifier             │    │    │
│  │  • language                     │    │  │                                 │    │    │
│  │  • upi_mode                     │    │  │  Keyword + LLM classification   │    │    │
│  │  • authenticated                │    │  └─────────────────────────────────┘    │    │
│  │  • structured_data              │    │                                         │    │
│  │  • statement_data               │    │  Intent → Agent Mapping                 │    │
│  └─────────────────────────────────┘    └─────────────────────────────────────────┘    │
└────────────────────────────────────────┬────────────────────────────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   AGENTS LAYER                                          │
│                                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────────────────┐ │
│  │   BankingAgent      │  │     UPIAgent        │  │         RAGAgent                │ │
│  │                     │  │                     │  │                                 │ │
│  │  Handles:           │  │  Handles:           │  │  Hybrid RAG Supervisor          │ │
│  │  • Balance queries  │  │  • UPI mode toggle  │  │  Routes to specialists:         │ │
│  │  • Transactions     │  │  • UPI balance      │  │                                 │ │
│  │  • Statements       │  │  • UPI payments     │  │  ┌─────────────────────────┐    │ │
│  │  • Reminders        │  │  • Recipient        │  │  │ rag_agents/             │    │ │
│  │  • Transfers        │  │    resolution       │  │  │ ├─ loan_agent.py        │    │ │
│  │                     │  │  • Account select   │  │  │ ├─ investment_agent.py  │    │ │
│  │                     │  │                     │  │  │ └─ customer_support.py  │    │ │
│  └──────────┬──────────┘  └──────────┬──────────┘  │  └─────────────────────────┘    │ │
│             │                        │             └───────────────┬─────────────────┘ │
│  ┌──────────┴────────────────────────┴─────────────────────────────┴─────────────────┐ │
│  │  Also: greeting_agent.py, feedback_agent.py                                       │ │
│  └───────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────┬────────────────────────────────────────────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         │                               │                               │
         ▼                               ▼                               ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  SERVICES LAYER                                         │
│                                                                                         │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐    │
│  │      LLMService        │  │      RAGService        │  │   GuardrailService     │    │
│  │                        │  │                        │  │                        │    │
│  │  • chat()              │  │  • initialize()        │  │  • check_input()       │    │
│  │  • chat_stream()       │  │  • retrieve()          │  │  • check_output()      │    │
│  │  • generate_embeddings │  │  • get_context_for_    │  │  • validate_input()    │    │
│  │  • health_check()      │  │    query()             │  │  • sanitize_output()   │    │
│  │                        │  │                        │  │                        │    │
│  │  Providers:            │  │  Embeddings:           │  │  Checks:               │    │
│  │  ┌──────────────────┐  │  │  HuggingFace           │  │  • PII detection       │    │
│  │  │ OllamaService    │  │  │  (all-MiniLM-L6-v2)    │  │  • Prompt injection    │    │
│  │  │ (qwen2.5:7b,     │  │  │                        │  │  • Toxicity            │    │
│  │  │  llama3.2:3b)    │  │  │  Cache:                │  │  • Rate limiting       │    │
│  │  └──────────────────┘  │  │  LRU (128, 120s TTL)   │  │  • Language match      │    │
│  │  ┌──────────────────┐  │  │                        │  │                        │    │
│  │  │ OpenAIService    │  │  │                        │  │                        │    │
│  │  │ (gpt-3.5-turbo)  │  │  │                        │  │                        │    │
│  │  └──────────────────┘  │  │                        │  │                        │    │
│  └────────────────────────┘  └────────────────────────┘  └────────────────────────┘    │
│                                                                                         │
│  ┌────────────────────────┐  ┌────────────────────────┐                                 │
│  │   AzureTTSService      │  │   SemanticChunker      │                                 │
│  │                        │  │                        │                                 │
│  │  Voices by language:   │  │  • Section-based       │                                 │
│  │  • en-IN: Neerja       │  │    parsing             │                                 │
│  │  • hi-IN: Swara        │  │  • Loan type detection │                                 │
│  │  • te-IN: Mohan        │  │  • Table splitting     │                                 │
│  └────────────────────────┘  └────────────────────────┘                                 │
└────────────────────────────────────────┬────────────────────────────────────────────────┘
                                         │
                          ┌──────────────┴──────────────┐
                          │                             │
                          ▼                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TOOLS LAYER                                           │
│                                                                                         │
│  ┌──────────────────────────────────┐    ┌──────────────────────────────────────────┐  │
│  │         Banking Tools            │    │              UPI Tools                   │  │
│  │                                  │    │                                          │  │
│  │  • get_user_accounts(user_id)    │    │  • resolve_upi_id(identifier)            │  │
│  │    → List all accounts           │    │    → Match phone/UPI ID/name to account  │  │
│  │                                  │    │                                          │  │
│  │  • get_balance(user_id, acct_id) │    │  • initiate_upi_payment(from, to, amt)   │  │
│  │    → Account balance             │    │    → Execute UPI transfer                │  │
│  │                                  │    │                                          │  │
│  │  • get_transactions(acct_id,     │    └──────────────────────────────────────────┘  │
│  │      start_date, end_date)       │                                                  │
│  │    → Transaction history         │                                                  │
│  │                                  │                                                  │
│  │  • download_statement(acct_id,   │                                                  │
│  │      start_date, end_date)       │                                                  │
│  │    → Prepare PDF statement       │                                                  │
│  └──────────────────────────────────┘                                                  │
└────────────────────────────────────────┬────────────────────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DATA LAYER                                           │
│                                                                                         │
│  ┌──────────────────────────────────┐    ┌──────────────────────────────────────────┐  │
│  │       Backend Database           │    │         ChromaDB Vector Store            │  │
│  │       (SQLAlchemy)               │    │                                          │  │
│  │                                  │    │  Collections:                            │  │
│  │  Tables:                         │    │  • loan_products                         │  │
│  │  • users                         │    │  • loan_products_hindi                   │  │
│  │  • accounts                      │    │  • investment_schemes                    │  │
│  │  • transactions                  │    │  • investment_schemes_hindi              │  │
│  │  • beneficiaries                 │    │                                          │  │
│  │  • upi_mappings                  │    │  Persisted in: chroma_db/                │  │
│  │                                  │    │                                          │  │
│  │  Accessed via: utils/db_helper   │    │                                          │  │
│  └──────────────────────────────────┘    └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Request Flow

### Chat Request Flow (`POST /api/chat`)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Chat Request Flow                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

  User Message
       │
       ▼
┌──────────────────┐
│  1. FastAPI      │
│     Receives     │
│     ChatRequest  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  2. Guardrail    │────►│  BLOCKED         │
│     Input Check  │ NO  │  Return error    │
│     (main.py)    │     │  response        │
└────────┬─────────┘     └──────────────────┘
         │ PASS
         ▼
┌──────────────────┐
│  3. Convert      │
│     message_     │
│     history      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  4. process_     │
│     message()    │
│     (agent_graph)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  5. Hybrid       │
│     Supervisor   │
│     .process()   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  6. Build        │
│     Conversation │
│     State        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  7. Guardrail    │────►│  BLOCKED         │
│     Validate     │ NO  │  Return refusal  │
│     (supervisor) │     │  message         │
└────────┬─────────┘     └──────────────────┘
         │ PASS
         ▼
┌──────────────────┐
│  8. Intent       │
│     Router       │
│     .assign_     │
│     intent()     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  9. Intent       │
│     Classifier   │
│                  │
│  Keyword +       │
│  LLM fallback    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           10. Route to Specialist Agent                          │
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ banking_    │  │ upi_        │  │ rag_        │  │ greeting/   │             │
│  │ agent       │  │ agent       │  │ agent       │  │ feedback    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                │                     │
│         ▼                ▼                ▼                ▼                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐              │
│  │ Banking     │  │ UPI         │  │ RAG Sub-Agents              │              │
│  │ Tools       │  │ Tools       │  │ • loan_agent                │              │
│  │             │  │             │  │ • investment_agent          │              │
│  │             │  │             │  │ • customer_support_agent    │              │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  11. Build       │
│     Response     │
│     (supervisor) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  12. Guardrail   │
│     Sanitize     │
│     Output       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  13. Guardrail   │
│     Check Output │
│     (main.py)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  14. Return      │
│     ChatResponse │
└──────────────────┘
```

---

## Component Details

### Intent Classification Flow

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                         IntentClassifier Decision Tree                              │
└────────────────────────────────────────────────────────────────────────────────────┘

   User Message
        │
        ▼
   ┌─────────────────────────────┐
   │ 1. Wake-up phrase?          │──Yes──► Activate UPI mode → upi_agent
   │    ("hello vaani", etc.)    │
   └─────────────┬───────────────┘
                 │ No
                 ▼
   ┌─────────────────────────────┐
   │ 2. Pending UPI operation?   │──Yes──► upi_agent (continue flow)
   │    (awaiting confirmation)  │
   └─────────────┬───────────────┘
                 │ No
                 ▼
   ┌─────────────────────────────┐
   │ 3. Loan/Investment keyword? │──Yes──► rag_agent (general_faq)
   │    ("loan", "investment")   │
   └─────────────┬───────────────┘
                 │ No
                 ▼
   ┌─────────────────────────────┐
   │ 4. Language change request? │──Yes──► rag_agent (language_change)
   │    ("switch to Hindi")      │
   └─────────────┬───────────────┘
                 │ No
                 ▼
   ┌─────────────────────────────┐
   │ 5. Reminder keywords?       │──Yes──► banking_agent
   │    ("set reminder", etc.)   │
   └─────────────┬───────────────┘
                 │ No
                 ▼
   ┌─────────────────────────────┐
   │ 6. UPI mode active?         │
   │    + balance/transfer kw?   │──Yes──► upi_agent
   └─────────────┬───────────────┘
                 │ No
                 ▼
   ┌─────────────────────────────┐
   │ 7. UPI keyword detected?    │──Yes──► Activate UPI mode → upi_agent
   │    ("UPI", "pay via UPI")   │
   └─────────────┬───────────────┘
                 │ No
                 ▼
   ┌─────────────────────────────┐
   │ 8. Balance/Transfer kw?     │──Yes──► banking_agent
   │    (normal banking ops)     │
   └─────────────┬───────────────┘
                 │ No
                 ▼
   ┌─────────────────────────────┐
   │ 9. LLM Classification       │
   │    (fallback)               │
   │                             │
   │    Returns one of:          │
   │    • upi_payment            │──► upi_agent
   │    • banking_operation      │──► banking_agent
   │    • general_faq            │──► rag_agent
   │    • greeting               │──► rag_agent
   │    • feedback               │──► rag_agent
   │    • other                  │──► rag_agent
   └─────────────────────────────┘
```

### RAG Agent Sub-Routing

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              RAG Agent (Hybrid Supervisor)                          │
└────────────────────────────────────────────────────────────────────────────────────┘

   Incoming Query
        │
        ▼
   ┌─────────────────────────────┐
   │ 1. Language change intent?  │──Yes──► Return language switch response
   └─────────────┬───────────────┘         (update language in state)
                 │ No
                 ▼
   ┌─────────────────────────────┐
   │ 2. Customer support query?  │──Yes──► customer_support_agent
   │   (contact, help, support)  │         → Return contact cards
   └─────────────┬───────────────┘
                 │ No
                 ▼
   ┌─────────────────────────────┐
   │ 3. QuerySignals Detection   │
   │   • is_loan_query           │──Yes──► loan_agent
   │   • is_investment_query     │──Yes──► investment_agent
   │   • detected_loan_type      │         (with sub-type filtering)
   │   • detected_investment_type│
   └─────────────┬───────────────┘
                 │ Neither
                 ▼
   ┌─────────────────────────────┐
   │ 4. Bank info query?         │──Yes──► Default bank info response
   │   ("bank", "branch", etc.)  │
   └─────────────┬───────────────┘
                 │ No
                 ▼
   ┌─────────────────────────────┐
   │ 5. Default response         │
   │   (fallback message)        │
   └─────────────────────────────┘
```

---

## External Dependencies

| Category | Technology | Purpose |
|----------|------------|---------|
| **LLM - Local** | Ollama | Local LLM inference (qwen2.5:7b, llama3.2:3b) |
| **LLM - Cloud** | OpenAI | Cloud LLM (gpt-3.5-turbo) |
| **Vector DB** | ChromaDB | Document embeddings & retrieval |
| **Embeddings** | HuggingFace (all-MiniLM-L6-v2) | Document/query embeddings |
| **TTS** | Azure Cognitive Services | Text-to-speech (Indian voices) |
| **Database** | SQLAlchemy + SQLite/PostgreSQL | Banking data |
| **Tracing** | LangSmith | LLM observability |
| **Logging** | structlog | Structured logging |

---

## Known Issues

### Dead Code
- `agents/agent_graph_old.py` - deprecated, unused
- `tools/banking_tools.py.backup` - backup file in source

### Code Quality Issues
- **sys.path manipulation**: Multiple files add parent paths using `sys.path.insert()` - fragile
- **Monolithic main.py**: ~500 lines mixing routes, models, and logic
- **Duplicate code**: `_detect_query_signals` logic duplicated across agents
- **Inconsistent naming**: Mix of snake_case and varying conventions in structured_data

### Performance Issues
- **Small RAG cache**: Only 128 entries, 120s TTL
- **No query embedding cache**: Re-embeds identical queries

### Security Concerns
- **PII regex gaps**: May miss dashed/spaced Aadhaar (XXXX-XXXX-XXXX)
- **In-memory rate limiting**: Lost on restart
- **Default JWT secret**: Risk if not overridden in production

---

## Next Steps

See `updated_architecture.md` for the post-refactor architecture.
