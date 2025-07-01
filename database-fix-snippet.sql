-- SUPABASE DASHBOARD FIX - Copy and paste this into SQL Editor
-- This fixes the infinite recursion in team_members RLS policies

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view team members of their teams" ON team_members;
DROP POLICY IF EXISTS "Team owners can insert team members" ON team_members;
DROP POLICY IF EXISTS "Team owners can update team members" ON team_members;
DROP POLICY IF EXISTS "Team owners and users can delete their own membership" ON team_members;

-- Create fixed policies (no recursion)
CREATE POLICY "Team owners can view all team members" ON team_members
    FOR SELECT USING (
        team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can view their own team memberships" ON team_members
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Team owners can insert team members" ON team_members
    FOR INSERT WITH CHECK (
        team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
    );

CREATE POLICY "Team owners can update team members" ON team_members
    FOR UPDATE USING (
        team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
    );

CREATE POLICY "Team owners and users can delete memberships" ON team_members
    FOR DELETE USING (
        team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()) 
        OR user_id = auth.uid()
    );

-- Create helper function to avoid recursion
CREATE OR REPLACE FUNCTION is_team_member(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id = team_uuid AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_team_member(UUID, UUID) TO authenticated;

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_team_members_lookup ON team_members(team_id, user_id);
