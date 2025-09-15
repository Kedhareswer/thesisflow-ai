-- Citations & Collections schema
-- Run this in Supabase SQL editor

-- Enable UUID
create extension if not exists "uuid-ossp";

-- Collections table
create table if not exists public.citation_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now()
);

-- Items table
create table if not exists public.citation_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid references public.citation_collections(id) on delete set null,
  -- Minimal fields for quick filters
  title text,
  year text,
  doi text,
  url text,
  journal text,
  -- CSL JSON for interoperability
  csl_json jsonb,
  -- Cached formatted styles for fast rendering
  styles jsonb,
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_citation_items_user on public.citation_items(user_id);
create index if not exists idx_citation_items_collection on public.citation_items(collection_id);
create index if not exists idx_citation_collections_user on public.citation_collections(user_id);

-- RLS
alter table public.citation_collections enable row level security;
alter table public.citation_items enable row level security;

create policy if not exists citation_collections_select on public.citation_collections
  for select using (auth.uid() = user_id);
create policy if not exists citation_collections_insert on public.citation_collections
  for insert with check (auth.uid() = user_id);
create policy if not exists citation_collections_update on public.citation_collections
  for update using (auth.uid() = user_id);
create policy if not exists citation_collections_delete on public.citation_collections
  for delete using (auth.uid() = user_id);

create policy if not exists citation_items_select on public.citation_items
  for select using (auth.uid() = user_id);
create policy if not exists citation_items_insert on public.citation_items
  for insert with check (auth.uid() = user_id);
create policy if not exists citation_items_update on public.citation_items
  for update using (auth.uid() = user_id);
create policy if not exists citation_items_delete on public.citation_items
  for delete using (auth.uid() = user_id);
