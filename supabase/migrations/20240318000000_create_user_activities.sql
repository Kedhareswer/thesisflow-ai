-- Create user_activities table
create table user_activities (
  id uuid default uuid_generate_v4() primary key,
  type varchar not null,
  title varchar not null,
  timestamp timestamptz default now(),
  details jsonb,
  user_id uuid references auth.users(id) on delete cascade
);

-- Create indexes for better query performance
create index idx_user_activities_user_id on user_activities(user_id);
create index idx_user_activities_type on user_activities(type);
create index idx_user_activities_timestamp on user_activities(timestamp);

-- Add RLS policies
alter table user_activities enable row level security;

-- Allow users to view their own activities
create policy "Users can view their own activities"
  on user_activities for select
  using (auth.uid() = user_id);

-- Allow users to insert their own activities
create policy "Users can insert their own activities"
  on user_activities for insert
  with check (auth.uid() = user_id);