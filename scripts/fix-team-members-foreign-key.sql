-- Fix team_members foreign key relationship with user_profiles
-- This script adds the missing foreign key constraint that Supabase needs for automatic joins

-- Ensure user_profiles table exists and has proper structure
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    institution VARCHAR(255),
    research_interests TEXT[],
    status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'offline', 'away')),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user profiles for any existing auth users that don't have profiles
INSERT INTO public.user_profiles (id, full_name, avatar_url, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)) as full_name,
    au.raw_user_meta_data->>'avatar_url' as avatar_url,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Add explicit foreign key constraint from team_members.user_id to user_profiles.id
-- This allows Supabase to automatically infer the relationship for joins
ALTER TABLE team_members 
ADD CONSTRAINT team_members_user_id_user_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Create index for better performance on this relationship
CREATE INDEX IF NOT EXISTS idx_team_members_user_profile ON team_members(user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT ON team_members TO authenticated;

COMMENT ON CONSTRAINT team_members_user_id_user_profiles_fkey ON team_members 
IS 'Foreign key to user_profiles to enable automatic Supabase joins';
