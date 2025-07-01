-- AI Project Planner Database Schema - FIXED
-- This script fixes the infinite recursion issue in team_members RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET row_security = on;

-- Drop existing policies that cause issues
DROP POLICY IF EXISTS "Users can view team members of their teams" ON team_members;
DROP POLICY IF EXISTS "Team owners can insert team members" ON team_members;
DROP POLICY IF EXISTS "Team owners can update team members" ON team_members;
DROP POLICY IF EXISTS "Team owners and users can delete their own membership" ON team_members;

-- Team members: FIXED RLS policies to avoid infinite recursion
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Allow users to see team members for teams they own
CREATE POLICY "Team owners can view all team members" ON team_members
    FOR SELECT USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()
        )
    );

-- Allow users to see their own membership records
CREATE POLICY "Users can view their own team memberships" ON team_members
    FOR SELECT USING (user_id = auth.uid());

-- Team owners can insert team members
CREATE POLICY "Team owners can insert team members" ON team_members
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()
        )
    );

-- Team owners can update team member roles
CREATE POLICY "Team owners can update team members" ON team_members
    FOR UPDATE USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()
        )
    );

-- Team owners can remove team members, users can remove themselves
CREATE POLICY "Team owners and users can delete memberships" ON team_members
    FOR DELETE USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()
        ) OR user_id = auth.uid()
    );

-- Update the teams policy to use a simpler approach for viewing teams
DROP POLICY IF EXISTS "Users can view public teams or their own teams" ON teams;

CREATE POLICY "Users can view public teams" ON teams
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view teams they own" ON teams
    FOR SELECT USING (owner_id = auth.uid());

-- Allow users to view teams they are members of (using a function to avoid recursion)
CREATE OR REPLACE FUNCTION is_team_member(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id = team_uuid AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can view teams they are members of" ON teams
    FOR SELECT USING (is_team_member(id, auth.uid()));

-- Update chat messages policy to avoid potential recursion
DROP POLICY IF EXISTS "Users can view team chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert team chat messages" ON chat_messages;

CREATE POLICY "Users can view chat messages in teams they own" ON chat_messages
    FOR SELECT USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view chat messages in teams they are members of" ON chat_messages
    FOR SELECT USING (is_team_member(team_id, auth.uid()));

CREATE POLICY "Users can insert chat messages in teams they are members of" ON chat_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        (team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()
        ) OR is_team_member(team_id, auth.uid()))
    );

-- Update documents policy to avoid potential issues
DROP POLICY IF EXISTS "Users can view accessible documents" ON documents;

CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can view public documents" ON documents
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view team documents they have access to" ON documents
    FOR SELECT USING (
        team_id IS NOT NULL AND 
        (team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()
        ) OR is_team_member(team_id, auth.uid()))
    );

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION is_team_member(UUID, UUID) TO authenticated;

-- Create an index on team_members for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_lookup ON team_members(team_id, user_id);

COMMENT ON FUNCTION is_team_member(UUID, UUID) IS 'Helper function to check team membership without causing RLS recursion'; 