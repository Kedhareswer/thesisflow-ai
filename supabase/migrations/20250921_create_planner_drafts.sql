-- Create planner_drafts table for cross-device draft synchronization
CREATE TABLE IF NOT EXISTS planner_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Plan',
  description TEXT,
  user_query TEXT NOT NULL,
  plan_data JSONB NOT NULL DEFAULT '{}',
  wizard_step TEXT NOT NULL DEFAULT 'inputs' CHECK (wizard_step IN ('inputs', 'generate', 'edit', 'preview', 'apply')),
  selected_model TEXT,
  provider_used TEXT DEFAULT 'openrouter',
  guardrails_passed BOOLEAN DEFAULT NULL,
  guardrail_issues TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_applied BOOLEAN NOT NULL DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_planner_drafts_user_id ON planner_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_drafts_updated_at ON planner_drafts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_planner_drafts_wizard_step ON planner_drafts(wizard_step);
CREATE INDEX IF NOT EXISTS idx_planner_drafts_is_applied ON planner_drafts(is_applied);

-- Add RLS policies
ALTER TABLE planner_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own drafts
CREATE POLICY "Users can view their own planner drafts" 
  ON planner_drafts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own planner drafts" 
  ON planner_drafts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planner drafts" 
  ON planner_drafts FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planner drafts" 
  ON planner_drafts FOR DELETE 
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_planner_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_synced_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_planner_drafts_updated_at
  BEFORE UPDATE ON planner_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_planner_drafts_updated_at();

-- Add helpful comments
COMMENT ON TABLE planner_drafts IS 'Stores planner drafts for cross-device synchronization and wizard flow state';
COMMENT ON COLUMN planner_drafts.wizard_step IS 'Current step in the planner wizard flow';
COMMENT ON COLUMN planner_drafts.plan_data IS 'JSON data containing the generated plan, tasks, and metadata';
COMMENT ON COLUMN planner_drafts.guardrails_passed IS 'Whether the plan passed QA guardrails validation';
COMMENT ON COLUMN planner_drafts.selected_model IS 'OpenRouter model used for generation';
COMMENT ON COLUMN planner_drafts.metadata IS 'Additional metadata like model comparison results, analytics, etc.';
