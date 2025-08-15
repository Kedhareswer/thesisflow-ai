---
inclusion: always
---

# Project Structure & Code Organization

## Directory Structure Rules

### Feature-Based Organization

- `app/[feature]/` - Each feature gets its own directory with `page.tsx`
- `app/api/[feature]/route.ts` - API endpoints follow feature structure
- `components/[feature]/` - Feature-specific components
- `lib/services/` - Business logic services

### Critical File Locations

- `lib/enhanced-ai-service.ts` - Multi-provider AI service (USE THIS for all AI calls)
- `lib/supabase.ts` - Database client
- `lib/auth-utils.ts` - Authentication utilities (`requireAuth` function)
- `components/ui/` - shadcn/ui base components
- `middleware.ts` - Authentication middleware

## Mandatory Code Patterns

### API Route Structure

```typescript
export async function POST(request: Request) {
  const user = await requireAuth(request); // ALWAYS first line
  const body = await request.json();
  const validatedData = schema.parse(body); // Zod validation required
  return NextResponse.json(result);
}
```

### Component Structure

```typescript
"use client"; // Required for client components

interface ComponentNameProps {
  // Props interface must match component name
}

export function ComponentName({ prop }: ComponentNameProps) {
  // Implementation
}
```

### Import Order (Strict)

```typescript
// 1. React/Next.js
import React from "react";
import { NextResponse } from "next/server";

// 2. Third-party
import { z } from "zod";

// 3. Internal (@/ alias)
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-utils";

// 4. Types (separate)
import type { User } from "@/lib/types";
```

## File Naming Conventions

### Strict Rules

- **Components**: PascalCase (`UserProfile.tsx`)
- **UI Components**: kebab-case (`button.tsx`, `input.tsx`)
- **API Routes**: Always `route.ts` in feature directories
- **Services**: kebab-case (`enhanced-ai-service.ts`)
- **Utilities**: camelCase (`authUtils.ts`)
- **Types**: kebab-case (`user-types.ts`)

### Path Aliases

- `@/` → project root (ALWAYS use this for internal imports)
- Never use relative imports for cross-directory references

## State Management Rules

### By Scope

1. **Server State**: Supabase queries with real-time subscriptions
2. **Global State**: Zustand stores (auth, user preferences)
3. **Context State**: React Context for providers only
4. **Local State**: useState/useReducer for component-specific data

### Forms

- React Hook Form + Zod validation (MANDATORY)
- Error boundaries on all form components
- Loading states during submission

## Architecture Patterns

### Data Flow (Enforced)

```
Component → API Route → Service → Database/External API
         ↓
    Zod Validation → requireAuth → Business Logic
```

### AI Integration Pattern

```typescript
// ALWAYS use enhanced-ai-service.ts
import { generateResponse } from "@/lib/enhanced-ai-service";

const response = await generateResponse({
  provider: "openai", // or auto-detect
  messages: [...],
  stream: true // when possible
});
```

### Error Handling (Required)

- API routes: Consistent error format with status codes
- Components: Error boundaries for all features
- Services: Typed errors with proper logging
- UI: Loading states and graceful degradation

## Component Organization Rules

### Feature Components

- Place in `components/[feature]/` directory
- Export from index file for clean imports
- Include loading and error states
- Use TypeScript interfaces for all props

### Shared Components

- `components/ui/` - Base shadcn/ui components (DO NOT modify)
- `components/common/` - Shared business components
- `components/providers/` - React Context providers only

### Real-time Features

- WebSocket server on port 3001 (Socket.io)
- Supabase realtime for database changes
- Optimistic updates for better UX
- Rate limiting on all real-time endpoints

## Development Commands

### Essential Services

```bash
node start-dev.js     # Full development environment
pnpm dev             # Next.js only (port 3000)
pnpm dev:ws          # WebSocket server (port 3001)
cd python && python app.py  # Literature search (port 5000)
```

### File Processing Rules

- PDF, DOCX, TXT only (validate MIME types)
- 10MB maximum file size
- Supabase Storage with secure bucket policies
- Generate UUIDs for file names (never use user input)
