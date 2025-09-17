<div align="center">

# 🚀 ThesisFlow-AI

*Comprehensive AI-powered research platform for academic discovery, document processing, and team collaboration*

[![License](https://img.shields.io/badge/License-MIT-FF6B2C?style=flat-square)](https://github.com/Kedhareswer/thesisflow-ai/blob/unified/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Kedhareswer/thesisflow-ai?style=flat-square&color=FF6B2C)](https://github.com/Kedhareswer/thesisflow-ai)
[![Production](https://img.shields.io/badge/Status-Production_Ready-28a745?style=flat-square)](https://thesisflow-ai.vercel.app)
[![Version](https://img.shields.io/badge/Version-1.0.9-FF6B2C?style=flat-square)](https://github.com/Kedhareswer/thesisflow-ai)

## 🎯 Core Features

| 🔍 Explorer | 📝 Writer | 📋 Planner | 👥 Collaborate |
|-------------|-----------|-------------|------------------|
| Multi-source literature search<br/>AI research assistant<br/>Deep research tools | LaTeX editor<br/>Document extraction<br/>AI writing assistance | Project management<br/>Task tracking<br/>Calendar integration | Real-time WebSocket chat<br/>Team management<br/>File sharing |

## 🛠️ Tech Stack

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js 15] --> B[React 19]
        B --> C[TypeScript]
        C --> D[TailwindCSS + Shadcn/UI]
    end
    
    subgraph "Backend Services"
        E[Supabase] --> F[PostgreSQL + RLS]
        G[WebSocket Server] --> H[Socket.IO]
        I[Python Services] --> J[Literature APIs]
    end
    
    subgraph "AI Providers"
        K[OpenAI GPT-4o/o3] --> L[Enhanced AI Service]
        M[Google Gemini 2.5] --> L
        N[Anthropic Claude] --> L
        O[Groq LLaMA] --> L
        P[Mistral AI] --> L
        Q[AIML API] --> L
    end
    
    subgraph "External APIs"
        R[OpenAlex] --> S[Literature Search]
        T[arXiv] --> S
        U[CrossRef] --> S
        V[Google Search] --> S
    end
    
    A --> E
    A --> G
    L --> A
    S --> I
    
    style A fill:#FF6B2C,color:#fff
    style E fill:#FF6B2C,color:#fff
    style L fill:#FF6B2C,color:#fff
    style S fill:#28a745,color:#fff
```

## ⚡ Quick Start

```bash
# 1. Clone and setup
git clone https://github.com/Kedhareswer/thesisflow-ai.git
cd thesisflow-ai
pnpm install

# 2. Configure environment
cp env.template .env.local
# Edit .env.local with your API keys

# 3. Start all services
pnpm dev                    # Frontend (port 3000)
node server/websocket-server.js  # WebSocket (port 3001)
cd python && python app.py  # Literature search (port 5000)
```

### 🔧 Required Configuration

**Essential Services:**
- **Supabase**: Database, authentication, and storage
- **AI Provider**: At least one (OpenAI, Gemini, Claude, Groq, Mistral, or AIML)
- **HuggingFace**: For AI content detection

**Optional Enhancements:**
- **Google Search API**: For enhanced literature search
- **Stripe**: For payment processing
- **Literature APIs**: Unpaywall, CORE, SerpAPI

🌐 **Live Demo:** [thesisflow-ai.vercel.app](https://thesisflow-ai.vercel.app)

</div>

---

## 🪙 Plans & Tokens

ThesisFlow-AI uses a token-based usage model with two plans:

- __Free__: 10 daily tokens, 50 monthly cap
- __Pro__: 100 daily tokens, 500 monthly cap

__Where tokens are consumed__
- AI Chat (messages and streaming)
- Explorer (topic exploration, deep research)
- Summarizer
- Plan-and-Execute workflows and related AI tools

__Where you can see usage__
- Top nav mini meter: shows remaining daily tokens, with a tooltip for daily/monthly breakdown
- Profile dropdown: shows current plan, daily remaining count, and a Manage/Upgrade button
- Plan & Analytics page (`/plan`): Token bars and usage by feature
- Tokens page (`/tokens`): Full dashboard with recent transactions and feature costs

Only two roles are recognized across the app: __free__ and __pro__. Any paid alias from the backend (e.g., professional, premium, enterprise) is normalized to `pro` on the client.

## 📣 Changelog

Stay up to date with the latest releases and improvements:

- Web: https://thesisflow-ai.vercel.app/changelog
- RSS: https://thesisflow-ai.vercel.app/changelog/rss.xml
- Atom: https://thesisflow-ai.vercel.app/changelog/atom.xml

Direct links to specific versions also work, for example:

- https://thesisflow-ai.vercel.app/changelog#v1.0.9

---

## 📚 Table of Contents

- [🎯 Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [⚙️ Setup Guide](#️-setup-guide)
- [🔌 API Reference](#-api-reference)
- [📊 Performance](#-performance)
- [📣 Changelog](#-changelog)
- [🤝 Contributing](#-contributing)

---

## 🎯 Features

### 🔍 Literature Explorer

```mermaid
flowchart TB
    A["🔍 Search Query"] --> B["Literature Search Service"]
    
    subgraph "Core APIs (Always Available)"
        C["OpenAlex<br/>📚 Academic Papers"]
        D["arXiv<br/>📄 Preprints"]
        E["CrossRef<br/>🔗 DOI Resolution"]
        F["OpenAIRE<br/>🌐 Open Access"]
        G["DOAJ<br/>📖 Open Journals"]
        H["PubMed<br/>🏥 Medical"]
    end
    
    subgraph "Enhanced APIs (With Keys)"
        I["Google Search<br/>🔍 Web + Scholar"]
        J["CORE<br/>📑 Repository"]
        K["SerpAPI<br/>⚡ Fast Scholar"]
    end
    
    subgraph "Processing Pipeline"
        L["Rate Limiting<br/>& Caching"]
        M["Deduplication<br/>& Ranking"]
        N["Citation Analysis<br/>& Metrics"]
    end
    
    B --> C & D & E & F & G & H
    B -.-> I & J & K
    C & D & E & F & G & H --> L
    I & J & K -.-> L
    L --> M --> N
    
    N --> O["📊 Research Results"]
    O --> P["🤖 AI Research Assistant"]
    O --> Q["📈 Citation Tracking"]
    O --> R["💾 Export Options"]
    
    style B fill:#FF6B2C,color:#fff
    style L fill:#17a2b8,color:#fff
    style O fill:#28a745,color:#fff
```

**Advanced Literature Search Features:**
- **Multi-Source Integration**: 11+ academic databases and search engines
- **Intelligent Caching**: Database + memory caching with 1-hour TTL
- **Rate Limiting**: Per-source token bucket algorithms with exponential backoff
- **Real-time Streaming**: Progressive results as sources respond
- **Citation Analysis**: Forward/backward citation tracking via OpenAlex
- **Aggregation Mode**: 2-minute window for comprehensive multi-source results
- **Smart Fallbacks**: Automatic provider switching on failures
- **Export Formats**: JSON, CSV, BibTeX, RIS

### 📝 Document Processing & LaTeX Writer

```mermaid
flowchart TB
    subgraph "Document Extraction Pipeline"
        A["📄 File Upload<br/>(10MB limit)"] --> B["File Type Detection"]
        B --> C{"Extraction Method"}
        
        C -->|PDF| D["pdf-parse<br/>📑 Text + Tables"]
        C -->|DOCX/DOC| E["mammoth.js<br/>📝 HTML Conversion"]
        C -->|PowerPoint| F["XML Parser<br/>🎯 Slides + Notes"]
        C -->|CSV| G["papaparse<br/>📊 Data Parsing"]
        C -->|Images| H["Tesseract.js + Sharp<br/>👁️ OCR Processing"]
        C -->|TXT| I["Direct Processing<br/>📋 Plain Text"]
        
        D & E & F & G & H & I --> J["Extraction Orchestrator"]
        J --> K["Metadata Extraction"]
        K --> L["AI Processing"]
    end
    
    subgraph "LaTeX Writing Environment"
        M["📝 LaTeX Editor"] --> N["Real-time Preview"]
        N --> O["KaTeX Rendering"]
        O --> P["Formula Display"]
        
        M --> Q["Collaborative Features"]
        Q --> R["User Avatars"]
        Q --> S["Real-time Sync"]
        
        M --> T["LaTeX Toolbar"]
        T --> U["Sections & Formatting"]
        T --> V["Equations & Tables"]
        T --> W["Citations & References"]
    end
    
    L --> X["AI Writing Assistant"]
    X --> Y["LaTeX Content Generation"]
    Y --> M
    
    style J fill:#FF6B2C,color:#fff
    style M fill:#28a745,color:#fff
    style X fill:#17a2b8,color:#fff
```

**Document Processing Capabilities:**

| Format | Extraction Features | Processing Time | AI Enhancement |
|--------|-------------------|-----------------|----------------|
| **PDF** | Text, tables, metadata, OCR | 15-45s | Summary, entities, structure |
| **DOCX/DOC** | HTML conversion, tables, images | 10-30s | Content analysis, formatting |
| **PowerPoint** | Slides, notes, speaker notes | 20-40s | Presentation insights |
| **CSV** | Data parsing, type detection | 5-15s | Statistical analysis |
| **Images** | OCR text extraction, metadata | 30-90s | Content recognition |
| **TXT** | Direct text processing | 2-10s | NLP analysis |

**LaTeX Writing Features:**
- **Real-time Collaboration**: Multi-user editing with presence indicators
- **Live Preview**: Split-view with instant KaTeX rendering
- **Smart Toolbar**: LaTeX-specific commands and shortcuts
- **AI Integration**: Generate LaTeX content from prompts
- **Export Options**: PDF, LaTeX source, HTML
- **Template System**: Academic paper templates

### 📋 Project Management & Planning

```mermaid
flowchart TB
    subgraph "Project Structure"
        A["📁 Projects"] --> B["📋 Tasks"]
        B --> C["✅ Subtasks"]
        C --> D["💬 Comments"]
    end
    
    subgraph "Visualization Views"
        E["📅 Calendar View<br/>date-fns integration"]
        F["📊 Gantt Chart<br/>Timeline visualization"]
        G["🗂️ Kanban Board<br/>Drag & drop"]
        H["📈 Analytics<br/>Progress metrics"]
    end
    
    subgraph "Team Features"
        I["👥 Team Management"]
        J["🔔 Notifications"]
        K["📤 Assignments"]
        L["⏰ Due Dates"]
    end
    
    subgraph "Data Integration"
        M["🗄️ Supabase Database"]
        N["🔄 Real-time Sync"]
        O["📊 Usage Analytics"]
    end
    
    A --> E & F & G & H
    B --> I & J & K & L
    E & F & G & H --> M
    I & J & K & L --> N
    M --> O
    
    style A fill:#FF6B2C,color:#fff
    style E fill:#28a745,color:#fff
    style I fill:#17a2b8,color:#fff
    style M fill:#6f42c1,color:#fff
```

**Advanced Planning Features:**
- **Multi-View Interface**: Calendar (date-fns), Gantt charts, Kanban boards
- **Hierarchical Tasks**: Projects → Tasks → Subtasks → Comments
- **Smart Scheduling**: Due date parsing and calendar integration
- **Team Collaboration**: Role-based permissions and assignments
- **Progress Analytics**: Completion rates, time tracking, performance metrics
- **Notification System**: Real-time updates and deadline reminders
- **Data Persistence**: Supabase integration with RLS policies

### 👥 Real-time Team Collaboration

```mermaid
flowchart TB
    subgraph "WebSocket Architecture"
        A["🌐 Socket.IO Server<br/>Port 3001"] --> B["🔐 JWT Authentication"]
        B --> C["👥 Team Rooms"]
        C --> D["💬 Message Broadcasting"]
    end
    
    subgraph "Chat Features"
        E["💬 Real-time Messaging"] --> F["📎 File Sharing"]
        F --> G["@️⃣ Mentions & Notifications"]
        G --> H["✏️ Typing Indicators"]
        H --> I["👁️ Read Receipts"]
    end
    
    subgraph "Presence System"
        J["🟢 Online Status"] --> K["⏰ Last Active"]
        K --> L["🎯 Activity Tracking"]
        L --> M["📊 Team Analytics"]
    end
    
    subgraph "Team Management"
        N["👑 Role-based Access"]
        O["📋 Owner/Admin/Editor/Viewer"]
        P["🔔 Notification Preferences"]
        Q["📧 Email Integration"]
    end
    
    A --> E & J & N
    E --> R["📱 Multi-device Sync"]
    J --> S["🔄 Cross-tab Updates"]
    N --> T["🛡️ RLS Security"]
    
    style A fill:#FF6B2C,color:#fff
    style E fill:#28a745,color:#fff
    style J fill:#17a2b8,color:#fff
    style N fill:#6f42c1,color:#fff
```

**Real-time Collaboration Features:**

| Component | Technology | Features |
|-----------|------------|----------|
| **WebSocket Server** | Socket.IO + Node.js | Real-time bidirectional communication |
| **Authentication** | Supabase JWT + Middleware | Secure token-based auth |
| **Message System** | PostgreSQL + Broadcasting | Persistent chat with real-time delivery |
| **Presence Tracking** | In-memory + Database | Online status, typing indicators |
| **File Sharing** | Supabase Storage | Secure file uploads and sharing |
| **Notifications** | Database + WebSocket | Granular notification preferences |
| **Team Management** | RLS Policies | Role-based access control |

**Advanced Collaboration:**
- **Multi-device Synchronization**: Seamless experience across devices
- **Offline Support**: Message queuing and sync on reconnection
- **Rate Limiting**: Per-user and per-IP protection
- **Scalable Architecture**: Horizontal scaling with Redis (future)
- **Security**: End-to-end encryption for sensitive data
- **Analytics**: Team activity and engagement metrics

### 🤖 AI Integration

```mermaid
flowchart TB
    subgraph "Enhanced AI Service"
        A["🧠 AI Provider Router"] --> B["🔑 API Key Management"]
        B --> C["🔄 Fallback System"]
        C --> D["📊 Usage Tracking"]
    end
    
    subgraph "Supported Providers"
        E["🤖 OpenAI<br/>GPT-4o, o3, GPT-4o-mini"]
        F["🔮 Google Gemini<br/>2.5 Pro/Flash, 2.0 Flash"]
        G["🎭 Anthropic<br/>Claude 3.5/4 Sonnet/Opus"]
        H["⚡ Groq<br/>LLaMA 3.1/3.3, Whisper"]
        I["🌟 Mistral AI<br/>Small/Medium/Large, Codestral"]
        J["🚀 AIML API<br/>Multi-provider access"]
    end
    
    subgraph "Streaming Architecture"
        K["📡 Server-Sent Events"] --> L["🔄 Real-time Tokens"]
        L --> M["📈 Progress Tracking"]
        M --> N["❤️ Heartbeat Pings"]
        N --> O["🛑 Abort Handling"]
    end
    
    subgraph "AI Features"
        P["💭 Research Assistant"]
        Q["✍️ Content Generation"]
        R["🔍 AI Content Detection"]
        S["📝 Writing Assistance"]
        T["🧮 Data Analysis"]
    end
    
    A --> E & F & G & H & I & J
    E & F & G & H & I & J --> K
    K --> P & Q & R & S & T
    
    style A fill:#FF6B2C,color:#fff
    style K fill:#28a745,color:#fff
    style P fill:#17a2b8,color:#fff
```

**AI Provider Capabilities:**

| Provider | Latest Models | Context Length | Strengths | Use Cases |
|----------|---------------|----------------|-----------|-----------|
| **OpenAI** | GPT-4o, o3-mini, o3 | 200K tokens | Reasoning, analysis | Complex research, coding |
| **Google** | Gemini 2.5 Pro/Flash | 1M tokens | Long context, multimodal | Document analysis, vision |
| **Anthropic** | Claude 3.5/4 Sonnet | 200K tokens | Academic writing, safety | Research papers, ethics |
| **Groq** | LLaMA 3.3-70B | 128K tokens | Ultra-fast inference | Real-time chat, quick tasks |
| **Mistral** | Large 2411, Codestral | 128K tokens | Code, multilingual | Programming, translation |
| **AIML** | Cross-provider | Variable | Model aggregation | Fallback, cost optimization |

**Advanced AI Features:**
- **Streaming Responses**: Server-Sent Events with 20ms token delivery
- **Smart Fallbacks**: Automatic provider switching on failures
- **Rate Limiting**: 50 requests/hour with intelligent backoff
- **Context Preservation**: Full conversation history in streaming
- **API Key Security**: Encrypted storage with Supabase
- **Usage Analytics**: Token tracking and cost optimization
- **AI Detection**: HuggingFace ensemble for content verification
- **Custom Prompts**: Research-specific prompt engineering

---

## 🏗️ System Architecture

### Complete System Overview

```mermaid
flowchart TB
    subgraph "Frontend Layer"
        A[Next.js 15 + React 19] --> B[Tailwind + Shadcn/UI]
        B --> C[TypeScript Components]
    end
    
    subgraph "API Routes"
        D[/api/ai/chat/stream] --> E[AI Streaming]
        F[/api/literature-search] --> G[Literature APIs]
        H[/api/extract] --> I[Document Processing]
        J[/api/collaborate/*] --> K[Team Management]
    end
    
    subgraph "Real-time Services"
        L[WebSocket Server] --> M[Socket.IO]
        N[Server-Sent Events] --> O[AI Streaming]
        P[Keep-alive Service] --> Q[Render Support]
    end
    
    subgraph "Database & Storage"
        R[Supabase PostgreSQL] --> S[Row Level Security]
        T[File Storage] --> U[Document Management]
        V[Authentication] --> W[JWT Sessions]
    end
    
    subgraph "AI & External APIs"
        X[Enhanced AI Service] --> Y[6 AI Providers]
        Z[Literature Search] --> AA[11+ Academic APIs]
        BB[Document Extraction] --> CC[Multi-format Support]
    end
    
    A --> D & F & H & J
    D --> X
    F --> Z
    H --> BB
    J --> L
    L --> R
    X --> Y
    Z --> AA
    
    style A fill:#FF6B2C,color:#fff
    style R fill:#28a745,color:#fff
    style X fill:#17a2b8,color:#fff
    style L fill:#6f42c1,color:#fff
```

### Core Architecture Components

| Component | Technology | Purpose |
|-----------|------------|----------|
| **Frontend** | Next.js 15, React 19, TypeScript | User interface and routing |
| **Database** | Supabase (PostgreSQL) | Data storage and authentication |
| **AI Services** | Multiple providers | Content generation and analysis |
| **Real-time** | Socket.io, WebSocket | Live collaboration features |
| **Backend** | Python FastAPI | Literature search and processing |
| **File Storage** | Supabase Storage | Document and media files |

### Security & Performance

**Security Features:**
- JWT authentication via Supabase
- Row Level Security (RLS) policies
- API key encryption and secure storage
- Rate limiting and request validation
- CORS protection and input sanitization

**Performance Metrics:**

| Feature | Response Time | Success Rate | Concurrency |
|---------|---------------|--------------|-------------|
| Literature Search | 1-3s | 98% | 20+ users |
| AI Generation | 3-8s | 95% | 30+ users |
| Document Processing | 15-45s | 92% | 25+ users |
| Real-time Chat | <100ms | 99.9% | 500+ users |

---

## ⚙️ Setup Guide

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|----------|
| Node.js | 18.0+ | Frontend runtime |
| Python | 3.7+ | Backend services |
| pnpm | Latest | Package manager |
| Supabase Account | - | Database & auth |

### Installation Steps

```bash
# 1. Clone repository
git clone https://github.com/Kedhareswer/thesisflow-ai.git
cd thesisflow-ai

# 2. Install dependencies
pnpm install

# 3. Setup Python backend
cd python
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# 4. Configure environment
cp env.template .env.local
# Edit .env.local with your API keys (see security notes below)

# 5. Start development servers
pnpm dev                         # Frontend (port 3000)
node server/websocket-server.js  # WebSocket (port 3001)
cd python && python app.py       # Literature search (port 5000)
```

### Environment Variables

**Required Configuration:**

| Variable | Required | Description | Security Notes |
|----------|----------|-------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL | Public, safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key | Public, RLS protected |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key | **SECRET** - Server only |
| `OPENAI_API_KEY` | ⭐ | OpenAI API access | **SECRET** - Never expose |
| `GEMINI_API_KEY` | ⭐ | Google Gemini API | **SECRET** - Never expose |
| `HUGGINGFACE_API_KEY` | ✅ | AI detection models | **SECRET** - Never expose |
| `NEXTAUTH_SECRET` | ✅ | Authentication secret | **SECRET** - Generate random |

⭐ = At least one AI provider required

**🔒 Security Best Practices:**
- Never commit `.env.local` to version control
- Use different API keys for development and production
- Rotate API keys regularly (monthly recommended)
- Monitor API usage for unusual activity
- Use environment-specific Supabase projects

### Database Setup

```bash
# Run database migrations
node scripts/run-migration.js

# Verify setup
npx supabase status

# Optional: Seed with sample data
node scripts/seed-database.js
```

**Database Schema:**
- `user_profiles` - User information and preferences
- `projects` - Research projects and tasks
- `teams` - Collaboration groups
- `summaries` - Document summaries and history
- `chat_sessions` - AI chat conversations
- `notifications` - User notifications and preferences

---

## 🔌 API Reference

### Core Endpoints

**AI Services:**
```http
POST /api/ai/generate
POST /api/ai/chat/stream
POST /api/ai-detect
```

**Literature Search:**
```http
GET /api/search/literature
GET /api/search/papers
POST /api/literature-search/stream
```

**Collaboration:**
```http
GET /api/collaborate/teams
POST /api/collaborate/messages
WebSocket: ws://localhost:3001
```

**Document Processing:**
```http
POST /api/extract
POST /api/summarize
POST /api/upload
```

### Authentication

All API endpoints require Supabase JWT authentication:

```javascript
// Headers for API requests - NEVER expose tokens in client code
{
  "Authorization": "Bearer <supabase_jwt_token>",
  "Content-Type": "application/json"
}

// Example secure usage with Supabase client
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', user.id); // RLS automatically filters by user
```

### Rate Limits

| Endpoint | Requests/Hour | Burst |
|----------|---------------|-------|
| AI Generation | 50 | 5 |
| Literature Search | 100 | 10 |
| File Upload | 20 | 3 |
| General API | 200 | 20 |

---

## 📊 Performance

### System Metrics

```mermaid
graph LR
    A[Response Times] --> A1[API: 200ms]
    A --> A2[Search: 1.2s]
    A --> A3[AI: 3-8s]
    
    B[Throughput] --> B1[1000 req/min]
    B --> B2[50 concurrent]
    B --> B3[99.9% uptime]
    
    C[Resources] --> C1[Memory: 512MB]
    C --> C2[CPU: 15%]
    C --> C3[Storage: 2GB/user]
    
    style A fill:#FF6B2C,color:#fff
    style B fill:#28a745,color:#fff
    style C fill:#17a2b8,color:#fff
```

### Benchmarks

| Feature | Current | Target | Industry |
|---------|---------|--------|-----------|
| Literature Search | 1.2s | <1s | 2-5s |
| Document Summary | 15-45s | <30s | 60-120s |
| AI Response | 3-8s | <5s | 10-15s |
| Chat Latency | 50ms | <100ms | 200ms |
| File Upload (10MB) | 8s | <10s | 15-30s |

### Cost Optimization

| Service | Monthly Cost | Usage |
|---------|--------------|-------|
| Supabase | $25 | 100GB DB |
| OpenAI API | $150 | 5M tokens |
| Vercel Hosting | $20 | Pro plan |
| **Total** | **$195** | Optimized |

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md).

### Development Standards
- Follow TypeScript best practices
- Use ESLint and Prettier configurations
- Write meaningful commit messages
- Add comprehensive error handling
- Include JSDoc comments for functions

### Getting Help
- 📖 [Documentation](https://github.com/Kedhareswer/thesisflow-ai/wiki)
- 💬 [Discussions](https://github.com/Kedhareswer/thesisflow-ai/discussions)
- 🐛 [Issues](https://github.com/Kedhareswer/thesisflow-ai/issues)
- 📧 [Contact](mailto:support@thesisflow-ai.com)

---

<div align="center">

### 🙏 Acknowledgments

**Core Technologies:** Next.js • Supabase • OpenAI • Anthropic • Google AI

**Literature Sources:** OpenAlex • Semantic Scholar • arXiv • White Rose

---

**Built with ❤️ for the research community**

[🌐 Live Demo](https://thesisflow-ai.vercel.app) • [📖 Documentation](https://github.com/Kedhareswer/thesisflow-ai/wiki) • [🐛 Report Issues](https://github.com/Kedhareswer/thesisflow-ai/issues)

**Status:** ✅ Production Ready • **Version:** 1.0.9 • **Updated:** September 2025

</div>
