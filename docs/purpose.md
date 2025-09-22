# Purpose

## Goals
- Deliver trustworthy topic synthesis and citations from multiple sources
- Provide responsive, streaming-first UX with visible progress and robust aborts
- Ensure accurate token accounting with dynamic per-feature costs and refunds
- Offer extensible services and clear contracts for contributors

## Non-goals
- Long-form document editing beyond focused summaries/paraphrasing
- Offline-first operation (cloud-based AI and APIs)
- Hard-coding a single AI vendor (we use OpenRouter abstraction and fallbacks)

## Success metrics (examples)
- 95th percentile end-to-end topic report latency under X minutes (configurable)
- <1% failed streams without surfaced error to the user
- 100% token transaction reconciliation (deduct vs refund) for error/abort cases
- Onboarding time: new devs can run the app, hit an SSE route, and see progress within 30 minutes

## What to protect
- SSE event naming and headers (`text/event-stream`) across routes
- Token middleware (`withTokenValidation()`) and refund logic for streaming/non-streaming flows
- RLS boundaries and Supabase RPC contracts

## Pointers
- SSE: `app/api/ai/chat/stream/route.ts`, `app/api/topics/report/stream/route.ts`
- Tokens: `lib/middleware/token-middleware.ts`, tables `user_tokens`, `token_transactions`, `token_feature_costs`
- Planner: table `public.planner_drafts` and `supabase/migrations/20250921113000_create_planner_drafts.sql`
