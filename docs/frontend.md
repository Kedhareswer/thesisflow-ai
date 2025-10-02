# Frontend Architecture

## Overview
ThesisFlow-AI uses Next.js 14 with TypeScript, React, and Tailwind CSS for a modern, responsive frontend experience.

## Key Technologies
- **Next.js 14**: App Router, Server Components, API Routes
- **React 18**: Hooks, Context, Suspense
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Animations and transitions
- **Lucide React**: Icon system
- **Shadcn/ui**: Component library

## Component Architecture

### Layout System
- `app/layout.tsx`: Root layout with providers
- `components/ui/`: Reusable UI components
- `components/`: Feature-specific components
- `components/support/`: Support chat system components

### State Management
- React Context for global state
- Local state with useState/useReducer
- Custom hooks for shared logic
- localStorage for client-side persistence

### Styling Approach
- Tailwind utility classes
- CSS modules for complex components
- Design system tokens
- Responsive design patterns
- ThesisFlow-AI brand colors (#FF6B2C)

## New Components (Support Chat System)

### Support Widget (`components/support/SupportWidget.tsx`)
- Home-page-only floating action button
- Lazy-loaded panel for performance
- Deep-link support for external navigation
- Unread indicator for broadcasts

### Support Panel (`components/support/SupportPanel.tsx`)
- Full chat interface with message history
- Thumbs up/down feedback system
- Quick reply chips for common actions
- Privacy controls (clear, export, delete)
- Broadcast banner system

### Changelog Info Widget (`components/changelog/InfoWidget.tsx`)
- Latest release highlights
- Deep-link CTA to support chat
- Dismissible with localStorage persistence

## Performance Optimizations
- Code splitting with dynamic imports
- Image optimization with Next.js Image
- Font optimization
- Bundle analysis and optimization
- Support chat lazy loading to avoid LCP impact

## App structure
- Pages: `app/**/page.tsx` (Next.js App Router)
- Shared UI: `components/**`, `src/components/ai-elements/`
- Component library: `components/ui/` for reusable design patterns
- Styles: `styles/globals.css` and Tailwind utilities with IBM Plex Sans font family
- Static assets: `public/` including product screenshots for homepage showcases

## Key pages
- **Homepage**: `app/page.tsx`
  - Marketing landing with research hero animation, stacking cards, stats carousel
  - Features actual product screenshots in scroll-triggered animations
  - Uses `ResearchHeroWithCards`, `StatsCarouselCount` components with IBM Plex Sans typography
- **Topics Explorer**: `app/topics/page.tsx`
  - Implements literature search, source listing, and scholarly report generation
  - Consumes SSE from `app/api/topics/report/stream/route.ts` via manual `ReadableStream` parsing
  - Enforces a client-side timeout with `AbortController` and cleans up intervals/signals
- **Explorer/Research Assistant**: `app/explorer/components/ResearchAssistant.tsx`
  - Uses `EventSource` to consume SSE from AI chat streaming
  - Integrated AI elements for reasoning, sources, tasks, tools, and citations
- **Paraphraser and Extract flows**
  - Paraphraser UI under `app/paraphraser/` with streaming-only interface
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

### Mermaid rendering security
- The Markdown renderer uses Mermaid for diagrams and enforces `securityLevel: 'strict'`.
- Input is sanitized before rendering (removes `%%{ }%%` config directives, `<script>` tags, event handlers, javascript: URLs, and dangerous embeds).
- Do not attempt to inject raw HTML/JS or unsafe Mermaid directives; such content will be stripped.

## State and UI patterns
- Keep derived state minimal and local to each page/component
- Show explicit loading and error states (spinners, banners)
- Use semantic HTML for accessibility; ensure links to sources use `target="_blank"` + `rel="noopener noreferrer"`

## Testing the frontend
- Validate literature search rate-limit states (429/Retry-After)
- Validate topics report SSE by triggering generation and observing progressive tokens
- Validate AbortController timeout shows the user-friendly timeout message

## Recent Frontend Fixes (2025-01-02)

### React Hook Order Compliance
- **Fixed hook order violation** in `app/topics/[id]/page.tsx`:
  - Created safe fallbacks (`session?.results ?? []`) before any early returns
  - Ensured `useMemo` hook always executes regardless of conditional logic
  - Prevents "Cannot call a React Hook conditionally" errors

### Session State Management  
- **Enhanced session persistence** in `app/topics/page.tsx`:
  - Added `sessionCreatedAtRef` to maintain consistent timestamps across effect runs
  - Prevents session reordering when snapshots update existing sessions
  - Ref resets only when explicitly starting new search sessions

### EventSource Memory Leak Fix
- **Fixed EventSource memory leak** in `hooks/use-topics-find.ts`:
  - Added cleanup effect with empty dependency array that returns `closeCurrent`
  - Ensures EventSource connections are properly closed on component unmount
  - Prevents state updates on unmounted components and connection leaks

### Timestamp Restoration Bug Fix
- **Fixed timestamp restoration** in `components/support/SupportPanel.tsx`:
  - Added proper timestamp conversion when restoring messages from localStorage
  - Serialized Date objects are now converted back to Date instances: `new Date(msg.timestamp)`
  - Ensures restored message timestamps match the expected `Date` type from `Message` interface

### Float32Array Indexing Fix
- **Fixed typed array indexing** in `lib/utils/simple-embed-cluster.ts`:
  - Ensured hash values remain 32-bit unsigned integers using `>>> 0` operators
  - Fixed non-integer index computation that created object properties instead of proper array indices
  - Prevents zero vector generation and improves embedding accuracy

### Key Patterns
- **Hook consistency**: All hooks must execute unconditionally before early returns
- **Ref-based persistence**: Use `useRef` for values that should persist across renders but not trigger re-renders
- **Safe fallbacks**: Compute fallback values before any conditional logic that might skip hook execution
- **Memory leak prevention**: Always add cleanup effects for EventSource, intervals, and subscriptions
- **Type safety**: Ensure serialized data is properly converted back to expected types when restoring from storage
- **Typed array integrity**: Use proper integer arithmetic for typed array indexing to prevent object property creation

## References
- Topics page: `app/topics/page.tsx`
- Topics detail: `app/topics/[id]/page.tsx` 
- Literature search hook: `hooks/use-literature-search.ts`
- Chat streaming UI: `app/explorer/components/ResearchAssistant.tsx`
- SSE routes: `app/api/ai/chat/stream/route.ts`, `app/api/topics/report/stream/route.ts`
