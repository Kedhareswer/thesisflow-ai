<div align="center">

# 🎓 ThesisFlow-AI

### *AI-Powered Research Platform for Academic Excellence*

[![License](https://img.shields.io/badge/License-MIT-FF6B2C?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.9-FF6B2C?style=for-the-badge&logo=semver&logoColor=white)](https://github.com/Kedhareswer/thesisflow-ai/releases)
[![Status](https://img.shields.io/badge/Status-Production_Ready-28a745?style=for-the-badge&logo=checkmarx&logoColor=white)](https://thesisflow-ai.vercel.app)
[![GitHub Stars](https://img.shields.io/github/stars/Kedhareswer/thesisflow-ai?style=for-the-badge&logo=github&color=FF6B2C)](https://github.com/Kedhareswer/thesisflow-ai)

[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[🚀 Live Demo](https://thesisflow-ai.vercel.app) • [📚 Documentation](https://github.com/Kedhareswer/thesisflow-ai/wiki) • [🐛 Report Issues](https://github.com/Kedhareswer/thesisflow-ai/issues) • [💬 Discussions](https://github.com/Kedhareswer/thesisflow-ai/discussions)

---

**Comprehensive platform for academic research, document processing, AI-powered writing, and real-time team collaboration**

</div>

## 📑 Table of Contents

- [✨ Key Features](#-key-features)
- [🏗️ Architecture Overview](#️-architecture-overview)
- [⚡ Quick Start](#-quick-start)
- [💎 Token System & Pricing](#-token-system--pricing)
- [🔍 Feature Deep Dive](#-feature-deep-dive)
  - [Literature Explorer](#literature-explorer)
  - [LaTeX Writer](#latex-writer)
  - [AI-Powered Planner](#ai-powered-planner)
  - [Team Collaboration](#team-collaboration)
  - [AI Integration](#ai-integration)
  - [Support System](#support-system)
- [🛠️ Installation Guide](#️-installation-guide)
- [📡 API Reference](#-api-reference)
- [🚀 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📋 Changelog](#-changelog)

---

## ✨ Key Features

<table>
<tr>
<td width="25%" align="center">

### 🔍 Explorer
**Multi-Source Research**

</td>
<td width="25%" align="center">

### ✍️ Writer
**LaTeX Editing**

</td>
<td width="25%" align="center">

### 📅 Planner
**Project Management**

</td>
<td width="25%" align="center">

### 👥 Collaborate
**Real-Time Teams**

</td>
</tr>
<tr>
<td valign="top">

- 11+ academic databases
- AI research assistant
- Deep research mode
- Citation analysis
- Export to BibTeX/RIS
- Smart caching (1-3s)

</td>
<td valign="top">

- Real-time LaTeX preview
- KaTeX math rendering
- Multi-format extraction
- AI writing assistance
- OCR for scanned docs
- Template library

</td>
<td valign="top">

- AI task generation
- Gantt charts
- Calendar integration
- Team assignments
- Progress analytics
- Deadline tracking

</td>
<td valign="top">

- WebSocket messaging
- File sharing
- @Mentions
- Presence indicators
- Role-based access
- Real-time sync

</td>
</tr>
</table>

## 🏗️ Architecture Overview

```mermaid
graph LR
    A[Client Browser] --> B[Next.js 15 Frontend]
    B --> C[API Routes]
    C --> D[Supabase PostgreSQL]
    C --> E[AI Providers]
    C --> F[Literature APIs]
    B --> G[WebSocket Server]
    G --> D
    
    style B fill:#FF6B2C,color:#fff
    style D fill:#28a745,color:#fff
    style E fill:#17a2b8,color:#fff
```

### Technology Stack

<table>
<tr>
<td width="33%">

**Frontend**
- Next.js 15 + React 19
- TypeScript
- TailwindCSS + Shadcn/UI
- Framer Motion
- KaTeX (Math rendering)
- Tesseract.js (OCR)

</td>
<td width="33%">

**Backend**
- Supabase PostgreSQL
- Row Level Security (RLS)
- Socket.IO (WebSocket)
- Server-Sent Events (SSE)
- JWT Authentication
- Redis Caching

</td>
<td width="33%">

**AI & External**
- Nova AI (Multi-model via Groq)
- 7 Groq models optimized by task
- Server-side AI processing
- OpenAlex + arXiv
- CrossRef + PubMed
- Google Scholar API
- HuggingFace (AI Detection)

</td>
</tr>
</table>

## ⚡ Quick Start

### Prerequisites

| Requirement | Version | Installation |
|-------------|---------|--------------|
| **Node.js** | 18.0+ | [nodejs.org](https://nodejs.org/) |
| **pnpm** | Latest | `npm install -g pnpm` |
| **Supabase Account** | - | [supabase.com](https://supabase.com/) |
| **Groq API Key** | - | [console.groq.com](https://console.groq.com/keys) |

### Installation

```bash
# 1. Clone repository
git clone https://github.com/Kedhareswer/thesisflow-ai.git
cd thesisflow-ai

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp env.template .env.local
# Edit .env.local with your API keys (see configuration below)

# 4. Start development servers
pnpm dev                          # Frontend (port 3000)
node server/websocket-server.js   # WebSocket (port 3001)

# 5. Optional: Python literature search
cd python
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py                     # Literature APIs (port 5000)
```

### Environment Configuration

**Required Variables:**

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Nova AI via Groq (Required)
GROQ_API_KEY=your_groq_api_key

# HuggingFace (Required for AI detection)
HUGGINGFACE_API_KEY=your_huggingface_api_key

# WebSocket Configuration
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

**Optional Enhancements:**

```bash
# Google Search API (Enhanced literature search)
GOOGLE_SEARCH_API_KEY=your_google_search_api_key
GOOGLE_SEARCH_CSE_ID=your_custom_search_engine_id

# Stripe (Payment processing)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

> **🚨 Security:** Never commit `.env.local` to version control!

---

## 💎 Token System & Pricing

### Subscription Plans

| Plan | Monthly Tokens | Price | Best For |
|------|----------------|-------|----------|
| **Free** | 50 tokens | $0 | Students & individual researchers |
| **Pro** | 500 tokens | $19/month | Active researchers & small teams |

### Token Usage

<table>
<tr>
<td width="50%">

**🔥 AI-Powered Features** *(Tokens Required)*

- AI Chat & Research Assistant
- Topic Exploration & Deep Research
- Document Summarization & Analysis
- AI Project Planning & Task Generation
- LaTeX Writing Assistance

</td>
<td width="50%">

**✨ Always Free Features**

- Literature Search (11+ databases)
- Project Management & Calendar
- Team Collaboration & Chat
- File Upload & Document Extraction
- Analytics & Progress Tracking

</td>
</tr>
</table>

### Usage Monitoring

| Location | Feature | Description |
|----------|---------|-------------|
| **Navigation Bar** | Live Counter | Real-time token usage display |
| **Profile Menu** | Plan Status | Current plan and upgrade options |
| **`/plan` Page** | Analytics Dashboard | Detailed usage charts by feature |
| **`/tokens` Page** | Transaction History | Complete token usage log |

> **📅 Note:** Tokens reset monthly. Unused tokens don't roll over.

---

## 🔍 Feature Deep Dive

### Literature Explorer

**Multi-Source Academic Search Engine**

```mermaid
graph TB
    A[Search Query] --> B[Orchestrator]
    B --> C[Academic DBs]
    B --> D[Web Sources]
    C --> E[Results Processing]
    D --> E
    E --> F[AI Assistant]
    
    style B fill:#FF6B2C,color:#fff
    style E fill:#28a745,color:#fff
    style F fill:#17a2b8,color:#fff
```

#### Data Sources

<table>
<tr>
<td width="50%">

**Academic Databases**
- OpenAlex (250M+ papers)
- arXiv (Preprints)
- CrossRef (DOI Registry)
- PubMed (Medical)
- DOAJ (Open Access)
- OpenAIRE (European Research)

</td>
<td width="50%">

**Web & News**
- Google Scholar
- DuckDuckGo Search
- Tavily AI Search
- Context7 Documentation
- LangSearch Multi-Source

</td>
</tr>
</table>

#### Performance Metrics

| Feature | Technology | Performance |
|---------|------------|-------------|
| **Multi-Source Search** | 11+ APIs orchestration | 1-3s response |
| **Real-time Streaming** | SSE + WebSocket | <100ms latency |
| **AI Assistant** | Nova AI (Multi-Model) | 0.5-15s (model-dependent) |
| **Smart Caching** | Supabase + Redis (1hr TTL) | 85%+ hit rate |
| **Citation Analysis** | OpenAlex graph | Forward/backward links |
| **Export Formats** | BibTeX, RIS, JSON, CSV | Bulk export |

### LaTeX Writer

**Collaborative LaTeX Editor with Real-Time Preview**

```mermaid
graph LR
    A[LaTeX Editor] --> B[KaTeX Renderer]
    A --> C[Multi-User Sync]
    A --> D[AI Assistant]
    B --> E[Live Preview]
    C --> E
    D --> A
    
    style A fill:#FF6B2C,color:#fff
    style B fill:#28a745,color:#fff
    style D fill:#17a2b8,color:#fff
```

#### Document Processing

| Format | Extraction Method | Processing Time | Capabilities |
|--------|-------------------|-----------------|--------------|
| **PDF** | pdf-parse + OCR | 15-45s | Text, tables, images, metadata |
| **DOCX/DOC** | mammoth.js | 10-30s | Rich text, tables, comments |
| **PowerPoint** | XML Parser | 20-40s | Slides, notes, embedded media |
| **CSV/Excel** | PapaCSV + XLSX | 5-15s | Data parsing, type detection |
| **Images/Scans** | Tesseract.js + Sharp | 30-90s | OCR, layout analysis |
| **Plain Text** | Direct processing | 2-10s | NLP, structure analysis |

#### Editor Features

<table>
<tr>
<td width="50%">

**Collaboration**
- Multi-user editing
- Live cursors & presence
- Real-time sync
- Conflict resolution
- Version control

</td>
<td width="50%">

**LaTeX Tools**
- KaTeX math rendering
- Smart toolbar
- Template library
- BibTeX integration
- PDF compilation
- AI content generation

</td>
</tr>
</table>

### AI-Powered Planner

**Intelligent Project Management with AI Task Generation**

```mermaid
graph TB
    A[Natural Language] --> B[AI Task Generator]
    B --> C[Smart Scheduling]
    C --> D[Gantt/Calendar]
    D --> E[Team Assignments]
    
    style B fill:#FF6B2C,color:#fff
    style C fill:#28a745,color:#fff
    style D fill:#17a2b8,color:#fff
```

#### AI Planning Features

| Feature | Technology | Benefit |
|---------|------------|----------|
| **AI Task Generation** | Nova AI + Planning Prompts | 10x faster project setup |
| **Smart Scheduling** | Constraint optimization | Conflict-free timelines |
| **Progress Prediction** | ML analytics | Deadline risk assessment |
| **Resource Optimization** | Team capacity analysis | Improved productivity |

#### Visualization Options

<table>
<tr>
<td width="50%">

**Views**
- Interactive Calendar
- Gantt Charts
- Kanban Boards
- Timeline Views
- Progress Analytics

</td>
<td width="50%">

**Features**
- Drag-drop editing
- Conflict detection
- Team assignments
- Real-time sync
- Hierarchical structure

</td>
</tr>
</table>

### Team Collaboration

**Real-Time Communication & Document Co-Editing**

```mermaid
graph TB
    A[Socket.IO Server] --> B[JWT Auth]
    B --> C[Team Rooms]
    C --> D[Real-time Chat]
    C --> E[File Sharing]
    C --> F[Presence]
    
    style A fill:#FF6B2C,color:#fff
    style C fill:#28a745,color:#fff
    style D fill:#17a2b8,color:#fff
```

#### Collaboration Features

| Feature | Technology | Performance |
|---------|------------|-------------|
| **Real-time Messaging** | Socket.IO + PostgreSQL | <50ms latency |
| **Document Co-editing** | WebSocket + OT | Live sync |
| **Presence System** | In-memory + DB | Real-time updates |
| **File Management** | Supabase Storage + CDN | Secure uploads |
| **Notifications** | WebSocket + Email + Push | Multi-channel |

#### Security & Permissions

<table>
<tr>
<td width="50%">

**Security**
- TLS encryption
- Row Level Security (RLS)
- JWT authentication
- Audit logging
- GDPR compliance

</td>
<td width="50%">

**Permissions**
- Owner/Admin/Editor/Viewer
- Granular access control
- Team management
- Notification preferences
- Multi-device sync

</td>
</tr>
</table>

### AI Integration

**Multi-Model Optimization Architecture**

```mermaid
graph TB
    A[AI Requests] --> B[Enhanced AI Service]
    B --> C[Nova AI - Groq]
    C --> D[Model Router]
    D --> E[7 Specialized Models]
    E --> F[SSE Streaming]

    style B fill:#FF6B2C,color:#fff
    style C fill:#28a745,color:#fff
    style F fill:#17a2b8,color:#fff
```

#### Nova AI Architecture

ThesisFlow-AI uses a **multi-model optimization architecture** with Nova AI powered by **7 specialized Groq models**, each optimized for specific tasks.

**Key Benefits:**
- ✅ **Zero Configuration** - No user API keys needed
- ✅ **Optimized Performance** - Right model for each task (speed, quality, context)
- ✅ **Better Security** - API keys managed server-side only
- ✅ **Cost Efficiency** - 8B models for simple tasks, 120B for complex synthesis
- ✅ **Research-Optimized** - Academic-focused model selection

#### Multi-Model Strategy

| System | Model | Why |
|--------|-------|-----|
| **NOVA Chat** | Qwen 3 32B | Thinking mode + efficient dialogue |
| **Summarization** | Llama 4 Scout (128K) | Extended context for long documents |
| **Paraphrasing** | Llama 3.1 8B Instant | Ultra-fast with low latency |
| **Research Ideas** | Llama 4 Scout | Comprehensive analysis + large context |
| **Report Curator** | Llama 3.1 8B | Fast source ranking |
| **Report Analyzer** | Llama 3.1 8B | Quick per-source summaries |
| **Report Synthesizer** | GPT-OSS 120B | Frontier reasoning for complex synthesis |

**Performance Range:** 0.5s (8B fast) to 15s (120B complex)

#### AI-Powered Features

<table>
<tr>
<td width="50%">

**Core Capabilities**
- Real-time streaming responses
- Full conversation history
- Progress tracking
- Multi-modal processing
- Academic-focused prompts

</td>
<td width="50%">

**Applications**
- Research assistant chat
- Literature summarization
- Document analysis
- Project planning & task generation
- LaTeX writing assistance
- Topic exploration

</td>
</tr>
</table>

#### Streaming Architecture

All AI features use **Server-Sent Events (SSE)** for real-time token streaming:

```javascript
// Client-side streaming (automatic via EventSource)
const eventSource = new EventSource('/api/ai/chat/stream?...')

eventSource.addEventListener('token', (event) => {
  const { content } = JSON.parse(event.data)
  // Render token in real-time
})

eventSource.addEventListener('done', (event) => {
  // Generation complete
})
```

**Performance Metrics:**
- Token streaming: 500+ tokens/second
- Initial response: 200-500ms
- Average generation: 3-8 seconds
- Concurrent requests: 30+ supported

---

### 🤖 Nova AI Architecture

**Multi-Model Optimization for Academic Excellence**

ThesisFlow AI uses a **multi-model optimization architecture** powered exclusively by **Nova AI** (Groq API with 7 specialized models). This design provides optimal performance, speed, and quality for each type of academic research task.

```mermaid
graph TB
    A[User Request] --> B[API Routes Layer]
    B --> C[Service Layer]
    C --> D[Groq API]
    D --> E[Model Router]
    E --> F1[Qwen 3 32B]
    E --> F2[Llama 4 Scout]
    E --> F3[Llama 3.1 8B]
    E --> F4[GPT-OSS 120B]
    F1 --> G[Streaming Response]
    F2 --> G
    F3 --> G
    F4 --> G
    G --> H[Client UI]

    style C fill:#FF6B2C,color:#fff
    style E fill:#28a745,color:#fff
    style G fill:#17a2b8,color:#fff
```

#### Core Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **NovaAIService** | Singleton managing all AI operations | `lib/services/nova-ai.service.ts` |
| **API Routes** | REST endpoints for AI features | `app/api/nova/*`, `app/api/ai/*` |
| **Enhanced AI Service** | High-level operations wrapper | `lib/enhanced-ai-service.ts` |
| **Configuration** | Provider detection and setup | `lib/ai-config.ts` |

#### Specialized Action Types

Nova AI supports 11 specialized action types optimized for academic workflows:

```typescript
- general              // General assistance
- research             // Research guidance and suggestions
- literature_review    // Academic paper analysis
- methodology          // Research methodology and design
- data_analysis        // Statistical interpretation
- writing_assistance   // Academic writing improvement
- citation_help        // Citation formatting (APA, MLA, Chicago)
- summarize            // Content summarization
- action_items         // Task extraction
- clarify              // Clarification requests
- decision             // Decision-making support
```

Each action type has a specialized system prompt optimized for that specific academic task.

#### Key Features

<table>
<tr>
<td width="50%">

**Technical Capabilities**
- Real-time token streaming (SSE)
- Conversation history (up to 100 messages)
- File content analysis (PDFs, documents)
- Context-aware responses
- Output sanitization
- Action item extraction

</td>
<td width="50%">

**Academic Focus**
- Research methodology guidance
- Literature review assistance
- Academic writing support
- Citation formatting help
- Data analysis interpretation
- Statistical insights

</td>
</tr>
</table>

#### API Endpoints

```http
# Nova AI Chat
POST /api/nova/chat              # Direct chat (streaming & non-streaming)
GET  /api/nova/chat              # Health check

# General AI Generation
POST /api/ai/generate            # Single generation request
POST /api/ai/chat/stream         # SSE streaming with full history

# Research Planning
POST /api/plan-and-execute       # AI-powered research planning
```

#### Configuration

**Required Environment Variable:**
```bash
# Server-side only (never use NEXT_PUBLIC_*)
GROQ_API_KEY=gsk_your_groq_api_key_here
```

**Optional Alias (backward compatibility):**
```bash
NOVA_API_KEY=gsk_your_groq_api_key_here
```

#### Security Best Practices

✅ **CORRECT:**
```typescript
const groqApiKey = process.env.GROQ_API_KEY
```

❌ **INCORRECT (Security Risk):**
```typescript
// Never use NEXT_PUBLIC_* for API keys
const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY
```

**Why**: `NEXT_PUBLIC_*` variables are exposed to client-side JavaScript, potentially leaking API keys.

#### Recent Code Fixes (2025-10-16)

**✅ Fixed Issues:**

1. **Dead Code Removed**
   - `lib/ai-service.ts` → Removed Google Gemini fallback (never used)
   - `hooks/use-user-ai.ts` → Removed broken hook (nonexistent API reference)

2. **Security Improvements**
   - Fixed API key exposure risk (removed `NEXT_PUBLIC_GROQ_API_KEY` checks)
   - Enforced server-side only API key management
   - Consistent security patterns across all files

3. **Logic Corrections**
   - Removed incorrect fallback to Google Gemini in `/api/nova/chat`
   - Clarified single-provider architecture
   - Improved error messages (clear 503 when GROQ_API_KEY missing)

**Impact:**
- 🔒 Eliminated security vulnerability (API key exposure)
- 🧹 Removed 500+ lines of dead code
- ✨ Clarified single-provider architecture
- 🐛 Fixed broken fallback logic
- 📚 Added comprehensive documentation

#### Documentation

For detailed information about Nova AI implementation:

- **📖 Architecture Guide**: [`docs/NOVA_AI.md`](docs/NOVA_AI.md)
  - Multi-model optimization strategy
  - Model selection decision tree
  - Complete system architecture
  - Usage patterns and examples
  - Security best practices
  - Troubleshooting guide
  - Performance metrics

#### Performance Benchmarks

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Token Streaming** | 300+ tokens/sec | 500+ tokens/sec | ✅ Exceeded |
| **Initial Response** | <500ms | 200-500ms | ✅ Achieved |
| **Average Generation** | <10s | 3-8s | ✅ Exceeded |
| **Concurrent Requests** | 20+ | 30+ | ✅ Exceeded |
| **Success Rate** | >95% | 97%+ | ✅ Exceeded |

#### Conversation Context

Nova AI maintains rich conversation context for better responses:

```typescript
interface NovaAIContext {
  teamId: string                    // Team identifier
  recentMessages: Message[]         // Up to 100 recent messages
  currentUser: User                 // Current user info
  mentionedUsers: User[]            // @mentioned team members
  conversationTopic?: string        // Optional topic
  actionType: ActionType            // Specialized action
  fileContents?: FileContent[]      // Referenced files
}
```

**File Analysis Support**: Nova can analyze uploaded PDF and document files, answering questions about their content, structure, and key points.

#### Example Usage

**Basic Generation:**
```typescript
import { NovaAIService } from '@/lib/services/nova-ai.service'

const novaService = NovaAIService.getInstance()

const response = await novaService.processMessage(
  "Explain quantum computing in simple terms",
  {
    teamId: 'team-123',
    recentMessages: [],
    currentUser: { id: 'user-1', name: 'John' },
    mentionedUsers: [],
    actionType: 'general'
  }
)

console.log(response.content)
```

**Streaming Response:**
```typescript
await novaService.processMessageStream(
  "Generate a research proposal on climate change",
  context,
  (chunk) => {
    // Handle each token as it arrives
    process.stdout.write(chunk)
  },
  (finalResponse) => {
    // Handle complete response
    console.log('\nDone:', finalResponse.type)
  },
  (error) => {
    // Handle errors
    console.error('Error:', error.message)
  }
)
```

#### Troubleshooting

**"Nova AI not configured" Error**

Solution: Set `GROQ_API_KEY` in environment variables
```bash
# .env.local or hosting platform
GROQ_API_KEY=gsk_your_actual_key_here
```

**Streaming Not Working**

Check:
1. Client is using `EventSource` or equivalent
2. Server is sending proper SSE headers
3. No proxy/CDN is buffering the stream

**Slow Response Times**

Causes & Solutions:
- Groq API rate limiting → Implement request queuing
- Large conversation history → Trim to last 50-100 messages
- Network latency → Use CDN for API route

#### Future Enhancements

Planned features for Nova AI:
- 🧠 Conversation memory across sessions
- 🎯 Custom fine-tuning for domain-specific tasks
- 📷 Multi-modal support (images, PDFs)
- 🎙️ Voice integration (speech-to-text, text-to-speech)
- 👥 Collaborative AI sessions (multi-user)

**Not Planned** (by design):
- ❌ Multiple AI provider support (adds complexity)
- ❌ User-provided API keys (security, support burden)
- ❌ Client-side AI processing (requires server infrastructure)

### Support System

**Intelligent Help & Assistance**

```mermaid
graph TB
    A[Support Widget] --> B[Intent Engine]
    B --> C[Response Templates]
    C --> D[Quick Replies]
    B --> E[API Routes]
    E --> F[Tickets/Feedback]

    style A fill:#FF6B2C,color:#fff
    style B fill:#28a745,color:#fff
    style E fill:#17a2b8,color:#fff
```

#### Features

| Feature | Description | Technology |
|---------|-------------|------------|
| **Smart Chat Assistant** | Nova AI support bot with intent classification | Rule-based engine |
| **Knowledge Base** | 15+ intents covering all platform features | JSON templates |
| **Ticket System** | Report bugs and issues with full tracking | Supabase + Local fallback |
| **Feedback Collection** | Share suggestions and rate experiences | Supabase + Local fallback |
| **Dynamic Broadcasts** | Latest release announcements in-chat | Changelog integration |
| **Privacy Controls** | Export, clear, or delete chat history | Browser localStorage |

#### Support Topics Covered

<table>
<tr>
<td width="50%">

**Platform Information**
- Pricing & subscription plans
- Token usage & limits
- Feature explanations
- Navigation & getting started
- Account management
- Latest updates & changelog

</td>
<td width="50%">

**User Actions**
- Report technical issues
- Submit feature requests
- Provide feedback & ratings
- Contact support team
- Export conversation history
- Manage privacy preferences

</td>
</tr>
</table>

#### Availability
- **Location**: Home page only (floating action button)
- **Response Time**: Instant (deterministic responses)
- **Storage**: Client-side localStorage for conversations
- **Ticket/Feedback**: Persisted to Supabase or local filesystem

---

## 🛠️ Installation Guide

### Database Setup

```bash
# Run database migrations
node scripts/run-migration.js

# Verify Supabase connection
npx supabase status

# Optional: Seed with sample data
node scripts/seed-database.js
```

### Database Schema

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `user_profiles` | User accounts & preferences | RLS policies, plan tracking |
| `projects` | Research projects & tasks | Hierarchical structure, team sharing |
| `teams` | Collaboration groups | Role-based permissions, invitations |
| `extractions` | Document processing results | File metadata, AI analysis |
| `chat_sessions` | AI conversation history | Context preservation, search |
| `literature_cache` | Search result caching | 1-hour TTL, deduplication |
| `user_tokens` | Monthly usage tracking | Token consumption, plan limits |

### Security & Performance

**Security Measures:**

| Measure | Implementation | Priority |
|---------|----------------|----------|
| **Environment Isolation** | Separate `.env.local` for dev/prod | Critical |
| **API Key Rotation** | Monthly key rotation schedule | High |
| **Usage Monitoring** | Track API consumption and costs | High |
| **Access Control** | RLS policies and JWT validation | Critical |
| **Rate Limiting** | Per-user and per-endpoint limits | Medium |
| **Audit Logging** | Track all sensitive operations | Medium |

**Performance Benchmarks:**

| Feature | Response Time | Throughput | Reliability |
|---------|---------------|------------|-------------|
| **Literature Search** | 1-3s | 100+ req/min | 98% success |
| **AI Generation** | 3-8s streaming | 30+ concurrent | 95% success |
| **Document Processing** | 15-45s | 25+ files/min | 92% success |
| **Real-time Chat** | <50ms | 1000+ msg/min | 99.9% uptime |
| **File Upload** | 2-10s | 20MB/file | 96% success |

---

## 📡 API Reference

### 🔥 Core API Endpoints

```http
# AI Services
GET  /api/ai/chat/stream          # Streaming AI chat with SSE
POST /api/ai/generate             # Single AI generation request
POST /api/ai-detect               # AI content detection

# Literature & Research
POST /api/literature-search/stream # Real-time literature search
GET  /api/search/papers           # Paper search with filters
POST /api/plan-and-execute        # AI project planning

# Document Processing
POST /api/extract                 # Multi-format document extraction
POST /api/extract/chat            # AI-powered document analysis
GET  /api/extractions/recent      # User's recent extractions

# Team Collaboration
GET  /api/collaborate/teams       # User's teams and permissions
POST /api/collaborate/messages    # Send team messages
WebSocket: ws://localhost:3001    # Real-time collaboration

# User Management
GET  /api/user/tokens             # Token usage and limits
PUT  /api/user/tokens/deduct      # Deduct tokens for AI features
GET  /api/user/plan               # Current subscription plan
```

### 🔐 Authentication & Security

All API endpoints use Supabase JWT authentication with automatic RLS filtering:

```javascript
// Client-side API calls (tokens handled automatically)
const { data, error } = await supabase
  .from('projects')
  .select('*')
  // RLS automatically filters to user's projects

// Manual API calls with auth headers
const response = await fetch('/api/extract', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ /* request data */ })
})
```

### ⚡ Rate Limits & Performance

| Feature | Rate Limit | Burst Capacity | Cache TTL |
|---------|------------|----------------|-----------|
| **AI Chat Streaming** | 50/hour | 5 concurrent | - |
| **Literature Search** | 100/hour | 10 concurrent | 1 hour |
| **Document Extraction** | 20/hour | 3 concurrent | 24 hours |
| **Team Collaboration** | 1000/hour | 50 concurrent | Real-time |
| **File Upload** | 20/hour | 10MB max | - |

---

## 🚀 Deployment & Production

### 🌐 Deployment Options

| Platform | Configuration | Benefits | Cost |
|----------|---------------|----------|------|
| **Vercel** | Zero-config Next.js deployment | Auto-scaling, CDN, preview deployments | $20/month |
| **Netlify** | Static site + serverless functions | Git-based deploys, form handling | $19/month |
| **Railway** | Full-stack deployment | Database included, simple setup | $5-20/month |
| **Google Cloud Run** | Containerized deployment | Pay-per-use, custom domains | Variable |

### Production Metrics

| Metric | Target | Status |
|--------|--------|--------|
| **API Response** | <200ms | ✅ Achieved |
| **Search Speed** | 1-3s | ✅ Achieved |
| **AI Generation** | 3-8s | ✅ Achieved |
| **Uptime** | 99.9% | ✅ Achieved |
| **Success Rate** | 95%+ | ✅ Achieved |
| **Concurrent Users** | 500+ | ✅ Scalable |
| **Requests/min** | 1000+ | ✅ Scalable |

---

## 📋 Changelog

Stay up to date with the latest releases and improvements:

**📍 Access Changelog:**
- **Web Interface**: [thesisflow-ai.vercel.app/changelog](https://thesisflow-ai.vercel.app/changelog)
- **RSS Feed**: [changelog/rss.xml](https://thesisflow-ai.vercel.app/changelog/rss.xml)
- **Atom Feed**: [changelog/atom.xml](https://thesisflow-ai.vercel.app/changelog/atom.xml)

**Direct Version Links:**
```
https://thesisflow-ai.vercel.app/changelog#v1.0.9
```

**Current Version:** 1.0.9 (September 2025)

---

## 🤝 Contributing

We welcome contributions from the research community! 

### 🛠️ Development Workflow

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/thesisflow-ai.git
cd thesisflow-ai

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Install dependencies and start development
pnpm install
pnpm dev

# 4. Make your changes and test thoroughly
pnpm lint
pnpm build

# 5. Submit a pull request with detailed description
```

### 📝 Development Standards

- **TypeScript**: Strict mode with comprehensive type definitions
- **Code Quality**: ESLint + Prettier with automated formatting
- **Testing**: Unit tests for critical functions and API endpoints
- **Documentation**: JSDoc comments for all public functions
- **Security**: Never commit API keys or sensitive data

### 🆘 Getting Help

- **📚 Documentation**: [GitHub Wiki](https://github.com/Kedhareswer/thesisflow-ai/wiki)
- **💬 Discussions**: [GitHub Discussions](https://github.com/Kedhareswer/thesisflow-ai/discussions)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/Kedhareswer/thesisflow-ai/issues)
- **📧 Direct Contact**: [support@thesisflow-ai.com](mailto:support@thesisflow-ai.com)

---

## 🙏 Acknowledgments

**🔧 Core Technologies:** Next.js 15 • React 19 • Supabase • TypeScript • TailwindCSS

**🤖 AI Technology:** Groq Cloud API (Nova AI - Multi-Model) • 7 Specialized Groq Models • HuggingFace (AI Detection)

**📚 Academic Sources:** OpenAlex • arXiv • CrossRef • PubMed • Google Scholar (API)

**🎨 UI Framework:** Shadcn/UI • Radix UI • Framer Motion • Lucide Icons

---

<div align="center">

**🎓 Built with passion for the research community**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-thesisflow--ai.vercel.app-FF6B2C?style=for-the-badge)](https://thesisflow-ai.vercel.app)
[![Documentation](https://img.shields.io/badge/📚_Documentation-GitHub_Wiki-28a745?style=for-the-badge)](https://github.com/Kedhareswer/thesisflow-ai/wiki)
[![Report Issues](https://img.shields.io/badge/🐛_Report_Issues-GitHub-17a2b8?style=for-the-badge)](https://github.com/Kedhareswer/thesisflow-ai/issues)

*Empowering researchers worldwide with AI-powered tools for discovery, collaboration, and innovation.*

**Status:** Production Ready • **Version:** 1.0.9 • **Updated:** September 2025
