# Tokens

- Sources: `app/tokens/page.tsx`, `components/token/token-usage-dashboard.tsx`
- Services: `lib/services/token.service.ts`, middleware `lib/middleware/token-middleware.ts`

## What is here
- A dashboard showing your monthly token usage/limits, dynamic feature costs, and recent transactions.

## Why it is used
- Provide transparency into the monthly-only token system, costs per feature, and a history of deductions/refunds.

## How it works
- Page component `app/tokens/page.tsx` renders `TokenUsageDashboard` inside a `RouteGuard`.
- `TokenUsageDashboard`:
  - Fetches the current user via `supabase.auth.getUser()`.
  - Loads three data sets in parallel using `tokenService`:
    - `getUserTokenStatus(userId)` → monthlyUsed, monthlyLimit, monthlyRemaining.
    - `getTokenTransactions(userId, 20)` → newest 20 transactions.
    - `getFeatureCosts()` → feature list with base costs and multipliers.
  - Displays metrics, a feature cost grid, and a transaction list with icons and timestamps.

## APIs & Integrations (Database + RPC)
- `lib/services/token.service.ts` uses Supabase client (anon on client, service-role on server):
  - `check_user_tokens(p_user_id, p_tokens_needed)` → status for a given operation.
  - `check_token_rate_limit(p_user_id, p_feature_name, p_context)` → returns `allowed`, `tokens_needed`, `monthly_remaining`, `reset_time`.
  - `deduct_user_tokens(p_user_id, p_feature_name, p_tokens_amount, p_context, p_ip_address, p_user_agent)` → returns `{ success, transaction_id, error }`.
  - `refund_user_tokens(p_user_id, p_tokens_amount, p_feature_name, p_context)` → returns `{ success, transaction_id }`.
  - `get_feature_cost(p_feature_name, p_context)` → number (dynamic cost based on context like `per_result`, `quality`, etc.).
  - `initialize_user_tokens(p_user_id)` → ensures `user_tokens` row exists for new users.
- Tables used/read:
  - `user_tokens`: `monthly_tokens_used`, `monthly_limit`.
  - `token_transactions`: history of `deduct`, `refund`, `grant`, `reset`.
  - `token_feature_costs`: base costs and `cost_multipliers` per feature.

## Authentication and Authorization
- Page enforces auth via `RouteGuard` client-side; note that `/tokens` is not currently listed under `middleware.ts` `protectedRoutes`, so server-side redirect protection is not applied.
- Note: `/tokens` is not currently listed in `middleware.ts` `protectedRoutes`; add it there if you want server-side redirect protection like other pages.
- Dashboard fetches via client Supabase auth session; RLS must permit user to read their own `user_tokens` and `token_transactions` rows.
- RPCs that modify state (`deduct_user_tokens`, `refund_user_tokens`, `initialize_user_tokens`) should be SECURITY DEFINER and validate `auth.uid()` server-side.

## Security Practices
- No secrets on client. The Supabase client uses anon key.
- IPC and correlation:
  - `TokenMiddleware` issues a correlation ID per request and sets `X-Correlation-Id`, `X-Tokens-Used`, and `X-Token-Transaction-ID` headers.
  - Requests include `ipAddress` and `userAgent` to the `deduct_user_tokens` RPC for auditing.
- API indexing blocked by `middleware.ts` which sets `X-Robots-Tag: noindex, nofollow` on `/api/*`.

## Billing / Token Model
- Monthly-only token model with dynamic, per-feature costs via `get_feature_cost`.
- Example dynamic inputs:
  - `per_result` mapped from query `limit`.
  - `quality` flags like `Enhanced`, `high`, `deep-review` set `high_quality=true`.
- Bypass:
  - `TokenMiddleware` explicitly bypasses deduction for `ai_chat` when `origin=explorer` and `feature=assistant` (Explorer Assistant is free).
- Refunds:
  - On handler failure or streaming error/abort, services call `tokenService.refundTokens` (see `app/api/topics/report/stream/route.ts`).

## Middleware
- `lib/middleware/token-middleware.ts` provides `withTokenValidation(featureName, handler, options)` to wrap API routes:
  - Auth via `requireAuth`.
  - Compute tokens via `tokenService.getFeatureCost(featureName, context)`.
  - Rate limit via `tokenService.checkRateLimit(...)`.
  - Deduct before executing handler; on error, refund.
  - Returns 429 with `Retry-After`, `X-RateLimit-Remaining-Monthly`, and `X-RateLimit-Reset` as appropriate.

## Error Handling
- Dashboard shows loading skeletons and error toasts on failures.
- If token status fails to load, shows an "Unavailable" callout with a retry button.
- API routes using `withTokenValidation` return clear JSON errors with status 401/402/429/500.

## Tests
- Unit:
  - `token.service.ts`: mock Supabase client to test `getUserTokenStatus`, `getFeatureCosts`, `getTokenTransactions`.
  - `TokenUsageDashboard`: renders metrics, formats transactions, refresh button state.
- Black box:
  - Simulate an API wrapped with `withTokenValidation` and verify headers and 429 responses.
  - Verify refund path via an endpoint that throws after deduction.

## Sequence (Dashboard fetch)
```mermaid
sequenceDiagram
  autonumber
  participant UI as TokenUsageDashboard
  participant SB as Supabase PostgREST/RPC

  UI->>SB: auth.getUser()
  SB-->>UI: { user.id }
  par parallel loads
    UI->>SB: RPC getUserTokenStatus(userId)
    UI->>SB: select * from token_feature_costs where is_active
    UI->>SB: select * from token_transactions where user_id=userId order by created_at desc limit 20
  and
  SB-->>UI: { monthlyUsed, monthlyLimit, monthlyRemaining }
  SB-->>UI: [{ featureName, baseCost, costMultipliers }]
  SB-->>UI: [transactions]
```

## Related Files
- `app/tokens/page.tsx`
- `components/token/token-usage-dashboard.tsx`
- `lib/services/token.service.ts`
- `lib/middleware/token-middleware.ts`
- APIs that use the middleware (examples):
  - `app/api/ai/chat/stream/route.ts` (ai_chat)
  - `app/api/literature-search/route.ts` (literature_search)
  - `app/api/topics/report/stream/route.ts` (topics_report)
