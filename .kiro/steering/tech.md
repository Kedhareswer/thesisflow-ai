# Technology Stack & Development Guidelines

## Core Technologies

### Frontend Stack
- **Framework**: Next.js 15.2.4 with App Router
- **UI Library**: React 19 with TypeScript 5.9.2
- **Styling**: TailwindCSS 3.4 with CSS variables for theming
- **UI Components**: Radix UI primitives with shadcn/ui component system
- **State Management**: Zustand for global state, React Context for auth/providers
- **Forms**: React Hook Form with Zod validation
- **Rich Text**: TipTap for collaborative document editing
- **Animations**: Framer Motion for smooth transitions
- **Icons**: Lucide React

### Backend Infrastructure
- **API**: Next.js API Routes with TypeScript
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with JWT tokens
- **Real-time**: Socket.io WebSocket server (port 3001)
- **File Storage**: Supabase Storage with secure uploads
- **Python Backend**: Flask service for literature search (port 5000)

### AI Integration
- **Providers**: OpenAI, Google Gemini, Groq, Anthropic, Mistral, AIML API
- **Service**: Enhanced AI service with automatic fallback and retry logic
- **Features**: Multi-personality AI, context-aware responses, streaming

### External Services
- **Literature APIs**: OpenAlex, Semantic Scholar, arXiv, White Rose eTheses
- **Payments**: Stripe with webhook handling
- **Analytics**: Vercel Analytics
- **Email**: Supabase Auth email templates

## Development Commands

### Setup & Installation
```bash
# Install dependencies
pnpm install

# Setup Python backend
cd python && pip install -r requirements.txt

# Configure environment
cp env.template .env.local
```

### Development
```bash
# Start full development environment
node start-dev.js
# or
pnpm dev

# Start individual services
pnpm dev:next     # Next.js frontend (port 3000)
pnpm dev:ws       # WebSocket server (port 3001)
cd python && python app.py  # Python backend (port 5000)
```

### Database
```bash
# Run database migrations
node scripts/run-migration.js

# Setup Stripe test data
node scripts/setup-stripe-prices.js

# Test database connection
node scripts/test-database.js
```

### Build & Deploy
```bash
# Production build
pnpm build

# Start production server
pnpm start

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## Code Standards

### TypeScript Configuration
- Strict mode enabled with ES6 target
- Path aliases: `@/*` maps to project root
- Module resolution: bundler with ESNext modules

### Component Patterns
- Use `"use client"` directive for client components
- Prefer function components with TypeScript interfaces
- Use Radix UI primitives with custom styling via CVA (class-variance-authority)
- Implement proper error boundaries for robust UX

### API Route Structure
- Use Next.js App Router API routes (`app/api/*/route.ts`)
- Implement proper authentication with `requireAuth` utility
- Return consistent JSON responses with error handling
- Use TypeScript for request/response typing

### Database Patterns
- Use Supabase client with proper RLS policies
- Implement proper foreign key relationships
- Use TypeScript types for database schemas
- Handle authentication state properly in queries

### Styling Guidelines
- Use TailwindCSS utility classes
- Implement CSS variables for theming (light/dark mode)
- Use `cn()` utility for conditional class merging
- Follow mobile-first responsive design principles

### Security Best Practices
- Validate all user inputs with Zod schemas
- Use middleware for route protection
- Implement proper CORS configuration
- Store sensitive data in environment variables only
- Use Supabase RLS for data access control