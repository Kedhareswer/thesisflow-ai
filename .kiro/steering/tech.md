---
inclusion: always
---

# Technology Stack & Development Guidelines

## Required Tech Stack

### Frontend (Next.js 15.2.4 + React 19)

- **Framework**: Next.js App Router with TypeScript 5.9.2
- **UI**: Radix UI primitives + shadcn/ui components
- **Styling**: TailwindCSS 3.4 with CSS variables (`cn()` utility for conditional classes)
- **State**: Zustand (global), React Context (auth/providers), React Hook Form + Zod (forms)
- **Rich Text**: TipTap for collaborative editing
- **Icons**: Lucide React only

### Backend & Services

- **API**: Next.js API routes (`app/api/*/route.ts` pattern)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Auth**: Supabase Auth with JWT tokens
- **Real-time**: Socket.io WebSocket server (port 3001)
- **File Storage**: Supabase Storage (10MB limit, PDF/DOCX/TXT only)
- **Python Service**: Flask literature search service (port 5000)

### AI & External APIs

- **AI Providers**: OpenAI, Google Gemini, Groq, Anthropic, Mistral, AIML API
- **AI Service**: Use `enhanced-ai-service.ts` with automatic fallback/retry
- **Literature APIs**: OpenAlex, Semantic Scholar, arXiv, White Rose eTheses
- **Payments**: Stripe with webhook handling

## Critical Code Patterns

### API Route Template

```typescript
export async function POST(request: Request) {
  const user = await requireAuth(request); // Always authenticate first
  const body = await request.json();
  // Validate with Zod schema
  // Business logic
  return NextResponse.json(result);
}
```

### Component Structure

- Use `"use client"` directive for client components
- Function components with TypeScript interfaces
- Props interfaces named `[ComponentName]Props`
- Always implement error boundaries and loading states

### Database Access

- Use Supabase client with proper RLS policies
- Always handle authentication state in queries
- Use TypeScript types for database schemas
- Implement proper foreign key relationships

### File Organization

- API routes: `app/api/[feature]/route.ts`
- Components: Feature-based in `components/[feature]/`
- Services: Business logic in `lib/services/`
- Types: Centralized in `lib/types/`
- Path alias: `@/` maps to project root

## Development Commands

### Essential Commands

```bash
# Full development environment
node start-dev.js

# Individual services
pnpm dev          # Next.js (port 3000)
pnpm dev:ws       # WebSocket (port 3001)
cd python && python app.py  # Literature search (port 5000)

# Database operations
node scripts/run-migration.js
node scripts/test-database.js
```

## Security Requirements

### Authentication

- Always use `requireAuth` utility for protected routes
- Implement proper RLS policies for all database tables
- Never expose service role keys in client code

### Input Validation

- Validate all inputs with Zod schemas
- Sanitize file uploads (PDF, DOCX, TXT only, 10MB max)
- Escape user-generated content
- Implement rate limiting for AI endpoints

### Environment Variables

- Store all secrets in `.env.local`
- Never commit environment files
- Required vars: Supabase keys, AI provider keys, Stripe keys

## AI Integration Rules

### Enhanced AI Service

- Use `lib/enhanced-ai-service.ts` for all AI calls
- Implement automatic provider fallback
- Handle streaming responses where possible
- Include proper error handling and retry logic

### Multi-Provider Support

- Support OpenAI, Gemini, Groq, Anthropic, Mistral, AIML
- Use provider detection and automatic switching
- Implement rate limiting per provider
- Store provider preferences per user

## File Processing Standards

### Supported Formats

- PDF, DOCX, TXT files only
- Maximum 10MB file size
- Secure upload to Supabase Storage
- Progress indicators for uploads

### Document Processing

- Use appropriate processors in `lib/file-processors.ts`
- Implement proper error handling for corrupted files
- Generate secure, non-predictable file names
- Clean up temporary files after processing
