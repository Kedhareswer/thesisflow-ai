# ThesisFlow-AI — Developer Documentation Index

This directory contains onboarding-focused documentation for new contributors. Start here and follow the recommended reading order.

- Supabase project URL: xxxxx

## Recommended reading order
1. `about.md` — What the product does and where the pieces live
2. `idea.md` — Problem, solution, differentiators
3. `purpose.md` — Goals, success metrics, non-goals
4. `branding.md` — Voice, tone, and comprehensive UI/UX guidance
5. `design-principles.md` — Research-first design philosophy and component standards
6. `coding-language.md` — TypeScript conventions and SSE contracts
7. `tech-stack.md` — Tech map across frontend, backend, DB, AI
8. `design-architecture.md` — Module boundaries, data flow, timeouts, tokens
9. `frontend.md` — Pages, hooks, SSE consumption patterns, component library
10. `backend.md` — API taxonomy, streaming, middleware, servers
11. `integrations.md` — Supabase, OpenRouter, search, Stripe, Render
12. `apis-critical-do-not-touch.md` — Contracts you must not break
13. `sequences-and-flows.md` — Mermaid diagrams for key flows
14. `database-schema.md` — Tables, columns, functions, and migrations
15. `tokens.md` — Token system details (pre-existing)

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
