# Backend

This guide documents backend routes, streaming conventions, token middleware, and supporting Node services to help onboarding developers safely extend the system.

## Overview
- Next.js API routes under `app/api/**`
- Node runtime for Server-Sent Events (SSE)
- Supabase-backed token accounting and rate limiting
- Additional Node services under `server/` for WebSocket and proxy

## Route taxonomy (key endpoints)
- AI Chat (SSE)
  - `app/api/ai/chat/stream/route.ts`
- Topics report (SSE + fallback)
  - `app/api/topics/report/stream/route.ts`
  - `app/api/topics/report/route.ts`
- Literature search
  - `app/api/literature-search/route.ts`
- Extraction and data processing
  - `app/api/extract/route.ts`
  - `app/api/extract-file/route.ts`
  - `app/api/extract-simple/route.ts`
  - `app/api/extract-data/route.ts`
- Planner flow
  - `app/api/plan-and-execute/route.ts`
- Collaboration & presence
  - `app/api/collaborate/*` (messages, teams, invitations, presence, notifications)
- Billing & usage
  - `app/api/stripe/*`
  - `app/api/tokens/*`
  - `app/api/usage/*`

See additional endpoints in `app/api/` for citations, humanize/paraphraser, projects, upload, etc.

## Streaming (SSE) conventions
- Required headers:
  - `Content-Type: text/event-stream`
  - `Connection: keep-alive`
  - `Cache-Control: no-cache`
- Event names:
  - `init` — handshake/initial payload
  - `progress` — milestone updates (e.g., curation/analysis/synthesis)
  - `token` — incremental model output
  - `error` — structured error payload
  - `done` — terminal success
  - `ping` — heartbeat (every ~10–15s)
- Client consumption:
  - Chat uses `EventSource` (see `lib/ai-providers.ts` consumer)
  - Topics report uses manual `ReadableStream` parsing in `app/topics/page.tsx`
- Abort handling:
  - Always observe `request.signal` and close the stream on client abort
  - Ensure timers/heartbeats are cleared on success/error/abort

## Token middleware & accounting
- Entry point: `lib/middleware/token-middleware.ts`
  - `withTokenValidation(featureName, handler)` wraps route handlers
  - Parses dynamic context (e.g., `origin`, `feature`, `quality`, `limit`) from headers/query/body
  - Deducts tokens based on `public.get_feature_cost` in Supabase
- Dynamic, monthly-only tokens (see `docs/tokens.md`)
- Refund semantics:
  - Non-stream routes: throw on failure to let the middleware auto-refund
  - Stream routes: explicitly compute context and call `tokenService.refundTokens()` on error/abort
- Service: `lib/services/token.service.ts`
  - Wraps RPC calls: `deduct_user_tokens`, `refund_user_tokens`, `check_token_rate_limit`, etc.
  - Rate-limit fallback behavior (service unavailable) is environment-gated via `RATE_LIMIT_FALLBACK_ALLOW` (default: unset/false):
    - When `true` (dev/test only): permissive fallback allows requests with a safe cap (e.g., `monthlyRemaining = 1000`)
    - When `false`/unset: conservative fallback denies requests (`allowed = false`)
    - Fallback responses include `fallback: true` and `fallbackReason` for observability

## Error handling & provider fallback
- AI chat streaming (`app/api/ai/chat/stream/route.ts`) implements provider/model fallback on unsupported/400 errors
- Topics report streaming emits `error` SSE with human-readable messages, then cleans up
- Literature search route surfaces rate-limit headers and descriptive errors
- SSE error payloads sanitized: stack traces only in development mode, no internal details in production
- Input validation: `maxIterations` clamped (1-5), `description` type-checked to prevent runaway workloads

## Supporting Node services
- `server/websocket-server.js`
  - Presence and real-time messaging backbone
- `server/chat-server.js`
  - Chat orchestration and event relays
- `server/proxy-server.js`
  - Dev proxy, optional keepalive for hosting

## Supabase (DB & Auth)
- URL: xxxxx
- RLS-enabled tables (highlights):
  - Tokens & plans: `user_tokens`, `user_plans`, `plan_limits`, `token_transactions`, `token_feature_costs`, `user_usage`
  - Literature search: `literature_search_rate_limits`
  - Planner: `planner_drafts`
  - Collaboration & chat: `teams`, `team_members`, `team_invitations`, `chat_messages`, `conversations`, `conversation_participants`, `team_shared_links`, `team_files`
  - Users & profiles: `user_profiles`, `user_settings`, `user_storage_providers`, `users` (security invoker view)
  - Documents & citations: `documents`, `document_extractions`, `citation_collections`, `citation_items`
- Functions (public highlights):
  - `get_feature_cost`, `deduct_user_tokens`, `refund_user_tokens`, `check_token_rate_limit`, `reset_user_tokens_if_needed`, `initialize_user_tokens`, `check_literature_search_rate_limit`, `can_use_feature`

## Developer tips
- Keep SSE event naming stable; clients depend on exact names
- For streaming handlers, implement per-stage timeouts and explicit refunds
- Use typed responses and consistent error shapes
- Prefer services in `lib/services/**` for business logic; keep route handlers thin
