# AI Module Documentation

## Overview

The AI module is the conversational intelligence layer of Vaani, built with **LangGraph**, **Ollama (Qwen 2.5)**, and **LangSmith**. It handles natural language understanding, intent classification, banking operations, and provides bilingual (Hindi/English) support through a multi-agent architecture.

**Port**: 8001  
**Tech Stack**: FastAPI, LangGraph, Ollama, LangSmith, Azure TTS

---

## Architecture

```
ai/
├── main.py                      # FastAPI application entry point
├── config.py                    # Configuration management
├── requirements.txt             # Python dependencies
├── run.sh                       # Startup script
├── start.sh                     # Setup and startup script
│
├── agents/                      # LangGraph agents
│   ├── agent_graph.py          # Main orchestration graph
│   ├── intent_classifier.py    # Intent classification
│   ├── banking_agent.py        # Banking operations agent
│   ├── upi_agent.py            # UPI payment agent
│   ├── faq_agent.py            # General FAQ agent
│   ├── greeting_agent.py       # Greeting and chitchat
│   ├── feedback_agent.py       # User feedback handling
│   ├── router.py               # Agent routing logic
│   └── rag_agents/             # RAG-based agents (future)
│
├── orchestrator/                # Hybrid supervisor pattern
│   ├── supervisor.py           # Main supervisor
│   ├── state.py                # Conversation state management
│   └── router.py               # Intent-based routing
│
├── services/                    # External service integrations
│   ├── llm_service.py          # Unified LLM interface
│   ├── ollama_service.py       # Ollama integration
│   ├── openai_service.py       # OpenAI integration
│   ├── azure_tts_service.py    # Azure Text-to-Speech
│   └── rag_service.py          # RAG (future)
│
├── tools/                       # LangChain tools for agents
│   ├── banking_tools.py        # Banking operations tools
│   └── upi_tools.py            # UPI payment tools
│
├── utils/                       # Utilities
│   ├── logging.py              # Structured logging
│   ├── exceptions.py           # Custom exceptions
│   └── db_helper.py            # Database helpers
│
├── core/                        # Core components
│   ├── memory/                 # Conversation memory
│   ├── supervisor/             # Supervisor patterns
│   └── workers/                # Worker agents
│
├── chroma_db/                   # Vector database for RAG
├── documents/                   # Documents for RAG ingestion
└── logs/                        # Application logs
```

---

## Core Components

### 1. Hybrid Supervisor (`orchestrator/supervisor.py`)

The supervisor orchestrates the entire conversation flow using a hybrid pattern that combines routing and delegation.

**Key Features:**
- Intent-based routing to specialized agents
- Conversation state management
- Multi-turn conversation support
- Error handling and fallback

**Process Flow:**
```
User Message
    ↓
Supervisor receives message
    ↓
Intent Classification
    ↓
Route to appropriate agent
    ↓
Agent processes with tools
    ↓
Response returned to user
```

**Methods:**

#### `process(message, user_id, session_id, language, user_context, message_history, upi_mode)`
- Main entry point for message processing
- Classifies intent
- Routes to appropriate agent
- Manages conversation state
- Returns response

**Supported Intents:**
- `banking_operation`: Balance, transactions, transfers
- `upi_payment`: UPI payments and transfers
- `general_faq`: General banking questions
- `greeting`: Greetings and chitchat
- `feedback`: User feedback
- `authentication`: Login and verification

### 2. Intent Classifier (`agents/intent_classifier.py`)

Determines user intent from natural language input using a fast LLM.

**Model Used**: Llama 3.2 3B (fast, < 200ms)

**Key Features:**
- Multi-language support (English, Hindi, Hinglish)
- Context-aware classification
- UPI mode detection
- Balance keyword detection

**Intent Categories:**

| Intent | Description | Examples |
|--------|-------------|----------|
| `banking_operation` | Account operations | "Check balance", "Show transactions" |
| `upi_payment` | UPI transfers | "Pay ₹500 to John", "Hello Vaani pay..." |
| `general_faq` | General queries | "Interest rates?", "Branch hours?" |
| `greeting` | Greetings | "Hello", "Namaste" |
| `feedback` | User feedback | "This is helpful", "Not working" |
| `authentication` | Login queries | "Forgot password", "How to login" |

**Methods:**

#### `classify_intent(message, language, upi_mode, message_history)`
- Analyzes user message
- Detects intent from predefined categories
- Considers conversation context
- Returns intent string

### 3. Banking Agent (`agents/banking_agent.py`)

