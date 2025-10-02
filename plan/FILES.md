# Files to Create/Modify

> Paths assume a Next.js style layout. Adjust to your project structure if different.

## Pages
- `app/topics/page.tsx` — Find Topics (pipeline)
- `app/topics/library/page.tsx` — Topics & Sources grid/list
- `app/topics/[id]/page.tsx` — Topic Detail

## Components (examples)
- `components/topics/ResearchStepper.tsx`
- `components/topics/PromptBar.tsx`
- `components/topics/TopicClusters.tsx`
- `components/topics/ResearchMetrics.tsx`
- `components/topics/KeyInsights.tsx`
- `components/topics/TopicCardsGrid.tsx`
- `components/topics/detail/AssociatedSources.tsx`
- `components/topics/detail/Progress.tsx`
- `components/topics/detail/Timeline.tsx`

## API
- `app/api/topics/find/stream/route.ts`
- `app/api/topics/sessions/route.ts` (POST, GET list)
- `app/api/topics/sessions/[id]/route.ts` (GET)
- `app/api/topics/[id]/route.ts` (GET, PUT)
- `app/api/topics/[id]/sources/route.ts` (POST)
- `app/api/topics/[id]/curate/route.ts` (POST)
- `app/api/topics/export/route.ts` (GET)

## Services & Utils
- `lib/services/unified-search.service.ts` (ensure all providers wired)
- `lib/services/topics-orchestrator.service.ts` (SSE + stages)
- `lib/services/clustering.service.ts` (embeddings + HDBSCAN/KMeans)
- `lib/services/insights.service.ts` (OpenRouter summarization)
- `lib/utils/sse.ts` (named events, heartbeats, cleanup)
- `lib/utils/sanitize.ts` (strict markdown/HTML sanitization)

## Database (Supabase)
- `scripts/sql/2025-xx-topics-v2.sql` — tables, indexes, RLS

## Tests
- `tests/e2e/topics/*.spec.ts` — streaming, filters, a11y, exports
- `tests/api/topics-find.http` — SSE manual checks

## Deletion Guard Commands
```powershell
# Show status (should be IN_PROGRESS until all plan tasks are verified)
# Get-Content .\plan\STATUS.txt

# Guarded deletion (only after STATUS says IMPLEMENTATION_COMPLETE)
# if ((Get-Content .\plan\STATUS.txt) -match 'IMPLEMENTATION_COMPLETE') {
#   Remove-Item -Recurse -Force .\plan
# } else {
#   Write-Host 'Not deleting: STATUS.txt is not IMPLEMENTATION_COMPLETE' -ForegroundColor Red
# }
```
