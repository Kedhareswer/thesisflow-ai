-- Session-based streaming schema for literature search
-- Creates tables to track search sessions, events, and streamed results

-- Ensure required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===============================
-- Tables
-- ===============================

-- Main session record (one per chat-like search session)
CREATE TABLE IF NOT EXISTS search_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  mode TEXT NOT NULL,            -- 'search' | 'forward' | 'backward'
  seed TEXT,
  result_limit INTEGER NOT NULL DEFAULT 20,
  client_ip INET,
  total_results INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_search_sessions_user_id ON search_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_search_sessions_created_at ON search_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_search_sessions_last_activity ON search_sessions(last_activity_at);

-- Event log for a session (init, paper, error, done, aborted, rate_limited, etc.)
CREATE TABLE IF NOT EXISTS search_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES search_sessions(session_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_events_session ON search_events(session_id);
CREATE INDEX IF NOT EXISTS idx_search_events_session_created ON search_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_search_events_type ON search_events(event_type);

-- Streamed results captured per session
CREATE TABLE IF NOT EXISTS search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES search_sessions(session_id) ON DELETE CASCADE,
  stable_key TEXT NOT NULL,
  paper JSONB NOT NULL,
  source TEXT,
  order_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, stable_key)
);

CREATE INDEX IF NOT EXISTS idx_search_results_session ON search_results(session_id);
CREATE INDEX IF NOT EXISTS idx_search_results_session_order ON search_results(session_id, order_index);

-- Optional: GIN index for searching within paper JSON (comment out if not needed)
-- CREATE INDEX IF NOT EXISTS idx_search_results_paper_gin ON search_results USING GIN (paper);

-- ===============================
-- RLS Policies
-- ===============================

ALTER TABLE search_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;

-- Sessions: users can read their own; service role can do all
CREATE POLICY "Users can view own sessions" ON search_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sessions" ON search_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Events: users can read events tied to their sessions; service role can do all
CREATE POLICY "Users can view events for own sessions" ON search_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM search_sessions s
      WHERE s.session_id = search_events.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage events" ON search_events
  FOR ALL USING (auth.role() = 'service_role');

-- Results: users can read results tied to their sessions; service role can do all
CREATE POLICY "Users can view results for own sessions" ON search_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM search_sessions s
      WHERE s.session_id = search_results.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage results" ON search_results
  FOR ALL USING (auth.role() = 'service_role');

-- ===============================
-- Grants
-- ===============================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON search_sessions TO authenticated;
GRANT SELECT ON search_events TO authenticated;
GRANT SELECT ON search_results TO authenticated;

-- (Service role will bypass RLS, but grant ALL to be explicit for tooling)
GRANT ALL ON search_sessions TO service_role;
GRANT ALL ON search_events TO service_role;
GRANT ALL ON search_results TO service_role;

-- ===============================
-- Maintenance helpers
-- ===============================

-- Delete completed sessions and associated data older than N days (default 30)
CREATE OR REPLACE FUNCTION cleanup_old_search_sessions(p_days INTEGER DEFAULT 30)
RETURNS VOID AS $$
BEGIN
  DELETE FROM search_sessions
  WHERE COALESCE(completed_at, last_activity_at) < NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_old_search_sessions(INTEGER) TO service_role;

-- Comments
COMMENT ON TABLE search_sessions IS 'Session tracking for SSE-based literature searches';
COMMENT ON TABLE search_events IS 'Event log per session (init, error, done, etc.)';
COMMENT ON TABLE search_results IS 'Streamed results captured for a session with dedup via stable_key';