Handles banking operations using database tools.

**Model Used**: Qwen 2.5 7B (high quality)

**Capabilities:**
- Account balance queries
- Transaction history
- Fund transfers (with confirmation)
- Account statement download
- Multi-account management
- Reminder management

**Tools Available:**
- `get_user_accounts`: List all user accounts
- `get_account_balance`: Get balance for specific account
- `get_transaction_history`: Retrieve transactions
- `transfer_between_accounts`: Transfer funds
- `download_statement`: Get account statement
- `get_reminders`: List reminders
- `set_reminder`: Create new reminder

**Agent Behavior:**
1. Understands user request
2. Selects appropriate tool(s)
3. Executes tool with parameters
4. Formats response in user's language
5. Handles errors gracefully

### 4. UPI Agent (`agents/upi_agent.py`)

Specialized agent for UPI payments following RBI guidelines.

**Model Used**: Qwen 2.5 7B

**Features:**
- Hello UPI wake-phrase detection
- Payment amount extraction
- Recipient resolution (UPI ID, phone, name)
- Account selection
- PIN verification flow
- Transaction confirmation

**UPI Flow:**
1. Wake phrase: "Hello Vaani" / "Hello UPI"
2. Payment command parsing
3. Recipient resolution
4. PIN entry prompt
5. Payment initiation
6. Confirmation response

**Tools Available:**
- `resolve_upi_id`: Find recipient by UPI ID, phone, or name
- `initiate_upi_payment`: Process UPI payment
- `get_upi_balance`: Check balance for UPI payment

**Compliance:**
- PIN never spoken (manual entry only)
- User consent required
- Transaction verification
- RBI guideline adherence

### 5. FAQ Agent (`agents/faq_agent.py`)

Handles general banking questions without database tools.

**Model Used**: Qwen 2.5 7B

**Topics Covered:**
- Interest rates
- Account types
- Loan products
- Bank hours
- Branch locations
- General banking procedures

**Agent Behavior:**
- Pure LLM-based responses
- No tool usage
- Leverages banking knowledge
- Provides helpful, accurate information

### 6. Greeting Agent (`agents/greeting_agent.py`)

Handles greetings and chitchat.

**Model Used**: Llama 3.2 3B (fast)

**Responses:**
- Welcome messages
- Casual conversation
- Polite redirects to banking topics
- Multi-language greetings

### 7. Feedback Agent (`agents/feedback_agent.py`)

Collects and processes user feedback.

**Features:**
- Acknowledges feedback
- Categorizes sentiment
- Logs for improvement
- Thanks user

---

## Tools (LangChain Tools)

### Banking Tools (`tools/banking_tools.py`)

Database-backed tools for banking operations.

#### `get_user_accounts(user_id)`
**Purpose**: Get all accounts for a user

**Returns**:
```json
{
  "success": true,
  "accounts": [
    {
      "account_number": "ACC001",
      "account_type": "SAVINGS",
      "balance": 10000.00,
      "currency": "INR"
    }
  ]
}
```

#### `get_account_balance(account_number)`
**Purpose**: Get balance for specific account

**Returns**:
```json
{
  "success": true,
  "account_number": "ACC001",
  "balance": 10000.00,
  "currency": "INR"
}
```

#### `get_transaction_history(account_number, days=30, limit=10)`
**Purpose**: Retrieve recent transactions

**Returns**:
```json
{
  "success": true,
  "transactions": [
    {
      "date": "2025-11-20",
      "type": "DEBIT",
      "amount": 500.00,
      "description": "UPI Payment",
      "balance_after": 9500.00
    }
  ]
}
```

#### `transfer_between_accounts(from_account, to_account, amount, description, channel, user_id, session_id)`
**Purpose**: Transfer funds between accounts

**Validation:**
- Checks account existence
- Verifies sufficient balance
- Atomic transaction

**Returns**:
```json
{
  "success": true,
  "reference_id": "TXN-20251120-143022",
  "amount": 5000.00,
  "from_account": "ACC001",
  "to_account": "ACC002"
}
```

#### `download_statement(account_number, from_date, to_date, period_type)`
**Purpose**: Get account statement for date range

**Returns**:
```json
{
  "success": true,
  "statement_data": {
    "account_number": "ACC001",
    "period": "2025-11-01 to 2025-11-20",
    "opening_balance": 15000.00,
    "closing_balance": 10000.00,
    "transactions": [...]
  }
}
```

#### `get_reminders(user_id)`
**Purpose**: List all reminders for user

