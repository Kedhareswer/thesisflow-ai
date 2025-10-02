# Find Topics v2 — Implementation Plan

> Read `README.md` first for guarded commands. Keep `STATUS.txt` as `IN_PROGRESS` until every checklist here is done and verified.

## Objectives
- **[Clarity]** Guided, stepwise pipeline with partial results surfaced early.
- **[Coverage]** Multi-source search, clustering, and insights tied to citations.
- **[Speed]** Parallel calls, aggregation window, streaming updates.
- **[Trust]** Reproducible responses, persistent sessions, exports.
- **[Safety]** Auth via headers/cookies, strict rendering, monthly-only tokens.

## Milestones
1. **M1 — UX Shells (read‑only)**
   - Pages: `Find Topics`, `Topics & Sources`, `Topic Detail` with static data.
   - Stepper, clusters canvas, metrics, insights, cards grid, detail panels.
2. **M2 — SSE Pipeline**
   - `GET /api/topics/find/stream` with named events (init, progress, sources, clusters, insights, metrics, done, error, ping).
   - Client fetch‑streaming, incremental rendering, abort/retry.
3. **M3 — Search + Clustering**
   - Integrate UnifiedSearchService + Deep Research; dedup; embeddings + clustering; topic labeling.
4. **M4 — Persistence + Curation**
   - Sessions, notes/tags, merge/split clusters, mark reviewed, timeline, exports.
5. **M5 — Perf, A11y, Security**
   - Virtualization, throttling, Unicode‑safe streaming; ARIA/keyboard; strict markdown rendering; token refunds; 429 UX.

## Architecture
- **Client**: React/Next.js pages/components; state machines per stage; EventSource via fetch‑stream polyfill (headers support) or native when cookie auth.
- **Server**: Next API routes; orchestrator coordinating search → cluster → summarize; SSE writer with heartbeats and centralized cleanup/refunds.
- **Services**: Unified search (Google/DDG/Tavily/Context7/LangSearch/OpenAlex/arXiv/CrossRef), OpenRouter LLMs for labeling/insights, embeddings provider.
- **Store**: Supabase tables for sessions, topics, sources, relations, notes, activity.

## SSE Contract (named events)
- `init`: `{ sessionId, stages: string[] }`
- `progress`: `{ stage, pct, message }`
- `sources`: `{ chunk: Source[], totalFound? }`
- `clusters`: `{ chunk: Cluster[] }`
- `insights`: `{ markdown: string, topicId?: string }`
- `metrics`: `{ relevance, diversity, coverage, counts }`
- `done`: `{ totals, durationMs }`
- `error`: `{ message, retryAfter?: number }`
- `ping`: `{ t: number }`

## Data Shapes (version: `topics.v2`)
- `Source`: `{ id, title, year, type, url, doi?, venue?, abstract?, relevance }`
- `Cluster/Topic`: `{ id, label, score, summary, sourceIds: string[], tags: string[] }`
- `Insight`: `{ id, title, bodyMd, weight, citationIds?: string[] }`
- `Metrics`: `{ relevance: number, diversity: number, coverage: number, sources: number }`

## Endpoints
- `GET /api/topics/find/stream`
- `POST /api/topics/sessions` | `GET /api/topics/sessions/:id`
- `GET/PUT /api/topics/:id` | `POST /api/topics/:id/sources`
- `POST /api/topics/:id/curate` (merge/split/markReviewed)
- `GET /api/topics/export` (JSON/CSV/MD; RIS/BibTeX optional)

## Database Outline
- `research_sessions(id, user_id, query, params_json, metrics_json, status, created_at, updated_at)`
- `topics(id, session_id, label, score, summary_md, tags text[], pinned bool)`
- `sources(id, session_id, title, year, type, url, doi, venue, relevance, meta_json)`
- `topic_sources(topic_id, source_id)`
- `notes(id, session_id, topic_id?, source_id?, body_md, tags text[], created_at)`
- `activity(id, session_id, type, data_json, created_at)`

## UX Components
- Stepper, PromptBar, Chips, Clusters (D3/ECharts; mermaid disabled), Metrics, Insights, CardsGrid, Detail panels (AssociatedSources, Progress, Timeline), Notes/Tags.

## Performance & Stability
- Parallel requests, 8–12s timeouts (AbortController), aggregation window (120s default), dedup by DOI/URL/normalized title.
- Virtualized lists, throttled reflows, Unicode‑safe chunking, heartbeat every 15s, centralized cleanup with refunds.

## Accessibility
- Keyboard toggles (Enter/Space), `aria-pressed`, `aria-current`, focus rings, semantic headings.

## Security
- Fetch‑based SSE auth (Authorization header) or secure cookies.
- No tokens in URLs; strict markdown render; content sanitization; disable Mermaid for AI output.

## Error & 429 Handling
- Cache‑first where applicable; surface Retry‑After and cooldown; allow retry when reset.

## Rollback Plan
- Feature flag `topics_find_v2`; keep old route until parity confirmed; export compatibility via versioned schema.

## Checklists
- [ ] Pages scaffolded
- [ ] SSE route streams named events
- [ ] Unified search wired + dedup
- [ ] Clustering + labeling
- [ ] Insights with citations
- [ ] Persistence + notes/tags/timeline
- [ ] Curation tools
- [ ] Exports
- [ ] Perf + a11y + security audits

---

```powershell
# Quick open in VS Code
# code .\plan\PLAN.md
```
