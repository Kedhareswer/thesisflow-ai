# Extract Data

- Source: `app/extract/page.tsx` (legacy), `app/extract-v2/page.tsx` (redesigned)

## What is here
- File upload and chat about extracted content. Previews text/PDF/image/CSV, shows tables/entities, exports CSV/JSON.
- **v2 Redesign**: 3-column layout with Workspace Panel, Viewer Tabs, Insights Rail, and Chat Dock.

## Why it is used
- Convert files into structured insight and interact with a document-aware chat.

## How it works
- Upload path: `POST /api/extract` with multipart form-data (file + options). Validates size ≤ 10MB and supported types; orchestrates extraction and writes optional DB record.
- Quick server-side preview: `POST /api/extract-file` returns text and metadata (PDF/Word/PPTX processing included) for UI preview.
- Document chat: `POST /api/extract/chat` with `{ message, context }`, uses OpenRouter fallback.

## Extract Data v2 (Phase 0 - Scaffolding)

### Feature Flag
Set `NEXT_PUBLIC_EXTRACT_V2_ENABLED=true` to enable v2 layout in the original page, or visit `/extract-v2` directly.

### New Architecture
- **Workspace Panel** (left): Upload, recent files, search/filter, grid/list toggle
- **Viewer Tabs** (center): File View, Summary, Tables, Entities, Citations, Raw JSON
- **Insights Rail** (right): Research Progress stepper, Key Insights, Activity Timeline, session metrics
- **Chat Dock** (bottom): Document-aware chat with suggestion chips, expandable, Advanced settings drawer

### Components Created
- `app/extract/components/workspace-panel.tsx`
- `app/extract/components/viewer-tabs/*.tsx` (6 tab components)
- `app/extract/components/insights-rail.tsx`
- `app/extract/components/chat-dock.tsx`
- `hooks/use-extraction-stream.ts` (Phase 0: mock data)
- `hooks/use-extract-chat-stream.ts` (Phase 0: mock streaming)
- `lib/types/extract-stream.ts` (SSE contracts and state interfaces)

### Phase 0 Status
- ✅ Component scaffolding complete
- ✅ 3-column layout rendering
- ✅ Mock extraction and chat streams
- ✅ Feature flag support
- 🔄 **Next**: Phase 1 - Real SSE streaming routes and data wiring

### Upcoming SSE Contracts (Phase 1+)
- `app/api/extract/stream/route.ts` - Extraction streaming with events: init, progress, parse, tables, entities, citations, insight, done, error, ping
- `app/api/extract/chat/stream/route.ts` - Chat streaming with conversation history and document context

## APIs & Integrations
- `app/api/extract/route.ts` (ExtractionOrchestrator, DataExtractionService, Supabase admin insert to `extractions`).
- `app/api/extract-file/route.ts` (PDF via `pdf-parse`, DOCX via `mammoth`, PPTX via `PptxExtractor`, optional OCR path via `FileProcessorWithOCR`).
- `app/api/extract/chat/route.ts` (OpenRouter fallback order).

## Authentication and Authorization
- Page protected by `middleware.ts` (`/extract`).
- `/api/extract` uses `requireAuth` (server) and Supabase admin credentials for DB persistence.
- `/api/extract/chat` uses `requireAuth` from `@/lib/auth-utils`.

## Security Practices
- File size checks and supported-type allowlist.
- Server-side parsing avoids recursion; sanitizes errors before returning.

## Data Storage
- Table: `extractions` (user_id, file metadata, result_json).

## Billing / Tokens
- Not charged by default in code shown; depends on environment.

## Middleware
- Route protection; API auth helpers.

## Error Handling
- Server returns 413 for large uploads, 422 for unreadable content, structured error JSON everywhere.

## Tests
- Unit: CSV/JSON export, preview parsers, chat service handler.
- Black box: POST `/api/extract` happy path and large file (413) case.

## Sequence
```mermaid
sequenceDiagram
  autonumber
  participant UI as extract/page.tsx
  participant P as /api/extract-file
  participant E as /api/extract
  participant C as /api/extract/chat

  UI->>P: POST file (preview)
  P-->>UI: { text, metadata }
  UI->>E: POST file + options (summary/tables/entities)
  E-->>UI: { result, metadata, extractionId }
  UI->>C: POST message + context
  C-->>UI: reply
```

## Related Files
- `app/extract/page.tsx`
- `app/api/extract/route.ts`
- `app/api/extract-file/route.ts`
- `app/api/extract/chat/route.ts`
