# Vaani AI Module Architecture

This document explains how the `ai/` module of the Vaani Banking Voice Assistant is structured, how requests flow through it, and what each major node in the architecture diagram does.

The goal is to keep **business logic in specialist agents**, while a **hybrid supervisor** handles orchestration, routing, and response shaping in one predictable place.

> Diagram source: `documentation/ai-architecture.mmd`

---

## 1. End‑to‑end flow

At a high level, the AI module turns an HTTP `/api/chat` request from the backend into a structured response for the frontend.

1. **Backend receives request** at `/api/chat` and forwards it into the AI module, typically by calling `agent_graph.process_message` in `ai/agents/agent_graph.py`.
2. **HybridSupervisor** (in `ai/orchestrator/supervisor.py`) builds a `ConversationState` from the raw payload: messages, user/session IDs, language, UPI mode, and any existing `structured_data`.
3. **IntentRouter** (in `ai/orchestrator/router.py`) runs the intent classifier and maps the text to a high‑level intent such as `banking_operation`, `upi_payment`, or `general_faq`.
4. **HybridSupervisor** chooses a **specialist agent** based on that intent and calls it with the current state.
5. The **specialist** (banking, UPI, RAG, greeting, or feedback) may call the LLM, RAG service, and banking/UPI tools, then updates the shared state (messages, structured data, statement data, flags).
6. **HybridSupervisor** merges the specialist’s changes back into the `ConversationState` and shapes a response dict with `response`, `intent`, `language`, `structured_data`, etc.
7. The **backend** returns this response to the web/voice client, which renders text plus any structured cards.

The Mermaid diagram in `ai-architecture.mmd` visualizes this control flow.

---

## 2. Orchestrator stack (ai/orchestrator)

### 2.1 `HybridSupervisor`

File: `ai/orchestrator/supervisor.py`

**Role:** Central brain that coordinates every request.

Responsibilities:
- Build a `ConversationState` from the raw request (`message`, `user_id`, `session_id`, `language`, optional `message_history`, `user_context`, `upi_mode`).
- Ask the `IntentRouter` to classify the intent and select a route key.
- Dispatch to exactly one specialist agent based on that route.
- Apply the resulting state changes (new messages, `structured_data`, `statement_data`, flags) back onto the conversation.
- Shape the final response payload for the backend.

Key behaviors:
- **Deterministic orchestration:** All routing decisions happen here; agents don’t call each other arbitrarily.
- **Graceful fallbacks:** Unknown or ambiguous intents fall back to the RAG supervisor so the user still gets a helpful answer.
- **Observability:** Logs key events such as `conversation_context_created`, `intent_router_decision`, `invoking_specialist`, and agent‑specific metrics.

### 2.2 `ConversationState`

File: `ai/orchestrator/state.py`

**Role:** Dataclass mirror of the legacy agent `state` dict, used throughout the AI module.

Holds:
- `messages`: list of LangChain `HumanMessage` / `AIMessage` objects.
- `language`: e.g. `"en-IN"` or `"hi-IN"`.
- `user_id`, `session_id`.
- `user_context`: profile information from the backend (accounts, name, etc.).
- `upi_mode`: whether UPI mode is currently active.
- `statement_data`, `structured_data`: payloads for the UI (e.g. tables, cards, UPI flows).
- Additional flags used by agents (e.g. `current_intent`, `next_action`).

Important methods:
- `from_request(...)` – builds a state object from the backend payload.
- `to_agent_state()` – converts back to the plain dict passed into agents.
- `apply_agent_state(state_dict)` – merges the agent’s mutated fields back into the dataclass while guarding against unexpected keys.

### 2.3 `IntentRouter`

File: `ai/orchestrator/router.py`

**Role:** Translate free‑form text into an intent and then into a route key.

Steps:
1. Wraps the **intent classifier** agent (in `ai/agents/intent_classifier.py`) so callers don’t talk to the classifier directly.
2. Sends the conversation state through the classifier to get an `intent` label (e.g. `"banking_operation"`, `"upi_payment"`, `"general_faq"`, `"chitchat"`).
3. Logs the decision, including confidence and whether UPI mode was considered.
4. Maps the intent to a **route key** via a lookup table, e.g.:
   - `banking_operation` → `banking_agent`
   - `upi_payment` → `upi_agent`
   - `general_faq` / `loan_inquiry` → `rag_agent`
   - `greeting` → `greeting_agent`
   - `feedback` → `feedback_agent`
5. Returns the updated state plus the route key to the supervisor.

Safeguards:
- If the classifier fails or produces an unknown label, the router falls back to a safe default route (RAG supervisor) so the user never sees a crash.

---

## 3. Specialist agents (ai/agents)

Each agent follows the same contract:

- **Input:** a mutable `state` dict (mirrored by `ConversationState`) that includes `messages`, `language`, IDs, and any prior structured payloads.
- **Output:** the same dict, usually with an appended `AIMessage` in `messages` plus optional `structured_data` or `statement_data` and a `next_action` hint.

