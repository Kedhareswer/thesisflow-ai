# Tech Stack

## Frontend
- Next.js (App Router)
- React 18 (client/server components)
- Tailwind CSS
- shadcn/ui components
- Markdown rendering for AI responses

## Backend
- Next.js API routes under `app/api/**`
- Node runtime for SSE and server utilities
- Additional Node servers under `server/`:
  - `server/websocket-server.js` (presence/chat)
  - `server/chat-server.js` (chat orchestration)
  - `server/proxy-server.js` (dev proxy/keepalive)

## Data and Auth
- Supabase
  - Auth (JWT, cookies)
  - Postgres DB with RLS
  - RPC functions for tokens, usage, and limits
  - URL: xxxxx

## AI Provider
- Nova AI (Groq) via:
  - `lib/services/nova-ai.service.ts`
  - Direct Llama-3.3-70B integration
  - Research-optimized prompting
- Single provider for reliability and simplicity

## Search Providers
- OpenAlex, arXiv, CrossRef
- Google Custom Search (CSE)
- DuckDuckGo
- Tavily
- Context7 docs API
- LangSearch
- Unified by `lib/services/literature-search.service.ts` and related modules

## Payments
- Stripe via `app/api/stripe/*`

## Streaming (SSE)
- Content-Type: `text/event-stream`
- Named events: `init`, `progress`, `token`, `error`, `done`, `ping`
- Implemented in routes such as:
  - `app/api/ai/chat/stream/route.ts`
  - `app/api/topics/report/stream/route.ts`

## Tokens & Rate Limits
- Monthly-only tokens (see `docs/tokens.md`)
- Dynamic costs per feature/context (Supabase `public.get_feature_cost`)
- Token middleware: `lib/middleware/token-middleware.ts`
- Rate limiting for literature search using `public.check_literature_search_rate_limit`

## Notable Directories
- UI pages: `app/**/page.tsx`
- API routes: `app/api/**`
- Services: `lib/services/**`
- Hooks: `hooks/**`
- Middleware: `lib/middleware/token-middleware.ts`
- Types: `lib/types.ts`, `integrations/supabase/types.ts`
