# Find Topics Page - Complete Analysis

## Overview

The Find Topics page (`/topics`) is a research tool that helps users discover and analyze topics across research papers. It combines literature search, AI-powered topic extraction, clustering, and report generation.

---

## File Structure

### Frontend Components
- **`/app/topics/page.tsx`** - Main Topics page component (863 lines)
- **`/app/topics/library/page.tsx`** - Topics library/history view
- **`/app/topics/[id]/page.tsx`** - Individual topic detail view

### API Routes
- **`/app/api/topics/find/stream/route.ts`** - SSE streaming endpoint for real-time source discovery
- **`/app/api/topics/extract/route.ts`** - Topic extraction from papers
- **`/app/api/topics/report/route.ts`** - Non-streaming report generation (legacy)
- **`/app/api/topics/report/stream/route.ts`** - SSE streaming report generation

### Hooks & Services
- **`/hooks/use-topics-find.ts`** - Hook for SSE streaming topic discovery
- **`/hooks/use-literature-search.ts`** - Hook for literature search with SSE/fetch fallback
- **`/lib/services/literature-search.service.ts`** - Service for multi-source literature search
- **`/lib/services/topics-session.store.ts`** - Client-side localStorage session management

### Utilities
- **`/lib/utils/sources.ts`** - Source enumeration and timeout utilities

---

## Workflow Diagram

```
User Input (Search Query)
         ↓
    [handleSearch]
         ↓
    ┌────────────────────────────────────┐
    │  Parallel Execution:               │
    │  1. Literature Search (SSE/Fetch)  │
    │  2. Topics Find Stream (SSE)       │
    └────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────┐
    │  Data Collection Phase:            │
    │  • Search papers from multiple     │
    │    sources (OpenAlex, arXiv, etc.) │
    │  • Stream results progressively    │
    │  • Deduplicate by DOI/ID/title     │
    └────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────┐
    │  Analysis Phase:                   │
    │  • Compute metrics (relevance,     │
    │    diversity, coverage)            │
    │  • Generate clusters (k-means)     │
    │  • Extract topics via AI           │
    └────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────┐
    │  Display Phase:                    │
    │  • Show sources with metadata      │
    │  • Display topic clusters          │
    │  • Show research metrics           │
    └────────────────────────────────────┘
         ↓
    [Manual Trigger: Generate Report]
         ↓
    ┌────────────────────────────────────┐
    │  Report Generation (3-stage):      │
    │  1. Curation (60s timeout)         │
    │  2. Analysis (90s timeout)         │
    │  3. Synthesis (90s timeout)        │
    │  Total: 240s (4 min) budget        │
    └────────────────────────────────────┘
         ↓
    [Display Streamed Report]
```

---

## API Endpoints & Workflows

### 1. **Topics Find Stream API** (`GET /api/topics/find/stream`)

**Purpose:** Real-time streaming of sources, metrics, clusters, and insights

**Flow:**
```typescript
1. Authenticate user via requireAuth()
2. Parse query parameters: q, limit, quality
3. Start SSE stream
4. Collect papers via LiteratureSearchService.streamPapers()
   - Searches: OpenAlex, arXiv, CrossRef, CORE, PubMed, DOAJ, OpenAIRE
   - Rate limits: 
     * OpenAlex: 8 tokens/250ms, 2 concurrent
     * arXiv: 4 tokens/500ms, 2 concurrent
     * Others: 4 tokens/500ms, 2 concurrent
   - Request timeout: 6 seconds per source
5. Emit 'sources' event for each paper
6. Compute metrics: relevance, diversity, coverage
7. Generate clusters using k-means or density-based clustering
8. Extract topics via enhancedAIService (Groq llama-3.1-8b-instant)
9. Emit events: init, progress, sources, metrics, insights, clusters, done
```

