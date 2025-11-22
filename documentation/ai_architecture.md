# AI Module Architecture

This document describes how the `ai/` microservice turns a chat request into a structured response using a hybrid supervisor and specialist agents.

Diagram: `documentation/ai_architecture.mmd`

---

## Purpose
- Orchestrate banking conversations
- Use RAG for loans/investments/support
- Emit `structured_data` and `statement_data` for the UI

## Orchestrator
- Entry: `agent_graph.process_message`
- HybridSupervisor builds a `ConversationState` (messages, user/session IDs, language, UPI mode, user context), classifies intent via `IntentRouter`, dispatches one agent, then shapes the final response back to the backend.
- ConversationState keeps a safe, predictable structure between agents and supervisor.

## Agents
- Banking Agent: balances, transactions, reminders, transfers (uses domain tools + LLM)
- UPI Agent: UPI payment flows (emits multi‑step `structured_data`)
- RAG Supervisor: routes product/FAQ queries to domain specialists
- Greeting Agent: deterministic greetings
- Feedback Agent: collects ratings/complaints

## RAG Specialists
- Loan / Investment / Customer Support specialists retrieve context via `RAGService` (Chroma + embeddings) and draft answers with `LLMService`.

## Shared Services
- LLMService: wraps Ollama/OpenAI providers (models set in `ai/.env`)
- RAGService: ingestion, retrieval, and context assembly with lightweight caching
- Tools: safe interfaces for backend banking/UPI operations

## Request → Response
1. Backend posts `/api/chat` with message and session info
2. Supervisor builds state and selects an agent
3. Agent may call tools, LLM, and/or RAG
4. Supervisor returns `{ response, structured_data?, statement_data? }`

## Localization
- Today: English embeddings
- Short‑term: translate non‑English → English for retrieval, translate answer back
- Medium‑term: switch to multilingual embeddings and re‑index
- Long‑term: add multi‑language corpora with language filters

## Extensibility
- New intent/agent: update classifier prompt + router, implement agent, register route key
- New RAG domain: add specialist and documents with metadata
- Provider swap: set `LLM_PROVIDER` and models in `ai/.env`

## Testing & Observability
- Tests cover intent routing, RAG retrieval, UPI flows, balance logic
- Logs: `intent_router_decision`, `rag_cache_hit`, `invoking_specialist`
- Optional LangSmith tracing via `.env` toggles
