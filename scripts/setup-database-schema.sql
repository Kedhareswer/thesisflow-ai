-- AI Project Planner Database Schema
-- This script sets up the complete database structure for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET row_security = on;

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'on-hold')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'completed')),
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    estimated_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    category VARCHAR(100) DEFAULT 'Research',
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Documents table for shared files and research papers
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    document_type VARCHAR(50) DEFAULT 'note' CHECK (document_type IN ('note', 'paper', 'summary', 'idea')),
    file_url TEXT,
    mime_type VARCHAR(100),
    file_size INTEGER,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Summaries table for AI-generated content summaries
CREATE TABLE IF NOT EXISTS summaries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    original_content TEXT,
    summary_content TEXT NOT NULL,
    key_points JSONB,
    source_type VARCHAR(20) CHECK (source_type IN ('text', 'file', 'url')),
    source_url TEXT,
    reading_time INTEGER,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Research ideas table
CREATE TABLE IF NOT EXISTS research_ideas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    research_question TEXT,
    methodology TEXT,
    impact TEXT,
    challenges TEXT,
    topic VARCHAR(255),
    context TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table for team collaboration
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'file')),
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    institution VARCHAR(255),
    research_interests TEXT[],
    status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'offline', 'away')),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity log table for tracking user actions
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_team_id ON documents(team_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_research_ideas_user_id ON research_ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_research_ideas_project_id ON research_ideas(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_team_id ON chat_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_research_ideas_updated_at BEFORE UPDATE ON research_ideas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Projects: Users can only see their own projects or projects they're collaborating on
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects" ON projects
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own projects" ON projects
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own projects" ON projects
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own projects" ON projects
    FOR DELETE USING (owner_id = auth.uid());

-- Tasks: Users can see tasks in their projects or tasks assigned to them
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their projects" ON tasks
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        ) OR assignee_id = auth.uid()
    );

CREATE POLICY "Users can insert tasks in their projects" ON tasks
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update tasks in their projects or assigned to them" ON tasks
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        ) OR assignee_id = auth.uid()
    );

CREATE POLICY "Users can delete tasks in their projects" ON tasks
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

-- Teams: Users can see public teams or teams they're members of
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public teams or their own teams" ON teams
    FOR SELECT USING (
        is_public = true OR 
        owner_id = auth.uid() OR 
        id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own teams" ON teams
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own teams" ON teams
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own teams" ON teams
    FOR DELETE USING (owner_id = auth.uid());

-- Team members: Users can see members of teams they belong to
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team members of their teams" ON team_members
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        ) OR team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Team owners can insert team members" ON team_members
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Team owners can update team members" ON team_members
    FOR UPDATE USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Team owners and users can delete their own membership" ON team_members
    FOR DELETE USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()
        ) OR user_id = auth.uid()
    );

-- Documents: Users can see their own documents, public documents, or team documents they have access to
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible documents" ON documents
    FOR SELECT USING (
        owner_id = auth.uid() OR 
        is_public = true OR
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own documents" ON documents
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own documents" ON documents
    FOR DELETE USING (owner_id = auth.uid());

-- Summaries: Users can only see their own summaries
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own summaries" ON summaries
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own summaries" ON summaries
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own summaries" ON summaries
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own summaries" ON summaries
    FOR DELETE USING (user_id = auth.uid());

-- Research ideas: Users can see their own ideas or public project ideas
ALTER TABLE research_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own research ideas" ON research_ideas
    FOR SELECT USING (
        user_id = auth.uid() OR 
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own research ideas" ON research_ideas
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own research ideas" ON research_ideas
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own research ideas" ON research_ideas
    FOR DELETE USING (user_id = auth.uid());

-- Chat messages: Users can see messages in teams they belong to
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team chat messages" ON chat_messages
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert team chat messages" ON chat_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

-- User profiles: Users can see all profiles but only update their own
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all user profiles" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Activity logs: Users can only see their own activity
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity logs" ON activity_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own activity logs" ON activity_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to update user last activity
CREATE OR REPLACE FUNCTION public.update_user_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_profiles 
    SET last_active = NOW(), status = 'online'
    WHERE id = auth.uid();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE projects IS 'Research projects created by users';
COMMENT ON TABLE tasks IS 'Individual tasks within research projects';
COMMENT ON TABLE teams IS 'Collaborative teams for research work';
COMMENT ON TABLE team_members IS 'Members of research teams with their roles';
COMMENT ON TABLE documents IS 'Shared documents and research papers';
COMMENT ON TABLE summaries IS 'AI-generated summaries of documents and content';
COMMENT ON TABLE research_ideas IS 'Research ideas generated by AI or users';
COMMENT ON TABLE chat_messages IS 'Team chat messages for collaboration';
COMMENT ON TABLE user_profiles IS 'Extended user profile information';
COMMENT ON TABLE activity_logs IS 'Log of user actions for analytics'; 