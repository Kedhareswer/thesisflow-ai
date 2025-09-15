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

// Enhanced Chat Types
export type User = {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  last_seen: string;
  is_online: boolean;
  status: 'online' | 'offline' | 'away';
  created_at: string;
  updated_at: string;
};

// Transform user profile to User type
export function transformUserProfile(profile: any): User {
  return {
    id: profile.id,
    username: profile.display_name || profile.full_name || profile.email,
    email: profile.email,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    last_seen: profile.last_active,
    is_online: profile.status === 'online',
    status: profile.status || 'offline',
    created_at: profile.created_at,
    updated_at: profile.updated_at
  };
}

export type Conversation = {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  avatar_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_id?: string;
  last_activity: string;
  participants?: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
};

export type ConversationParticipant = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_message_id?: string;
  is_muted: boolean;
  user?: User;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to_message_id?: string;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  is_deleted: boolean;
  delivery_status: 'sent' | 'delivered' | 'read';
  sender?: User;
  reply_to_message?: Message;
  reactions?: MessageReaction[];
  is_local?: boolean; // for optimistic updates
  temp_id?: string; // for optimistic updates
};

export type MessageReaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: User;
};

export type TypingIndicator = {
  id: string;
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  updated_at: string;
  user?: User;
};

// Legacy types for backward compatibility
export type ChatMessage = Message;
export type UserProfile = User;
