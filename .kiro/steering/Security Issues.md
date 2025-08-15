---
inclusion: always
---

---
inclusion: always
---

# Security Guidelines & Best Practices

## Authentication Requirements

### API Route Authentication Pattern
```typescript
// MANDATORY: All protected API routes must start with this
export async function POST(request: Request) {
  const user = await requireAuth(request); // Always first line
  const body = await request.json();
  const validatedData = schema.parse(body); // Validate before processing
  return NextResponse.json(result);
}
```

### Supabase Authentication Rules
- **Protected Routes**: Always use `requireAuth` from `@/lib/auth-utils`
- **Server Auth**: Use `supabase.auth.getUser()` for user validation
- **Client Auth**: Check auth state before rendering protected content
- **Service Key**: Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code
- **RLS Policies**: All database tables MUST have Row Level Security enabled

## Input Validation Standards

### Zod Schema Requirements
```typescript
// REQUIRED: All API inputs must be validated
const schema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  url: z.string().url().optional(),
});
const validatedData = schema.parse(body);
```

### File Upload Restrictions
- **Formats**: PDF, DOCX, TXT only (validate MIME types and headers)
- **Size Limit**: 10MB maximum per file
- **Storage**: Use Supabase Storage with secure bucket policies
- **Naming**: Generate UUIDs for file names, never use user input
- **Processing**: Validate file integrity before processing

### URL Validation Pattern
```typescript
// REQUIRED: Validate external URLs
const urlSchema = z.string().url().refine(url => {
  const parsed = new URL(url);
  return ['http:', 'https:'].includes(parsed.protocol) && 
         !parsed.hostname.includes('localhost');
});
```

## API Security Implementation

### Rate Limiting Rules
- **AI Endpoints**: 10 requests/minute per user
- **Literature Search**: 30 requests/minute per user  
- **File Upload**: 5 files/minute per user
- **External APIs**: Implement exponential backoff (1s, 2s, 4s, 8s)

### Error Response Standards
```typescript
// STANDARD: Sanitized error responses
return NextResponse.json(
  { error: "Invalid request", code: "VALIDATION_ERROR" },
  { status: 400 }
);
// Never expose: stack traces, internal paths, API keys
```

### External API Security
- **API Keys**: Store in `.env.local`, never in client code
- **Timeouts**: 30 second maximum for all external calls
- **Validation**: Use Zod schemas for all external API responses
- **Logging**: Log failures without exposing sensitive data

## Data Protection Standards

### Sensitive Data Rules
- **Never Log**: API keys, passwords, session tokens, file contents, user PII
- **Error Sanitization**: Remove internal details before client responses
- **Database Queries**: Use parameterized queries only
- **File Storage**: Encrypt sensitive files in Supabase Storage

### Database Security Pattern
```sql
-- REQUIRED: RLS policy template
CREATE POLICY "user_access_policy" ON table_name
  FOR ALL USING (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

## Environment & Configuration Security

### Required Environment Variables
```bash
# Core Services
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers
OPENAI_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=

# External Services
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Environment Validation
```typescript
// REQUIRED: Validate critical env vars on startup
const envSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
});
envSchema.parse(process.env);
```

## Component Security Patterns

### Client Component Security
- **Permission Checks**: Validate user access before rendering sensitive UI
- **Content Sanitization**: Use DOMPurify for user-generated content
- **Error Boundaries**: Wrap all feature components
- **State Management**: Never store sensitive data in component state

### Form Security Implementation
```typescript
// REQUIRED: Secure form pattern
const formSchema = z.object({
  field: z.string().min(1).max(500),
});

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
});
```

## Real-time Security (WebSocket)

### Socket.io Security Configuration
- **Origin Validation**: Verify request origin for all connections
- **Authentication**: Authenticate users before socket connection
- **Rate Limiting**: Limit socket events per user (100/minute)
- **Message Sanitization**: Validate and sanitize all real-time messages

## Security Validation Checklist

### Pre-Deployment Requirements
- [ ] All API routes implement `requireAuth` authentication
- [ ] All user inputs validated with Zod schemas
- [ ] No API keys or secrets in client-side code
- [ ] RLS policies enabled and tested on all database tables
- [ ] File upload restrictions properly implemented
- [ ] Error messages sanitized and non-revealing
- [ ] Environment variables validated on startup
- [ ] Rate limiting implemented on all endpoints

### Code Review Security Checks
- [ ] No `console.log` statements with sensitive data
- [ ] No hardcoded secrets, API keys, or URLs
- [ ] Proper TypeScript types (avoid `any` type)
- [ ] Input validation on all API endpoints
- [ ] Comprehensive error handling with proper status codes
- [ ] Proper CORS configuration for production
- [ ] SQL injection prevention (parameterized queries only)
