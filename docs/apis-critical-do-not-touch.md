# APIs — Critical Contracts (Do Not Change)

This document lists API and system contracts that must remain stable. Breaking these will cause runtime failures in the UI, token accounting, or integrations.

## 1) SSE event contract (global)
- Headers:
  - `Content-Type: text/event-stream`
  - `Connection: keep-alive`
  - `Cache-Control: no-cache`
- Event names (MUST NOT CHANGE):
  - `init` — initial handshake/payload
  - `progress` — human-friendly stage updates
  - `token` — incremental content (model output chunks)
  - `error` — structured error payload with `error` or `message` field
  - `done` — terminal success
  - `ping` — heartbeat (every ~10–15s)
- Client dependencies:
  - Chat uses `EventSource` via `lib/ai-providers.ts`
  - Topics report uses manual `ReadableStream` parsing in `app/topics/page.tsx`

## 2) Topics — Scholarly Report (SSE)
- Route: `app/api/topics/report/stream/route.ts`
- Inputs:
  - Headers: optional `Authorization: Bearer <access_token>`
  - Query: `quality`, `limit`
  - Body: `{ query: string, papers: Paper[], quality?: string }`
- Events (order): `init` → `progress`/`token` → `done` (or `error`)
- Requirements:
  - Per-stage timeouts and overall deadline; on timeout, emit `error` then close
  - Observe `request.signal` for client abort; close stream
  - On error/abort, explicitly REFUND tokens using the same dynamic context used for deduct
  - Clear heartbeats on success/error/abort
- UI dependency: `app/topics/page.tsx` parses named events; do not change event names or JSON shapes

## 3) AI Chat (SSE with fallback)
- Route: `app/api/ai/chat/stream/route.ts`
- Behavior:
  - Enforce token checks and rate limits
  - Stream tokens with named events
  - On provider/model incompatibility or 400 errors, automatically fall back to alternative providers/models
  - Emit `error` before closing on fatal failure
- Client: `lib/ai-providers.ts` (EventSource consumer). Do not change event names.

## 4) Literature Search
- Route: `app/api/literature-search/route.ts`
- Semantics:
  - Returns JSON results (not SSE) but cooperates with the aggregation window managed by `hooks/use-literature-search.ts`
  - On rate limit, return 429 and `Retry-After` header; include clear error message
  - Keep response shape stable for the hook consumers

## 5) Extraction APIs
- Routes: `app/api/extract/route.ts`, `app/api/extract-file/route.ts`, `app/api/extract-simple/route.ts`, `app/api/extract-data/route.ts`
- Contracts:
  - Stable request/response shapes across endpoints (files, parsed text, tables, entities)
  - Errors are structured with `message` and `code` where available
  - Do not rename keys used by the UI without coordination

## 6) Planner — Plan & Execute (SSE)
- Route: `app/api/plan-and-execute/route.ts`
- Events: should follow the global SSE contract; include `progress` and `token` where applicable, `done` on success, `error` on failure

## 7) Token Middleware and Accounting
- Middleware entry: `lib/middleware/token-middleware.ts`
  - Wrapper: `withTokenValidation(featureName, handler)` MUST remain stable
  - Dynamic context parsing (MUST NOT CHANGE keys without coordination): `feature`, `origin`, `quality`, `limit`, etc.
  - Deduct via Supabase `public.get_feature_cost` result
  - Non-stream routes REFUND on throw (middleware auto-refund)
  - Stream routes MUST explicitly REFUND on error/abort from inside the handler
- Service: `lib/services/token.service.ts` (keep method names and semantics)

## 8) Supabase RPCs (names and signatures)
- MUST NOT CHANGE without a coordinated migration + code updates:
  - `public.get_feature_cost(p_feature_name text, p_context jsonb)`
  - `public.deduct_user_tokens(p_user_id uuid, p_feature_name text, p_tokens int, p_context jsonb)`
  - `public.refund_user_tokens(p_user_id uuid, p_feature_name text, p_tokens int, p_context jsonb)`
  - `public.check_token_rate_limit(p_user_id uuid, p_feature_name text, p_context jsonb)`
  - `public.reset_user_tokens_if_needed(p_user_id uuid)`
  - `public.initialize_user_tokens(p_user_id uuid)`
  - `public.append_usage_metrics(p_transaction_id uuid, p_metrics jsonb)`
  - `public.check_literature_search_rate_limit(p_user_id uuid, p_ip inet, p_limit int, p_window_minutes int)`
  - `public.can_use_feature(p_user_id uuid, p_feature_name text)`

## 9) Supabase Tables (critical columns)
- `public.user_tokens` — `user_id`, `monthly_tokens_used`, `monthly_limit`, `last_monthly_reset`
- `public.token_transactions` — `operation_type`, `tokens_amount`, `feature_name`, `operation_context`, `idempotency_key`, `input_tokens`, `output_tokens`, `provider_cost_usd`, `latency_ms`
- `public.plan_limits` — `plan_type`, `feature_name`, `limit_value`
- `public.token_feature_costs` — `feature_name`, `base_cost`, `cost_multipliers`
- Do not drop or rename these without coordinated migrations and code updates

## 10) Auth & Protected Routes
- Middleware: `middleware.ts` guards protected routes; do not remove protections or change cookie names used by Supabase auth
- Server-side helpers must continue to accept auth from headers, cookies, and query params where documented (SSE compatibility)

## 11) Backward compatibility policy
- When adding fields to SSE payloads, only EXTEND payloads; do not rename or remove existing fields
- When modifying response JSON, maintain old keys while introducing new ones; deprecate with a migration period

## 12) Testing gates (before merge)
- Verify SSE flows:
  - Event order and names unchanged
  - Heartbeat cleared on success/error
  - Client abort triggers server abort and refund (stream routes)
- Verify token transactions:
  - Deduct on start
  - Refund on error/abort
  - No double-refunds or missing refunds
