# Sequences and Flows

This file contains the core end-to-end flows for ThesisFlow-AI expressed as Mermaid diagrams. Use these to understand runtime behavior and contracts quickly.

## Auth and route protection
```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant M as middleware.ts
    participant R as Next.js Route
    participant S as Supabase (Auth)

    B->>M: Request /protected/page
    M->>S: Validate cookies (sb-access-token)
    S-->>M: user_id or 401
    alt Authenticated
      M-->>B: Continue (rewrite allowed)
      B->>R: GET /protected/page
      R-->>B: 200 HTML/JSON
    else Not Authenticated
      M-->>B: Redirect to /login
    end
```

## Topics: literature search → scholarly report (SSE)
```mermaid
sequenceDiagram
    autonumber
    participant UI as app/topics/page.tsx
    participant L as /api/literature-search
    participant LS as literature-search.service.ts
    participant EXT as External APIs (OpenAlex, arXiv, CrossRef, CSE, Tavily, ...)
    participant T as /api/topics/report/stream
    participant OR as OpenRouter (LLM)
    participant SUPA as Supabase (tokens)

    UI->>L: POST search query (respect aggregate window)
    L->>LS: Resolve providers + cache
    loop Providers
      LS->>EXT: Query source
      EXT-->>LS: Results
    end
    LS-->>L: Aggregated results
    L-->>UI: JSON papers

    UI->>T: POST {query, papers, quality}&limit (SSE)
    T->>SUPA: withTokenValidation() → deduct tokens (get_feature_cost)
    SUPA-->>T: deducted

    T-->>UI: SSE event: init
    T->>OR: Curate sources (stage 1) with timeout
    OR-->>T: Progress/tokens
    T-->>UI: SSE events: progress/token
    T->>OR: Analyze (stage 2) with timeout
    OR-->>T: Progress/tokens
    T-->>UI: SSE events: progress/token
    T->>OR: Synthesize (stage 3) with timeout
    OR-->>T: Final tokens
    T-->>UI: SSE event: done

    UI-->>UI: Render markdown progressively

    rect rgba(255,213,213,0.3)
    note over UI,T,SUPA: On error or client abort → emit SSE error and REFUND tokens with same context
    end
```

## Literature search: aggregation and rate-limit flow
```mermaid
flowchart TD
    A[User triggers search] --> B{Aggregate window open?}
    B -- Yes --> C[Ignore or queue; UI shows aggregating badge]
    B -- No --> D[Call /api/literature-search]
    D --> E[Query providers via literature-search.service]
    E --> F[Return aggregated results]
    F --> G[UI renders papers]

    D -.429.-> H[Rate limited]
    H --> I[Return Retry-After header]
    I --> J[Hook starts countdown and disables retry]
```

## AI Chat streaming with fallback
```mermaid
sequenceDiagram
    autonumber
    participant UI as ResearchAssistant (EventSource)
    participant C as /api/ai/chat/stream
    participant P as ai-providers.ts
    participant OR as OpenRouter

    UI->>C: EventSource connect (withCredentials: true; cookie auth)
    C->>P: Generate with primary model
    alt Model unsupported / 400
      P->>OR: Try next fallback
    else OK
      P->>OR: Stream tokens
    end
    OR-->>C: token chunks
    C-->>UI: SSE events: init/token/progress/done
    note over C,UI: On fatal failure → SSE error, close stream
```

## Extraction orchestrator
```mermaid
sequenceDiagram
    autonumber
    participant UI as Upload UI
    participant X as /api/extract-file (or /extract)
    participant FX as lib/services/file-extraction/*
    participant SUM as summarizer.service.ts

    UI->>X: POST file
    X->>FX: Detect type + extract text/tables
    FX-->>X: Structured extraction
    X->>SUM: Summarize / key points (optional)
    SUM-->>X: Summary/metadata
    X-->>UI: JSON with extracted content
```

## Planner: plan-and-execute (SSE)
```mermaid
sequenceDiagram
    autonumber
    participant UI as Planner UI
    participant P as /api/plan-and-execute (SSE)
    participant PL as planning.service.ts
    participant EX as executing.service.ts

    UI->>P: POST inputs (SSE)
    P->>PL: Generate plan
    PL-->>P: steps/outline
    P-->>UI: SSE events: init/progress/token
    UI-->>UI: Let user preview/accept
    UI->>P: Continue execute
    P->>EX: Execute tasks
    EX-->>P: status updates
    P-->>UI: SSE events: progress/done (or error)
```

## Tokens: deduct and refund
```mermaid
sequenceDiagram
    autonumber
    participant R as Route Handler
    participant MW as withTokenValidation()
    participant S as Supabase (RPC)

    R->>MW: Call handler(feature)
    MW->>S: get_feature_cost + deduct_user_tokens
    S-->>MW: ok
    alt Non-stream route success
      R-->>MW: return 200
      MW-->>R: finalize
    else Non-stream route error
      R-->>MW: throw Error
      MW->>S: refund_user_tokens
      S-->>MW: refunded
    end

    rect rgba(255,213,213,0.3)
    note over R,MW: Stream routes must refund explicitly in the handler on error/abort
    end
```

## WebSocket presence and keepalive
```mermaid
sequenceDiagram
    autonumber
    participant UI as Client
    participant WS as websocket-server.js
    participant DB as Supabase (presence tables)
    participant KA as render-keepalive.service.ts

    UI->>WS: Connect WebSocket
    WS->>DB: Update presence/typing status
    UI-->>WS: Heartbeat pings
    KA->>WS: Periodic keepalive (hosting dependent)
    WS-->>UI: Broadcast presence/events
```

## References
- SSE routes: `app/api/ai/chat/stream/route.ts`, `app/api/topics/report/stream/route.ts`, `app/api/plan-and-execute/route.ts`
- Hooks: `hooks/use-literature-search.ts`, `hooks/use-chat-socket.ts`, `hooks/use-plan-and-execute.ts`
- Services: `lib/services/literature-search.service.ts`, `lib/services/openrouter.service.ts`, `lib/services/topic-report-agents.ts`, `lib/services/file-extraction/*`, `lib/services/planning.service.ts`, `lib/services/executing.service.ts`, `lib/services/token.service.ts`
- Middleware: `lib/middleware/token-middleware.ts`
- Supabase URL: xxxxx
