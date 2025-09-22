# ThesisFlow-AI — Developer Documentation Index

This directory contains onboarding-focused documentation for new contributors. Start here and follow the recommended reading order.

- Supabase project URL: xxxxx

## Recommended reading order
1. `about.md` — What the product does and where the pieces live
2. `idea.md` — Problem, solution, differentiators
3. `purpose.md` — Goals, success metrics, non-goals
4. `branding.md` — Voice, tone, and UI/UX guidance
5. `coding-language.md` — TypeScript conventions and SSE contracts
6. `tech-stack.md` — Tech map across frontend, backend, DB, AI
7. `design-architecture.md` — Module boundaries, data flow, timeouts, tokens
8. `frontend.md` — Pages, hooks, SSE consumption patterns
9. `backend.md` — API taxonomy, streaming, middleware, servers
10. `integrations.md` — Supabase, OpenRouter, search, Stripe, Render
11. `apis-critical-do-not-touch.md` — Contracts you must not break
12. `sequences-and-flows.md` — Mermaid diagrams for key flows
13. `database-schema.md` — Tables, columns, functions, and migrations
14. `tokens.md` — Token system details (pre-existing)

## Quick facts
- SSE event names used across the app: `init`, `progress`, `token`, `error`, `done`, `ping`
- Streaming routes must explicitly refund tokens on error/abort
- Literature search implements rate limits with `Retry-After` handling in the UI
- **Security**: JWT tokens never in query params, cookie-based auth for SSE, input validation on all routes
- Buffer overflow protection (1MB) in streaming hooks prevents memory exhaustion

## Where to start coding
- Topics SSE UI: `app/topics/page.tsx`
- Topics SSE route: `app/api/topics/report/stream/route.ts`
- Chat SSE route: `app/api/ai/chat/stream/route.ts`
- Token middleware: `lib/middleware/token-middleware.ts`
- Token service: `lib/services/token.service.ts`

## Contributing
- Keep contracts stable (see `apis-critical-do-not-touch.md`)
- Extend schemas and RPCs only via migrations; update docs accordingly
- Prefer additive changes to SSE payloads and route responses
