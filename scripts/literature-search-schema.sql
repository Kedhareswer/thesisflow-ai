-- Enhanced Literature Search Database Schema
-- Optimized for fast caching and result storage

-- Literature search cache table for storing search results
CREATE TABLE IF NOT EXISTS literature_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_key TEXT NOT NULL UNIQUE,
    result JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast cache lookups
CREATE INDEX IF NOT EXISTS idx_literature_cache_query_key ON literature_cache(query_key);
CREATE INDEX IF NOT EXISTS idx_literature_cache_expires_at ON literature_cache(expires_at);

-- Literature search usage tracking
CREATE TABLE IF NOT EXISTS literature_search_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    source TEXT NOT NULL, -- 'openalex', 'arxiv', 'crossref', 'combined'
    results_count INTEGER DEFAULT 0,
    search_time_ms INTEGER DEFAULT 0,
    cached BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for usage analytics
CREATE INDEX IF NOT EXISTS idx_literature_search_usage_user_id ON literature_search_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_literature_search_usage_created_at ON literature_search_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_literature_search_usage_source ON literature_search_usage(source);

-- Saved papers table for user research collections
CREATE TABLE IF NOT EXISTS saved_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    paper_id TEXT NOT NULL,
    title TEXT NOT NULL,
    authors TEXT[] DEFAULT '{}',
    abstract TEXT,
    year TEXT,
    journal TEXT,
    url TEXT,
    doi TEXT,
    citations INTEGER DEFAULT 0,
    source TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, paper_id)
);

-- Index for saved papers
CREATE INDEX IF NOT EXISTS idx_saved_papers_user_id ON saved_papers(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_papers_created_at ON saved_papers(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_papers_tags ON saved_papers USING gin(tags);

-- Literature search rate limiting
CREATE TABLE IF NOT EXISTS literature_search_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address INET,
    requests_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, ip_address)
);

-- Index for rate limiting
CREATE INDEX IF NOT EXISTS idx_literature_search_rate_limits_user_id ON literature_search_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_literature_search_rate_limits_ip ON literature_search_rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_literature_search_rate_limits_window ON literature_search_rate_limits(window_start);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE literature_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE literature_search_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE literature_search_rate_limits ENABLE ROW LEVEL SECURITY;

-- Literature cache policies (public read, system write)
CREATE POLICY "Anyone can read literature cache" ON literature_cache
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage literature cache" ON literature_cache
    FOR ALL USING (auth.role() = 'service_role');

-- Literature search usage policies
CREATE POLICY "Users can view own search usage" ON literature_search_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search usage" ON literature_search_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all usage data" ON literature_search_usage
    FOR ALL USING (auth.role() = 'service_role');

-- Saved papers policies
CREATE POLICY "Users can manage own saved papers" ON saved_papers
    FOR ALL USING (auth.uid() = user_id);

-- Rate limiting policies
CREATE POLICY "Users can view own rate limits" ON literature_search_rate_limits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage rate limits" ON literature_search_rate_limits
    FOR ALL USING (auth.role() = 'service_role');

-- Utility functions for cache management

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_literature_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM literature_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION get_literature_cache_stats()
RETURNS TABLE (
    total_entries BIGINT,
    expired_entries BIGINT,
    cache_size_mb NUMERIC,
    avg_search_time_ms NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_entries,
        COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_entries,
        ROUND(pg_total_relation_size('literature_cache')::NUMERIC / 1048576, 2) as cache_size_mb,
        ROUND(AVG((result->>'searchTime')::NUMERIC), 2) as avg_search_time_ms
    FROM literature_cache;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_literature_search_rate_limit(
    p_user_id UUID,
    p_ip_address INET,
    p_limit INTEGER DEFAULT 100,
    p_window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
    allowed BOOLEAN,
    current_count INTEGER,
    reset_time TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_window_start TIMESTAMP WITH TIME ZONE;
    v_current_count INTEGER;
    v_reset_time TIMESTAMP WITH TIME ZONE;
BEGIN
    v_window_start := NOW() - INTERVAL '1 minute' * p_window_minutes;
    
    -- Get or create rate limit record
    INSERT INTO literature_search_rate_limits (user_id, ip_address, requests_count, window_start)
    VALUES (p_user_id, p_ip_address, 1, NOW())
    ON CONFLICT (user_id, ip_address) DO UPDATE SET
        requests_count = CASE 
            WHEN literature_search_rate_limits.window_start < v_window_start THEN 1
            ELSE literature_search_rate_limits.requests_count + 1
        END,
        window_start = CASE 
            WHEN literature_search_rate_limits.window_start < v_window_start THEN NOW()
            ELSE literature_search_rate_limits.window_start
        END;
    
    -- Get current count and reset time
    SELECT 
        r.requests_count,
        r.window_start + INTERVAL '1 minute' * p_window_minutes
    INTO v_current_count, v_reset_time
    FROM literature_search_rate_limits r
    WHERE r.user_id = p_user_id AND r.ip_address = p_ip_address;
    
    RETURN QUERY SELECT 
        v_current_count <= p_limit as allowed,
        v_current_count as current_count,
        v_reset_time as reset_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup job for expired cache (call this periodically)
CREATE OR REPLACE FUNCTION schedule_literature_cache_cleanup()
RETURNS void AS $$
BEGIN
    -- Clean up expired cache entries older than 24 hours
    DELETE FROM literature_cache 
    WHERE expires_at < NOW() - INTERVAL '24 hours';
    
    -- Clean up old usage data older than 90 days
    DELETE FROM literature_search_usage 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Clean up old rate limit records older than 24 hours
    DELETE FROM literature_search_rate_limits 
    WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON literature_cache TO anon, authenticated;
GRANT ALL ON literature_search_usage TO authenticated;
GRANT ALL ON saved_papers TO authenticated;
GRANT SELECT ON literature_search_rate_limits TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION clean_expired_literature_cache() TO service_role;
GRANT EXECUTE ON FUNCTION get_literature_cache_stats() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION check_literature_search_rate_limit(UUID, INET, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION schedule_literature_cache_cleanup() TO service_role;

-- Comments for documentation
COMMENT ON TABLE literature_cache IS 'Caches literature search results to improve performance';
COMMENT ON TABLE literature_search_usage IS 'Tracks literature search usage for analytics and rate limiting';
COMMENT ON TABLE saved_papers IS 'Stores user-saved research papers';
COMMENT ON TABLE literature_search_rate_limits IS 'Tracks API usage for rate limiting';
COMMENT ON FUNCTION clean_expired_literature_cache() IS 'Removes expired cache entries';
COMMENT ON FUNCTION get_literature_cache_stats() IS 'Returns cache performance statistics';
COMMENT ON FUNCTION check_literature_search_rate_limit(UUID, INET, INTEGER, INTEGER) IS 'Checks and enforces rate limits';
COMMENT ON FUNCTION schedule_literature_cache_cleanup() IS 'Scheduled cleanup of old data';