### 3.1 `banking_agent`

File: `ai/agents/banking_agent.py`

**Role:** Handle core banking tasks: balances, transactions, reminders, and transfers.

Typical flow:
1. Interpret the latest user message in the context of previous messages and `user_context`.
2. Use **banking tools** (`ai/tools/banking_tools.py`) to:
   - Fetch account balances and statements.
   - List reminders and beneficiaries.
   - Initiate transfers (with confirmation).
3. Optionally call the **LLM service** to format explanations or answer more conversationally.
4. Populate:
   - `statement_data` for tables of transactions.
   - `structured_data` for UI cards (e.g. transfer confirmation, reminder details).
5. Append a clear, localized assistant message to `messages`.

### 3.2 `upi_agent`

File: `ai/agents/upi_agent.py`

**Role:** Manage end‑to‑end UPI payment flows.

Responsibilities:
- Interpret UPI‑specific intents (`upi_payment`, `upi_balance`, etc.).
- Build and update `structured_data` describing multi‑step UPI flows:
  - Collect payee, amount, and UPI ID.
  - Ask for and validate UPI PIN.
  - Confirm payment status.
- Coordinate with backend UPI/payment services (via tools or API calls) to actually execute or simulate transactions.

The supervisor ensures UPI mode can be activated either via frontend flag or via wake‑word detection in recent messages.

### 3.3 `rag_agent` (RAG Supervisor)

File: `ai/agents/rag_agent.py`

**Role:** Front‑door to RAG‑backed FAQs and product discovery.

Responsibilities:
- Analyze the latest user message with lightweight keyword/phrase detection to decide whether the question is about:
  - A specific **loan type** (home, personal, gold, education, business, LAP).
  - A specific **investment scheme** (PPF, NPS, SSY, ELSS, FD, RD, NSC).
  - General “what schemes/loans are available?” discovery.
- Delegate to domain specialists in `ai/agents/rag_agents/`:
  - `loan_agent.handle_loan_query`.
  - `investment_agent.handle_investment_query`.
  - `customer_support_agent.handle_customer_support_query`.
- For generic discovery questions, return selection cards (e.g. list of loans or schemes) via `structured_data`.

Key behavior:
- Keeps business logic for loans and investments inside the specialists while itself staying small and focused on detection and delegation.

### 3.4 RAG domain specialists

Folder: `ai/agents/rag_agents/`

#### `loan_agent`

- Uses `RAGService` with `documents_type="loan"` to retrieve chunks from loan product PDFs.
- Builds a **loan card** (name, interest range, amount range, tenure, eligibility, features) either by:
  - Extracting structured JSON via the LLM from the retrieved context, or
  - Falling back to generic but safe descriptions if context is missing.
- Adds the card to `structured_data` with type `"loan"` and generates a short localized message like “Here are the details for Home Loan.”

#### `investment_agent`

- Uses `RAGService` with `documents_type="investment"` and metadata filters (by `scheme_type`) when a specific scheme is detected.
- Extracts structured investment info in the same pattern (min/max amounts, tax benefits, tenure, features).
- For scheme discovery, returns an `investment_selection` table in `structured_data` so the UI can show clickable cards.

#### `customer_support_agent`

- Handles generic bank FAQs and support questions.
- Uses the LLM service to generate answers from high‑level FAQ content or, when needed, from RAG context.

### 3.5 `greeting_agent`

File: `ai/agents/greeting_agent.py`

**Role:** Provide deterministic, fast greetings and welcome messages.

Characteristics:
- Does **not** call the LLM.
- Generates localized scripts like “Welcome back to Sun National Bank, Ashok. How can I help with your accounts today?”
- Ensures greetings are low‑latency and predictable.

### 3.6 `feedback_agent`

File: `ai/agents/feedback_agent.py`

**Role:** Capture feedback and complaints cleanly.

Responsibilities:
- Acknowledge user satisfaction scores or complaints.
- Tag feedback in `structured_data` or logs so downstream systems (support dashboards, analytics) can ingest it.
- Keep responses short, empathetic, and consistent.

### 3.7 `intent_classifier`

File: `ai/agents/intent_classifier.py`

**Role:** Single place where natural language text is mapped to intent labels.

- Uses the **LLM service** with a dedicated classification prompt.
- Returns a label (and sometimes a confidence indicator) that the `IntentRouter` translates into route keys.
- Handles both banking and non‑banking topics; non‑banking questions usually go to greeting / feedback / RAG handlers that redirect users politely.

---

## 4. Shared services and tools (ai/services, ai/tools)

### 4.1 LLMService and providers

Files:
- `ai/services/llm_service.py`
- `ai/services/ollama_service.py`
- `ai/services/openai_service.py`
- `ai/ARCHITECTURE_DIAGRAM.md` (provider diagram)

**Role:** Present a single interface for chat, streaming, embeddings, and health checks, while allowing you to switch between **local Ollama** and **OpenAI** (or other providers) via configuration.

