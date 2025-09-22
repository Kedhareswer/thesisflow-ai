# Idea

## Problem
Finding, digesting, and organizing research across multiple sources is slow and fragmented. Researchers need fast multi-source discovery, rigorous topic synthesis, trustworthy citations, and a way to turn ideas into actionable plans.

## Solution
ThesisFlow-AI unifies literature search, extraction, topic synthesis (scholarly report), paraphrasing, citations, and planning—powered by LLMs with streaming UX and robust fallback.

- Literature search aggregates across sources and APIs, with rate-limit resilience and short aggregation windows
- Topic reports are generated via SSE in stages (curation → analysis → synthesis) with explicit events and timeouts
- AI chat supports token-by-token streaming; providers are abstracted with model fallback
- Extraction and citation services turn files into structured knowledge and CSL metadata
- Planner drafts store wizard state for iterative flows and cross-device continuity

## Differentiators
- Streaming-first UX with readable SSE contracts
- Provider abstraction and automatic fallback to mitigate model issues
- Monthly-only token system with dynamic per-feature costs (context-sensitive)
- Supabase-native RLS and RPCs with extensive migrations for collaboration and chat

## Why now
- Open models via OpenRouter are rapidly improving
- Research workflows benefit from real-time synthesis and planning
- Developer tooling for streaming and typed contracts has matured (Next.js App Router + Supabase)

## Related components
- `hooks/use-literature-search.ts`, `lib/services/literature-search.service.ts`
- `app/api/topics/report/stream/route.ts`, `lib/services/topic-report-agents.ts`
- `app/api/ai/chat/stream/route.ts`, `lib/ai-providers.ts`
- `lib/services/file-extraction/*`, `app/api/extract*`
- `public.planner_drafts` (Supabase)
