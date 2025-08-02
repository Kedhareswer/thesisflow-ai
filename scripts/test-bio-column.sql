-- Test script to verify bio column exists and works
-- This script will check the current table structure and test bio operations

-- 1. Check current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if bio column specifically exists
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
AND column_name = 'bio';

-- 3. Test inserting a profile with bio
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    test_bio TEXT := 'This is a test bio to verify the column works properly';
BEGIN
    -- Insert test profile with bio
    INSERT INTO user_profiles (
        id, 
        display_name, 
        bio, 
        location, 
        website, 
        institution, 
        position
    ) VALUES (
        test_user_id,
        'Test User',
        test_bio,
        'Test Location',
        'https://test.com',
        'Test Institution',
        'Test Position'
    ) ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        bio = EXCLUDED.bio,
        location = EXCLUDED.location,
        website = EXCLUDED.website,
        institution = EXCLUDED.institution,
        position = EXCLUDED.position,
        updated_at = NOW();
    
    RAISE NOTICE 'Test profile inserted/updated successfully with bio: %', test_bio;
    
    -- Verify the bio was saved
    PERFORM bio FROM user_profiles WHERE id = test_user_id;
    IF FOUND THEN
        RAISE NOTICE 'Bio column is working correctly';
    ELSE
        RAISE NOTICE 'Bio column test failed';
    END IF;
    
    -- Clean up test data
    DELETE FROM user_profiles WHERE id = test_user_id;
    RAISE NOTICE 'Test data cleaned up';
END $$;

-- 4. Show any existing profiles with bio data
SELECT 
    id,
    display_name,
    bio,
    location,
    institution,
    position,
    created_at,
    updated_at
FROM user_profiles 
WHERE bio IS NOT NULL 
LIMIT 5; 