---
inclusion: always
---

---

## inclusion: always

# Technology Stack & Development Guidelines

## Core Stack

### Frontend (Next.js 15.2.4 + React 19)

- **Framework**: Next.js App Router with TypeScript 5.9.2
- **UI**: shadcn/ui components (Radix UI primitives)
- **Styling**: TailwindCSS 3.4 with CSS variables, `cn()` utility
- **State**: Zustand (global), React Context (auth/providers)
- **Forms**: React Hook Form + Zod validation (MANDATORY)
- **Icons**: Lucide React ONLY

### Backend & Services

- **API**: Next.js API routes (`app/api/[feature]/route.ts`)
- **Database**: Supabase PostgreSQL with RLS
- **Auth**: Supabase Auth with JWT tokens
- **Real-time**: Socket.io WebSocket (port 3001)
- **File Storage**: Supabase Storage (10MB, PDF/DOCX/TXT only)
- **Literature Search**: Python Flask service (port 5000)

### AI Integration

- **Service**: Use `lib/enhanced-ai-service.ts` for ALL AI calls
- **Providers**: OpenAI, Gemini, Groq, Anthropic, Mistral, AIML
- **Features**: Auto-fallback, streaming, rate limiting

## Mandatory Code Patterns

### API Route Structure (STRICT)

```typescript
export async function POST(request: Request) {
  const user = await requireAuth(request); // ALWAYS first line
  const body = await request.json();
  const validatedData = schema.parse(body); // Zod validation required

  // Business logic here

  return NextResponse.json(result);
}
```

### Component Pattern (REQUIRED)

```typescript
"use client"; // For client components

interface ComponentNameProps {
  // Props must match component name
}

export function ComponentName({ prop }: ComponentNameProps) {
  // Implementation with error boundaries and loading states
}
```

### Import Order (ENFORCED)

```typescript
// 1. React/Next.js
import React from "react";
import { NextResponse } from "next/server";

// 2. Third-party libraries
import { z } from "zod";

// 3. Internal (@/ alias ONLY)
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-utils";

// 4. Types (separate section)
import type { User } from "@/lib/types";
```

## File Organization Rules

### Directory Structure

- `app/[feature]/page.tsx` - Feature pages
- `app/api/[feature]/route.ts` - API endpoints
- `components/[feature]/` - Feature components
- `lib/services/` - Business logic
- `lib/types/` - TypeScript definitions

### Naming Conventions

- **Components**: PascalCase (`UserProfile.tsx`)
- **UI Components**: kebab-case (`button.tsx`)
- **Services**: kebab-case (`enhanced-ai-service.ts`)
- **API Routes**: Always `route.ts`

### Path Aliases

- Use `@/` for ALL internal imports
- Never use relative imports across directories

## Development Commands

```bash
# Full environment
node start-dev.js

# Individual services
pnpm dev                    # Next.js (3000)
pnpm dev:ws                # WebSocket (3001)
cd python && python app.py # Literature (5000)

# Database
node scripts/run-migration.js
node scripts/test-database.js
```

## Security Requirements (CRITICAL)

### Authentication Pattern

```typescript
// MANDATORY for protected routes
const user = await requireAuth(request);
```

### Input Validation

- ALL inputs MUST use Zod schemas
- File uploads: PDF/DOCX/TXT only, 10MB max
- Rate limiting on AI endpoints

### Environment Variables

```bash
# Required in .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

## AI Service Usage (MANDATORY)

### Enhanced AI Service Pattern

```typescript
import { generateResponse } from "@/lib/enhanced-ai-service";

const response = await generateResponse({
  provider: "openai", // or auto-detect
  messages: [...],
  stream: true, // when possible
  maxRetries: 3
});
```

### Provider Support

- Auto-fallback between providers
- User preference storage
- Rate limiting per provider
- Error handling with retries

## File Processing Rules

### Upload Restrictions

- Formats: PDF, DOCX, TXT only (validate MIME types)
- Size: 10MB maximum
- Storage: Supabase with secure policies
- Naming: UUID-based, never user input

### Processing Pattern

```typescript
// Use lib/file-processors.ts
const processor = getFileProcessor(file.type);
const content = await processor.process(file);
```

## Error Handling Standards

### API Responses

```typescript
// Consistent error format
return NextResponse.json(
  { error: "Validation failed", code: "INVALID_INPUT" },
  { status: 400 }
);
```

### Component Error Boundaries

- Wrap all feature components
- Graceful degradation
- User-friendly error messages

## Performance Guidelines

### Optimization Rules

- Lazy load non-critical components
- Use React.memo for expensive renders
- Implement proper loading states
- Cache API responses where appropriate

### Real-time Features

- WebSocket for chat/collaboration
- Supabase realtime for database changes
- Optimistic updates for better UX
