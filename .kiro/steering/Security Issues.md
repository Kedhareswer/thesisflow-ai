---
inclusion: always
---

---
inclusion: always
---

# Security Guidelines & Best Practices

## Authentication Patterns

### Required API Route Pattern
```typescript
// MANDATORY: All protected API routes must use this pattern
export async function POST(request: Request) {
  const user = await requireAuth(request); // Always first line
  const body = await request.json();
  // Validate with Zod schema before processing
  return NextResponse.json(result);
}
```

### Supabase Auth Rules
- Use `requireAuth` from `@/lib/auth-utils` for all protected routes
- Server-side: `supabase.auth.getUser()` for user validation
- Client-side: Check auth state before rendering protected content
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code
- All database tables MUST have RLS policies enabled

## Input Validation Requirements

### Zod Schema Validation
```typescript
// REQUIRED: Validate all API inputs
const schema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
});
const validatedData = schema.parse(body);
```

### File Upload Security
- Allowed formats: PDF, DOCX, TXT only
- Max size: 10MB per file
- Use Supabase Storage with secure bucket policies
- Generate UUIDs for file names, never use user-provided names
- Validate file headers, not just extensions

### URL Validation
```typescript
// REQUIRED: Validate URLs before fetching
const urlSchema = z.string().url().refine(url => {
  const parsed = new URL(url);
  return ['http:', 'https:'].includes(parsed.protocol);
});
```

## API Security Patterns

### Rate Limiting Implementation
- AI endpoints: 10 requests/minute per user
- Literature search: 30 requests/minute per user
- File upload: 5 files/minute per user
- Use exponential backoff for external API calls

### Error Response Format
```typescript
// STANDARD: Never expose internal details
return NextResponse.json(
  { error: "Invalid request", code: "VALIDATION_ERROR" },
  { status: 400 }
);
```

### External API Integration
- Store all API keys in `.env.local`
- Implement timeout configurations (30s max)
- Validate all external API responses with Zod
- Log API failures without exposing keys

## Data Protection Rules

### Sensitive Data Handling
- Never log: API keys, user passwords, session tokens, file contents
- Sanitize error messages before sending to client
- Use parameterized queries for all database operations
- Encrypt file contents in Supabase Storage

### Database Security Patterns
```sql
-- REQUIRED: RLS policy example
CREATE POLICY "Users can only access their own data" ON user_documents
  FOR ALL USING (auth.uid() = user_id);
```

## Environment Security

### Required Environment Variables
```bash
# MANDATORY: These must be set and validated on startup
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

### Environment Validation
```typescript
// REQUIRED: Validate env vars on startup
const envSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
});
```

## Component Security

### Client Component Security
- Validate user permissions before rendering sensitive UI
- Sanitize all user-generated content with DOMPurify
- Use error boundaries for all feature components
- Never store sensitive data in component state

### Form Security
```typescript
// REQUIRED: Form validation pattern
const formSchema = z.object({
  // Define strict validation rules
});

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
});
```

## WebSocket Security

### Socket.io Configuration
- Validate origin for all WebSocket connections
- Authenticate users before allowing socket connections
- Implement rate limiting for socket events
- Sanitize all real-time message content

## Critical Security Checks

### Before Deployment
- [ ] All API routes use `requireAuth`
- [ ] All user inputs validated with Zod
- [ ] No API keys in client-side code
- [ ] RLS policies enabled on all tables
- [ ] File upload restrictions implemented
- [ ] Error messages sanitized
- [ ] Environment variables validated

### Code Review Checklist
- [ ] No `console.log` with sensitive data
- [ ] No hardcoded secrets or URLs
- [ ] Proper TypeScript types (no `any`)
- [ ] Input validation on all endpoints
- [ ] Proper error handling implemented
