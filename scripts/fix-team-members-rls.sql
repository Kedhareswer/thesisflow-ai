-- Fix infinite recursion in team_members RLS policy

-- Drop existing problematic policies
DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;
DROP POLICY IF EXISTS "Users can view team members of their teams" ON team_members;
DROP POLICY IF EXISTS "Team owners can insert team members" ON team_members;
DROP POLICY IF EXISTS "Team owners can update team members" ON team_members;
DROP POLICY IF EXISTS "Team owners and users can delete their own membership" ON team_members;
DROP POLICY IF EXISTS "Team owners can view all team members" ON team_members;
DROP POLICY IF EXISTS "Users can view their own team memberships" ON team_members;
DROP POLICY IF EXISTS "Team owners and users can delete memberships" ON team_members;

-- Create a helper function to avoid recursion
CREATE OR REPLACE FUNCTION is_team_member(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id = team_uuid AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION is_team_member(UUID, UUID) TO authenticated;

-- Create simple, non-recursive policies for team_members
CREATE POLICY "team_members_select_policy" ON team_members
    FOR SELECT USING (
        -- Allow users to see team members if:
        -- 1. They are the team owner
        EXISTS (
            SELECT 1 FROM teams 
            WHERE teams.id = team_id 
            AND teams.owner_id = auth.uid()
        )
        OR
        -- 2. They are a member of the team themselves
        user_id = auth.uid()
    );

CREATE POLICY "team_members_insert_policy" ON team_members
    FOR INSERT WITH CHECK (
        -- Allow team owners to add members
        EXISTS (
            SELECT 1 FROM teams 
            WHERE teams.id = team_id 
            AND teams.owner_id = auth.uid()
        )
        OR
        -- Allow users to add themselves to public teams
        (user_id = auth.uid() AND EXISTS (
            SELECT 1 FROM teams 
            WHERE teams.id = team_id 
            AND teams.is_public = true
        ))
    );

CREATE POLICY "team_members_update_policy" ON team_members
    FOR UPDATE USING (
        -- Allow team owners to update member roles
        EXISTS (
            SELECT 1 FROM teams 
            WHERE teams.id = team_id 
            AND teams.owner_id = auth.uid()
        )
        OR
        -- Allow users to update their own membership
        user_id = auth.uid()
    );

CREATE POLICY "team_members_delete_policy" ON team_members
    FOR DELETE USING (
        -- Allow team owners to remove members
        EXISTS (
            SELECT 1 FROM teams 
            WHERE teams.id = team_id 
            AND teams.owner_id = auth.uid()
        )
        OR
        -- Allow users to remove themselves
        user_id = auth.uid()
    );

-- Ensure RLS is enabled
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Also fix teams table policies to be simpler
DROP POLICY IF EXISTS "teams_select_policy" ON teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON teams;
DROP POLICY IF EXISTS "teams_update_policy" ON teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON teams;
DROP POLICY IF EXISTS "Users can view public teams or their own teams" ON teams;
DROP POLICY IF EXISTS "Users can view teams they own" ON teams;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON teams;

CREATE POLICY "teams_select_policy" ON teams
    FOR SELECT USING (
        -- Allow authenticated users to see public teams
        (is_public = true AND auth.uid() IS NOT NULL)
        OR
        -- Allow owners to see their teams
        owner_id = auth.uid()
        OR
        -- Allow team members to see their teams (using helper function)
        is_team_member(id, auth.uid())
    );

CREATE POLICY "teams_insert_policy" ON teams
    FOR INSERT WITH CHECK (
        -- Only authenticated users can create teams
        auth.uid() IS NOT NULL
        AND owner_id = auth.uid()
    );

CREATE POLICY "teams_update_policy" ON teams
    FOR UPDATE USING (
        -- Only team owners can update teams
        owner_id = auth.uid()
    );

CREATE POLICY "teams_delete_policy" ON teams
    FOR DELETE USING (
        -- Only team owners can delete teams
        owner_id = auth.uid()
    );

-- Ensure RLS is enabled on teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create an index on team_members for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_lookup ON team_members(team_id, user_id);

-- Fix chat_messages policies to use the helper function
DROP POLICY IF EXISTS "Users can view team chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert team chat messages" ON chat_messages;

CREATE POLICY "chat_messages_select_policy" ON chat_messages
    FOR SELECT USING (
        -- Allow team owners to see messages
        EXISTS (
            SELECT 1 FROM teams 
            WHERE teams.id = team_id 
            AND teams.owner_id = auth.uid()
        )
        OR
        -- Allow team members to see messages (using helper function)
        is_team_member(team_id, auth.uid())
    );

CREATE POLICY "chat_messages_insert_policy" ON chat_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        (
            -- Allow team owners to add messages
            EXISTS (
                SELECT 1 FROM teams 
                WHERE teams.id = team_id 
                AND teams.owner_id = auth.uid()
            )
            OR
            -- Allow team members to add messages (using helper function)
            is_team_member(team_id, auth.uid())
        )
    );

-- Enable RLS on chat_messages if not already enabled
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
