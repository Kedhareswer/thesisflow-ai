# Expected Behavior & Acceptance Criteria

## UX Behavior
- **Stepper** reflects pipeline stage and percentage.
- **Partial Results**: sources appear within 3s on typical queries; clusters begin <10s.
- **Insights** stream progressively; each insight links at least one citation.
- **Detail Page** shows reviewed/total, timeline auto-updates.

## Performance Targets
- TTFP (first sources) < 3s, P95 < 6s
- Clusters first chunk < 12s (P95 < 20s)
- Memory stable (no UI freeze), lists virtualized

## Reliability
- Aborts refund tokens; server cleans up heartbeat/intervals
- 429 shows cooldown using Retry-After; retry blocked until reset

## Security
- No tokens in URLs; Authorization header or cookies only
- Strict markdown/HTML sanitization; Mermaid disabled for AI output

## Accessibility
- Chips/buttons keyboard operable (Enter/Space), ARIA state reflected
- Stepper uses `aria-current="step"` for active stage

## Analytics/Tokens
- Monthly-only token accounting with feature key `topics_find_v2`
- Provider/model attributed for costs; zero-cost flows logged distinctly

## QA Checklist
- **[ ]** SSE events arrive in order; client handles out-of-order gracefully
- **[ ]** Abort mid-stream → cleanup + refund
- **[ ]** Network drop → user sees recoverable state and can resume
- **[ ]** 429 → cooldown UI matches server reset time
- **[ ]** Export files validate against schema
- **[ ]** A11y keyboard traversal across chips/filters/stepper
- **[ ]** No remote scripts executed from AI content

---
```powershell
# Page through this file
# more .\plan\EXPECTED.md
```
