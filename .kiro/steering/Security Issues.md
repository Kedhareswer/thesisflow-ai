---
inclusion: always
---

# Security Guidelines & Best Practices

## Authentication & Authorization

### Supabase Auth Implementation

- Always use `requireAuth` utility for protected API routes
- Implement proper Row Level Security (RLS) policies for all database tables
- Validate user sessions on both client and server sides
- Use `supabase.auth.getUser()` for server-side auth checks
- Never expose service role keys in client-side code

### API Route Security

```typescript
// Required pattern for protected routes
export async function POST(request: Request) {
  const user = await requireAuth(request);
  // Route logic here
}
```

### JWT Token Handling

- Store tokens securely using Supabase client
- Implement proper token refresh mechanisms
- Never store sensitive tokens in localStorage
- Use httpOnly cookies for sensitive session data

## Input Validation & Sanitization

### Zod Schema Validation

- Validate all user inputs using Zod schemas
- Sanitize file uploads and content processing
- Implement proper type checking for API parameters
- Validate environment variables on startup

### File Upload Security

- Restrict file types to allowed formats (PDF, DOCX, TXT)
- Implement file size limits (max 10MB)
- Scan uploaded files for malicious content
- Use Supabase Storage with proper bucket policies
- Generate secure, non-predictable file names

### Content Processing

- Sanitize HTML content from rich text editors
- Validate URLs before fetching external content
- Implement rate limiting for AI API calls
- Escape user-generated content in database queries

## API Security

### Rate Limiting

- Implement rate limiting for AI generation endpoints
- Protect literature search APIs from abuse
- Use exponential backoff for external API calls
- Monitor and log suspicious activity patterns

### CORS Configuration

- Configure strict CORS policies for production
- Whitelist only necessary origins
- Implement proper preflight request handling
- Secure WebSocket connections with origin validation

### External API Integration

- Store all API keys in environment variables
- Implement proper error handling for API failures
- Use secure HTTP clients with timeout configurations
- Validate responses from external services

## Data Protection

### Sensitive Data Handling

- Never log sensitive user data or API keys
- Implement proper data encryption for stored files
- Use secure methods for password reset flows
- Sanitize error messages to prevent information leakage

### Database Security

- Use parameterized queries to prevent SQL injection
- Implement proper foreign key constraints
- Enable audit logging for sensitive operations
- Regular backup and recovery procedures

### Privacy Compliance

- Implement proper data retention policies
- Provide user data export/deletion capabilities
- Secure handling of research documents and citations
- Comply with academic data sharing requirements

## Environment & Deployment Security

### Environment Variables

- Never commit `.env` files to version control
- Use different keys for development/production
- Implement proper secret rotation procedures
- Validate required environment variables on startup

### Production Deployment

- Enable HTTPS for all production traffic
- Implement proper CSP headers
- Use secure session configurations
- Regular security updates and dependency audits

## Error Handling & Logging

### Secure Error Responses

- Never expose internal system details in error messages
- Implement consistent error response formats
- Log security events for monitoring
- Use proper HTTP status codes

### Monitoring & Alerting

- Monitor for unusual API usage patterns
- Alert on authentication failures
- Track file upload and processing activities
- Implement proper audit trails for team collaboration

## Code Security Patterns

### TypeScript Security

- Use strict TypeScript configuration
- Implement proper type guards for user inputs
- Avoid `any` types in security-critical code
- Use readonly types for immutable data

### Component Security

- Sanitize props passed to components
- Implement proper error boundaries
- Validate user permissions in UI components
- Secure handling of collaborative editing features
