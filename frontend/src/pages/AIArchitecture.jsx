import { useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
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

// Architecture components with their details and icons
// Layout: Top-down tree structure for clarity
const ARCHITECTURE_COMPONENTS = {
  // Input Layer - User on left, STT/TTS spread out with diagonal arrows
  "user-input": { label: "User", category: "input", icon: "👤", x: 80, y: 150 },
  "stt": { label: "STT (Speech)", category: "voice", icon: "🎤", x: 210, y: 90, voiceOnly: true },
  "tts": { label: "TTS (Voice)", category: "voice", icon: "🔊", x: 210, y: 210, voiceOnly: true },
  
  // Frontend - React Frontend box (centered in Frontend section 310-450)
  "frontend": { label: "React Frontend", category: "frontend", icon: "⚛️", x: 370, y: 150 },
  
  // API Gateway - positioned at boundary to overlap both sections (with gap from React)
  "api-gateway": { label: "FastAPI Gateway", category: "backend", icon: "⚡", x: 510, y: 150 },
  
  // AI Backend components (within 470-1110)
  "guardrails": { label: "Guardrails", category: "security", icon: "🛡️", x: 660, y: 150 },
  "intent-classifier": { label: "Intent Classifier", category: "ai", icon: "🧠", x: 840, y: 150 },
  
  // === AGENTS & TOOLS SECTION - Tree Structure ===
  // Level 1: Orchestrator (center top of agents section)
  "orchestrator": { label: "Orchestrator", category: "orchestrator", icon: "🎯", x: 700, y: 290 },
  
  // Level 2: Main Agents (three branches from orchestrator)
  "banking-agent": { label: "Banking Agent", category: "agent", icon: "🤖", x: 540, y: 380 },
  "upi-agent": { label: "UPI Agent", category: "agent", icon: "🤖", x: 700, y: 380 },
  "rag-supervisor": { label: "RAG Supervisor", category: "agent", icon: "🤖", x: 880, y: 380 },
  
  // Level 3: Tools (under Banking/UPI) and Sub-agents (under RAG Supervisor)
  "banking-tools": { label: "Banking Tools", category: "tools", icon: "🔧", x: 540, y: 460 },
  "upi-tools": { label: "UPI Tools", category: "tools", icon: "🔧", x: 700, y: 460 },
  "loan-agent": { label: "Loan Agent", category: "sub-agent", icon: "📋", x: 800, y: 460 },
  "investment-agent": { label: "Investment Agent", category: "sub-agent", icon: "📈", x: 920, y: 460 },
  "support-agent": { label: "Support Agent", category: "sub-agent", icon: "💬", x: 1040, y: 460 },
  
  // === SERVICES & DATA SECTION - Tree Structure ===
  // LLM Service at center-left (connects to all agents)
  "llm-service": { label: "LLM Service", category: "service", icon: "🦙", x: 620, y: 570 },
  
  // Database below Tools
  "database": { label: "SQLite DB", category: "database", icon: "💾", x: 620, y: 650 },
  
  // RAG Service below RAG agents
  "rag-service": { label: "RAG Service", category: "service", icon: "🔍", x: 880, y: 570 },
  
  // ChromaDB below RAG Service
  "chromadb": { label: "ChromaDB", category: "database", icon: "🗃️", x: 880, y: 650 },
  
  // Interactive Cards - receives from LLM Service
  "interactive-cards": { label: "Interactive Cards", category: "frontend", icon: "🎴", x: 380, y: 570 },
  
  // Response - back to user
  "response": { label: "Response", category: "output", icon: "✅", x: 80, y: 570 },
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

// Technology stack
const TECH_STACK = {
  current: [
    { name: "Ollama + Llama 3.2", category: "LLM (Local)", description: "Local LLM inference (qwen2.5:7b, llama3.2:3b)", icon: "🦙" },
    { name: "OpenAI GPT-4", category: "LLM (Cloud)", description: "Cloud LLM via OCI deployment", icon: "🤖" },
    { name: "ChromaDB", category: "Vector DB", description: "Local vector database for RAG", icon: "🗃️" },
    { name: "SQLite", category: "Database", description: "File-based relational database", icon: "💾" },
    { name: "FastAPI", category: "Backend", description: "Async Python web framework", icon: "⚡" },
    { name: "React + Vite", category: "Frontend", description: "UI library with Vite bundler", icon: "⚛️" },
    { name: "Web Speech API", category: "Voice", description: "Browser-based TTS & STT", icon: "🎤" },
    { name: "HuggingFace", category: "Embeddings", description: "all-MiniLM-L6-v2 model", icon: "🤗" },
    { name: "Resemblyzer", category: "Biometrics", description: "Speaker embedding + cosine similarity matching", icon: "🔐", note: "dev" },
    { name: "OCI / Local VM", category: "Deployment", description: "Oracle Cloud or macOS Virtual Machine", icon: "☁️" },
    { name: "Monolithic", category: "Architecture", description: "AI + Backend combined (not exposed externally)", icon: "🏢", note: "dev" },
  ],
  production: [
    { name: "OpenAI GPT-4 / Claude", category: "LLM", description: "Enterprise-grade cloud LLMs", icon: "🤖", status: "recommended" },
    { name: "Azure TTS", category: "Voice", description: "High-quality neural voices", icon: "🔊", status: "optional" },
    { name: "PostgreSQL", category: "Database", description: "Production-grade relational DB", icon: "🐘", status: "recommended" },
    { name: "Redis", category: "Cache", description: "Distributed caching & sessions", icon: "📦", status: "optional" },
    { name: "Qdrant / Pinecone", category: "Vector DB", description: "Scalable vector search", icon: "🔍", status: "recommended" },
    { name: "Azure Speaker Recognition", category: "Biometrics", description: "Enterprise voice biometrics (or AWS Voice ID, Nuance)", icon: "🔐", status: "recommended" },
    { name: "AWS / GCP / Azure", category: "Cloud", description: "Enterprise cloud platforms", icon: "☁️", status: "recommended" },
    { name: "Kubernetes", category: "Orchestration", description: "Container orchestration & scaling", icon: "☸️", status: "recommended" },
    { name: "API Gateway", category: "Gateway", description: "Kong / AWS API Gateway for routing", icon: "🚦", status: "optional" },
    { name: "Microservices", category: "Architecture", description: "Separate AI & Backend services for scalability", icon: "🧩", status: "warning" },
  ]
};

const AIArchitecture = ({ session, onSignOut }) => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("architecture"); // architecture, folder, tech, explain
  const [selectedFlow, setSelectedFlow] = useState(null);
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
              <span className="flow-icon">{flow.icon}</span>
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
            🎤 Voice
          </button>
          <button 
            className={`mode-btn ${!isVoiceMode ? 'active' : ''}`}
            onClick={() => setIsVoiceMode(false)}
          >
            ⌨️ Chat
          </button>
        </div>
      </div>

      {/* Flow Description */}
      {selectedFlow && (
        <div className="flow-description">
          <span className="flow-path-label">
            {FLOW_PATHS[selectedFlow].icon} {FLOW_PATHS[selectedFlow].label}:
          </span>
          <span className="flow-path-desc">{FLOW_PATHS[selectedFlow].description}</span>
        </div>
      )}

      {/* SVG Architecture Diagram */}
      <div className="architecture-svg-container">
        <svg viewBox="0 0 1150 780" className="architecture-svg">
          {/* Arrow marker definitions - smaller arrows */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="5"
              refX="5"
              refY="2.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0 0, 6 2.5, 0 5" fill="#22c55e" />
            </marker>
            <marker
              id="arrowhead-inactive"
              markerWidth="6"
              markerHeight="5"
              refX="5"
              refY="2.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0 0, 6 2.5, 0 5" fill="#cbd5e1" />
            </marker>
            {/* Reverse arrow for bidirectional connections - points outward from line start */}
            <marker
              id="arrowhead-start"
              markerWidth="6"
              markerHeight="5"
              refX="0"
              refY="2.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="6 0, 0 2.5, 6 5" fill="#22c55e" />
            </marker>
            <marker
              id="arrowhead-start-inactive"
              markerWidth="6"
              markerHeight="5"
              refX="0"
              refY="2.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="6 0, 0 2.5, 6 5" fill="#cbd5e1" />
            </marker>
          </defs>
          
          {/* Background sections - properly sized and positioned */}
          {/* Input Layer - larger box */}
          <rect x="20" y="50" width="280" height="200" rx="10" className="section-bg section-input" />
          <text x="280" y="72" textAnchor="end" className="section-label">Input Layer</text>
          
          {/* Frontend - ends before AI Backend */}
          <rect x="310" y="50" width="140" height="200" rx="10" className="section-bg section-frontend" />
          <text x="430" y="72" textAnchor="end" className="section-label">Frontend</text>
          
          {/* AI Backend - aligned with Agents & Tools (starts at x=470) */}
          <rect x="470" y="50" width="640" height="200" rx="10" className="section-bg section-backend" />
          <text x="1090" y="72" textAnchor="end" className="section-label">AI Backend</text>
          
          {/* Agents & Tools - aligned with AI Backend (starts at x=470) */}
          <rect x="470" y="260" width="640" height="240" rx="10" className="section-bg section-agents" />
          <text x="1090" y="282" textAnchor="end" className="section-label">Agents & Tools</text>
          <text x="1090" y="298" textAnchor="end" className="section-sublabel">(Multi-Agent Supervisor Pattern)</text>
          
          {/* Services & Data - taller for tree structure */}
          <rect x="310" y="510" width="800" height="170" rx="10" className="section-bg section-data" />
          <text x="1090" y="532" textAnchor="end" className="section-label">Services & Data</text>

          {/* Connection lines with arrows - Tree structure layout */}
          <g className="connections">
            {/* === INPUT LAYER === */}
            {/* User to STT - diagonal cross arrow */}
            <line x1="130" y1="130" x2="160" y2="100" className={`connection ${isInPath('stt') ? 'active' : ''} ${isDimmed('stt') ? 'dimmed' : ''}`} markerEnd={isInPath('stt') && !isDimmed('stt') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* TTS back to User - diagonal arrow */}
            <line x1="160" y1="200" x2="130" y2="170" className={`connection ${isInPath('tts') ? 'active' : ''} ${isDimmed('tts') ? 'dimmed' : ''}`} markerEnd={isInPath('tts') && isVoiceMode ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* STT to Frontend */}
            <line x1="265" y1="95" x2="315" y2="140" className={`connection ${isInPath('stt') && isInPath('frontend') ? 'active' : ''} ${isDimmed('stt') ? 'dimmed' : ''}`} markerEnd={isInPath('stt') && isInPath('frontend') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* User direct to Frontend (chat mode) */}
            <line x1="135" y1="150" x2="315" y2="150" className={`connection ${isInPath('frontend') && !isInPath('stt') ? 'active' : ''}`} markerEnd={isInPath('frontend') && !isInPath('stt') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* === FRONTEND TO BACKEND === */}
            {/* Frontend to API Gateway */}
            <line x1="425" y1="150" x2="455" y2="150" className={`connection ${isInPath('api-gateway') ? 'active' : ''}`} markerEnd={isInPath('api-gateway') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* API Gateway to Guardrails */}
            <line x1="565" y1="150" x2="605" y2="150" className={`connection ${isInPath('guardrails') ? 'active' : ''}`} markerEnd={isInPath('guardrails') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* Guardrails to Intent Classifier */}
            <line x1="715" y1="150" x2="785" y2="150" className={`connection ${isInPath('intent-classifier') ? 'active' : ''}`} markerEnd={isInPath('intent-classifier') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* === INTENT TO ORCHESTRATOR === */}
            {/* Intent Classifier down to Orchestrator */}
            <line x1="840" y1="170" x2="740" y2="270" className={`connection ${isInPath('orchestrator') ? 'active' : ''}`} markerEnd={isInPath('orchestrator') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* === ORCHESTRATOR TO AGENTS (Tree Branch) === */}
            {/* Orchestrator to Banking Agent - left branch */}
            <line x1="650" y1="310" x2="590" y2="360" className={`connection bidirectional ${isInPath('banking-agent') ? 'active' : ''}`} markerStart={isInPath('banking-agent') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('banking-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* Orchestrator to UPI Agent - center branch */}
            <line x1="700" y1="310" x2="700" y2="360" className={`connection bidirectional ${isInPath('upi-agent') ? 'active' : ''}`} markerStart={isInPath('upi-agent') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('upi-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* Orchestrator to RAG Supervisor - right branch */}
            <line x1="750" y1="310" x2="830" y2="360" className={`connection bidirectional ${isInPath('rag-supervisor') ? 'active' : ''}`} markerStart={isInPath('rag-supervisor') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('rag-supervisor') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* === AGENTS TO TOOLS/SUB-AGENTS (Level 3) === */}
            {/* Banking Agent to Banking Tools */}
            <line x1="540" y1="400" x2="540" y2="440" className={`connection bidirectional ${isInPath('banking-tools') ? 'active' : ''}`} markerStart={isInPath('banking-tools') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('banking-tools') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* UPI Agent to UPI Tools */}
            <line x1="700" y1="400" x2="700" y2="440" className={`connection bidirectional ${isInPath('upi-tools') ? 'active' : ''}`} markerStart={isInPath('upi-tools') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('upi-tools') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* RAG Supervisor to Loan Agent */}
            <line x1="855" y1="400" x2="820" y2="440" className={`connection ${isInPath('loan-agent') ? 'active' : ''}`} markerEnd={isInPath('loan-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* RAG Supervisor to Investment Agent */}
            <line x1="905" y1="400" x2="920" y2="440" className={`connection ${isInPath('investment-agent') ? 'active' : ''}`} markerEnd={isInPath('investment-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* RAG Supervisor to Support Agent */}
            <line x1="935" y1="395" x2="1000" y2="440" className={`connection ${isInPath('support-agent') ? 'active' : ''}`} markerEnd={isInPath('support-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* === AGENTS TO LLM SERVICE (Agents connect to LLM, not tools) === */}
            {/* Banking Agent to LLM Service */}
            <line x1="540" y1="400" x2="600" y2="550" className={`connection ${isInPath('llm-service') && isInPath('banking-agent') ? 'active' : ''}`} markerEnd={isInPath('llm-service') && isInPath('banking-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* UPI Agent to LLM Service */}
            <line x1="680" y1="400" x2="640" y2="550" className={`connection ${isInPath('llm-service') && isInPath('upi-agent') ? 'active' : ''}`} markerEnd={isInPath('llm-service') && isInPath('upi-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* === TOOLS TO DATABASE (Tools connect to DB) === */}
            {/* Banking Tools to Database */}
            <line x1="510" y1="480" x2="590" y2="630" className={`connection bidirectional ${isInPath('database') && isInPath('banking-tools') ? 'active' : ''}`} markerStart={isInPath('database') && isInPath('banking-tools') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('database') && isInPath('banking-tools') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* UPI Tools to Database */}
            <line x1="720" y1="480" x2="650" y2="630" className={`connection bidirectional ${isInPath('database') && isInPath('upi-tools') ? 'active' : ''}`} markerStart={isInPath('database') && isInPath('upi-tools') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('database') && isInPath('upi-tools') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* === RAG SUB-AGENTS TO RAG SERVICE === */}
            {/* Loan Agent to RAG Service */}
            <line x1="820" y1="480" x2="860" y2="550" className={`connection bidirectional ${isInPath('rag-service') && isInPath('loan-agent') ? 'active' : ''}`} markerStart={isInPath('rag-service') && isInPath('loan-agent') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('rag-service') && isInPath('loan-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* Investment Agent to RAG Service */}
            <line x1="910" y1="480" x2="890" y2="550" className={`connection bidirectional ${isInPath('rag-service') && isInPath('investment-agent') ? 'active' : ''}`} markerStart={isInPath('rag-service') && isInPath('investment-agent') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('rag-service') && isInPath('investment-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* Support Agent to RAG Service */}
            <line x1="1010" y1="480" x2="920" y2="550" className={`connection bidirectional ${isInPath('rag-service') && isInPath('support-agent') ? 'active' : ''}`} markerStart={isInPath('rag-service') && isInPath('support-agent') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('rag-service') && isInPath('support-agent') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* === RAG SERVICE TO LLM AND CHROMADB === */}
            {/* RAG Service to LLM Service */}
            <line x1="825" y1="570" x2="675" y2="570" className={`connection ${isInPath('llm-service') && isInPath('rag-service') ? 'active' : ''}`} markerEnd={isInPath('llm-service') && isInPath('rag-service') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* RAG Service to ChromaDB - vertical tree */}
            <line x1="880" y1="590" x2="880" y2="630" className={`connection bidirectional ${isInPath('chromadb') ? 'active' : ''}`} markerStart={isInPath('chromadb') ? "url(#arrowhead-start)" : "url(#arrowhead-start-inactive)"} markerEnd={isInPath('chromadb') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* === LLM SERVICE TO RESPONSE === */}
            {/* LLM Service to Interactive Cards */}
            <line x1="565" y1="570" x2="435" y2="570" className={`connection ${isInPath('interactive-cards') ? 'active' : ''}`} markerEnd={isInPath('interactive-cards') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* Interactive Cards to Response */}
            <line x1="325" y1="570" x2="135" y2="570" className={`connection ${isInPath('response') ? 'active' : ''}`} markerEnd={isInPath('response') ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
            
            {/* Response to TTS (voice mode) */}
            <line x1="80" y1="550" x2="180" y2="230" className={`connection ${isInPath('tts') ? 'active' : ''} ${!isVoiceMode ? 'dimmed' : ''}`} markerEnd={isInPath('tts') && isVoiceMode ? "url(#arrowhead)" : "url(#arrowhead-inactive)"} />
          </g>

          {/* Components */}
          {Object.entries(ARCHITECTURE_COMPONENTS).map(([id, comp]) => {
            const inPath = isInPath(id);
            const dimmed = isDimmed(id);
            return (
              <g 
                key={id}
                className={`component ${comp.category} ${inPath ? 'in-path' : ''} ${dimmed ? 'dimmed' : ''}`}
                transform={`translate(${comp.x}, ${comp.y})`}
              >
                <rect 
                  x="-55" y="-16" 
                  width="110" height="32" 
                  rx="6"
                  className="component-bg"
                />
                {/* Icon badge in top-left corner */}
                <circle cx="-45" cy="-8" r="10" className="icon-badge" />
                <text className="component-icon" x="-45" y="-4" textAnchor="middle" fontSize="10">
                  {comp.icon}
                </text>
                <text className="component-label" textAnchor="middle" dy="4">
                  {comp.label}
                </text>
                {inPath && <circle cx="45" cy="-8" r="5" className="path-indicator" />}
              </g>
            );
          })}

          {/* Legend - with background box */}
          <g transform="translate(50, 730)">
            {/* Legend background */}
            <rect x="-10" y="-18" width="780" height="36" rx="8" className="legend-bg" />
            
            <text className="legend-title" x="5" y="0">Legend:</text>
            
            {/* Orchestrator */}
            <text x="75" y="0" fontSize="11">🎯</text>
            <text x="93" y="0" className="legend-text">Orchestrator</text>
            
            {/* Agent */}
            <text x="180" y="0" fontSize="11">🤖</text>
            <text x="198" y="0" className="legend-text">Agent</text>
            
            {/* Service */}
            <text x="260" y="0" fontSize="11">🔍</text>
            <text x="278" y="0" className="legend-text">Service</text>
            
            {/* Database */}
            <text x="345" y="0" fontSize="11">💾</text>
            <text x="363" y="0" className="legend-text">Database</text>
            
            {/* Tools */}
            <text x="435" y="0" fontSize="11">🔧</text>
            <text x="453" y="0" className="legend-text">Tools</text>
            
            {/* Bidirectional */}
            <line x1="510" y1="-3" x2="545" y2="-3" stroke="#cbd5e1" strokeWidth="2" markerStart="url(#arrowhead-start-inactive)" markerEnd="url(#arrowhead-inactive)" />
            <text x="555" y="0" className="legend-text">Bidirectional</text>
            
            {/* Active Path */}
            <line x1="660" y1="-3" x2="695" y2="-3" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowhead)" />
            <text x="705" y="0" className="legend-text">Active Path</text>
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
        <h3>🚀 Current Stack (Development)</h3>
        <p className="tech-section-note">💡 AI & Backend run together as a monolith for security - AI services not exposed externally</p>
        <div className="tech-grid">
          {TECH_STACK.current.map((tech) => (
            <div key={tech.name} className={`tech-card ${tech.note || ''}`}>
              <span className="tech-icon">{tech.icon}</span>
              <div className="tech-info">
                <strong>{tech.name}</strong>
                <span className="tech-category">{tech.category}</span>
                <p>{tech.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="tech-section">
        <h3>🏭 Production Options</h3>
        <p className="tech-section-note">⚠️ Current monolithic design can be separated into microservices for horizontal scaling</p>
        <div className="tech-grid">
          {TECH_STACK.production.map((tech) => (
            <div key={tech.name} className={`tech-card ${tech.status}`}>
              <span className="tech-icon">{tech.icon}</span>
              <div className="tech-info">
                <strong>{tech.name}</strong>
                <span className="tech-category">{tech.category}</span>
                <span className={`tech-status ${tech.status}`}>{tech.status}</span>
                <p>{tech.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render module explanations view
  const renderExplanations = () => (
    <div className="explanations-container">
      <h3>📚 Module Explanations</h3>
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
              🏗️ Architecture
            </button>
            <button 
              className={`view-btn ${activeView === 'folder' ? 'active' : ''}`}
              onClick={() => setActiveView('folder')}
            >
              📁 Folder Structure
            </button>
            <button 
              className={`view-btn ${activeView === 'tech' ? 'active' : ''}`}
              onClick={() => setActiveView('tech')}
            >
              ⚙️ Tech Stack
            </button>
            <button 
              className={`view-btn ${activeView === 'explain' ? 'active' : ''}`}
              onClick={() => setActiveView('explain')}
            >
              📖 Explanations
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