**Events Emitted:**
- `init` - Stream initialized
- `progress` - Progress updates with message
- `sources` - Individual paper/source
- `metrics` - Computed metrics (relevance, diversity, coverage, sources)
- `insights` - Extracted topics array
- `clusters` - Topic clusters with labels
- `done` - Stream complete
- `error` - Error occurred
- `ping` - Keep-alive (every 15s)

**No timeout** - Runs until completion or client disconnect

---

### 2. **Topics Extract API** (`POST /api/topics/extract`)

**Purpose:** Extract topics from a list of papers

**Flow:**
```typescript
1. Token validation (withTokenValidation middleware)
2. Parse papers array (max 30)
3. Build prompt with titles and abstracts
4. Call enhancedAIService.generateText()
   - Provider: "groq"
   - Model: "llama-3.1-8b-instant"
   - maxTokens: 1500
   - temperature: 0.2
5. Parse JSON response (expects array of strings)
6. Fallback: parse lines if JSON fails
7. Return max 15 topics
```

**Timeout:** 30 seconds (inherited from client-side fetch in page.tsx line 274-276)

---

### 3. **Report Stream API** (`POST /api/topics/report/stream`)

**Purpose:** Generate comprehensive research report using 3-stage AI agent pipeline

**Flow:**
```typescript
1. Token validation (withTokenValidation middleware)
2. Parse request: query, papers, quality
3. Limit papers to 8-20
4. Create SSE stream
5. Three-stage pipeline:

   Stage 1 - CURATION (60s timeout):
   - Provider: Groq
   - Model: llama-3.1-8b-instant
   - Task: Rate each source as HIGH/MEDIUM/LOW trust
   - Output: Markdown table with rationales

   Stage 2 - ANALYSIS (90s timeout):
   - Provider: Groq
   - Model: llama-3.1-8b-instant (Standard) or llama-3.3-70b-versatile (Enhanced)
   - Task: Write 2-3 bullet summaries per source
   - Output: Markdown with per-source sections

   Stage 3 - SYNTHESIS (90s timeout):
   - Provider: Groq
   - Model: llama-3.3-70b-versatile
   - Task: Write scholarly review with tables, charts
   - Word count: 1000-1500 (Standard), 1500-2200 (Enhanced)
   - Output: Structured markdown with visual summaries

6. Stream final document as tokens (48 chars/chunk, 12ms delay)
7. Emit 'done' event
```

**Total Timeout Budget:** 240 seconds (4 minutes)
- Curation: 60s
- Analysis: 90s  
- Synthesis: 90s

**Events Emitted:**
- `init` - Stream started
- `progress` - Stage updates
- `token` - Content chunks
- `done` - Complete
- `error` - Failure (with refund)
- `ping` - Keep-alive (every 15s)

---

### 4. **Literature Search API** (`GET /api/literature-search/stream`)

**Purpose:** Stream papers from multiple academic sources

**Flow:**
```typescript
1. Parse: query, limit, userId, sessionId
2. Start SSE stream
3. Search sources in parallel:
   - OpenAlex (primary)
   - arXiv
   - CrossRef
   - CORE
   - PubMed
   - DOAJ
   - OpenAIRE
4. Emit 'paper' event for each result
5. Deduplicate by DOI/ID/title
6. Store results in session (Supabase)
7. Emit 'done' when complete or limit reached
```

**Rate Limits (per source):**
- OpenAlex: 8 req burst, refill 1/250ms, max 2 concurrent
- arXiv: 4 req burst, refill 1/500ms, max 2 concurrent
- Others: 4 req burst, refill 1/500ms, max 1-2 concurrent

**Request Timeout:** 6 seconds per source call

**Events Emitted:**
- `init` - Stream started with rate limit info
- `paper` - Individual paper result
- `error` - Per-source errors (non-fatal)
- `done` - Stream complete
- Network error triggers onerror

---

## Timeout Configuration Summary

### Client-Side Timeouts

**Topics Page (`/app/topics/page.tsx`):**
- Topic extraction fetch: **30 seconds** (line 274)
- Report generation client timeout: **240 seconds** (4 minutes, line 391)
- Literature search SSE fallback: **1.5 seconds** if no results (via hook default)

