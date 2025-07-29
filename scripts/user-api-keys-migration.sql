-- User API Keys Migration
-- This script creates the user_api_keys table for API key storage

-- Create user_api_keys table for storing user API keys
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'groq', 'gemini', 'anthropic', 'mistral', 'aiml')),
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_status VARCHAR(20) DEFAULT 'untested' CHECK (test_status IN ('valid', 'invalid', 'untested')),
    test_model VARCHAR(100), -- Store which model was used for testing
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider) -- One key per provider per user
);

-- Add RLS policies for user_api_keys
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own API keys
DROP POLICY IF EXISTS "Users can view their own API keys" ON user_api_keys;
CREATE POLICY "Users can view their own API keys" ON user_api_keys
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own API keys
DROP POLICY IF EXISTS "Users can insert their own API keys" ON user_api_keys;
CREATE POLICY "Users can insert their own API keys" ON user_api_keys
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own API keys
DROP POLICY IF EXISTS "Users can update their own API keys" ON user_api_keys;
CREATE POLICY "Users can update their own API keys" ON user_api_keys
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own API keys
DROP POLICY IF EXISTS "Users can delete their own API keys" ON user_api_keys;
CREATE POLICY "Users can delete their own API keys" ON user_api_keys
    FOR DELETE USING (user_id = auth.uid());

-- Ensure trigger is created only once
DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON user_api_keys;
CREATE TRIGGER update_user_api_keys_updated_at 
    BEFORE UPDATE ON user_api_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(user_id, is_active) WHERE is_active = true;

-- Add usage tracking function
CREATE OR REPLACE FUNCTION increment_api_key_usage(key_user_id UUID, key_provider VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE user_api_keys 
    SET 
        usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE user_id = key_user_id AND provider = key_provider AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to get user's active API keys (for server-side use)
CREATE OR REPLACE FUNCTION get_user_active_api_keys(key_user_id UUID)
RETURNS TABLE(
    provider VARCHAR(50),
    api_key TEXT,
    test_status VARCHAR(20),
    last_tested_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        k.provider,
        k.api_key,
        k.test_status,
        k.last_tested_at
    FROM user_api_keys k
    WHERE k.user_id = key_user_id 
    AND k.is_active = true
    ORDER BY k.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE user_api_keys IS 'Stores API keys for AI providers per user';
COMMENT ON COLUMN user_api_keys.api_key IS 'Plain text API key';

-- Migration: Update existing table if it exists with encrypted column
DO $$
BEGIN
    -- Check if the old encrypted column exists and rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_api_keys' 
        AND column_name = 'api_key_encrypted'
    ) THEN
        -- Rename the column to the new name
        ALTER TABLE user_api_keys RENAME COLUMN api_key_encrypted TO api_key;
        
        -- Note: The encrypted data will now be stored as-is. 
        -- You may want to manually clean up the data or ask users to re-enter their keys
        RAISE NOTICE 'Renamed api_key_encrypted column to api_key. Existing encrypted data needs to be cleaned up manually.';
    END IF;
END
$$;
