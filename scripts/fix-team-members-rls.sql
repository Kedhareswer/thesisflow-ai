-- Fix infinite recursion in team_members RLS policy

-- Drop existing problematic policies
DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;

-- Create simple, non-recursive policies for team_members
CREATE POLICY "team_members_select_policy" ON team_members
    FOR SELECT USING (
        -- Allow users to see team members if they are authenticated
        auth.uid() IS NOT NULL
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

CREATE POLICY "teams_select_policy" ON teams
    FOR SELECT USING (
        -- Allow authenticated users to see public teams
        (is_public = true AND auth.uid() IS NOT NULL)
        OR
        -- Allow owners to see their teams
        owner_id = auth.uid()
        OR
        -- Allow team members to see their teams
        id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
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