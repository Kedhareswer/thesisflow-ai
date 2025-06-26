# Real-Time Chat Collaboration

This document provides instructions on setting up and using the real-time chat collaboration feature in the AI Project Planner application.

## Overview

The Collaborate page has been transformed from a localStorage-based prototype into a fully functional real-time collaborative chat application with the following features:

- Real-time messaging using Socket.io
- Persistent data storage with Supabase
- User authentication and profiles
- Team creation and management
- Member invitations
- Presence detection (online status)
- Typing indicators
- Message history

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
SOCKET_PORT=3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Supabase Setup

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Set up the following tables in your Supabase database:

#### user_profiles
```sql
create table public.user_profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  status text default 'offline',
  last_active timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.user_profiles enable row level security;

-- Create policies
create policy "Users can view all profiles" on public.user_profiles
  for select using (true);

create policy "Users can update their own profile" on public.user_profiles
  for update using (auth.uid() = id);
```

#### teams
```sql
create table public.teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_by uuid references public.user_profiles(id) not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.teams enable row level security;

-- Create policies
create policy "Team members can view their teams" on public.teams
  for select using (
    exists (
      select 1 from public.team_members
      where team_id = id and user_id = auth.uid()
    )
  );

create policy "Users can create teams" on public.teams
  for insert with check (created_by = auth.uid());

create policy "Team owners can update their teams" on public.teams
  for update using (
    exists (
      select 1 from public.team_members
      where team_id = id and user_id = auth.uid() and role = 'owner'
    )
  );
```

#### team_members
```sql
create table public.team_members (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  role text default 'member' not null,
  created_at timestamp with time zone default now(),
  unique(team_id, user_id)
);

-- Enable RLS
alter table public.team_members enable row level security;

-- Create policies
create policy "Team members can view their team members" on public.team_members
  for select using (
    exists (
      select 1 from public.team_members as tm
      where tm.team_id = team_id and tm.user_id = auth.uid()
    )
  );

create policy "Team owners can add members" on public.team_members
  for insert with check (
    exists (
      select 1 from public.team_members
      where team_id = team_id and user_id = auth.uid() and role = 'owner'
    ) or (
      -- Allow users to add themselves as owners when creating a new team
      role = 'owner' and user_id = auth.uid()
    )
  );
```

#### chat_messages
```sql
create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  sender_id uuid references public.user_profiles(id) on delete set null,
  content text not null,
  type text default 'message' not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.chat_messages enable row level security;

-- Create policies
create policy "Team members can view their team messages" on public.chat_messages
  for select using (
    exists (
      select 1 from public.team_members
      where team_id = team_id and user_id = auth.uid()
    )
  );

create policy "Team members can send messages" on public.chat_messages
  for insert with check (
    exists (
      select 1 from public.team_members
      where team_id = team_id and user_id = auth.uid()
    )
  );
```

### 3. Running the Application

To run both the Next.js application and the Socket.io server concurrently, use the provided script:

```bash
node start-dev.js
```

Alternatively, you can run them separately:

```bash
# Terminal 1: Start Next.js app
npm run dev

# Terminal 2: Start Socket.io server
node server.js
```

## Usage

1. Access the Collaborate page at `/collaborate`
2. Register or log in with your credentials
3. Create a new team or select an existing team
4. Start chatting in real-time with team members
5. Invite new members to your team using their email address

## Implementation Details

The real-time chat functionality is implemented using:

1. **Frontend**:
   - React components for UI
   - Socket.io client for real-time communication
   - Supabase client for data persistence and authentication

2. **Backend**:
   - Next.js API routes for data operations
   - Standalone Socket.io server for real-time events
   - Supabase database for data storage

3. **Key Features**:
   - Authentication and user profiles
   - Team creation and management
   - Real-time messaging
   - Presence detection (online status)
   - Typing indicators
   - Message history

## Troubleshooting

- **Socket Connection Issues**: Ensure the Socket.io server is running on port 3001 and the `NEXT_PUBLIC_SOCKET_URL` environment variable is set correctly.
- **Authentication Problems**: Check that your Supabase URL and anon key are correct in the environment variables.
- **Database Errors**: Verify that all required tables have been created in your Supabase project with the correct schemas and permissions.

## Future Enhancements

- File sharing capabilities
- Read receipts
- Message reactions
- Direct messaging between users
- Rich text formatting
- Voice and video calls
