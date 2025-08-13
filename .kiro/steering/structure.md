# Project Structure & Organization

## Directory Structure

```
ai-project-planner/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── ai/            # AI generation endpoints
│   │   ├── search/        # Literature search APIs
│   │   ├── collaborate/   # Team collaboration APIs
│   │   ├── user-api-keys/ # API key management
│   │   ├── stripe/        # Payment webhooks
│   │   └── upload/        # File upload handling
│   ├── (auth)/            # Authentication pages
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── explorer/          # Research discovery tools
│   ├── collaborate/       # Team collaboration features
│   ├── summarizer/        # Document summarization
│   ├── writer/            # Academic writing tools
│   ├── planner/           # Project management
│   ├── profile/           # User profile management
│   ├── settings/          # Application settings
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Landing page
│   └── loading.tsx        # Global loading component
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── animate-ui/       # Animated components
│   ├── auth/             # Authentication components
│   ├── common/           # Shared components
│   ├── forms/            # Form components
│   ├── planner/          # Project planning components
│   ├── providers/        # Context providers
│   └── *.tsx             # Feature-specific components
├── lib/                  # Core utilities and services
│   ├── services/         # Business logic services
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── ai-providers.ts   # AI provider configurations
│   ├── enhanced-ai-service.ts # Multi-provider AI service
│   ├── supabase.ts       # Database client
│   └── utils.ts          # Common utilities (cn, etc.)
├── hooks/                # Custom React hooks
├── server/               # WebSocket server
├── python/               # Python backend services
│   ├── app.py            # Flask application
│   ├── improved_app.py   # Enhanced Flask app
│   ├── search_papers.py  # Literature search logic
│   └── requirements.txt  # Python dependencies
├── scripts/              # Database and setup scripts
├── public/               # Static assets
├── types/                # Global TypeScript definitions
├── styles/               # Additional stylesheets
└── middleware.ts         # Next.js middleware for auth
```

## Architectural Patterns

### Feature-Based Organization
- Each major feature has its own app route directory
- Components are organized by feature or shared in `components/`
- Business logic is centralized in `lib/services/`

### API Route Structure
- RESTful API design with proper HTTP methods
- Consistent error handling and response formats
- Authentication middleware for protected routes
- Separate routes for different feature domains

### Component Hierarchy
```
Layout (app/layout.tsx)
├── ThemeProvider
├── AuthErrorBoundary
├── SupabaseAuthProvider
├── ResearchSessionProvider
├── MainNav
└── Page Content
    ├── Feature Components
    ├── UI Components
    └── Form Components
```

### State Management Layers
1. **Server State**: Supabase queries with real-time subscriptions
2. **Global State**: Zustand stores for app-wide state
3. **Context State**: React Context for auth and providers
4. **Local State**: useState/useReducer for component state

## File Naming Conventions

### Components
- PascalCase for component files: `UserProfile.tsx`
- kebab-case for UI components: `button.tsx`, `dialog.tsx`
- Descriptive names that indicate purpose: `research-chatbot.tsx`

### API Routes
- RESTful naming: `route.ts` in feature directories
- Nested routes follow directory structure: `api/ai/generate/route.ts`
- Use HTTP method exports: `GET`, `POST`, `PUT`, `DELETE`

### Utilities and Services
- camelCase for utility files: `authUtils.ts`
- Descriptive service names: `enhanced-ai-service.ts`
- Type files use kebab-case: `user-types.ts`

## Import Patterns

### Path Aliases
- `@/` maps to project root for clean imports
- `@/components/ui` for base UI components
- `@/lib` for utilities and services
- `@/hooks` for custom hooks

### Import Order
1. React and Next.js imports
2. Third-party library imports
3. Internal component imports (using @/ alias)
4. Relative imports
5. Type-only imports (with `type` keyword)

## Data Flow Architecture

### Authentication Flow
```
Middleware → SupabaseAuthProvider → Protected Routes
```

### API Request Flow
```
Client Component → API Route → Service Layer → Database/External API
```

### Real-time Updates
```
Database Change → Supabase Realtime → React Component
WebSocket Event → Socket.io → Client Handler
```

### AI Generation Flow
```
User Input → API Route → Enhanced AI Service → Provider Selection → Response
```

## Environment Configuration

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side Supabase key
- AI Provider keys: `OPENAI_API_KEY`, `GEMINI_API_KEY`, etc.
- `STRIPE_SECRET_KEY`: Stripe payment processing
- `STRIPE_WEBHOOK_SECRET`: Webhook verification

### Configuration Files
- `.env.local`: Local development environment
- `env.template`: Template for required variables
- `next.config.js`: Next.js configuration
- `tailwind.config.ts`: TailwindCSS configuration
- `tsconfig.json`: TypeScript configuration
- `components.json`: shadcn/ui configuration