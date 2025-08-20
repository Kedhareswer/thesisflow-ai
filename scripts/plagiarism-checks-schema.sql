-- Plagiarism Checks Database Schema
-- Run this SQL in your Supabase SQL editor to create the necessary tables

-- Create plagiarism_checks table for caching results
CREATE TABLE IF NOT EXISTS plagiarism_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  check_id VARCHAR(32) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text_hash VARCHAR(64) NOT NULL,
  similarity_score INTEGER NOT NULL,
  is_plagiarized BOOLEAN DEFAULT false,
  sources_count INTEGER DEFAULT 0,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_plagiarism_checks_check_id ON plagiarism_checks(check_id),
  INDEX idx_plagiarism_checks_user_id ON plagiarism_checks(user_id),
  INDEX idx_plagiarism_checks_created_at ON plagiarism_checks(created_at),
  INDEX idx_plagiarism_checks_text_hash ON plagiarism_checks(text_hash)
);

-- Create external_sources table for tracking found sources
CREATE TABLE IF NOT EXISTS external_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  check_id VARCHAR(32) REFERENCES plagiarism_checks(check_id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  domain VARCHAR(255) NOT NULL,
  title TEXT,
  snippet TEXT,
  similarity_score DECIMAL(3,2),
  source_type VARCHAR(20) CHECK (source_type IN ('web', 'academic', 'news', 'social')),
  crawled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_external_sources_check_id ON external_sources(check_id),
  INDEX idx_external_sources_domain ON external_sources(domain),
  INDEX idx_external_sources_similarity ON external_sources(similarity_score DESC)
);

-- Create plagiarism_reports table for detailed reports
CREATE TABLE IF NOT EXISTS plagiarism_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID,
  document_title VARCHAR(500),
  check_id VARCHAR(32) REFERENCES plagiarism_checks(check_id),
  overall_similarity INTEGER,
  confidence_score DECIMAL(3,2),
  total_words INTEGER,
  matched_sources INTEGER,
  report_data JSONB,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_plagiarism_reports_user_id ON plagiarism_reports(user_id),
  INDEX idx_plagiarism_reports_document_id ON plagiarism_reports(document_id),
  INDEX idx_plagiarism_reports_created_at ON plagiarism_reports(created_at DESC)
);

-- Create usage_tracking table for monitoring API usage
CREATE TABLE IF NOT EXISTS plagiarism_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  checks_count INTEGER DEFAULT 0,
  total_words_checked INTEGER DEFAULT 0,
  external_api_calls INTEGER DEFAULT 0,
  month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, month_year),
  INDEX idx_plagiarism_usage_user_month ON plagiarism_usage(user_id, month_year)
);

-- Create RLS policies
ALTER TABLE plagiarism_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE plagiarism_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE plagiarism_usage ENABLE ROW LEVEL SECURITY;

-- Policies for plagiarism_checks
CREATE POLICY "Users can view their own plagiarism checks"
  ON plagiarism_checks FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own plagiarism checks"
  ON plagiarism_checks FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policies for external_sources
CREATE POLICY "Users can view external sources for their checks"
  ON external_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plagiarism_checks
      WHERE plagiarism_checks.check_id = external_sources.check_id
      AND (plagiarism_checks.user_id = auth.uid() OR plagiarism_checks.user_id IS NULL)
    )
  );

-- Policies for plagiarism_reports
CREATE POLICY "Users can view their own reports"
  ON plagiarism_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports"
  ON plagiarism_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
  ON plagiarism_reports FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for plagiarism_usage
CREATE POLICY "Users can view their own usage"
  ON plagiarism_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
  ON plagiarism_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
  ON plagiarism_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to update usage tracking
CREATE OR REPLACE FUNCTION update_plagiarism_usage(
  p_user_id UUID,
  p_words_checked INTEGER,
  p_external_calls INTEGER DEFAULT 0
) RETURNS VOID AS $$
DECLARE
  v_month_year VARCHAR(7);
BEGIN
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
  
  INSERT INTO plagiarism_usage (
    user_id,
    checks_count,
    total_words_checked,
    external_api_calls,
    month_year
  ) VALUES (
    p_user_id,
    1,
    p_words_checked,
    p_external_calls,
    v_month_year
  )
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    checks_count = plagiarism_usage.checks_count + 1,
    total_words_checked = plagiarism_usage.total_words_checked + p_words_checked,
    external_api_calls = plagiarism_usage.external_api_calls + p_external_calls,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean old cache entries
CREATE OR REPLACE FUNCTION clean_old_plagiarism_cache() RETURNS VOID AS $$
BEGIN
  DELETE FROM plagiarism_checks
  WHERE created_at < NOW() - INTERVAL '7 days'
  AND user_id IS NULL; -- Only delete anonymous checks
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean cache (if pg_cron is enabled)
-- SELECT cron.schedule('clean-plagiarism-cache', '0 2 * * *', 'SELECT clean_old_plagiarism_cache();');
