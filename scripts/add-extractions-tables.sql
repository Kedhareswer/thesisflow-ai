-- Create tables for storing extractions and chats
-- Safe to run multiple times

create table if not exists public.extractions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  file_name text not null,
  file_type text not null,
  file_size bigint not null,
  summary text null,
  result_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_extractions_created_at on public.extractions(created_at desc);
create index if not exists idx_extractions_user_id on public.extractions(user_id);

create table if not exists public.extraction_chats (
  id uuid primary key default gen_random_uuid(),
  extraction_id uuid not null references public.extractions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_extraction_chats_extraction_id on public.extraction_chats(extraction_id, created_at);
