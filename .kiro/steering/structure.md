---
inclusion: always
---

# Project Structure & Code Organization

## Directory Structure & Patterns

### Core Application Structure

```
app/                    # Next.js App Router - feature-based organization
├── api/               # API routes with consistent patterns
│   ├── ai/            # AI generation endpoints
│   ├── search/        # Literature search APIs
│   ├── collaborate/   # Team collaboration APIs
│   └── */route.ts     # Each endpoint as route.ts file
├── (auth)/            # Route groups for auth pages
├── [feature]/         # Feature directories (explorer, summarizer, writer, etc.)
│   ├── page.tsx       # Main feature page
│   ├── components/    # Feature-specific components
│   └── lib/          # Feature-specific utilities
├── layout.tsx         # Root layout with providers
└── globals.css        # Global styles with CSS variables
```

### Component Organization

```
components/
├── ui/               # shadcn/ui base components (button, dialog, etc.)
├── [feature]/        # Feature-specific components
├── common/           # Shared components across features
├── providers/        # React Context providers
└── *.tsx            # Top-level shared components
```

### Service Layer Structure

```
lib/
├── services/         # Business logic services
├── types/           # TypeScript definitions
├── utils/           # Utility functions
├── ai-providers.ts  # AI provider configurations
├── enhanced-ai-service.ts # Multi-provider AI service
├── supabase.ts      # Database client
└── utils.ts         # Common utilities (cn, etc.)
```

## Code Patterns & Conventions

### Component Patterns

- Use `"use client"` directive for client components
- Function components with TypeScript interfaces
- Props interfaces named `[ComponentName]Props`
- Error boundaries for robust UX
- Consistent loading and error states

### API Route Patterns

```typescript
// Standard API route structure
export async function POST(request: Request) {
  const user = await requireAuth(request); // Always authenticate first
  const body = await request.json();
  // Validate with Zod schema
  // Business logic
  return NextResponse.json(result);
}
```

### Service Layer Patterns

- Centralize business logic in `lib/services/`
- Use dependency injection for testability
- Consistent error handling with typed errors
- Async/await for all async operations

### State Management Strategy

1. **Server State**: Supabase queries with real-time subscriptions
2. **Global State**: Zustand stores for app-wide state
3. **Context State**: React Context for auth and providers
4. **Local State**: useState/useReducer for component state

## File Naming & Import Conventions

### Naming Rules

- **Components**: PascalCase (`UserProfile.tsx`)
- **UI Components**: kebab-case (`button.tsx`, `dialog.tsx`)
- **API Routes**: Always `route.ts` in feature directories
- **Services**: kebab-case (`enhanced-ai-service.ts`)
- **Types**: kebab-case (`user-types.ts`)
- **Utilities**: camelCase (`authUtils.ts`)

### Import Order & Aliases

```typescript
// 1. React and Next.js
import React from "react";
import { NextResponse } from "next/server";

// 2. Third-party libraries
import { z } from "zod";

// 3. Internal imports with @/ alias
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-utils";

// 4. Relative imports
import "./styles.css";

// 5. Type-only imports
import type { User } from "@/lib/types";
```

### Path Aliases

- `@/` → project root
- `@/components/ui` → base UI components
- `@/lib` → utilities and services
- `@/hooks` → custom hooks

## Architecture Patterns

### Component Hierarchy

```
RootLayout
├── Providers (Theme, Auth, Research Session)
├── MainNav
└── Page Content
    ├── Feature Components
    ├── UI Components
    └── Form Components
```

### Data Flow Patterns

- **Authentication**: Middleware → Provider → Protected Routes
- **API Requests**: Component → API Route → Service → Database/External API
- **Real-time**: Database Change → Supabase Realtime → Component
- **AI Generation**: Input → API Route → Enhanced AI Service → Provider → Response

### Error Handling Strategy

- API routes return consistent error formats
- Components use error boundaries
- Loading states for async operations
- Graceful degradation for failed services

## Development Patterns

### Form Handling

- React Hook Form with Zod validation
- Consistent error display patterns
- Loading states during submission
- Success/error feedback to users

### File Processing

- Support PDF, DOCX, TXT formats
- 10MB file size limit
- Secure file upload to Supabase Storage
- Progress indicators for uploads

### AI Integration

- Multi-provider support with fallback
- Streaming responses where possible
- Rate limiting and error handling
- Context-aware prompt engineering

### Real-time Features

- WebSocket server on port 3001
- Socket.io for real-time collaboration
- Supabase realtime for database changes
- Optimistic updates for better UX

## Configuration & Environment

### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers
OPENAI_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Key Configuration Files

- `.env.local` - Local development environment
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - TailwindCSS with CSS variables
- `components.json` - shadcn/ui configuration
- `middleware.ts` - Authentication middleware
