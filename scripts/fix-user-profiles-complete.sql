-- Fix User Profiles Table - Add Missing Columns
-- This script adds the missing columns to the existing user_profiles table

-- Add missing columns that don't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS institution VARCHAR(255),
ADD COLUMN IF NOT EXISTS position VARCHAR(255),
ADD COLUMN IF NOT EXISTS research_interests TEXT[],
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'offline', 'away')),
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Enable RLS if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "user_profiles_select_all" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_own" ON user_profiles;

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

-- Verify the bio column exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'bio' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ Bio column exists in user_profiles table';
    ELSE
        RAISE EXCEPTION '❌ Bio column does not exist in user_profiles table';
    END IF;
END $$;

-- Test insert to verify bio column works
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';
    test_bio TEXT := 'This is a test bio to verify the column works';
    test_email TEXT := 'test@example.com';
BEGIN
    -- Insert test profile with bio and required email
    INSERT INTO user_profiles (id, email, display_name, bio, location, website, institution, position)
    VALUES (
        test_user_id,
        test_email,
        'Test User',
        test_bio,
        'Test Location',
        'https://test.com',
        'Test Institution',
        'Test Position'
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        bio = EXCLUDED.bio,
        location = EXCLUDED.location,
        website = EXCLUDED.website,
        institution = EXCLUDED.institution,
        position = EXCLUDED.position,
        updated_at = NOW();
    
    RAISE NOTICE '✅ Test profile inserted/updated successfully with bio: %', test_bio;
    
    -- Verify the bio was saved
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = test_user_id AND bio = test_bio) THEN
        RAISE NOTICE '✅ Bio column is working correctly';
    ELSE
        RAISE NOTICE '❌ Bio column test failed';
    END IF;
    
    -- Clean up test data
    DELETE FROM user_profiles WHERE id = test_user_id;
    RAISE NOTICE '✅ Test data cleaned up';
END $$;

COMMENT ON TABLE user_profiles IS 'User profiles table with complete schema including bio column';
COMMENT ON COLUMN user_profiles.bio IS 'User biography/description text';
COMMENT ON COLUMN user_profiles.display_name IS 'User display name for public profile';
COMMENT ON COLUMN user_profiles.location IS 'User location';
COMMENT ON COLUMN user_profiles.website IS 'User website URL';
COMMENT ON COLUMN user_profiles.institution IS 'User institution/organization';
COMMENT ON COLUMN user_profiles.position IS 'User position/title'; 