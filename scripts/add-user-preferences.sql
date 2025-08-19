-- Add user preference fields to profiles and create RPC to update them
-- Safe to run multiple times

begin;

-- 1) Add columns if not exists
alter table if exists public.profiles
  add column if not exists accepted_terms boolean not null default false,
  add column if not exists accepted_terms_at timestamptz null,
  add column if not exists email_marketing_opt_in boolean not null default false;

-- 2) Create or replace RPC to set preferences
create or replace function public.set_user_preferences(
  p_user_id uuid,
  p_accepted_terms boolean,
  p_accepted_terms_at timestamptz,
  p_email_marketing_opt_in boolean
) returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set
    accepted_terms = coalesce(p_accepted_terms, accepted_terms),
    accepted_terms_at = coalesce(p_accepted_terms_at, accepted_terms_at),
    email_marketing_opt_in = coalesce(p_email_marketing_opt_in, email_marketing_opt_in)
  where id = p_user_id;
$$;

-- 3) Grants
revoke all on function public.set_user_preferences(uuid, boolean, timestamptz, boolean) from public;
grant execute on function public.set_user_preferences(uuid, boolean, timestamptz, boolean) to anon, authenticated;

commit;
