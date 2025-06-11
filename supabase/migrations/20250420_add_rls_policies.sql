-- Enable Row Level Security on all tables
ALTER TABLE public.research_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view all profiles" ON public.user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profiles" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Research papers policies
CREATE POLICY "Users can view all research papers" ON public.research_papers
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own research papers" ON public.research_papers
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own research papers" ON public.research_papers
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own research papers" ON public.research_papers
  FOR DELETE USING (auth.uid() = author_id);

-- Paper edits policies
CREATE POLICY "Users can view all paper edits" ON public.paper_edits
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own paper edits" ON public.paper_edits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Collaboration sessions policies
CREATE POLICY "Users can view all collaboration sessions" ON public.collaboration_sessions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own collaboration sessions" ON public.collaboration_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collaboration sessions" ON public.collaboration_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collaboration sessions" ON public.collaboration_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view all chat messages" ON public.chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
