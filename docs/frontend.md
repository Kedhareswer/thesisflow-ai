# Frontend

This guide orients onboarding developers to the UI structure, key pages, and hooks.

## App structure
- Pages: `app/**/page.tsx` (Next.js App Router)
- Shared UI: `components/**`, `src/components/ai-elements/`
- Styles: `styles/globals.css` and Tailwind utilities
- Static assets: `public/`

## Key pages
- Topics Explorer: `app/topics/page.tsx`
  - Implements literature search, source listing, and scholarly report generation
  - Consumes SSE from `app/api/topics/report/stream/route.ts` via manual `ReadableStream` parsing
  - Enforces a client-side timeout with `AbortController` and cleans up intervals/signals
- Explorer/Research Assistant: `app/explorer/components/ResearchAssistant.tsx`
  - Uses `EventSource` to consume SSE from AI chat streaming
- Paraphraser and Extract flows
  - Paraphraser UI under `app/paraphraser/`
  - Extract flows under `app/extract*` and related components in `components/`

## Hooks
- `hooks/use-literature-search.ts`
  - Aggregation window via `aggregateWindowMs`
  - Rate-limit and Retry-After handling; exposes countdown and retry state
  - Resets `aggregating` flags on success/error/abort
- `hooks/use-chat-socket.ts`
  - Real-time chat presence and messages
- Planning SSE via `app/api/plan-and-execute/route.ts` with services `lib/services/planning.service.ts` and `lib/services/executing.service.ts`
- `hooks/use-user-plan.ts`
  - Exposes monthly-only token status and plan info to the UI

## SSE consumption patterns
- Chat (EventSource)
  - Simpler consumption with `EventSource`, handling `message` and named events
- Topics report (manual stream)
  - `fetch()` with `ReadableStream` + `TextDecoder`
  - Parse lines prefixed by `event: <name>` and `data: <json>`
  - Append `token` chunks to the report content; show `progress` messages
  - Stop on `done`; show errors on `error`
- Required event names: `init`, `progress`, `token`, `error`, `done`, `ping`

## State and UI patterns
- Keep derived state minimal and local to each page/component
- Show explicit loading and error states (spinners, banners)
- Use semantic HTML for accessibility; ensure links to sources use `target="_blank"` + `rel="noopener noreferrer"`

## Testing the frontend
- Validate literature search rate-limit states (429/Retry-After)
- Validate topics report SSE by triggering generation and observing progressive tokens
- Validate AbortController timeout shows the user-friendly timeout message

## References
- Topics page: `app/topics/page.tsx`
- Literature search hook: `hooks/use-literature-search.ts`
- Chat streaming UI: `app/explorer/components/ResearchAssistant.tsx`
- SSE routes: `app/api/ai/chat/stream/route.ts`, `app/api/topics/report/stream/route.ts`
