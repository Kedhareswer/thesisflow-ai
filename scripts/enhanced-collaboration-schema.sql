-- Enhanced Collaboration Database Schema
-- Supports: Limited invitations, role-based permissions, team discovery, granular notifications

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TEAM INVITATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invitee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invitee_email VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
    personal_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, invitee_id) -- Prevent duplicate invitations to same team
);

-- =====================================================
-- JOIN REQUESTS TABLE (for public team discovery)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_join_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    request_message TEXT,
    admin_response TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, requester_id) -- Prevent duplicate requests
);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'team_invitation',
        'join_request',
        'member_added',
        'new_message',
        'message_mention',
        'document_shared',
        'role_changed',
        'team_updated'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB, -- Additional data like team_id, invitation_id, message_id, etc.
    is_read BOOLEAN DEFAULT false,
    action_url TEXT, -- URL to navigate when notification is clicked
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- USER NOTIFICATION PREFERENCES
-- =====================================================
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    team_invitations BOOLEAN DEFAULT true,
    member_added BOOLEAN DEFAULT true,
    new_messages BOOLEAN DEFAULT true,
    message_mentions BOOLEAN DEFAULT true,
    document_shared BOOLEAN DEFAULT true,
    role_changes BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT false, -- Future use
    push_notifications BOOLEAN DEFAULT true,   -- Future use
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INVITATION RATE LIMITING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invitation_rate_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date_created DATE DEFAULT CURRENT_DATE,
    invitation_count INTEGER DEFAULT 0,
    teams_invited_to TEXT[], -- Array of team IDs invited to today
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date_created)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_status ON team_invitations(invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_status ON team_invitations(team_id, status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires ON team_invitations(expires_at, status);

CREATE INDEX IF NOT EXISTS idx_join_requests_team_status ON team_join_requests(team_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_requester_status ON team_join_requests(requester_id, status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_date ON invitation_rate_limits(user_id, date_created);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Team Invitations RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations sent to them" ON team_invitations
    FOR SELECT USING (invitee_id = auth.uid());

CREATE POLICY "Users can view invitations they sent" ON team_invitations
    FOR SELECT USING (inviter_id = auth.uid());

CREATE POLICY "Team owners and admins can view team invitations" ON team_invitations
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Team owners and admins can send invitations" ON team_invitations
    FOR INSERT WITH CHECK (
        inviter_id = auth.uid() AND
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Invitees can update their invitations" ON team_invitations
    FOR UPDATE USING (invitee_id = auth.uid());

CREATE POLICY "Inviters can cancel their invitations" ON team_invitations
    FOR UPDATE USING (inviter_id = auth.uid());

-- Join Requests RLS
ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own join requests" ON team_join_requests
    FOR SELECT USING (requester_id = auth.uid());

CREATE POLICY "Team owners and admins can view join requests" ON team_join_requests
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can create join requests for public teams" ON team_join_requests
    FOR INSERT WITH CHECK (
        requester_id = auth.uid() AND
        team_id IN (SELECT id FROM teams WHERE is_public = true)
    );

CREATE POLICY "Requesters can update their requests" ON team_join_requests
    FOR UPDATE USING (requester_id = auth.uid());

CREATE POLICY "Team owners and admins can respond to requests" ON team_join_requests
    FOR UPDATE USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Notification Preferences RLS
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences" ON user_notification_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own preferences" ON user_notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- Rate Limits RLS
ALTER TABLE invitation_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits" ON invitation_rate_limits
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage rate limits" ON invitation_rate_limits
    FOR ALL WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user can assign roles
CREATE OR REPLACE FUNCTION can_assign_role(team_uuid UUID, user_uuid UUID, target_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get user's role in the team
    SELECT role INTO user_role
    FROM team_members
    WHERE team_id = team_uuid AND user_id = user_uuid;
    
    -- Only owners can assign admin role
    IF target_role = 'admin' THEN
        RETURN user_role = 'owner';
    END IF;
    
    -- Owners and admins can assign editor/viewer roles
    IF target_role IN ('editor', 'viewer') THEN
        RETURN user_role IN ('owner', 'admin');
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check invitation limits (max 2 teams per day)
CREATE OR REPLACE FUNCTION check_invitation_limit(user_uuid UUID, team_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    today_count INTEGER;
    teams_today TEXT[];
BEGIN
    -- Get today's invitation count and teams
    SELECT 
        COALESCE(invitation_count, 0),
        COALESCE(teams_invited_to, ARRAY[]::TEXT[])
    INTO today_count, teams_today
    FROM invitation_rate_limits
    WHERE user_id = user_uuid AND date_created = CURRENT_DATE;
    
    -- If user hasn't invited to this team today and is under limit
    IF NOT (team_uuid::TEXT = ANY(teams_today)) AND today_count < 2 THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update invitation rate limit
CREATE OR REPLACE FUNCTION update_invitation_limit(user_uuid UUID, team_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO invitation_rate_limits (user_id, date_created, invitation_count, teams_invited_to)
    VALUES (user_uuid, CURRENT_DATE, 1, ARRAY[team_uuid::TEXT])
    ON CONFLICT (user_id, date_created)
    DO UPDATE SET
        invitation_count = invitation_rate_limits.invitation_count + 1,
        teams_invited_to = array_append(invitation_rate_limits.teams_invited_to, team_uuid::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    target_user_id UUID,
    notification_type TEXT,
    notification_title TEXT,
    notification_message TEXT,
    notification_data JSONB DEFAULT '{}',
    action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    user_prefs RECORD;
BEGIN
    -- Check if user wants this type of notification
    SELECT * INTO user_prefs
    FROM user_notification_preferences
    WHERE user_id = target_user_id;
    
    -- If no preferences set, create default ones
    IF user_prefs IS NULL THEN
        INSERT INTO user_notification_preferences (user_id)
        VALUES (target_user_id);
        
        -- Assume all notifications enabled by default
        SELECT * INTO user_prefs
        FROM user_notification_preferences
        WHERE user_id = target_user_id;
    END IF;
    
    -- Check specific notification preference
    CASE notification_type
        WHEN 'team_invitation' THEN
            IF NOT user_prefs.team_invitations THEN RETURN NULL; END IF;
        WHEN 'member_added' THEN
            IF NOT user_prefs.member_added THEN RETURN NULL; END IF;
        WHEN 'new_message' THEN
            IF NOT user_prefs.new_messages THEN RETURN NULL; END IF;
        WHEN 'message_mention' THEN
            IF NOT user_prefs.message_mentions THEN RETURN NULL; END IF;
        WHEN 'document_shared' THEN
            IF NOT user_prefs.document_shared THEN RETURN NULL; END IF;
        WHEN 'role_changed' THEN
            IF NOT user_prefs.role_changes THEN RETURN NULL; END IF;
        ELSE
            -- Unknown type, create anyway
    END CASE;
    
    -- Create the notification
    INSERT INTO notifications (
        user_id, type, title, message, data, action_url
    ) VALUES (
        target_user_id, notification_type, notification_title, 
        notification_message, notification_data, action_url
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_invitations_updated_at 
    BEFORE UPDATE ON team_invitations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_join_requests_updated_at 
    BEFORE UPDATE ON team_join_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON user_notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION can_assign_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_invitation_limit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_invitation_limit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE team_invitations IS 'Team invitations with 2-team daily limit and role-based permissions';
COMMENT ON TABLE team_join_requests IS 'Public team join requests with admin approval';
COMMENT ON TABLE notifications IS 'Granular in-app notifications system';
COMMENT ON TABLE user_notification_preferences IS 'User preferences for different notification types';
COMMENT ON TABLE invitation_rate_limits IS 'Rate limiting for invitations (max 2 teams per day)';

COMMENT ON FUNCTION can_assign_role(UUID, UUID, TEXT) IS 'Check if user can assign specific role (owner assigns admin, owner/admin assign others)';
COMMENT ON FUNCTION check_invitation_limit(UUID, UUID) IS 'Verify user can invite to team (max 2 teams per day)';
COMMENT ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, JSONB, TEXT) IS 'Create notification respecting user preferences'; 