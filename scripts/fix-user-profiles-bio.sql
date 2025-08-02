-- Fix User Profiles Bio Column and Complete Schema
-- This script ensures the user_profiles table has all required columns including bio

-- First, let's check if the user_profiles table exists and create it if not
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

-- Add missing columns that might not exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS position VARCHAR(255),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Enable RLS if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "user_profiles_select_all" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_own" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;

-- Create consolidated, clear policies for user_profiles
-- Policy 1: Users can view all profiles (for collaboration features)
CREATE POLICY "user_profiles_select_all" ON user_profiles
    FOR SELECT USING (true);

-- Policy 2: Users can insert their own profile only
CREATE POLICY "user_profiles_insert_own" ON user_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Policy 3: Users can update their own profile only
CREATE POLICY "user_profiles_update_own" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Policy 4: Users can delete their own profile only (optional, for account deletion)
CREATE POLICY "user_profiles_delete_own" ON user_profiles
    FOR DELETE USING (id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_institution ON user_profiles(institution);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at_trigger ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at_trigger
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create user profiles for any existing auth users that don't have profiles
INSERT INTO public.user_profiles (id, full_name, avatar_url, display_name, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)) as full_name,
    au.raw_user_meta_data->>'avatar_url' as avatar_url,
    COALESCE(au.raw_user_meta_data->>'display_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as display_name,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test insert to verify bio column works
-- (This will be rolled back, it's just for testing)
BEGIN;
INSERT INTO user_profiles (id, display_name, bio, location, website, institution, position, avatar_url)
VALUES (
    '00000000-0000-0000-0000-000000000000', -- Test UUID
    'Test User',
    'This is a test bio to verify the column works',
    'Test Location',
    'https://test.com',
    'Test Institution',
    'Test Position',
    'https://test.com/avatar.jpg'
) ON CONFLICT (id) DO NOTHING;
ROLLBACK;

COMMENT ON TABLE user_profiles IS 'User profiles table with complete schema including bio column';
COMMENT ON COLUMN user_profiles.bio IS 'User biography/description text';
COMMENT ON COLUMN user_profiles.display_name IS 'User display name for public profile';
COMMENT ON COLUMN user_profiles.location IS 'User location';
COMMENT ON COLUMN user_profiles.website IS 'User website URL';
COMMENT ON COLUMN user_profiles.institution IS 'User institution/organization';
COMMENT ON COLUMN user_profiles.position IS 'User position/title'; 