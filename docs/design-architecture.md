# Design & Architecture

This document describes the system architecture, module boundaries, data model highlights, and the critical runtime contracts that power ThesisFlow-AI.

- Frontend: Next.js App Router (React), Tailwind, shadcn/ui
- Backend: Next.js API routes (Node runtime) with Server-Sent Events (SSE)
- Services: `lib/services/**` encapsulating domain logic
- Data/Auth: Supabase (RLS-enabled Postgres, RPC functions, views)
- Realtime/Proxy: Node servers in `server/`

See diagrams in `docs/sequences-and-flows.md`.

## Module boundaries
- UI (`app/`, `components/`, `src/components/ai-elements/`)
  - Server/client components, route-level layouts, page compositions
  - Component library in `components/ui/` with shadcn/ui patterns
  - Homepage showcases: `ResearchHeroWithCards`, `StatsCarouselCount`, research stacking cards
  - Hooks in `hooks/**` (e.g., `use-literature-search.ts`, `use-chat-socket.ts`)
- API (`app/api/**`)
  - App Router route handlers (REST/SSE)
  - Streaming endpoints set `Content-Type: text/event-stream` and emit named events
- Services (`lib/services/**`)
  - Simplified AI service (`enhanced-ai-service.ts`) - server-side only, no user API keys
  - Literature search, extraction, summarization, planning, analytics, tokens
  - Single AI provider architecture (no fallback complexity)
- Middleware (`lib/middleware/token-middleware.ts`)
  - Token checks, rate limits, cost calculation, deduction/refund orchestration
- Servers (`server/`)
  - `server/websocket-server.js` (presence & realtime)
  - `server/chat-server.js` (chat orchestration)
  - `server/proxy-server.js` (dev proxy/keepalive)

## Key backend routes (taxonomy)
- AI / Chat
  - `app/api/ai/chat/stream/route.ts` (SSE with fallback)
- Topics
  - `app/api/topics/report/stream/route.ts` (SSE scholarly report)
  - `app/api/topics/report/route.ts` (non-stream fallback)
- Literature Search
  - `app/api/literature-search/route.ts`
- Extraction & Summarization
  - `app/api/extract/route.ts`, `app/api/extract-file/route.ts`, `app/api/extract-simple/route.ts`, `app/api/extract-data/route.ts`
- Planner & Execute
  - `app/api/plan-and-execute/route.ts`
- Collaboration & Presence
  - `app/api/collaborate/*`
- Billing & Usage
  - `app/api/stripe/*`, `app/api/tokens/*`, `app/api/usage/*`

## Streaming (SSE) contract
- Headers: `Content-Type: text/event-stream`, `Connection: keep-alive`, `Cache-Control: no-cache`
- Event names used consistently:
  - `init` — initial handshake/payload
  - `progress` — stage updates (e.g., curation → analysis → synthesis)
  - `token` — incremental content output
  - `error` — structured error payload
  - `done` — terminal success signal
  - `ping` — heartbeat every 10–15s
- Client-side parsing patterns:
  - Chat: `EventSource`
  - Topics Report: manual `ReadableStream` decode in `app/topics/page.tsx`

## Token model
- Monthly-only tokens (no daily counters) — see `docs/tokens.md`
- Dynamic per-feature costs computed by Supabase `public.get_feature_cost` using context keys:
  - `feature`, `origin`, `quality`, `limit`, and others
- Middleware: `withTokenValidation()` wrappers enforce deduct and rate-limit checks
- Streaming refunds:
  - Non-stream routes: throw on error to let middleware auto-refund
  - Stream routes: explicitly perform refund in the handler on error/abort

## Rate limits & aggregation
- Literature search rate limit: `public.check_literature_search_rate_limit`

## Analytics & Taxonomy
- Canonical feature taxonomy (examples): `explorer_assistant`, `explorer_explore`, `explorer_ideas`, `plan_and_execute`, `deep_research`, `planner_apply`, `writer`, `paraphraser`, `extract_data`, `topics_extract`, `topics_report`, `citations`, `chat_pdf`, `ai_detector`.
- Zero-cost usage is still recorded to ensure visibility in analytics (e.g., Explorer Assistant bypass). These entries are written to `public.usage_events` with `tokens_charged = 0`.
- Data sources:
  - `token_transactions` (additive metrics for deduct rows)
  - `usage_events` (zero-cost or non-deducted usage)
- Aggregation:
  - Materialized view `usage_daily_mv` aggregates by day and dimensions (service, provider, model, feature_name, etc.).
  - The Analytics API (`/api/usage/analytics/v2`) merges `usage_daily_mv` with aggregated `usage_events` at request time for additive metrics (Tokens, Requests, Cost). Non-additive metrics are derived from the MV only.
- Dimensions supported by the API/UI: `service`, `feature`, `provider`, `model`, `api_key_owner` (user/system), `api_key_provider` (openrouter, openai, etc.).
- Providers are normalized in the UI so OpenRouter-based entries display as `NOVA`; model names are grouped into families (GPT, Claude, Llama, Gemini, Mixtral, Qwen, DeepSeek, GLM, Nemotron, Gemma, Mistral, Other).

## Component Structure

### Core Components
- **Research Assistant**: AI-powered chat interface
- **Literature Search**: Multi-source paper discovery
- **Project Planner**: Task management with Gantt charts
- **Data Extraction**: PDF/document analysis
- **Collaboration Hub**: Team workspace
- **LaTeX Writer**: Document editing with real-time preview
- **Support Chat System**: Deterministic help system (home page only)

## Supabase schema highlights
- URL: xxxxx
- Tokens & plans: `user_tokens`, `user_plans`, `plan_limits`, `token_transactions`, `token_feature_costs`, `user_usage`
- Literature search: `literature_search_rate_limits`
- Planner: `planner_drafts`
- Collaboration: `teams`, `team_members`, `team_invitations`, `team_shared_links`, `team_files`, presence/chat tables
- Users & profiles: `user_profiles`, `user_settings`, `user_storage_providers`, `users` (security-invoker view)
- Documents & citations: `documents`, `document_extractions`, `citation_collections`, `citation_items`
- Functions (public): `get_feature_cost`, `deduct_user_tokens`, `refund_user_tokens`, `check_token_rate_limit`, `reset_user_tokens_if_needed`, `initialize_user_tokens`, `check_literature_search_rate_limit`, `can_use_feature`

## Migrations of note
- Token system: `create_token_system_fixed`, `monthly_only_tokens_20250919`, `insert_feature_costs_and_policies`, `update_token_functions_idempotency`
- Literature search: `enhanced_literature_search_system`, `literature_search_rate_limits_table`
- Planner: `create_planner_drafts`
- Collaboration & chat: multiple RLS/policy/index migrations across July–Sept 2025

## Error handling & fallbacks
- Provider fallback on model incompatibilities or 400/unsupported errors
- SSE emits structured `error` before stream closes; server cleans heartbeats
- Client abort: ensure route observes `request.signal` and refunds as needed

## Directory map (partial)
- UI: `app/**`, `components/**`, `src/components/ai-elements/`
- Hooks: `hooks/**`
- API: `app/api/**`
- Services: `lib/services/**`
- Providers & config: `lib/ai-providers.ts`, `lib/enhanced-ai-service.ts`, `lib/config/model-presets.ts`
- Middleware: `lib/middleware/token-middleware.ts`
- Servers: `server/**`

For end-to-end diagrams, see `docs/sequences-and-flows.md`.