#### `set_reminder(user_id, reminder_type, message, remind_at, account_id, channel, recurrence_rule)`
**Purpose**: Create new payment reminder

### UPI Tools (`tools/upi_tools.py`)

Specialized tools for UPI operations.

#### `resolve_upi_id(recipient_identifier, user_id)`
**Purpose**: Resolve UPI ID, phone, or name to account

**Input Types:**
- UPI ID: `9876543210@sunbank`
- Phone: `9876543210`
- Name: `John Doe`
- Beneficiary: `first`, `last`

**Returns**:
```json
{
  "success": true,
  "account_number": "ACC002",
  "upi_id": "9876543210@sunbank",
  "name": "John Doe"
}
```

#### `initiate_upi_payment(source_account, destination_account, amount, remarks, user_id, session_id)`
**Purpose**: Process UPI payment

**Features:**
- Generates UPI reference ID
- Creates debit/credit transactions
- Updates balances
- Marks as UPI channel

**Returns**:
```json
{
  "success": true,
  "reference_id": "UPI-20251120-143022",
  "amount": 500.00,
  "recipient": "John Doe"
}
```

#### `get_upi_balance(account_number)`
**Purpose**: Get balance specifically for UPI payment

---

## Services

### LLM Service (`services/llm_service.py`)

Unified interface for LLM providers.

**Supported Providers:**
- Ollama (local, default)
- OpenAI (cloud, optional)

**Methods:**

#### `chat(messages, use_fast_model=False, temperature=None, max_tokens=None)`
**Purpose**: Send chat completion request

**Parameters:**
- `messages`: List of message dicts `[{"role": "user", "content": "..."}]`
- `use_fast_model`: Use fast model (Llama 3.2 3B) instead of primary
- `temperature`: Sampling temperature (0.0-1.0)
- `max_tokens`: Maximum response tokens

**Returns**: String response

#### `stream_chat(messages, use_fast_model=False)`
**Purpose**: Stream chat completion (token-by-token)

**Returns**: AsyncGenerator yielding tokens

**Model Selection:**
- **Primary Model**: Qwen 2.5 7B (quality)
- **Fast Model**: Llama 3.2 3B (speed)
- **Voice Mode**: Automatically uses fast model

### Ollama Service (`services/ollama_service.py`)

Integration with local Ollama server.

**Features:**
- Local model execution
- No data sent to cloud
- Fast inference on M-series Macs
- Streaming support

**Configuration:**
```python
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen2.5:7b"
OLLAMA_FAST_MODEL = "llama3.2:3b"
```

**Methods:**
- `chat(messages, model, temperature, max_tokens)`: Chat completion
- `stream_chat(messages, model)`: Streaming chat
- `check_health()`: Verify Ollama is running

### OpenAI Service (`services/openai_service.py`)

Integration with OpenAI API (optional).

**Features:**
- GPT-4 and GPT-3.5 support
- Cloud-based inference
- Higher quality for complex queries
- Streaming support

**Configuration:**
```python
OPENAI_API_KEY = "sk-..."
OPENAI_MODEL = "gpt-4"
OPENAI_FAST_MODEL = "gpt-3.5-turbo"
```

### Azure TTS Service (`services/azure_tts_service.py`)

Text-to-speech using Azure Cognitive Services.

**Features:**
- High-quality Indian voices
- Multi-language support
- Hindi and English voices
- Low latency

**Supported Voices:**
- Hindi: `hi-IN-SwaraNeural` (female), `hi-IN-MadhurNeural` (male)
- English: `en-IN-NeerjaNeural` (female), `en-IN-PrabhatNeural` (male)

**Methods:**

#### `synthesize_speech(text, language, voice_name=None)`
**Purpose**: Convert text to speech

**Parameters:**
- `text`: Text to synthesize
- `language`: Language code (`hi-IN`, `en-IN`)
- `voice_name`: Specific voice (optional)

**Returns**: Audio bytes (WAV format)

**Configuration:**
```python
AZURE_TTS_ENABLED = true
AZURE_TTS_KEY = "your_key"
AZURE_TTS_REGION = "centralindia"
```

---

## API Endpoints

### Chat Endpoint

**POST /api/chat**

Main endpoint for conversational AI.

**Request:**
```json
{
  "message": "Check my balance",
  "user_id": "uuid-string",
  "session_id": "session-uuid",
  "language": "en-IN",
  "user_context": {
    "account_number": "ACC001",
    "name": "John Doe"
  },
  "message_history": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi! How can I help?"}
  ],
  "voice_mode": false,
  "upi_mode": false
}
```

