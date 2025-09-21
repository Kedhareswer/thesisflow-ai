-- Create planner_drafts table for cross-device plan drafts
-- Generated at 2025-09-21 11:30 local time

-- Ensure required extensions (for gen_random_uuid)
create extension if not exists pgcrypto;

create table if not exists public.planner_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan jsonb not null,
  updated_at timestamptz not null default now(),
  constraint planner_drafts_user_fk foreign key (user_id)
    references auth.users (id) on delete cascade
);

-- One draft per user (latest wins via upsert)
create unique index if not exists planner_drafts_user_id_key
  on public.planner_drafts (user_id);

-- Optional: enable RLS (server uses service role in API, so policies won't block it)
alter table public.planner_drafts enable row level security;

-- Optional: policy allowing users to read their own drafts if ever queried client-side
create policy if not exists "Users can read own drafts"
  on public.planner_drafts
  for select
  using (auth.uid() = user_id);
