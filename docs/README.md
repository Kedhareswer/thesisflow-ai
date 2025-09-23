# ThesisFlow-AI — Developer Documentation Index

This directory contains onboarding-focused documentation for new contributors. Start here and follow the recommended reading order.

- Supabase project URL: xxxxx

## Documentation Structure

- **[About](./about.md)** - Project overview and mission
- **[Purpose](./purpose.md)** - Core objectives and goals
- **[Idea](./idea.md)** - Original concept and vision
- **[Branding](./branding.md)** - Brand guidelines and identity
- **[Coding Language](./coding-language.md)** - Development standards
- **[Tech Stack](./tech-stack.md)** - Technology choices
- **[Design Architecture](./design-architecture.md)** - System architecture
- **[Frontend](./frontend.md)** - Frontend architecture
- **[Backend](./backend.md)** - Backend architecture
- **[Components Guide](./components-guide.md)** - Component architecture and usage
- **[Support Chat System](./support-chat-system.md)** - Support chat implementation
- **[Integrations](./integrations.md)** - Third-party integrations
- **[APIs Critical](./apis-critical-do-not-touch.md)** - Critical API documentation
- **[Sequences and Flows](./sequences-and-flows.md)** - User flows and processes
- **[Database Schema](./database-schema.md)** - Database structure
- **[Tokens](./tokens.md)** - Token system documentation

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