Main concepts:
- `get_llm_service()` reads config (.env via `ai/config.py`) and constructs an `LLMService` instance with the right provider.
- `LLMService` exposes methods like:
  - `async chat(messages, use_fast_model=False, temperature=None, max_tokens=None)`
  - `async chat_stream(messages, use_fast_model=False, temperature=None)`
  - `async generate_embeddings(text)`
  - `async health_check()`
- Agents call **only** `get_llm_service()`; they never talk to Ollama/OpenAI directly.

Benefits:
- Easy provider switching (local vs cloud) without changing agent code.
- Centralized logging and performance metrics for all LLM calls.

### 4.2 RAGService

File: `ai/services/rag_service.py`

**Role:** Handle document ingestion, chunking, vector storage, and retrieval for RAG queries.

Responsibilities:
- Load PDFs from `backend/documents/loan_products` and `backend/documents/investment_schemes`.
- Chunk documents using `RecursiveCharacterTextSplitter`.
- Build a Chroma vector store with sentence‑transformer embeddings.
- Provide retrieval and context helpers:
  - `retrieve(query, k, filter=None)`
  - `retrieve_with_scores(query, k)`
  - `get_context_for_query(query, k, filter=None)` – formats retrieved chunks into a single context string, and caches recent contexts in an in‑memory LRU cache to reduce latency.
- Factory functions:
  - `get_rag_service(documents_type="loan" | "investment")`
  - `initialize_rag(force_rebuild=False)`

Specialists like `loan_agent` and `investment_agent` call `get_rag_service(...)` and then `get_context_for_query(...)` to seed their prompts.

### 4.3 Banking & UPI tools

Folder: `ai/tools/`

Files:
- `banking_tools.py`
- `upi_tools.py`

**Role:** Provide a safe, structured interface between agents and the backend database/APIs.

Typical responsibilities:
- Query balances, statements, reminders, and beneficiaries.
- Execute transfers and record them.
- Manage UPI mandates, consent, and PIN verification.

These tools allow agents to stay **purely declarative** ("I need the last 10 transactions for this account") instead of embedding SQL or HTTP details.

---

## 5. Request/response contract

### 5.1 Input contract

The AI module expects a request dict with fields like:

- `message: str` – latest user utterance.
- `user_id: str` – unique user identifier.
- `session_id: str` – unique session identifier.
- `language: str` – e.g. `"en-IN"`, `"hi-IN"`.
- `user_context: dict` – account/profile data from backend.
- `message_history: list[dict]` – previous user/assistant messages (optional).
- `upi_mode: bool` – whether UPI mode is active (optional; can also be inferred).

### 5.2 Output contract

The supervisor returns a dict shaped for the backend/clients, e.g.:

```json
{
  "success": true,
  "response": "Your account balance is [0;...",
  "intent": "banking_operation",
  "language": "en-IN",
  "structured_data": { /* optional cards/tables */ },
  "statement_data": { /* optional structured statements */ },
  "timestamp": "2025-11-21T10:30:00Z"
}
```

The backend passes this through to the frontend almost as‑is, so **clients never see internal agent details**—only the final friendly response and any UI payloads.

---

## 6. Extending the AI module

When you add new capabilities, follow this pattern:

### 6.1 Add a new specialist agent

1. Create a new file in `ai/agents/`, e.g. `insurance_agent.py`.
2. Implement an async function, e.g. `async def insurance_agent(state: dict) -> dict`, that respects the existing contract (reads latest human message, appends an AI reply, optionally sets `structured_data`).
3. Add tests that call the agent directly with a minimal state.

### 6.2 Wire it into routing

1. Update the intent classifier prompt to emit a new label, e.g. `insurance_inquiry`.
2. In `ai/orchestrator/router.py`, map `insurance_inquiry` to a new route key.
3. In `HybridSupervisor`, extend the route‑to‑function mapping so the new key calls `insurance_agent`.

### 6.3 (Optional) Add RAG support

1. Extend `RAGService` to load a new document set (e.g. `insurance_products`).
2. Create a new specialist under `ai/agents/rag_agents/` if you want to keep RAG logic separate.

---

## 7. Testing and observability

Relevant tests in `ai/` include:

- `test_rag_agent.py` – validates behavior of the RAG supervisor and its delegation.
- `test_upi_mode_routing.py` – ensures UPI wake‑word and mode routing behave correctly.
- `test_balance_queries.py` / `test_balance_logic.py` – exercise banking logic.
- `test_backend.py` – integration tests for the AI HTTP surface.
- `test_rag_service_cache.py` – verifies RAG context caching helpers.

Logging and tracing:
- Structured logs from supervisor, router, and agents include message lengths, intent labels, route keys, and whether RAG was used.
- Optional LangSmith integration (see `docs/AI_README.md`) provides full trace visualization for debugging and optimization.

Together, the diagram in `ai-architecture.mmd` and this document should give any engineer enough context to safely extend or debug the AI module without diving into every single file first.
