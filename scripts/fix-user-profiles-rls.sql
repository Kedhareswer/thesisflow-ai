-- Fix User Profiles RLS Policies
-- This script resolves conflicts and ensures proper profile management

-- First, drop all existing conflicting policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;

-- Ensure user_profiles table has RLS enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

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

-- Ensure all required columns exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS position VARCHAR(255),
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert user profile with all required fields
    INSERT INTO public.user_profiles (
        id, 
        full_name, 
        display_name, 
        avatar_url,
        role,
        active,
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(
            NEW.raw_user_meta_data->>'display_name', 
            NEW.raw_user_meta_data->>'full_name', 
            NEW.email
        ),
        NEW.raw_user_meta_data->>'avatar_url',
        'user',
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for existing users who don't have them
INSERT INTO public.user_profiles (
    id,
    full_name,
    display_name,
    role,
    active,
    created_at,
    updated_at
)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    COALESCE(
        au.raw_user_meta_data->>'display_name',
        au.raw_user_meta_data->>'full_name',
        au.email
    ),
    'user',
    true,
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);

-- Comments for documentation
COMMENT ON POLICY "user_profiles_select_all" ON user_profiles IS 'Allow all authenticated users to view all profiles for collaboration';
COMMENT ON POLICY "user_profiles_insert_own" ON user_profiles IS 'Users can only insert their own profile';
COMMENT ON POLICY "user_profiles_update_own" ON user_profiles IS 'Users can only update their own profile';
COMMENT ON POLICY "user_profiles_delete_own" ON user_profiles IS 'Users can only delete their own profile';
