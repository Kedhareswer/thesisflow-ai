# Integrations

This document describes all external and internal integrations used by ThesisFlow-AI with implementation pointers for onboarding developers.

## Supabase (Auth + DB)
- URL: xxxxx
- Client init: `integrations/supabase/client.ts`
- Types: `integrations/supabase/types.ts`
- Auth: JWT cookies; protected routes via `middleware.ts` and server-side `requireAuth`
- RLS: enabled on most public tables; security-invoker view `public.users`

### Key tables (public)
- Tokens & plans: `user_tokens`, `user_plans`, `plan_limits`, `token_feature_costs`, `token_transactions`, `user_usage`
- Literature search: `literature_search_rate_limits`
- Planner: `planner_drafts`
- Users & profiles: `user_profiles`, `user_settings`, `user_storage_providers`, `users` (view)
- Collaboration & chat: `teams`, `team_members`, `team_invitations`, `chat_messages`, `conversations`, `conversation_participants`, `team_shared_links`, `team_files`
- Documents & citations: `documents`, `document_extractions`, `citation_collections`, `citation_items`

### Functions (public highlights)
- Token & usage:
  - `get_feature_cost(p_feature_name text, p_context jsonb)`
  - `deduct_user_tokens(p_user_id uuid, p_feature_name text, p_tokens int, p_context jsonb)`
  - `refund_user_tokens(p_user_id uuid, p_feature_name text, p_tokens int, p_context jsonb)`
  - `check_token_rate_limit(p_user_id uuid, p_feature_name text, p_context jsonb)`
  - `reset_user_tokens_if_needed(p_user_id uuid)`
  - `initialize_user_tokens(p_user_id uuid)`
  - `append_usage_metrics(p_transaction_id uuid, p_metrics jsonb)`
- Literature search rate limit:
  - `check_literature_search_rate_limit(p_user_id uuid, p_ip inet, p_limit int DEFAULT 100, p_window_minutes int DEFAULT 60)`
- Feature gating:
  - `can_use_feature(p_user_id uuid, p_feature_name text)`

### Migrations of note
- Token system (monthly-only): `monthly_only_tokens_20250919`, `create_token_system_fixed`, `insert_feature_costs_and_policies`, `update_token_functions_idempotency`
- Literature search: `enhanced_literature_search_system`, `create_literature_search_rate_limits_table`
- Planner drafts: `create_planner_drafts`

## AI Service
- Service: `lib/enhanced-ai-service.ts` (simplified, server-side only)
- Direct integration with Llama-3.3-70B via server-configured API
- Usage:
  - All AI features use server-side API keys exclusively
  - No user API key management required
- Environment: `GROQ_API_KEY` (configured server-side only)
- Note: Uses internal name "Nova AI" for consistency

## Search providers
- Aggregated by: `lib/services/literature-search.service.ts`
- Likely sources: OpenAlex, arXiv, CrossRef, Google CSE, DuckDuckGo, Tavily, Context7, LangSearch
- Environment: see `.env.example` for relevant API keys (e.g., Google CSE key/engine id, Tavily key)
- Rate-limit handling: surfaced by `app/api/literature-search/route.ts` and `hooks/use-literature-search.ts`

## Stripe (Billing)
- Endpoints: `app/api/stripe/*`
- Plan and usage in DB: `user_plans`, `plan_limits`, `user_usage`
- Token model: monthly-only; explorer tabs may be unlimited per `plan_limits` rows

## Render / Hosting / Keepalive
- Keepalive helper: `lib/services/render-keepalive.service.ts`
- WebSocket and proxy services in `server/` may be deployed as separate processes depending on hosting

## WebSockets / Realtime
- `server/websocket-server.js` and `server/chat-server.js`
- Presence tables and collaboration endpoints in `app/api/collaborate/*`
- Client hook: `hooks/use-chat-socket.ts`

## File extraction
- APIs: `app/api/extract*`
- Services: `lib/services/file-extraction/*`, `lib/services/data-extraction.service.ts`, `lib/services/summarizer.service.ts`

## Citations
- APIs: `app/api/citation/*`
- Services: `lib/services/citation.service.ts`, `lib/services/citation-export.service.ts`

## Notes for contributors
- Always keep SSE event names consistent across providers and UIs
- For streaming routes, ensure explicit refunds are performed on error/abort
- Keep Supabase RPC names and argument shapes unchanged without a coordinated migration
