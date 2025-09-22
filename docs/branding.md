# Branding

ThesisFlow-AI projects a precise, research-grade brand with calm, trustworthy UX. Keep the tone professional, concise, and helpful.

## Voice and tone
- Clear, direct, and confident
- Research-first empathy; avoid marketing fluff
- Use precise terminology when referencing features, models, and data sources

## Writing style
- Prefer active voice, short sentences, and bullet points
- When citing code, use backticked paths (e.g., `app/api/ai/chat/stream/route.ts`)
- Make SSE events explicit: `init`, `progress`, `token`, `error`, `done`, `ping`

## Visual identity
- Neutral base with a single accent color for key actions
- Motion should be subtle; prefer gentle easing and longer durations (~600–1000ms) over snappy transitions
- Avoid distracting animations in content-heavy views

## UI guidelines
- Keep controls discoverable and labeled
- Use consistent empty-state and error-state patterns across pages
- Source links: always open in a new tab with `rel="noopener noreferrer"`
- Accessible colors and contrasts; respect user font scaling where possible

## Footer and global elements
- Footer may include a large `@THESISFLOW` marque; keep it tasteful and non-distracting
- Maintain a consistent top-level layout across `app/` pages

## Naming and copy
- Refer to the product as "ThesisFlow-AI"
- Avoid legacy product names in public copy
- Be explicit about providers: “OpenRouter” (for models), “Supabase” (for auth/DB)

## Where brand manifests in code
- Global styles: `styles/globals.css`
- Shared UI patterns and components: `components/` and `src/components/ai-elements/`
- Page-specific compositions: `app/**/page.tsx`

## Don’ts
- Don’t introduce sudden or attention-grabbing motion in content areas
- Don’t rename SSE event types used by the UI (breaks the contract)
- Don’t show internal IDs or sensitive context in user-facing strings
