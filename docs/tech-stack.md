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

## AI Service
- Server-side AI integration via:
  - `lib/enhanced-ai-service.ts` (multi-model optimization)
  - `lib/services/nova-ai.service.ts` (NOVA Chat)
  - `lib/services/paraphrase.service.ts` (Paraphrasing)
  - `lib/services/topic-report-agents.ts` (Multi-agent reports)
  - `lib/config/model-presets.ts` (7 Groq models)
- Multi-model architecture:
  - Qwen 3 32B (Chat - thinking mode + dialogue)
  - Llama 4 Scout (Summarization - 128K context)
  - Llama 3.1 8B Instant (Paraphrasing - ultra-fast)
  - GPT-OSS 120B (Report synthesis - frontier reasoning)
  - Llama 3.3 70B (General purpose fallback)
  - GPT-OSS 20B, Llama 4 Maverick (Additional options)
- No user API key management - all configuration server-side
- Environment variable: `GROQ_API_KEY`

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
