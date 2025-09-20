# ThesisFlow-AI Token System

This document describes the token accounting model, relevant database objects, RPC functions, and HTTP API endpoints.

## Overview
- Token quotas are tracked per user with monthly limits only.
- All deductions/refunds are performed atomically inside Postgres functions (RPC), eliminating race conditions.
- Operations are idempotent when a stable `Idempotency-Key` is provided.
- Server routes authenticate via a centralized `requireAuth` helper that accepts Bearer header, query token, or Supabase cookies.

## Database Objects (public)

- `user_tokens`
  - Tracks usage and limits per user.
  - Columns: `user_id (PK/FK)`, `monthly_tokens_used`, `monthly_limit`, `last_monthly_reset (date)`, timestamps.
  - Resets are triggered by `reset_user_tokens_if_needed(user_id)` at month boundaries.

- `token_transactions`
  - Append-only ledger of token operations.
  - Columns: `id (uuid)`, `user_id`, `operation_type` ('deduct' | 'refund' | 'grant' | 'reset'), `tokens_amount`, `feature_name`, `operation_context jsonb`, `success boolean`, `error_message text`, `ip_address inet`, `user_agent text`, `idempotency_key text`, `created_at`.
  - Indexes:
    - `(user_id, created_at desc)` for fast history.
    - Unique `(user_id, operation_type, idempotency_key)` for idempotency (NULLs allowed).

- `token_feature_costs`
  - Configures base costs per feature with optional context multipliers.
  - Columns: `feature_name (unique)`, `base_cost`, `description`, `cost_multipliers jsonb`, `is_active`.

- `user_plans`
  - Associates a plan (free/pro) with per-user limits.

- `plan_limits` (RLS enabled; service_role only)
  - Central limits by `plan_type`/`feature_name` used by RPC to determine allowances.

## RPC Functions

All functions are defined with `security definer` and pinned `search_path = public, pg_temp`. Schema-qualified references are used for safety.

- `initialize_user_tokens(p_user_id uuid)`
  - Ensures a `user_tokens` row exists.

- `reset_user_tokens_if_needed(p_user_id uuid)`
  - Resets monthly counters at month boundaries.

- `check_user_tokens(p_user_id uuid, p_tokens_needed int)` => jsonb
  - Returns `{ has_tokens, monthly_remaining, monthly_limit, tokens_needed }`.

- `check_token_rate_limit(p_user_id uuid, p_feature_name text, p_context jsonb)` => jsonb
  - Returns `{ allowed, tokensNeeded, monthlyRemaining, resetTime, errorMessage? }`.

- `get_feature_cost(p_feature_name text, p_context jsonb)` => int
  - Returns dynamic cost for a feature based on context multipliers.

- `deduct_user_tokens(p_user_id uuid, p_feature_name text, p_tokens_amount int, p_context jsonb, p_ip_address inet, p_user_agent text)` => jsonb
  - Atomically resets if needed, checks limits, updates usage, and logs a transaction.
  - Idempotent: when `p_context->>'idempotencyKey'` is present, duplicate requests return the original successful transaction.
  - Returns `{ success, transaction_id?, tokens_deducted?, error? }`.

- `refund_user_tokens(p_user_id uuid, p_tokens_amount int, p_feature_name text, p_context jsonb)` => jsonb
  - Atomically decreases usage (never below 0) and logs a transaction.
  - Idempotent via `p_context->>'idempotencyKey'`.
  - Returns `{ success, transaction_id?, tokens_refunded?, error? }`.

## HTTP API Endpoints

All endpoints require authentication. Routes set `Cache-Control: no-store`.

### GET `/api/user/tokens`
- Read-only status for the current user.
- Response:
```json
{
  "monthlyUsed": number,
  "monthlyLimit": number,
  "monthlyRemaining": number
}
```
- Errors: `401 Unauthorized`, `404 Token status unavailable`, `500`.

### POST `/api/user/tokens/deduct`
- Body:
```json
{
  "feature": "string",
  "amount": 1,
  "context": { "sessionId": "abc" },
  "idempotencyKey": "optional"
}
```
- Headers:
  - `Idempotency-Key: <key>` (preferred over body field if present)
- Success Response:
```json
{
  "success": true,
  "monthlyUsed": number,
  "monthlyLimit": number,
  "monthlyRemaining": number
}
```
- Errors:
  - `400 Invalid payload`
  - `401 Unauthorized`
  - `429 Rate limited` (includes `Retry-After: seconds`)
  - `500 Failed to deduct tokens`

### POST `/api/user/tokens/refund`
- Body/Headers same as deduct.
- Success Response shape matches deduct status payload.
- Errors: `400`, `401`, `500`.

## Authentication
- Centralized helper: `lib/server/auth.ts` `requireAuth(request)`
  - Accepts:
    - `Authorization: Bearer <token>`
    - Query: `?access_token=` or `?token=`
    - Supabase cookies: `sb-access-token` / `supabase-auth-token`

## Idempotency
- Provide a stable `Idempotency-Key` header for retries.
- Server persists the key on `token_transactions.idempotency_key`.
- RPC de-duplicates and returns the existing transaction result.

## Rate Limiting
- `check_token_rate_limit` is invoked prior to deductions.
- 429 includes `Retry-After` based on the `resetTime` returned by the RPC.

## Security
- RLS enabled for sensitive tables (`plan_limits`, `user_usage`, etc.).
- Many RLS policies now wrap `auth.uid()` in a subselect to avoid per-row re-evaluation.
- Functions have pinned `search_path`.
- `public.users` view runs with `security_invoker`.

## Best Practices for Clients
- Always set `Idempotency-Key` for any non-read operation.
- Handle `429` with jittered backoff until `Retry-After` elapses.
- Display remaining quota using `/api/user/tokens`.
- Avoid caching responses; observe `Cache-Control: no-store`.

## Change Log (Token System)
- Switched to RPC-based atomic deductions/refunds.
- Added idempotency support end-to-end.
- Standardized auth with `requireAuth` across token routes.
- Added rate-limit handling with `Retry-After`.
