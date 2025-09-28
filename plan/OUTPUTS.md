# Deliverables & Outputs

## UI Deliverables
- **Find Topics page**: Stepper, clusters viz, metrics, insights, controls.
- **Topics & Sources**: Cards grid/list, filters, bulk actions, export.
- **Topic Detail**: Associated sources, progress, insights, timeline, notes/tags.

## API Deliverables
- `GET /api/topics/find/stream` (SSE named events)
- Sessions CRUD, Curation, Export routes

## Data Deliverables
- Supabase tables/migrations described in `PLAN.md`
- Materialized views (optional) for analytics

## Streaming Examples
### Example event sequence
```
init → progress(10,"Querying sources...") → sources(chunk) × N →
progress(45,"Embedding & clustering...") → clusters(chunk) × M →
progress(70,"Summarizing insights...") → insights(markdown) × K →
metrics → progress(100,"Complete") → done
```

### Example partial `clusters` payload
```json
{
  "chunk": [
    {
      "id": "t-perovskite",
      "label": "Perovskite Solar Cells",
      "score": 0.92,
      "summary": "Efficiency improvements over 25% in lab conditions...",
      "sourceIds": ["s1","s4","s9"],
      "tags": ["Solar","Materials"]
    }
  ]
}
```

## Exports
- Topics JSON/CSV, Insights Markdown, Sources CSV; optional RIS/BibTeX
- Deterministic ordering and `version: topics.v2` for reproducibility

## Testing Artefacts
- Postman collection for SSE route
- Mock session fixtures
- Playwright tests for stepper, streaming, filters, accessibility

---
```powershell
# View this file quickly
# Get-Content .\plan\OUTPUTS.md | more
```
