# ThesisFlow-AI — Developer Documentation

This directory contains comprehensive documentation for developers, contributors, and maintainers.

**Supabase Project**: xxxxx

---

## 🚀 Quick Start

**New to the project?** Read in this order:
1. [Tech Stack](./tech-stack.md) - Technologies and tools
2. [Coding Standards](./coding-language.md) - Development conventions
3. [Design Architecture](./design-architecture.md) - System overview
4. [APIs Critical](./apis-critical-do-not-touch.md) - Breaking changes to avoid

---

## 📚 Core Documentation

### Architecture & System Design
- **[Design Architecture](./design-architecture.md)** - Complete system architecture
- **[Frontend](./frontend.md)** - React/Next.js frontend patterns
- **[Backend](./backend.md)** - API routes and services
- **[Sequences and Flows](./sequences-and-flows.md)** - Mermaid diagrams of key flows
- **[Database Schema](./database-schema.md)** - Supabase tables and RPCs

### Development Standards
- **[Tech Stack](./tech-stack.md)** - Technology choices and rationale
- **[Coding Language](./coding-language.md)** - TypeScript conventions and patterns
- **[DESIGN.md](./DESIGN.md)** - UI/UX design system and branding
- **[APIs Critical](./apis-critical-do-not-touch.md)** - Stable contracts (DO NOT BREAK)

### Features & Services
- **[NOVA_AI.md](./NOVA_AI.md)** - AI service architecture (Multi-model via Groq)
- **[SUPPORT_SYSTEM.md](./SUPPORT_SYSTEM.md)** - Support chat implementation
- **[Tokens](./tokens.md)** - Token accounting and rate limiting
- **[Integrations](./integrations.md)** - External services (Supabase, Stripe, etc.)
- **[Pages Documentation](./pages/README.md)** - Feature-specific documentation

---

## 📂 Pages & Features

See **[pages/README.md](./pages/README.md)** for feature-specific documentation:
- Topics Explorer & Research
- Literature Search
- AI Chat & Assistance
- Paraphraser & Writer
- Planner & Project Management
- Collaboration & Teams
- And more...

---

## ⚡ Quick Facts

- **SSE Events**: `init`, `progress`, `token`, `error`, `done`, `ping`
- **Token Refunds**: Streaming routes must explicitly refund on error/abort
- **Rate Limiting**: Literature search uses `Retry-After` headers
- **Security**: JWT in headers/cookies only (never query params), input validation on all routes
- **Buffer Protection**: 1MB limit in streaming hooks prevents memory exhaustion

---

## 🔧 Where to Start Coding

| Feature | UI Entry | API Route | Service Layer |
|---------|----------|-----------|---------------|
| **Topics Report** | `app/topics/page.tsx` | `app/api/topics/report/stream/route.ts` | `lib/services/topic-report-agents.ts` |
| **AI Chat** | `app/explorer/` | `app/api/ai/chat/stream/route.ts` | `lib/services/nova-ai.service.ts` |
| **Tokens** | `app/plan/` | `app/api/user/tokens/` | `lib/services/token.service.ts` |
| **Literature** | `app/topics/` | `app/api/literature-search/route.ts` | `lib/services/literature-search.service.ts` |

**Middleware**: `lib/middleware/token-middleware.ts`

---

## 📦 Archive

Historical documentation and one-time fixes: **[archive/](./archive/)**
- NOVA_AI_FIXES.md - Historical AI fixes
- AI_CLEANUP_SUMMARY.md - v2.4.x cleanup details
- NOVA_AI_AUDIT_SUMMARY.md - Audit report
- And other temporary documents

---

## 🤝 Contributing

- **Keep contracts stable**: See [apis-critical-do-not-touch.md](./apis-critical-do-not-touch.md)
- **Database changes**: Use migrations; update docs accordingly
- **SSE payloads**: Prefer additive changes to maintain backward compatibility
- **Error messages**: Make them actionable and user-friendly
- **Testing**: Write tests for new features and bug fixes

---

**Last Updated**: 2025-10-17
