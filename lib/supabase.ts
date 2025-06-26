import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for Supabase tables
export type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  created_at: string;
};

export type Team = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  is_public: boolean;
  category: string;
  owner_id: string;
};

export type ChatMessage = {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  type: 'text' | 'system';
  created_at: string;
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  last_active: string;
  status: 'online' | 'offline' | 'away';
};