**Response:**
```json
{
  "success": true,
  "response": "Your account balance is ₹10,000.00.",
  "intent": "banking_operation",
  "language": "en-IN",
  "timestamp": "2025-11-20T14:30:00",
  "statement_data": null,
  "structured_data": null
}
```

### Streaming Chat

**POST /api/chat/stream**

Server-Sent Events (SSE) for real-time responses.

**Request**: Same as `/api/chat`

**Response**: Stream of text chunks
```
data: Your
data: account
data: balance
data: is
data: ₹10,000.00
data: [DONE]
```

### Text-to-Speech

**POST /api/tts**

Convert text to speech audio.

**Request:**
```json
{
  "text": "Your balance is ₹10,000",
  "language": "en-IN",
  "use_azure": true
}
```

**Response**: Audio file (WAV format)

### Voice Verification

**POST /api/voice-verification**

AI-enhanced voice verification for authentication.

**Request:**
```json
{
  "similarity_score": 0.82,
  "threshold": 0.75,
  "user_context": {
    "user_id": "uuid",
    "device_trust_level": "TRUSTED"
  }
}
```

**Response:**
```json
{
  "confidence": 0.85,
  "risk_level": "LOW",
  "recommendation": "ACCEPT",
  "reasoning": "High similarity with low risk indicators"
}
```

### Health Check

**GET /health**

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "ollama_status": true,
  "azure_tts_available": false
}
```

---

## Configuration

### Environment Variables

**Core Settings:**
```env
# API Configuration
API_PORT=8001
API_HOST=0.0.0.0

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_FAST_MODEL=llama3.2:3b

# Database
DATABASE_URL=sqlite:///../backend/vaani.db

# LLM Provider (ollama or openai)
LLM_PROVIDER=ollama
```

**LangSmith Tracing (Recommended):**
```env
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_your_key
LANGCHAIN_PROJECT=vaani-banking-assistant
```

**Azure TTS (Optional):**
```env
AZURE_TTS_ENABLED=true
AZURE_TTS_KEY=your_azure_key
AZURE_TTS_REGION=centralindia
```

**OpenAI (Optional):**
```env
OPENAI_API_KEY=sk-your_key
OPENAI_MODEL=gpt-4
OPENAI_FAST_MODEL=gpt-3.5-turbo
```

---

## Conversation State

The system maintains conversation state across turns.

**State Fields:**
- `message`: Current user message
- `language`: User's language preference
- `user_id`: User UUID
- `session_id`: Conversation session ID
- `user_context`: User profile and account info
- `message_history`: Previous messages
- `intent`: Classified intent
- `upi_mode`: Whether UPI mode is active
- `response`: Generated response
- `structured_data`: Data for UI components
- `statement_data`: Account statement data

---

## Logging and Monitoring

### Structured Logging

All logs use `structlog` for consistent, queryable logging.

**Log Levels:**
- DEBUG: Detailed debugging information
- INFO: General information
- WARNING: Warning messages
- ERROR: Error messages

**Log Fields:**
- `event`: Event name
- `timestamp`: ISO timestamp
- `session_id`: Session identifier
- `user_id`: User identifier
- `duration`: Operation duration (seconds)
- Custom fields per event

**Example Logs:**
```json
{
  "event": "llm_call",
  "model": "qwen2.5:7b",
  "duration": 1.234,
  "tokens": 150
}

