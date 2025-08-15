---
inclusion: always
---

# Supabase Configuration & Usage Rules

## Core Configuration

### Environment Variables (Required)

```bash
# Public keys (safe for client-side)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-only keys (NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Client Initialization

```typescript
// lib/supabase.ts - Standard client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "ai-research-platform-auth",
    persistSession: true,
    autoRefreshToken: true,
  },
});

// lib/auth-utils.ts - Admin client for server-side operations
export const createSupabaseAdmin = () => {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
```

## Authentication Patterns

### API Route Authentication (MANDATORY)

```typescript
// ALWAYS use this pattern for protected API routes
export async function POST(request: Request) {
  const user = await requireAuth(request); // First line - throws if not authenticated
  const body = await request.json();
  const validatedData = schema.parse(body); // Zod validation required

  // Business logic with authenticated user
  return NextResponse.json(result);
}
```

### Client-Side Authentication Check

```typescript
// Check auth state before rendering protected content
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
if (!user) {
  // Redirect to login or show auth required message
}
```

### Token Extraction (Server-Side)

The `getAuthUser` function handles multiple token sources:

- Authorization header: `Bearer <token>`
- Cookies with various naming patterns
- Parsed JSON cookie values for localStorage-style storage

## Database Schema Rules

### Table Structure Standards

All tables must follow these patterns:

```sql
-- Standard table structure
CREATE TABLE table_name (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (MANDATORY for all tables)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Core Tables Schema

#### User Profiles

```sql
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name VARCHAR(255),
  display_name VARCHAR(255),
  bio TEXT,
  avatar_url TEXT,
  location VARCHAR(255),
  website VARCHAR(255),
  role TEXT DEFAULT 'user',
  active BOOLEAN DEFAULT true,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'offline',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Teams & Collaboration

```sql
CREATE TABLE teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  category VARCHAR(100),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Row Level Security (RLS) Policies

### Standard RLS Policy Patterns

#### User-Owned Resources

```sql
-- Users can only access their own data
CREATE POLICY "user_access_own_data" ON table_name
  FOR ALL USING (auth.uid() = user_id);
```

#### Team-Based Access

```sql
-- Users can access data for teams they belong to
CREATE POLICY "team_member_access" ON table_name
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = table_name.team_id
      AND team_members.user_id = auth.uid()
    )
  );
```

#### Public + Private Access

```sql
-- Users can see public data or their own private data
CREATE POLICY "public_or_own_access" ON table_name
  FOR SELECT USING (
    is_public = true OR user_id = auth.uid()
  );
```

### Critical RLS Rules

- **ALWAYS enable RLS**: Every table must have `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- **Test policies thoroughly**: Use different user contexts to verify access control
- **Avoid recursive policies**: Don't reference the same table in policy conditions
- **Use EXISTS for joins**: More efficient than subqueries for team-based access

## Database Operations

### Query Patterns

#### Safe User Data Access

```typescript
// Always filter by authenticated user
const { data, error } = await supabase
  .from("user_profiles")
  .select("*")
  .eq("id", user.id)
  .single();
```

#### Team Data with RLS

```typescript
// RLS automatically filters based on team membership
const { data, error } = await supabase
  .from("team_documents")
  .select(
    `
    *,
    teams(name),
    user_profiles(full_name)
  `
  )
  .eq("team_id", teamId);
```

#### Real-time Subscriptions

```typescript
// Subscribe to changes with proper filtering
const subscription = supabase
  .channel("team_updates")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "chat_messages",
      filter: `team_id=eq.${teamId}`,
    },
    handleUpdate
  )
  .subscribe();
```

### Migration Scripts

- Use `scripts/run-migration.js` for database changes
- Always test migrations on development first
- Include rollback procedures for production changes
- Validate RLS policies after schema changes

## File Storage Rules

### Bucket Configuration

```typescript
// Secure file upload with validation
const uploadFile = async (file: File, userId: string) => {
  // Validate file type and size
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type) || file.size > maxSize) {
    throw new Error("Invalid file type or size");
  }

  // Generate secure filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${uuid()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("documents")
    .upload(fileName, file);

  return { data, error };
};
```

### Storage Policies

```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read files they have access to
CREATE POLICY "Users can read accessible files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Add team-based access logic here
    )
  );
```

## Real-time Features

### Channel Subscriptions

```typescript
// Team-based real-time updates
const subscribeToTeamUpdates = (teamId: string) => {
  return supabase
    .channel(`team:${teamId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_messages",
        filter: `team_id=eq.${teamId}`,
      },
      handleChatMessage
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "team_members",
        filter: `team_id=eq.${teamId}`,
      },
      handleMembershipChange
    )
    .subscribe();
};
```

### Presence Tracking

```typescript
// Track user presence in teams
const trackPresence = (teamId: string, user: User) => {
  const channel = supabase.channel(`presence:${teamId}`);

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      // Handle presence updates
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: user.id,
          full_name: user.user_metadata.full_name,
          online_at: new Date().toISOString(),
        });
      }
    });
};
```

## Security Best Practices

### Input Validation

```typescript
// Always validate inputs with Zod before database operations
const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  is_public: z.boolean().default(false),
});

const validatedData = createTeamSchema.parse(requestBody);
```

### Error Handling

```typescript
// Sanitize database errors before returning to client
try {
  const { data, error } = await supabase.from("teams").insert(validatedData);

  if (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
} catch (error) {
  console.error("Unexpected error:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
```

### Rate Limiting

- Implement rate limiting for database operations
- Use connection pooling for high-traffic endpoints
- Monitor query performance and optimize slow queries
- Set up database alerts for unusual activity

## Development Workflow

### Local Development

```bash
# Test database connection
node scripts/test-database.js

# Run migrations
node scripts/run-migration.js

# Verify RLS policies
node scripts/verify-policies.js
```

### Database Management

- Use Supabase Dashboard for schema visualization
- Monitor real-time usage and performance
- Set up automated backups
- Use database branching for testing schema changes

### Debugging

- Enable query logging in development
- Use Supabase logs for error tracking
- Test RLS policies with different user contexts
- Validate real-time subscriptions with multiple clients
