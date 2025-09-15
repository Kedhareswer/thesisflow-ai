-- Chat Sessions Schema for AI chat threads with RLS and maintenance helpers
-- Creates ai_chat_sessions, ai_chat_messages, and ai_chat_events with indexes and policies

-- Ensure required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===============================
-- Tables
-- ===============================

-- Main chat session record (one per chat-like conversation)
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT,
  model TEXT,
  system_prompt TEXT,
  metadata JSONB,
  ephemeral BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_last_activity ON ai_chat_sessions(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_created_at ON ai_chat_sessions(created_at);

-- Messages within a chat session
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES ai_chat_sessions(session_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool','function')),
  content TEXT,
  content_json JSONB,
  tool_name TEXT,
  tool_call_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('queued','streaming','completed','error')),
  tokens_input INTEGER,
  tokens_output INTEGER,
  order_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_order ON ai_chat_messages(session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_created ON ai_chat_messages(session_id, created_at);
-- Optional GIN indexes for advanced filtering
-- CREATE INDEX IF NOT EXISTS idx_chat_messages_content_json_gin ON chat_messages USING GIN (content_json);
-- CREATE INDEX IF NOT EXISTS idx_chat_sessions_metadata_gin ON chat_sessions USING GIN (metadata);

-- Event log per session: tool calls, function results, stream lifecycle, errors
CREATE TABLE IF NOT EXISTS ai_chat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES ai_chat_sessions(session_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_events_session ON ai_chat_events(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_events_session_created ON ai_chat_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_chat_events_type ON ai_chat_events(event_type);

-- ===============================
-- RLS Policies
-- ===============================

ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_events ENABLE ROW LEVEL SECURITY;

-- Sessions: users can manage their own sessions; service role can manage all
CREATE POLICY "Users can manage own chat sessions (all)" ON ai_chat_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage chat sessions" ON ai_chat_sessions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Messages: users can access/manipulate messages for their own sessions; service role can manage all
CREATE POLICY "Users can read messages for own sessions" ON ai_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions s
      WHERE s.session_id = ai_chat_messages.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages for own sessions" ON ai_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions s
      WHERE s.session_id = ai_chat_messages.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages for own sessions" ON ai_chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions s
      WHERE s.session_id = ai_chat_messages.session_id
        AND s.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions s
      WHERE s.session_id = ai_chat_messages.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages for own sessions" ON ai_chat_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions s
      WHERE s.session_id = ai_chat_messages.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage messages" ON ai_chat_messages
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Events: users can read events for their own sessions; service role can manage all
CREATE POLICY "Users can view events for own sessions" ON ai_chat_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions s
      WHERE s.session_id = ai_chat_events.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage events" ON ai_chat_events
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ===============================
-- Grants
-- ===============================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_chat_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_chat_messages TO authenticated;
GRANT SELECT ON ai_chat_events TO authenticated;

-- Explicit grants for service role (bypasses RLS but clarity helps tooling)
GRANT ALL ON ai_chat_sessions TO service_role;
GRANT ALL ON ai_chat_messages TO service_role;
GRANT ALL ON ai_chat_events TO service_role;

-- ===============================
-- Maintenance helpers
-- ===============================

-- Archive or prune old/idle sessions and cascade deletes via FK
CREATE OR REPLACE FUNCTION cleanup_old_ai_chat_sessions(p_days INTEGER DEFAULT 90)
RETURNS VOID AS $$
BEGIN
  DELETE FROM ai_chat_sessions
  WHERE COALESCE(archived_at, last_activity_at) < NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_old_ai_chat_sessions(INTEGER) TO service_role;

-- Comments
COMMENT ON TABLE ai_chat_sessions IS 'Chat session tracking for AI conversations';
COMMENT ON TABLE ai_chat_messages IS 'Messages belonging to a chat session';
COMMENT ON TABLE ai_chat_events IS 'Event log per chat session (tool calls, errors, streaming, etc.)';