{
  "event": "tool_execution",
  "tool": "get_account_balance",
  "success": true,
  "duration": 0.042
}
```

### LangSmith Tracing

Comprehensive tracing of all LLM interactions.

**What's Traced:**
- LLM calls with input/output
- Agent decisions
- Tool executions
- Errors and exceptions
- Performance metrics

**Benefits:**
- Debug conversation flows
- Monitor performance
- Analyze user interactions
- Identify issues
- Optimize prompts

**Access**: [smith.langchain.com](https://smith.langchain.com)

---

## Performance

### Benchmarks (Apple M4 Max, 128GB RAM)

| Operation | Model | Latency | Quality |
|-----------|-------|---------|---------|
| Intent Classification | Llama 3.2 3B | 100-200ms | 90%+ |
| Balance Query | Qwen 2.5 7B | 500-800ms | 95%+ |
| General FAQ | Qwen 2.5 7B | 1-2s | 95%+ |
| Streaming First Token | Qwen 2.5 7B | 200-400ms | - |
| Voice Mode | Llama 3.2 3B | 300-800ms | 85%+ |
| UPI Payment | Qwen 2.5 7B | 1-1.5s | 95%+ |

### Optimization Tips

1. **Use Fast Model for Voice**: Set `voice_mode: true`
2. **Limit Message History**: Keep last 10 messages max
3. **Cache Embeddings**: For RAG operations (future)
4. **Parallel Tool Calls**: Execute multiple tools concurrently (future)
5. **Warm Start**: First request is slower, subsequent ones are fast

---

## Error Handling

### Error Types

1. **LLM Errors**: Model not responding, timeout
2. **Tool Errors**: Database error, insufficient funds
3. **Validation Errors**: Invalid input parameters
4. **Network Errors**: Ollama not reachable

### Error Response Format

```json
{
  "success": false,
  "response": "I'm sorry, I encountered an error.",
  "error": "Error description",
  "language": "en-IN",
  "timestamp": "2025-11-20T14:30:00"
}
```

### Retry Logic

- Automatic retry (3 attempts)
- Exponential backoff
- Graceful degradation
- Fallback to mock responses (if configured)

---

## Multi-Language Support

### Supported Languages

- **English (en-IN)**: Primary language
- **Hindi (hi-IN)**: Full support
- **Hinglish**: Code-switching support

### Language Detection

- User's `language` parameter
- Auto-detection from message content
- Preference stored in user context

### Response Generation

- System prompts in target language
- LLM generates responses in target language
- Tool outputs formatted per language
- Number formatting (₹ symbol)

**Example Prompts:**

**English:**
```
You are Vaani, a helpful banking assistant for Sun National Bank.
Answer questions about accounts, transactions, and banking services.
```

**Hindi:**
```
आप वाणी हैं, सन नेशनल बैंक की एक सहायक सहायक।
खातों, लेन-देन और बैंकिंग सेवाओं के बारे में सवालों का जवाब दें।
```

---

## Security Features

### Data Privacy

- All LLM processing is local (Ollama)
- No user data sent to external services (except optional LangSmith)
- Database queries use parameterized statements
- No raw credentials in logs

### Input Validation

- Pydantic models for all inputs
- Type checking
- Field validation
- SQL injection prevention (ORM)

### Authentication

- User ID verification
- Session validation
- Access token checks
- Tool authorization

---

## Testing

### Manual Testing

```bash
# Test chat endpoint
curl -X POST http://localhost:8001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Check my balance",
    "user_id": "test-user",
    "session_id": "test-session",
    "language": "en-IN",
    "user_context": {"account_number": "ACC001"}
  }'
```

### Unit Tests

Located in `ai/test_*.py` files:
- `test_balance_logic.py`: Balance query tests
- `test_balance_queries.py`: Balance query variations
- `test_llm_providers.py`: LLM provider tests
- `test_rag_faq.py`: RAG FAQ tests
- `test_upi_mode_routing.py`: UPI routing tests

**Run tests:**
```bash
cd ai
pytest
```

---

## Future Enhancements

### RAG System
- Document Q&A for loan products
- Policy and procedure lookup
- FAQ database
- Vector similarity search

### Advanced Features
- Multi-turn context tracking
- User preference learning
- Proactive suggestions
- Sentiment analysis

### Performance
- Response caching (Redis)
- Parallel tool execution
- Model quantization
- Batch processing

### Capabilities
- Voice biometric integration
- Image understanding (QR codes, documents)
- Multi-modal interactions
- Regional language support (Tamil, Telugu, etc.)

---

## Troubleshooting

### Issue: Ollama connection error

**Solution:**
```bash
# Check Ollama is running
ps aux | grep ollama

# Start Ollama
ollama serve

# Verify models
ollama list
```

### Issue: LangSmith not tracing

**Solution:**
- Verify `LANGCHAIN_TRACING_V2=true` (exact string)
- Check API key is correct
- Restart AI backend after changing `.env`

### Issue: Agent not using tools

**Solution:**
- Check tool definitions in logs
- Verify database connection
- Review LLM prompt templates
- Check LangSmith trace for tool calls

### Issue: Poor response quality

**Solution:**
- Use primary model (not fast model) for complex queries
- Increase context in prompts
- Improve tool descriptions
- Fine-tune temperature parameter

---

## Related Documentation

- [Setup Guide](./setup_guide.md) - Installation and configuration
- [Backend Documentation](./backend_modules.md) - Backend API details
- [Frontend Documentation](./frontend_modules.md) - Frontend components
- [UPI Payment Flow](./upi_payment_flow.md) - UPI implementation
- [API Reference](./api_reference.md) - Complete API docs
