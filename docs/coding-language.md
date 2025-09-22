# Coding Language and Conventions

This repository primarily uses TypeScript and TSX (React) under Next.js App Router.

## Language and patterns
- TypeScript everywhere in `app/`, `lib/`, `hooks/`, and `lib/services/`
- React server and client components under `app/**/page.tsx` and supporting components in `components/`
- Node-side utilities in `lib/server/` and additional Node services in `server/`
- API routes in `app/api/**` (App Router handlers)

## Naming conventions
- Components: `PascalCase` file and export names; files typically end with `.tsx`
- Functions/variables: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE` when global/immutable
- Paths in docs and comments should be backticked, e.g. `app/api/ai/chat/stream/route.ts`

## Imports and module boundaries
- Keep imports at the top of files (no dynamic import side-effects in mid file)
- Prefer path aliases configured in `tsconfig.json` where available
- Respect boundaries:
  - UI-only logic in components and hooks
  - Network/streaming logic in API routes and service layers
  - Persistence/DB logic in Supabase (RPCs, views, RLS)

## SSE event contract
When implementing or consuming Server-Sent Events (SSE), use the following event names consistently:
- `init` — initial handshake/data
- `progress` — stage or progress messages
- `token` — streaming tokens/partial content
- `error` — error payloads
- `done` — completion signal
- `ping` — heartbeat for connection liveness

Headers for SSE should include `Content-Type: text/event-stream`, `Connection: keep-alive`, and appropriate no-cache directives. See `app/api/ai/chat/stream/route.ts` and `app/api/topics/report/stream/route.ts` for examples.

## Error handling and fallbacks
- API routes should translate upstream errors into typed failures and SSE `error` events when streaming
- For AI model calls, prefer provider fallback patterns (`lib/ai-providers.ts`, `lib/enhanced-ai-service.ts`)
- For streaming routes, ensure you either:
  - Throw to the middleware for automatic refund (non-stream), or
  - Explicitly refund tokens on error/abort in the route handler (stream)

## Tokens and accounting
- All features are on monthly-only tokens (see `docs/tokens.md`)
- Dynamic cost is computed by Supabase function `public.get_feature_cost` using context keys (e.g., `quality`, `limit`, `origin`, `feature`)
- Middleware hook: `lib/middleware/token-middleware.ts` exposes `withTokenValidation()`
- Service: `lib/services/token.service.ts` handles deduct/refund and RPC wrapping

## Rate limiting and aggregation
- Literature search aggregation window is exposed via `hooks/use-literature-search.ts` (`aggregateWindowMs`).
- Retry and `Retry-After` support is surfaced in the hook and UI components.

## File organization
- UI pages: `app/**/page.tsx`
- API routes: `app/api/**`
- Services: `lib/services/**`
- Middlewares and tokens: `lib/middleware/token-middleware.ts`
- Hooks: `hooks/**`
- Node servers (WS/proxy): `server/**`

## Testing guidance (lightweight)
- Unit-test service functions (parsers, token accounting helpers) where feasible
- For SSE, create small harnesses that validate event order (`init` → `progress`/`token` → `done` and proper `error` semantics)
- Validate Supabase RPC behavior using SQL or PostgREST during development; avoid brittle mocks
