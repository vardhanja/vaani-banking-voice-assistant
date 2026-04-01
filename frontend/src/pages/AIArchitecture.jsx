import { useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import techOrangeIcon from '../assets/tech-orange.svg';
import { useNavigate } from "react-router-dom";
import AIAssistantLogo from "../components/AIAssistantLogo.jsx";
import "./AIArchitecture.css";

/**
 * Interactive AI Architecture Showcase Page
 * Displays the AI module architecture with interactive flow visualization
 */

// Architecture flow paths for different scenarios
// Note: Banking and UPI agents also use LLM for natural language response formatting
// Flow: User → STT → Frontend → API → Guardrails → Intent → Orchestrator → Agents → Tools/Services → Response
const FLOW_PATHS = {
  balance: {
    label: "Check Balance",
    icon: "💰",
    voice: ["user-input", "stt", "frontend", "api-gateway", "guardrails", "intent-classifier", "orchestrator", "banking-agent", "banking-tools", "database", "llm-service", "interactive-cards", "response", "tts"],
    chat: ["user-input", "frontend", "api-gateway", "guardrails", "intent-classifier", "orchestrator", "banking-agent", "banking-tools", "database", "llm-service", "interactive-cards", "response"],
    description: "Orchestrator routes to Banking Agent → Tools fetch data → LLM formats response → Interactive cards"
  },
  transfer: {
    label: "Transfer Funds",
    icon: "💸",
    voice: ["user-input", "stt", "frontend", "api-gateway", "guardrails", "intent-classifier", "orchestrator", "banking-agent", "banking-tools", "database", "llm-service", "interactive-cards", "response", "tts"],
    chat: ["user-input", "frontend", "api-gateway", "guardrails", "intent-classifier", "orchestrator", "banking-agent", "banking-tools", "database", "llm-service", "interactive-cards", "response"],
    description: "Orchestrator → Banking Agent → LLM extracts details → Tools validate & execute → Transfer card"
  },
  upi: {
    label: "UPI Payment",
    icon: "📱",
    voice: ["user-input", "stt", "frontend", "api-gateway", "guardrails", "intent-classifier", "orchestrator", "upi-agent", "upi-tools", "database", "llm-service", "interactive-cards", "response", "tts"],
    chat: ["user-input", "frontend", "api-gateway", "guardrails", "intent-classifier", "orchestrator", "upi-agent", "upi-tools", "database", "llm-service", "interactive-cards", "response"],
    description: "Orchestrator → UPI Agent → LLM extracts payment details → Tools execute → Payment card"
  },
  loan: {
    label: "Loan Info",
    icon: "📋",
    voice: ["user-input", "stt", "frontend", "api-gateway", "guardrails", "intent-classifier", "orchestrator", "rag-supervisor", "loan-agent", "rag-service", "chromadb", "llm-service", "interactive-cards", "response", "tts"],
    chat: ["user-input", "frontend", "api-gateway", "guardrails", "intent-classifier", "orchestrator", "rag-supervisor", "loan-agent", "rag-service", "chromadb", "llm-service", "interactive-cards", "response"],
    description: "Orchestrator → RAG Supervisor → Loan Agent retrieves docs from ChromaDB → LLM response"
  },
  investment: {
    label: "Investment",
    icon: "📈",
    voice: ["user-input", "stt", "frontend", "api-gateway", "guardrails", "intent-classifier", "orchestrator", "rag-supervisor", "investment-agent", "rag-service", "chromadb", "llm-service", "interactive-cards", "response", "tts"],
    chat: ["user-input", "frontend", "api-gateway", "guardrails", "intent-classifier", "orchestrator", "rag-supervisor", "investment-agent", "rag-service", "chromadb", "llm-service", "interactive-cards", "response"],
    description: "Orchestrator → RAG Supervisor → Investment Agent queries vector DB → Scheme cards shown"
  },
  support: {
    label: "Support",
    icon: "💬",
    voice: ["user-input", "stt", "frontend", "api-gateway", "guardrails", "intent-classifier", "orchestrator", "rag-supervisor", "support-agent", "rag-service", "chromadb", "llm-service", "interactive-cards", "response", "tts"],
    chat: ["user-input", "frontend", "api-gateway", "guardrails", "intent-classifier", "orchestrator", "rag-supervisor", "support-agent", "rag-service", "chromadb", "llm-service", "interactive-cards", "response"],
    description: "Orchestrator → RAG Supervisor → Support Agent handles queries via RAG → Support cards"
  },
};

// SVG Icon paths for clean, consistent design
const ICONS = {
  user: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  mic: "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z",
  speaker: "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
  react: "M12 10.11c1.03 0 1.87.84 1.87 1.89 0 1-.84 1.85-1.87 1.85-1.03 0-1.87-.85-1.87-1.85 0-1.05.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7-.52-.59-1.03-1.23-1.51-1.9-.82-.08-1.63-.2-2.4-.36-.51 2.14-.32 3.61.31 3.96m.71-5.74l-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16l-.3-.51m6.54-.76l.81-1.5-.81-1.5c-.3-.53-.62-1-.91-1.47C13.17 9 12.6 9 12 9s-1.17 0-1.71.03c-.29.47-.61.94-.91 1.47L8.57 12l.81 1.5c.3.53.62 1 .91 1.47.54.03 1.11.03 1.71.03s1.17 0 1.71-.03c.29-.47.61-.94.91-1.47M12 6.78c-.19.22-.39.45-.59.72h1.18c-.2-.27-.4-.5-.59-.72m0 10.44c.19-.22.39-.45.59-.72h-1.18c.2.27.4.5.59.72M16.62 4c-.62-.38-2 .2-3.59 1.7.52.59 1.03 1.23 1.51 1.9.82.08 1.63.2 2.4.36.51-2.14.32-3.61-.32-3.96m-.7 5.74l.29.51c.11-.29.22-.58.29-.86-.27-.06-.57-.11-.88-.16l.3.51m1.45-7.05c1.47.84 1.63 3.05 1.01 5.63 2.54.75 4.37 1.99 4.37 3.68s-1.83 2.93-4.37 3.68c.62 2.58.46 4.79-1.01 5.63-1.46.84-3.45-.12-5.37-1.95-1.92 1.83-3.91 2.79-5.38 1.95-1.46-.84-1.62-3.05-1-5.63-2.54-.75-4.37-1.99-4.37-3.68s1.83-2.93 4.37-3.68c-.62-2.58-.46-4.79 1-5.63 1.47-.84 3.46.12 5.38 1.95 1.92-1.83 3.91-2.79 5.37-1.95M17.08 12c.34.75.64 1.5.89 2.26 2.1-.63 3.28-1.53 3.28-2.26s-1.18-1.63-3.28-2.26c-.25.76-.55 1.51-.89 2.26M6.92 12c-.34-.75-.64-1.5-.89-2.26-2.1.63-3.28 1.53-3.28 2.26s1.18 1.63 3.28 2.26c.25-.76.55-1.51.89-2.26m9 2.26l-.3.51c.31-.05.61-.1.88-.16-.07-.28-.18-.57-.29-.86l-.29.51m-2.89 4.04c1.59 1.5 2.97 2.08 3.59 1.7.64-.35.83-1.82.32-3.96-.77.16-1.58.28-2.4.36-.48.67-.99 1.31-1.51 1.9M8.08 9.74l.3-.51c-.31.05-.61.1-.88.16.07.28.18.57.29.86l.29-.51m2.89-4.04C9.38 4.2 8 3.62 7.37 4c-.63.35-.82 1.82-.31 3.96.77-.16 1.58-.28 2.4-.36.48-.67.99-1.31 1.51-1.9z",
  bolt: "M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z",
  shield: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z",
  brain: "M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z",
  target: "M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-8c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z",
  bot: "M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z",
  wrench: "M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z",
  docs: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  chart: "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
  chat: "M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z",
  ai: "M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1-2.73 2.71-2.73 7.08 0 9.79s7.15 2.71 9.88 0C18.32 15.65 19 14.08 19 12.1h2c0 1.98-.88 4.55-2.64 6.29-3.51 3.48-9.21 3.48-12.72 0-3.5-3.47-3.53-9.11-.02-12.58s9.14-3.47 12.65 0L21 3v7.12zM12.5 8v4.25l3.5 2.08-.72 1.21L11 13V8h1.5z",
  db: "M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.59 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm0 2c3.87 0 6 1.5 6 2s-2.13 2-6 2-6-1.5-6-2 2.13-2 6-2zm6 12c0 .5-2.13 2-6 2s-6-1.5-6-2v-2.23c1.61.78 3.72 1.23 6 1.23s4.39-.45 6-1.23V17zm0-5c0 .5-2.13 2-6 2s-6-1.5-6-2V9.77c1.61.78 3.72 1.23 6 1.23s4.39-.45 6-1.23V12z",
  search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  cards: "M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
};

// Architecture components with their details and icons
// Layout: Top-down tree structure for clarity
const ARCHITECTURE_COMPONENTS = {
  // Input Layer - User on left, STT/TTS spread out with diagonal arrows (padding from edges: 40-260)
  "user-input": { label: "User", category: "input", iconKey: "user", x: 90, y: 150 },
  "stt": { label: "Speech to Text", category: "voice", iconKey: "mic", x: 210, y: 100, voiceOnly: true },
  "tts": { label: "Text to Speech", category: "voice", iconKey: "speaker", x: 210, y: 200, voiceOnly: true },
  
  // Frontend - React Frontend box (centered in Frontend section 310-450, padding 20px)
  "frontend": { label: "React UI", category: "frontend", iconKey: "react", x: 380, y: 150 },
  
  // API Gateway - positioned at boundary to overlap both sections (with gap from React)
  "api-gateway": { label: "API Gateway", category: "backend", iconKey: "bolt", x: 540, y: 150 },
  
  // AI Backend components (within 470-1110, padding from edges: 490-1090)
  "guardrails": { label: "Guardrails", category: "security", iconKey: "shield", x: 690, y: 150 },
  "intent-classifier": { label: "Intent Router", category: "ai", iconKey: "brain", x: 840, y: 150 },
  
  // === AGENTS & TOOLS SECTION - Tree Structure (470-1110, padding: 490-1090) ===
  // Level 1: Orchestrator (center top of agents section)
  "orchestrator": { label: "Orchestrator", category: "orchestrator", iconKey: "target", x: 750, y: 295 },
  
  // Level 2: Main Agents (three branches from orchestrator)
  "banking-agent": { label: "Banking Agent", category: "agent", iconKey: "bot", x: 570, y: 375 },
  "upi-agent": { label: "UPI Agent", category: "agent", iconKey: "bot", x: 730, y: 375 },
  "rag-supervisor": { label: "RAG Supervisor", category: "agent", iconKey: "bot", x: 910, y: 375 },
  
  // Level 3: Tools together on left, Sub-agents spread on right under RAG
  "banking-tools": { label: "Banking Tools", category: "tools", iconKey: "wrench", x: 550, y: 460 },
  "upi-tools": { label: "UPI Tools", category: "tools", iconKey: "wrench", x: 710, y: 460 },
  "loan-agent": { label: "Loan Agent", category: "sub-agent", iconKey: "bot", x: 840, y: 460 },
  "investment-agent": { label: "Investment", category: "sub-agent", iconKey: "bot", x: 960, y: 460 },
  "support-agent": { label: "Support", category: "sub-agent", iconKey: "bot", x: 1050, y: 460 },
  
  // === SERVICES & DATA SECTION - Tree Structure (310-1110, padding: 330-1090) ===
  // LLM Service at center-left (connects to all agents)
  "llm-service": { label: "LLM Service", category: "service", iconKey: "ai", x: 600, y: 575 },
  
  // Database below Tools
  "database": { label: "SQLite DB", category: "database", iconKey: "db", x: 600, y: 650 },
  
  // RAG Service below RAG agents
  "rag-service": { label: "RAG Service", category: "service", iconKey: "search", x: 900, y: 575 },
  
  // ChromaDB below RAG Service
  "chromadb": { label: "ChromaDB", category: "database", iconKey: "db", x: 900, y: 650 },
  
  // Interactive Cards - receives from LLM Service (within Services section)
  "interactive-cards": { label: "UI Cards", category: "frontend", iconKey: "cards", x: 400, y: 575 },
  
  // Response - back to user (outside sections on left)
  "response": { label: "Response", category: "output", iconKey: "check", x: 80, y: 575 },
};

// Module explanations
const MODULE_EXPLANATIONS = {
  frontend: {
    title: "React Frontend",
    description: "Single-page application built with React and Vite. Handles user interactions, voice input via Web Speech API, and real-time chat interface.",
    tech: "React 18, Vite, Web Speech API"
  },
  voice: {
    title: "Voice Processing",
    description: "Browser-based speech recognition for input and Web Speech API for text-to-speech output. Azure TTS available for production.",
    tech: "Web Speech API, Azure TTS (optional)"
  },
  backend: {
    title: "FastAPI Backend",
    description: "Async Python backend handling API requests, CORS, validation, and request routing to AI agents.",
    tech: "FastAPI, Uvicorn, Pydantic"
  },
  security: {
    title: "Guardrails Service",
    description: "Input/output validation including PII detection (Aadhaar, PAN), toxicity filtering, jailbreak prevention, and rate limiting.",
    tech: "Regex patterns, keyword filtering"
  },
  ai: {
    title: "Intent Classification",
    description: "Analyzes user queries to determine intent (banking, UPI, RAG) and routes to appropriate agent for processing.",
    tech: "LLM-based classification"
  },
  agent: {
    title: "AI Agents",
    description: "Specialized agents for different domains: Banking for account operations, UPI for payments, RAG Supervisor for information queries.",
    tech: "LangChain, Custom agents"
  },
  "sub-agent": {
    title: "RAG Sub-Agents",
    description: "Domain-specific agents under RAG Supervisor: Loan Agent, Investment Agent, and Customer Support Agent for specialized queries.",
    tech: "LangChain, RAG patterns"
  },
  tools: {
    title: "Banking Tools",
    description: "LangChain tools that interface with the database to perform actual banking operations like balance checks and transfers.",
    tech: "LangChain Tools, SQLAlchemy"
  },
  service: {
    title: "AI Services",
    description: "Core services including LLM abstraction (Ollama/OpenAI), RAG retrieval with semantic search, and response caching.",
    tech: "Ollama, OpenAI, HuggingFace"
  },
  database: {
    title: "Data Storage",
    description: "SQLite for transactional data (accounts, users). ChromaDB vector database for document embeddings used in RAG queries.",
    tech: "SQLite, ChromaDB, SQLAlchemy"
  },
};

// Folder structure
const FOLDER_STRUCTURE = `backend/ai/
├── main.py              # FastAPI app entry
├── config.py            # Settings & environment
├── models/              # Pydantic models
│   ├── requests.py      # API request schemas
│   └── responses.py     # API response schemas
├── routes/              # API endpoints
│   ├── chat.py          # Chat & streaming
│   ├── health.py        # Health checks
│   ├── tts.py           # Text-to-speech
│   └── voice.py         # Voice verification
├── agents/              # AI agents
│   ├── agent_graph.py   # Main orchestrator
│   ├── banking_agent.py # Account operations
│   ├── upi_agent.py     # UPI payments
│   ├── rag_agent.py     # RAG supervisor
│   └── rag_agents/      # Sub-agents
│       ├── loan_agent.py
│       ├── investment_agent.py
│       └── customer_support_agent.py
├── services/            # Core services
│   ├── llm_service.py   # LLM abstraction
│   ├── rag_service.py   # RAG + ChromaDB
│   ├── guardrail_service.py
│   └── azure_tts_service.py
├── tools/               # LangChain tools
│   ├── banking_tools.py
│   └── upi_tools.py
└── utils/               # Helpers
    ├── logging.py
    └── db_helper.py`;

// Technology stack with official logos or initials
const TECH_STACK = {
  current: [
    { name: "Ollama + Llama 3.2", category: "LLM (Local)", description: "Local LLM inference (qwen2.5:7b, llama3.2:3b)" },
    { name: "OpenAI GPT-4", category: "LLM (Cloud)", description: "Cloud LLM via OCI deployment" },
    { name: "ChromaDB", category: "Vector DB", description: "Local vector database for RAG" },
    { name: "SQLite", category: "Database", description: "File-based relational database" },
    { name: "FastAPI", category: "Backend", description: "Async Python web framework" },
    { name: "React + Vite", category: "Frontend", description: "UI library with Vite bundler" },
    { name: "Web Speech API", category: "Voice", description: "Browser-based TTS & STT" },
    { name: "HuggingFace", category: "Embeddings", description: "all-MiniLM-L6-v2 model" },
    { name: "LangSmith", category: "Observability", description: "LLM tracing, debugging & monitoring" },
    { name: "Resemblyzer", category: "Biometrics", description: "Speaker embedding + cosine similarity matching", note: "dev" },
    { name: "OCI / Local VM", category: "Deployment", description: "Oracle Cloud or macOS Virtual Machine" },
    { name: "Monolithic", category: "Architecture", description: "AI + Backend combined (not exposed externally)", note: "dev" },
  ],
  production: [
    { name: "OpenAI GPT-4 / Claude", category: "LLM", description: "Enterprise-grade cloud LLMs", status: "recommended" },
    { name: "Azure TTS", category: "Voice", description: "High-quality neural voices", status: "optional" },
    { name: "PostgreSQL", category: "Database", description: "Production-grade relational DB", status: "recommended" },
    { name: "Redis", category: "Cache", description: "Distributed caching & sessions", status: "optional" },
    { name: "Qdrant / Pinecone", category: "Vector DB", description: "Scalable vector search", status: "recommended" },
    { name: "Azure Speaker Recognition", category: "Biometrics", description: "Enterprise voice biometrics (or AWS Voice ID, Nuance)", status: "recommended" },
    { name: "AWS / GCP / Azure", category: "Cloud", description: "Enterprise cloud platforms", status: "recommended" },
    { name: "Kubernetes", category: "Orchestration", description: "Container orchestration & scaling", status: "recommended" },
    { name: "API Gateway", category: "Gateway", description: "Kong / AWS API Gateway for routing", status: "optional" },
    { name: "Microservices", category: "Architecture", description: "Separate AI & Backend services for scalability", status: "warning" },
  ]
};

const AIArchitecture = ({ session, onSignOut }) => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("architecture"); // architecture, folder, tech, explain
  const [selectedFlow, setSelectedFlow] = useState('balance');
  const [isVoiceMode, setIsVoiceMode] = useState(true);

  // Get active path based on selected flow and mode
  const activePath = useMemo(() => {
    if (!selectedFlow) return [];
    const flowData = FLOW_PATHS[selectedFlow];
    return isVoiceMode ? flowData.voice : flowData.chat;
  }, [selectedFlow, isVoiceMode]);

  // Check if component is in active path
  const isInPath = useCallback((componentId) => {
    return activePath.includes(componentId);
  }, [activePath]);

  // Check if component should be dimmed (voice-only in chat mode)
  const isDimmed = useCallback((componentId) => {
    const component = ARCHITECTURE_COMPONENTS[componentId];
    if (!component) return false;
    return !isVoiceMode && component.voiceOnly;
  }, [isVoiceMode]);

  // Handle quick action click
  const handleFlowSelect = useCallback((flowId) => {
    setSelectedFlow(flowId === selectedFlow ? null : flowId);
  }, [selectedFlow]);

  // Render the interactive architecture diagram
  const renderArchitectureDiagram = () => (
    <div className="architecture-diagram-container">
      {/* Quick Actions with Mode Toggle */}
      <div className="flow-quick-actions-row">
        <div className="flow-quick-actions">
          {Object.entries(FLOW_PATHS).map(([id, flow]) => (
            <button
              key={id}
              className={`flow-action-btn ${selectedFlow === id ? 'active' : ''}`}
              onClick={() => handleFlowSelect(id)}
            >
              <span className="flow-label">{flow.label}</span>
            </button>
          ))}
        </div>
        
        {/* Mode Toggle - Voice/Chat */}
        <div className="mode-toggle">
          <button 
            className={`mode-btn ${isVoiceMode ? 'active' : ''}`}
            onClick={() => setIsVoiceMode(true)}
          >
            Voice
          </button>
          <button 
            className={`mode-btn ${!isVoiceMode ? 'active' : ''}`}
            onClick={() => setIsVoiceMode(false)}
          >
            Chat
          </button>
        </div>
      </div>

      {/* Flow Description */}
      {selectedFlow && (
        <div className="flow-description">
          <span className="flow-path-label">
            {FLOW_PATHS[selectedFlow].label}:
          </span>
          <span className="flow-path-desc">{FLOW_PATHS[selectedFlow].description}</span>
        </div>
      )}

      {/* SVG Architecture Diagram */}
      <div className="architecture-svg-container">
        <svg viewBox="0 0 1150 780" className="architecture-svg">
          {/* Arrow marker definitions - Small tips, line ends at tip */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="3"
              markerHeight="3"
              refX="3"
              refY="1.5"
              orient="auto"
            >
              <polygon points="0 0, 3 1.5, 0 3" fill="#15803d" />
            </marker>
            <marker
              id="arrowhead-inactive"
              markerWidth="3"
              markerHeight="3"
              refX="3"
              refY="1.5"
              orient="auto"
            >
              <polygon points="0 0, 3 1.5, 0 3" fill="#9ca3af" />
            </marker>
            {/* Reverse arrow for bidirectional connections */}
            <marker
              id="arrowhead-start"
              markerWidth="3"
              markerHeight="3"
              refX="0"
              refY="1.5"
              orient="auto"
            >
              <polygon points="3 0, 0 1.5, 3 3" fill="#15803d" />
            </marker>
            <marker
              id="arrowhead-start-inactive"
              markerWidth="3"
              markerHeight="3"
              refX="0"
              refY="1.5"
              orient="auto"
            >
              <polygon points="3 0, 0 1.5, 3 3" fill="#9ca3af" />
            </marker>
            <linearGradient id="beamGradient" gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor="#059669" stopOpacity="1" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#059669" stopOpacity="1" />
            </linearGradient>
          </defs>
          
          {/* Background sections - properly sized and positioned */}
          {/* Input Layer - larger box */}
          <rect x="20" y="50" width="280" height="200" rx="10" className="section-bg section-input" />
          <text x="40" y="72" textAnchor="start" className="section-label">Input Layer</text>
          
          {/* Frontend - ends before AI Backend */}
          <rect x="310" y="50" width="140" height="200" rx="10" className="section-bg section-frontend" />
          <text x="330" y="72" textAnchor="start" className="section-label">Frontend</text>
          
          {/* AI Backend - aligned with Agents & Tools (starts at x=470) */}
          <rect x="470" y="50" width="640" height="200" rx="10" className="section-bg section-backend" />
          <text x="1070" y="72" textAnchor="end" className="section-label">AI Backend</text>
          
          {/* Agents & Tools - aligned with AI Backend (starts at x=470) */}
          <rect x="470" y="260" width="640" height="240" rx="10" className="section-bg section-agents" />
          <text x="1070" y="282" textAnchor="end" className="section-label">Agents & Tools</text>
          <text x="1070" y="298" textAnchor="end" className="section-sublabel">(Multi-Agent Supervisor Pattern)</text>
          
          {/* Services & Data - taller for tree structure */}
          <rect x="310" y="510" width="800" height="170" rx="10" className="section-bg section-data" />
          <text x="1070" y="532" textAnchor="end" className="section-label">Services & Data</text>

          {/* Connection lines with arrows - Tree structure layout */}
          <g className="connections">
            {/* All connection lines with dynamic active state based on selected flow */}
            
            {/* === INPUT LAYER === */}
            <line x1={140} y1={130} x2={160} y2={110} className={`connection ${isInPath('stt') && !isDimmed('stt') ? 'active' : ''} ${isDimmed('stt') ? 'dimmed' : ''}`} markerEnd={isInPath('stt') && !isDimmed('stt') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={160} y1={190} x2={140} y2={170} className={`connection ${isInPath('tts') && isVoiceMode && !isDimmed('tts') ? 'active' : ''} ${isDimmed('tts') ? 'dimmed' : ''}`} markerEnd={isInPath('tts') && isVoiceMode && !isDimmed('tts') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={265} y1={105} x2={325} y2={140} className={`connection ${isInPath('stt') && isInPath('frontend') && !isDimmed('stt') ? 'active' : ''} ${isDimmed('stt') ? 'dimmed' : ''}`} markerEnd={isInPath('stt') && isInPath('frontend') && !isDimmed('stt') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={150} y1={150} x2={316} y2={150} className={`connection ${isInPath('frontend') && !isInPath('stt') ? 'active' : ''}`} markerEnd={isInPath('frontend') && !isInPath('stt') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            
            {/* === FRONTEND TO BACKEND === */}
            <line x1={444} y1={150} x2={476} y2={150} className={`connection short ${isInPath('api-gateway') ? 'active' : ''}`} markerEnd={isInPath('api-gateway') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={604} y1={150} x2={626} y2={150} className={`connection ${isInPath('guardrails') ? 'active' : ''}`} markerEnd={isInPath('guardrails') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={754} y1={150} x2={776} y2={150} className={`connection ${isInPath('intent-classifier') ? 'active' : ''}`} markerEnd={isInPath('intent-classifier') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            
            {/* === INTENT TO ORCHESTRATOR === */}
            <line x1={860} y1={170} x2={770} y2={275} className={`connection ${isInPath('orchestrator') ? 'active' : ''}`} markerEnd={isInPath('orchestrator') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            
            {/* === ORCHESTRATOR TO AGENTS === */}
            <line x1={710} y1={315} x2={610} y2={355} className={`connection bidirectional ${isInPath('banking-agent') ? 'active' : ''}`} markerStart={isInPath('banking-agent') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('banking-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={750} y1={315} x2={730} y2={355} className={`connection bidirectional ${isInPath('upi-agent') ? 'active' : ''}`} markerStart={isInPath('upi-agent') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('upi-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={795} y1={315} x2={880} y2={355} className={`connection bidirectional ${isInPath('rag-supervisor') ? 'active' : ''}`} markerStart={isInPath('rag-supervisor') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('rag-supervisor') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            
            {/* === AGENTS TO TOOLS/SUB-AGENTS === */}
            <line x1={530} y1={395} x2={540} y2={440} className={`connection bidirectional ${isInPath('banking-tools') ? 'active' : ''}`} markerStart={isInPath('banking-tools') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('banking-tools') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={710} y1={395} x2={710} y2={440} className={`connection bidirectional ${isInPath('upi-tools') ? 'active' : ''}`} markerStart={isInPath('upi-tools') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('upi-tools') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={900} y1={395} x2={830} y2={440} className={`connection ${isInPath('loan-agent') ? 'active' : ''}`} markerEnd={isInPath('loan-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={945} y1={395} x2={955} y2={440} className={`connection ${isInPath('investment-agent') ? 'active' : ''}`} markerEnd={isInPath('investment-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={970} y1={395} x2={1050} y2={440} className={`connection ${isInPath('support-agent') ? 'active' : ''}`} markerEnd={isInPath('support-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            
            {/* === AGENTS TO LLM SERVICE === */}
            <line x1={595} y1={395} x2={600} y2={555} className={`connection ${isInPath('llm-service') && isInPath('banking-agent') ? 'active' : ''}`} markerEnd={isInPath('llm-service') && isInPath('banking-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={760} y1={395} x2={640} y2={555} className={`connection ${isInPath('llm-service') && isInPath('upi-agent') ? 'active' : ''}`} markerEnd={isInPath('llm-service') && isInPath('upi-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            
            {/* === TOOLS TO DATABASE === */}
            <line x1={540} y1={480} x2={580} y2={630} className={`connection bidirectional ${isInPath('database') && isInPath('banking-tools') ? 'active' : ''}`} markerStart={isInPath('database') && isInPath('banking-tools') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('database') && isInPath('banking-tools') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={710} y1={480} x2={640} y2={630} className={`connection bidirectional ${isInPath('database') && isInPath('upi-tools') ? 'active' : ''}`} markerStart={isInPath('database') && isInPath('upi-tools') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('database') && isInPath('upi-tools') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            
            {/* === RAG SUB-AGENTS TO RAG SERVICE === */}
            <line x1={830} y1={480} x2={880} y2={555} className={`connection bidirectional ${isInPath('rag-service') && isInPath('loan-agent') ? 'active' : ''}`} markerStart={isInPath('rag-service') && isInPath('loan-agent') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('rag-service') && isInPath('loan-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={955} y1={480} x2={910} y2={555} className={`connection bidirectional ${isInPath('rag-service') && isInPath('investment-agent') ? 'active' : ''}`} markerStart={isInPath('rag-service') && isInPath('investment-agent') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('rag-service') && isInPath('investment-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={1050} y1={480} x2={920} y2={555} className={`connection bidirectional ${isInPath('rag-service') && isInPath('support-agent') ? 'active' : ''}`} markerStart={isInPath('rag-service') && isInPath('support-agent') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('rag-service') && isInPath('support-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            
            {/* === RAG SERVICE TO LLM AND CHROMADB === */}
            <line x1={840} y1={575} x2={664} y2={575} className={`connection ${isInPath('llm-service') && isInPath('rag-service') ? 'active' : ''}`} markerEnd={isInPath('llm-service') && isInPath('rag-service') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            <line x1={900} y1={595} x2={900} y2={630} className={`connection bidirectional ${isInPath('chromadb') ? 'active' : ''}`} markerStart={isInPath('chromadb') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('chromadb') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} vectorEffect="non-scaling-stroke" />
            
            {/* === STATIC LINES: LLM TO RESPONSE (Always visible) === */}
            <line x1={544} y1={575} x2={464} y2={575} className="connection" markerEnd="url(#arrowhead-inactive)" vectorEffect="non-scaling-stroke" />
            <line x1={344} y1={575} x2={144} y2={575} className="connection" markerEnd="url(#arrowhead-inactive)" vectorEffect="non-scaling-stroke" />
            
            {/* === BEAM OVERLAYS FOR ALL ACTIVE CONNECTIONS === */}
            {/* Render beams on top of all active connection lines */}
            {selectedFlow !== null && (
              <>
                {/* INPUT LAYER BEAMS */}
                {isInPath('stt') && !isDimmed('stt') && <line x1={140} y1={130} x2={160} y2={110} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('tts') && isVoiceMode && !isDimmed('tts') && <line x1={160} y1={190} x2={140} y2={170} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('stt') && isInPath('frontend') && !isDimmed('stt') && <line x1={265} y1={105} x2={325} y2={140} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('frontend') && !isInPath('stt') && <line x1={150} y1={150} x2={316} y2={150} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                
                {/* FRONTEND TO BACKEND BEAMS */}
                {isInPath('api-gateway') && <line x1={444} y1={150} x2={476} y2={150} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('guardrails') && <line x1={604} y1={150} x2={626} y2={150} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('intent-classifier') && <line x1={754} y1={150} x2={776} y2={150} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                
                {/* INTENT TO ORCHESTRATOR BEAM */}
                {isInPath('orchestrator') && <line x1={860} y1={170} x2={770} y2={275} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                
                {/* ORCHESTRATOR TO AGENTS BEAMS */}
                {isInPath('banking-agent') && <line x1={710} y1={315} x2={610} y2={355} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('upi-agent') && <line x1={750} y1={315} x2={730} y2={355} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('rag-supervisor') && <line x1={795} y1={315} x2={880} y2={355} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                
                {/* AGENTS TO TOOLS/SUB-AGENTS BEAMS */}
                {isInPath('banking-tools') && <line x1={530} y1={395} x2={540} y2={440} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('upi-tools') && <line x1={710} y1={395} x2={710} y2={440} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('loan-agent') && <line x1={900} y1={395} x2={830} y2={440} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('investment-agent') && <line x1={945} y1={395} x2={955} y2={440} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('support-agent') && <line x1={970} y1={395} x2={1050} y2={440} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                
                {/* AGENTS TO LLM SERVICE BEAMS */}
                {isInPath('llm-service') && isInPath('banking-agent') && <line x1={595} y1={395} x2={600} y2={555} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('llm-service') && isInPath('upi-agent') && <line x1={760} y1={395} x2={640} y2={555} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                
                {/* TOOLS TO DATABASE BEAMS */}
                {isInPath('database') && isInPath('banking-tools') && <line x1={540} y1={480} x2={580} y2={630} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('database') && isInPath('upi-tools') && <line x1={710} y1={480} x2={640} y2={630} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                
                {/* RAG SUB-AGENTS TO RAG SERVICE BEAMS */}
                {isInPath('rag-service') && isInPath('loan-agent') && <line x1={830} y1={480} x2={880} y2={555} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('rag-service') && isInPath('investment-agent') && <line x1={955} y1={480} x2={910} y2={555} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('rag-service') && isInPath('support-agent') && <line x1={1050} y1={480} x2={920} y2={555} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                
                {/* RAG SERVICE TO LLM AND CHROMADB BEAMS */}
                {isInPath('llm-service') && isInPath('rag-service') && <line x1={840} y1={575} x2={664} y2={575} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                {isInPath('chromadb') && <line x1={900} y1={595} x2={900} y2={630} className="connection-beam" vectorEffect="non-scaling-stroke" />}
                
                {/* LLM TO RESPONSE BEAMS */}
                <line x1={544} y1={575} x2={464} y2={575} className="connection-beam" vectorEffect="non-scaling-stroke" />
                <line x1={344} y1={575} x2={144} y2={575} className="connection-beam" vectorEffect="non-scaling-stroke" />
              </>
            )}
            
            {/* Response to TTS (voice mode) */}
            {isInPath('tts') && isVoiceMode && (
              <line x1={80} y1={550} x2={180} y2={230} className="connection-beam" vectorEffect="non-scaling-stroke" />
            )}
          </g>

          {/* Components */}
          {Object.entries(ARCHITECTURE_COMPONENTS).map(([id, comp]) => {
            const inPath = isInPath(id);
            const dimmed = isDimmed(id);
            const iconPath = ICONS[comp.iconKey];
            return (
              <g 
                key={id}
                className={`component ${comp.category} ${inPath ? 'in-path' : ''} ${dimmed ? 'dimmed' : ''}`}
                transform={`translate(${comp.x}, ${comp.y})`}
              >
                {/* Modern rounded rectangle with shadow effect */}
                <rect 
                  x="-60" y="-20" 
                  width="120" height="40" 
                  rx="8"
                  className="component-shadow"
                />
                <rect 
                  x="-60" y="-20" 
                  width="120" height="40" 
                  rx="8"
                  className="component-bg"
                />
                {/* Icon container - vertically centered on left */}
                <rect x="-54" y="-10" width="20" height="20" rx="4" className="icon-container" />
                {/* SVG Icon - vertically centered */}
                <g transform="translate(-52, -8)">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d={iconPath} className="component-icon-path" />
                  </svg>
                </g>
                {/* Label - with padding from icon, slightly right of center */}
                <text className="component-label" x="6" textAnchor="middle" dy="5">
                  {comp.label}
                </text>
              </g>
            );
          })}

          {/* Legend - centered content */}
          <g transform="translate(575, 730)">
            {/* Legend background - centered around group origin */}
            <rect x="-450" y="-18" width="900" height="36" rx="6" className="legend-bg" />

            <text className="legend-title" x="-420" y="4" dominantBaseline="middle">Legend:</text>

            {/* Legend items positioned evenly and centered */}
            <g transform="translate(-360, -6)">
              <rect width="16" height="16" rx="3" className="legend-icon-bg orchestrator" />
              <svg x="2" y="2" width="12" height="12" viewBox="0 0 24 24"><path d={ICONS.target} fill="#ea580c" /></svg>
            </g>
            <text x="-339" y="4" className="legend-text" dominantBaseline="middle">Orchestrator</text>

            <g transform="translate(-240, -6)">
              <rect width="16" height="16" rx="3" className="legend-icon-bg agent" />
              <svg x="2" y="2" width="12" height="12" viewBox="0 0 24 24"><path d={ICONS.bot} fill="#ea580c" /></svg>
            </g>
            <text x="-219" y="4" className="legend-text" dominantBaseline="middle">Agent</text>

            <g transform="translate(-120, -6)">
              <rect width="16" height="16" rx="3" className="legend-icon-bg service" />
              <svg x="2" y="2" width="12" height="12" viewBox="0 0 24 24"><path d={ICONS.search} fill="#0891b2" /></svg>
            </g>
            <text x="-99" y="4" className="legend-text" dominantBaseline="middle">Service</text>

            <g transform="translate(0, -6)">
              <rect width="16" height="16" rx="3" className="legend-icon-bg database" />
              <svg x="2" y="2" width="12" height="12" viewBox="0 0 24 24"><path d={ICONS.db} fill="#7c3aed" /></svg>
            </g>
            <text x="21" y="4" className="legend-text" dominantBaseline="middle">Database</text>

            <g transform="translate(120, -6)">
              <rect width="16" height="16" rx="3" className="legend-icon-bg tools" />
              <svg x="2" y="2" width="12" height="12" viewBox="0 0 24 24"><path d={ICONS.wrench} fill="#db2777" /></svg>
            </g>
            <text x="141" y="4" className="legend-text" dominantBaseline="middle">Tools</text>

            {/* Bidirectional */}
            <line x1="220" y1="2" x2="260" y2="2" stroke="#9ca3af" strokeWidth="2" markerStart="url(#arrowhead-start-inactive)" markerEnd="url(#arrowhead-inactive)" />
            <text x="271" y="4" className="legend-text" dominantBaseline="middle">Bidirectional</text>

            {/* Active Path */}
            <line x1="320" y1="2" x2="360" y2="2" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text x="371" y="4" className="legend-text" dominantBaseline="middle">Active Flow</text>
          </g>
        </svg>
      </div>
    </div>
  );

  // Render folder structure view
  const renderFolderStructure = () => (
    <div className="folder-structure-container">
      <h3>📁 AI Module Structure</h3>
      <pre className="folder-tree">{FOLDER_STRUCTURE}</pre>
    </div>
  );

  // Render technology stack view
  const renderTechStack = () => (
    <div className="tech-stack-container">
      <div className="tech-section">
        <h3>Current Stack (Development)</h3>
        <p className="tech-section-note">AI & Backend run together as a monolith for security - AI services not exposed externally</p>
        <div className="tech-grid">
          {TECH_STACK.current.map((tech) => (
            <div key={tech.name} className={`tech-card ${tech.note || ''}`}>
              <div className="tech-card-header">
                <strong>{tech.name}</strong>
                <span className="tech-category">{tech.category}</span>
              </div>
              <p className="tech-card-description">{tech.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="tech-section">
        <h3>Production Options</h3>
        <p className="tech-section-note">Current monolithic design can be separated into microservices for horizontal scaling</p>
        <div className="tech-grid">
          {TECH_STACK.production.map((tech) => (
            <div key={tech.name} className={`tech-card ${tech.status}`}>
              <div className="tech-card-header">
                <strong>{tech.name}</strong>
                <span className="tech-category">{tech.category}</span>
              </div>
              <p className="tech-card-description">{tech.description}</p>
              {tech.status && <span className={`tech-status ${tech.status}`}>{tech.status}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render module explanations view
  const renderExplanations = () => (
    <div className="explanations-container">
      <h3>Module Explanations</h3>
      <div className="explanation-grid">
        {Object.entries(MODULE_EXPLANATIONS).map(([key, module]) => (
          <div key={key} className={`explanation-card ${key}`}>
            <h4>{module.title}</h4>
            <p>{module.description}</p>
            <div className="tech-badge">{module.tech}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="ai-architecture-page">
      <div className="architecture-content">
        {/* Title Section with navigation */}
        <div className="architecture-header">
          <AIAssistantLogo size={80} showAssistant={true} animated={true} />
          <div className="header-text">
            <h1>AI Architecture Explorer</h1>
            <p>Interactive visualization of Vaani's AI-powered banking assistant</p>
          </div>
          {session && (
            <div className="architecture-header-actions">
              <button className="ghost-btn" onClick={() => navigate('/profile')}>
                ← Back to Profile
              </button>
              <button className="ghost-btn" onClick={onSignOut}>
                Log out
              </button>
            </div>
          )}
        </div>

        {/* View Toggle Buttons with Mode Toggle */}
        <div className="view-toggles-row">
          <div className="view-toggles">
            <button 
              className={`view-btn ${activeView === 'architecture' ? 'active' : ''}`}
              onClick={() => setActiveView('architecture')}
            >
              Architecture
            </button>
            <button 
              className={`view-btn ${activeView === 'folder' ? 'active' : ''}`}
              onClick={() => setActiveView('folder')}
            >
              Folder Structure
            </button>
            <button 
              className={`view-btn ${activeView === 'tech' ? 'active' : ''}`}
              onClick={() => setActiveView('tech')}
            >
              Tech Stack
            </button>
            <button 
              className={`view-btn ${activeView === 'explain' ? 'active' : ''}`}
              onClick={() => setActiveView('explain')}
            >
              Explanations
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="architecture-main">
          {activeView === 'architecture' && renderArchitectureDiagram()}
          {activeView === 'folder' && renderFolderStructure()}
          {activeView === 'tech' && renderTechStack()}
          {activeView === 'explain' && renderExplanations()}
        </div>
      </div>
    </div>
  );
};

AIArchitecture.propTypes = {
  session: PropTypes.object,
  onSignOut: PropTypes.func,
};

export default AIArchitecture;
