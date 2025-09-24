# Analytics (Usage Analytics v2)

This page documents the Analytics v2 system that powers the Usage Analytics UI and API.

- API route: `/api/usage/analytics/v2`
- UI component: `components/analytics/usage-analytics-v2.tsx`
- Storage and aggregation:
  - Materialized view `public.usage_daily_mv` (aggregates `token_transactions` deduct rows)
  - Table `public.usage_events` (records zero-cost or non-deducted usage)
  - The API merges MV + usage_events for additive metrics at request time

## Metrics
- Tokens
- Requests
- Cost ($)

All other latency/average metrics have been removed from the UI for clarity and performance.

## Dimensions
- Service (e.g., `explorer`, `planner`, `writer`, `topics`, `citations`, `chat_pdf`, `ai_detector`)
- Feature (canonical feature name; see taxonomy below)
- Provider (UI normalizes OpenRouter-based providers as `NOVA`)
- Model (UI groups into families: GPT, Claude, Llama, Gemini, Mixtral, Qwen, DeepSeek, GLM, Nemotron, Gemma, Mistral, Other)
- API Key Owner (`user` or `system`)
- API Key Provider (e.g., `openrouter`, `openai`, `anthropic`, `gemini`, ...)

## Canonical Feature Taxonomy
Examples:
- `explorer_assistant`
- `explorer_explore`
- `explorer_ideas`
- `plan_and_execute`
- `deep_research`
- `planner_apply`
- `writer`
- `paraphraser`
- `extract_data`
- `topics_extract`
- `topics_report`
- `citations`
- `chat_pdf`
- `ai_detector`

Unmapped/legacy features appear as `unknown` to surface instrumentation needs (we avoid the catch-all of "Other").

## Zero-Cost Usage Logging
Some flows are intentionally free (no token deduction). To keep analytics complete while preserving zero billing impact:
- Middleware writes a usage-only record to `public.usage_events` with `tokens_charged = 0` after successful handler execution.
- Explorer Assistant (bypass) is recorded this way, so charts show activity without charging tokens.

## API Request Body
```json
{
  "metric": "tokens | requests | cost",
  "dimension": "service | provider | model | feature | api_key_owner | api_key_provider",
  "from": "2025-09-01T00:00:00.000Z",
  "to": "2025-09-24T00:00:00.000Z",
  "compare": true,
  "cumulative": false
}
```

## API Response Shape
```json
{
  "from": "2025-09-01T00:00:00.000Z",
  "to": "2025-09-24T00:00:00.000Z",
  "days": ["2025-09-01", "2025-09-02", "…"],
  "series": { "explorer": [10, 5, 0, …], "planner": [2, 4, …] },
  "totals": { "explorer": 123, "planner": 45 },
  "totalMetric": 168,
  "totalPerDay": [12, 9, 3, …],
  "metric": "tokens",
  "dimension": "service",
  "previous": {
    "from": "2025-08-08T00:00:00.000Z",
    "to": "2025-08-31T00:00:00.000Z",
    "days": ["2025-08-08", "…"],
    "series": { "explorer": [8, 4, …] },
    "totals": { "explorer": 100 },
    "totalMetric": 100,
    "totalPerDay": [8, 4, …]
  }
}
```

## UI Behavior
- The UI auto-selects the top 5 series by `totals` for clarity.
- Provider names are normalized (OpenRouter → `NOVA`).
- Models are grouped into families.
- Compare and Cumulative toggles are available.

## Notes
- The API best-effort refreshes `usage_daily_mv` and falls back to on-the-fly aggregation from `token_transactions` when MV is empty. It also merges `usage_events` in both primary and fallback paths for additive metrics.
- Non-additive metrics (like averages) are not displayed in the UI and are computed only from the MV path when needed.