**Literature Search Hook (`/hooks/use-literature-search.ts`):**
- SSE fallback timer: **1500ms** (line 73, `sseFallbackToFetchMs`)
- Per-query cooldown: **60 seconds** (line 85)
- Aggregate window: **120 seconds** (when configured, line 45)

### Server-Side Timeouts

**Topics Find Stream API:**
- No explicit timeout (runs until completion)
- Per-source request timeout: **6 seconds** (LiteratureSearchService)

**Topics Extract API:**
- Relies on client-side 30s timeout
- No server-side timeout wrapper

**Report Stream API:**
- **Curation stage: 60 seconds** (line 56)
- **Analysis stage: 90 seconds** (line 57)
- **Synthesis stage: 90 seconds** (line 58)
- **Total budget: 240 seconds** (line 55)
- Uses `withTimeout()` wrapper from `/lib/utils/sources.ts`

**Literature Search Service:**
- Per-API-call timeout: **6 seconds** (line 75)
- Rate limit refill intervals: 250-1000ms depending on source

---

## Current Issue: "Curation timed out"

### Root Cause

The screenshot shows **"Curation timed out"** error. This occurs when:

1. **Report Stream API** (`/app/api/topics/report/stream/route.ts`) starts the curation stage
2. Calls `enhancedAIService.generateText()` with Groq provider
3. The AI request takes longer than **60 seconds** (curationBudgetMs)
4. `withTimeout()` wrapper rejects the promise with error: `"Curation timed out"`
5. Error is caught and emitted as SSE error event
6. Client displays the error message

### Why It Happens

**Groq API delays:**
- Free tier models can be slow during high demand
- `llama-3.1-8b-instant` may queue requests
- Network latency to Groq servers
- Long prompts with many sources

**Current timeout allocation:**
- Curation: 60s (recently increased from 30s, line 56)
  // Overall timeout budget (align with client 4-minute AbortController)
  // Use explicit per-stage budgets so later stages don't starve
  const totalBudgetMs = 240_000
  const curationBudgetMs = 90_000  // Increased to 90s to handle slow AI API responses
  const analysisBudgetMs = 75_000  // Reduced to 75s
  const synthesisBudgetMs = 75_000  // Reduced to 75s to keep total under 240s

**Option 2: Add retry logic**
```typescript
const curationResult = await withRetry(
  () => withTimeout(enhancedAIService.generateText(...), curationBudgetMs, 'Curation'),
  () => withTimeout(enhancedAIService.generateText(...), 60_000, 'Curation'),
  { maxRetries: 2, retryDelay: 1000 }
)
```

**Option 3: Fallback to simpler curation**
```typescript
try {
  const curationResult = await withTimeout(...)
} catch (err) {
  if (err.message.includes('timed out')) {
    // Simple trust ratings without AI
    const curation = limited.map((p, i) => 
      `${i+1} | MEDIUM | ${p.source} source`
    ).join('\n')
  }
}
```

**Option 4: Use faster model**
```typescript
// Switch to faster model for curation
model: "llama-3.1-8b-instant"  // Already the fastest
// Or skip curation entirely if timeout is common
```

---

## Data Flow Architecture

### State Management

**Client State (React):**
- `searchQuery` - Current search query
- `literature.results` - Papers from literature search
- `topics` - Extracted topic strings
- `topicsFind` - Streaming SSE state (items, metrics, clusters)
- `report` - Generated report markdown
- `sessionId` - Unique session identifier

**Local Storage:**
- Sessions stored in `thesisflow_topics_sessions_v2`
- Max 50 sessions cached
- Contains: id, query, createdAt, quality, results, topics, metrics

**Server State (Supabase):**
- Session metadata
- Search results per session
- Event logs (optional)

### Authentication Flow

**Token Validation:**
- All API routes use `withTokenValidation` middleware
- Deducts tokens based on feature cost
- Refunds on error (except success)
- Context: `{ origin: 'topics', feature: 'extract|report|find' }`

