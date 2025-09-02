import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with fallback for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (process.env.NODE_ENV !== 'production' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  console.warn('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'ai-research-platform-auth',
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Types for Supabase tables
export type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joined_at: string;
  created_at?: string;
};

export type Team = {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  category: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  timestamp: any | string;
  id: string;
  team_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'system' | 'file';
  file_url?: string;
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
