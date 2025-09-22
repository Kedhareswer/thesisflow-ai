# ThesisFlow-AI — About

ThesisFlow-AI is a research copilot that helps researchers, students, and teams search literature, extract insights, generate scholarly topic reports, paraphrase and cite sources, and plan research workflows with AI assistance.

- Audience: onboarding developers and contributors
- Tech foundations: Next.js (App Router), Node SSR APIs, streaming SSE, Supabase (auth + DB), OpenRouter (LLM), Stripe (billing)
- Repo context: application UI lives under `app/`, core services in `lib/` and `lib/services/`, API routes in `app/api/**`, schema and migrations in Supabase

## What it does
- Literature search with aggregation and rate-limit handling
  - UI hook: `hooks/use-literature-search.ts` (supports `aggregateWindowMs`, rate-limit recovery)
  - Service: `lib/services/literature-search.service.ts`
  - API: `app/api/literature-search/route.ts`
- Topic Explorer + Scholarly Report (SSE)
  - Page: `app/topics/page.tsx` (manual `ReadableStream` SSE parse; client timeout + cleanup)
  - SSE: `app/api/topics/report/stream/route.ts` (named events: `init`, `progress`, `token`, `done`, `error`, `ping`)
  - Non-stream fallback: `app/api/topics/report/route.ts`
  - Agents: `lib/services/topic-report-agents.ts`
- AI chat (SSE with fallback)
  - API: `app/api/ai/chat/stream/route.ts`
  - Provider client + fallback: `lib/ai-providers.ts`, `lib/enhanced-ai-service.ts`
- File extraction and summarization
  - APIs: `app/api/extract/route.ts`, `app/api/extract-file/route.ts`, `app/api/extract-simple/route.ts`, `app/api/extract-data/route.ts`
  - Services: `lib/services/file-extraction/*`, `lib/services/data-extraction.service.ts`, `lib/services/summarizer.service.ts`
- Citations and bibliography
  - Services: `lib/services/citation.service.ts`, `lib/services/citation-export.service.ts`
  - API: `app/api/citation/*`
- Collaboration, presence, and chat
  - APIs: `app/api/collaborate/*`
  - WebSocket servers: `server/websocket-server.js`, `server/chat-server.js`
- Billing and usage analytics
  - Stripe: `app/api/stripe/*`
  - Analytics components: `components/analytics/*`
  - Tokens: see `docs/tokens.md`

## Architecture at a glance
- Frontend: Next.js App Router with React, Tailwind, shadcn/ui
- Backend: Next.js API routes (Node runtime), SSE streaming, plus Node servers in `server/`
- Data/Auth: Supabase (RLS on most tables, security invoker views, RPC functions)
- AI: OpenRouter models with provider fallback and graceful degradation

See `docs/design-architecture.md` and `docs/sequences-and-flows.md` for system diagrams and detailed flows.

## Database (Supabase)
- Project URL: xxxxx
- Core tables (public): `user_tokens`, `user_plans`, `plan_limits`, `token_transactions`, `token_feature_costs`, `user_usage`, `literature_search_rate_limits`, `planner_drafts`, `user_profiles`, `user_settings`, `user_storage_providers`, `citation_collections`, `citation_items`, `documents`, `document_extractions`, `chat_messages`, `conversations`, `conversation_participants`, `teams`, `team_members`, `team_invitations`, `team_shared_links`, `team_files`
- Notable functions (public): `get_feature_cost`, `deduct_user_tokens`, `refund_user_tokens`, `check_token_rate_limit`, `reset_user_tokens_if_needed`, `initialize_user_tokens`, `check_literature_search_rate_limit`, `can_use_feature`

Tokens are monthly-only with dynamic costs by feature/context (e.g., quality, limit). See `lib/middleware/token-middleware.ts` and `docs/tokens.md`.

## Getting started (developer)
- Environment: copy `.env.example` to `.env.local` and fill required keys
  - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - OpenRouter: `OPENROUTER_API_KEY`
  - Stripe (optional locally): `STRIPE_*`
- Scripts: standard Next.js dev workflow (`pnpm dev`), ensure Node 18+
- Run-time notes: streaming endpoints require proper proxying in dev; see `server/proxy-server.js`

## Where to go next
- `docs/tech-stack.md` for a component-by-component technology overview
- `docs/backend.md` for API route taxonomy and SSE details
- `docs/integrations.md` for Supabase, OpenRouter, Search providers, Stripe, Render
- `docs/apis-critical-do-not-touch.md` for contracts you must not break
- `docs/sequences-and-flows.md` for Mermaid diagrams of key flows