**Session Auth:**
- EventSource uses cookie-based auth (`withCredentials: true`)
- Access token passed via query param for SSE (fallback)
- User ID tracked for rate limiting and session ownership

---

## Metrics Computation

**Relevance (60% base + 40% match-based):**
```typescript
const tokens = query.split(/\s+/).filter(t => t.length > 2)
const perPaper = results.map(r => {
  const titleMatches = tokens.filter(tok => r.title.includes(tok)).length
  return Math.min(1, titleMatches / Math.min(5, tokens.length))
})
const avgMatch = sum(perPaper) / perPaper.length
const relevance = 0.6 + 0.4 * avgMatch
```

**Diversity (domain-based):**
```typescript
const uniqueDomains = new Set(results.map(r => extractDomain(r.url)))
const diversity = Math.min(1, uniqueDomains.size / Math.max(5, results.length / 2))
```

**Coverage (linear to 20 sources):**
```typescript
const coverage = Math.min(1, results.length / 20)
```

---

## Clustering Algorithm

**K-means clustering:**
1. Embed text using simple token-based vectors (`embedText()`)
2. Determine k = `max(2, min(8, round(sqrt(n/2))))`
3. Run k-means to get cluster labels
4. Group papers by cluster
5. Extract top 3 tokens per cluster as label
6. Fallback to density-based clustering if <2 groups

**Density-based fallback:**
- Similarity threshold: 0.84
- Minimum cluster size: 2
- Creates connected components from similarity graph

---

## Quality Modes

**Standard:**
- Literature search limit: 10 papers
- Topics extraction limit: 10-20 items
- Report word count: 1000-1500
- Analysis model: llama-3.1-8b-instant
- Synthesis model: llama-3.3-70b-versatile

**Enhanced:**
- Literature search limit: 20 papers
- Topics extraction limit: 10-20 items
- Report word count: 1500-2200
- Analysis model: llama-3.3-70b-versatile
- Synthesis model: llama-3.3-70b-versatile

---

## Error Handling

**Literature Search Errors:**
- Per-source errors don't stop stream (emit 'error' event)
- Network errors trigger SSE fallback to fetch
- Rate limit errors surface with retry countdown
- Partial results displayed even on failure

**Topic Extraction Errors:**
- Timeout: Silent failure with empty topics array
- API error: Display error message
- JSON parse error: Fallback to line-based parsing

**Report Generation Errors:**
- Stage timeout: Error event with specific stage name
- Client abort: Refund tokens
- Network error: Refund tokens
- Success: No refund

**Refund Flow:**
```typescript
if (error && !succeeded) {
  await tokenService.refundTokens(userId, 'topics_report', tokensNeeded, {
    ...ctx,
    refund_reason: 'curation_timeout' | 'client_abort' | 'stream_error'
  })
}
```

---

## Performance Optimizations

**Literature Search:**
- Parallel source queries (max 2-3 concurrent per source)
- Token bucket rate limiting prevents API bans
- 1-hour cache with inflight request deduplication
- Progressive SSE streaming for perceived speed

**Topic Extraction:**
- Uses fastest model (llama-3.1-8b-instant)
- Processes only first 30 papers
- Extracts 12 abstract snippets max

**Report Generation:**
- Streams tokens (48 chars @ 12ms delay) for smooth UX
- Uses larger model only for synthesis stage
- Heartbeat pings (15s) prevent connection drops

**Client Optimizations:**
- Deduplicate papers by DOI/ID/title/hash
- Per-query cooldown (60s) prevents spam
- Aggregate window option (120s) batches requests
- Session preloading for instant resume

---

## File Dependencies Graph

```
app/topics/page.tsx
├── hooks/use-topics-find.ts
│   └── app/api/topics/find/stream/route.ts
│       └── lib/services/literature-search.service.ts
├── hooks/use-literature-search.ts
│   └── app/api/literature-search/stream/route.ts
│       └── lib/services/literature-search.service.ts
├── app/api/topics/extract/route.ts
│   └── lib/enhanced-ai-service.ts
└── app/api/topics/report/stream/route.ts
    ├── lib/enhanced-ai-service.ts
    └── lib/utils/sources.ts
        └── lib/enhanced-ai-service.ts
```

---

## Recommendations

### Immediate Fixes

1. **Increase curation timeout to 90s:**
   ```typescript
   // /app/api/topics/report/stream/route.ts line 56
   const curationBudgetMs = 90_000
   ```

2. **Add fallback curation:**
   ```typescript
   const curation = curationResult.success 
     ? curationResult.content 
     : generateSimpleTrustRatings(limited)
   ```

3. **Add retry with exponential backoff:**
   ```typescript
   const curationResult = await retryWithBackoff(
     () => enhancedAIService.generateText(...),
     { maxRetries: 2, baseDelay: 2000 }
   )
   ```

### Long-term Improvements

1. **Cache AI responses** by prompt hash to avoid re-generation
2. **Pre-warm AI models** with dummy requests
3. **Add progress indicators** showing which stage is running
4. **Implement circuit breaker** for AI service to fast-fail on outages
5. **Use WebSockets** instead of SSE for bidirectional communication
6. **Add job queue** (Redis/BullMQ) for long-running reports
7. **Implement streaming AI responses** instead of waiting for full completion

---

## Testing the Workflow

### Manual Test Steps

1. Navigate to `/topics`
2. Enter query: "machine learning benchmarks"
3. Observe:
   - Progress steps update
   - Sources stream in
   - Metrics appear (relevance, diversity, coverage)
   - Topic chips display
   - Clusters show (if ≥6 sources)
4. Click "Generate Report"
5. Monitor:
   - Progress: "Curating trusted sources..."
   - Progress: "Analyzing each source..."
   - Progress: "Synthesizing final report..."
   - Token streaming (48 chars/chunk)
   - Final markdown display

### API Testing

```bash
# Test topics find stream
curl -N -H "Authorization: Bearer <token>" \
  'http://localhost:3000/api/topics/find/stream?q=AI&limit=10&quality=Standard'

# Test topic extraction
curl -X POST http://localhost:3000/api/topics/extract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"papers": [{"title": "Machine Learning", "abstract": "..."}]}'

# Test report stream
curl -N -X POST http://localhost:3000/api/topics/report/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "AI", "papers": [...], "quality": "Standard"}'
```

---

## Debugging Tips

**Enable debug logs:**
```bash
export LIT_SEARCH_DEBUG=1
```

**Check timeout issues:**
- Monitor Chrome DevTools Network tab for request duration
- Look for "timed out" in error messages
- Check Groq API status page
- Verify API keys are configured

**SSE connection issues:**
- Ensure `withCredentials: true` is set
- Check CORS headers
- Verify cookie-based auth works
- Monitor for 'onerror' events

**Token refund issues:**
- Check Supabase `token_transactions` table
- Verify refund_reason in metadata
- Ensure middleware calculates cost correctly

---

## Security Considerations

1. **Token validation** on all API routes
2. **Rate limiting** per user and per source
3. **Input validation** (query length, paper count)
4. **Timeout enforcement** prevents resource exhaustion
5. **Token refunds** prevent unfair charging on errors
6. **Session isolation** by user ID
7. **CORS restrictions** on API endpoints
8. **Sanitized error messages** (no internal details leaked)

---

## Conclusion

The Find Topics page is a sophisticated multi-stage research pipeline that:
- Aggregates papers from 7+ academic sources
- Uses AI to extract insights and generate reports
- Employs SSE for real-time streaming UX
- Implements complex rate limiting and timeout management
- Handles errors gracefully with token refunds

The current "Curation timed out" issue stems from the 60s timeout being too aggressive for slow AI API responses. Increasing to 90s or adding fallback logic will resolve this.
