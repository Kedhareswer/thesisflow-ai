import { createClient, SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

// Environment variable validation
const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  
  if (!supabaseUrl || supabaseUrl === '') {
    console.error('NEXT_PUBLIC_SUPABASE_URL is missing or invalid')
    throw new Error('Missing Supabase URL. Please check your environment variables.')
  }
  
  if (!supabaseAnonKey || supabaseAnonKey === '') {
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or invalid')
    throw new Error('Missing Supabase key. Please check your environment variables.')
  }

  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch {
    throw new Error('Invalid Supabase URL format. Please check your environment variables.')
  }
  
  return { supabaseUrl, supabaseAnonKey }
}

// Unified Supabase client with comprehensive error handling
let supabaseClient: SupabaseClient<Database>

try {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  
  if (typeof window !== 'undefined') {
    console.log("✅ Supabase client initialized with URL:", supabaseUrl.split('.')[0] + '.supabase.co')
  }
  
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'ai-research-platform-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      headers: {
        'X-Client-Info': 'ai-research-platform@1.0.0',
      },
    },
    db: {
      schema: 'public',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })
} catch (error) {
  console.error('Failed to initialize Supabase client:', error)
  
  // Fallback client for development/testing
  if (typeof window !== 'undefined') {
    console.warn('⚠️ Using fallback Supabase client. Authentication features will not work.')
  }
  
  supabaseClient = createClient<Database>(
    'https://placeholder.supabase.co', 
    'placeholder-key',
    {
      auth: { persistSession: false }
    }
  )
}

// Export the unified client
export const supabase = supabaseClient

// Export types for consistency
export type { Database, User, Session, AuthChangeEvent }
export type SupabaseClientType = typeof supabaseClient

// Utility functions for common operations
export const supabaseUtils = {
  // Check if client is properly configured
  isConfigured(): boolean {
    try {
      const config = getSupabaseConfig()
      return !config.supabaseUrl.includes('placeholder') && !config.supabaseAnonKey.includes('placeholder')
    } catch {
      return false
    }
  },

  // Get current user safely
  async getCurrentUser(): Promise<{ user: User | null; error: Error | null }> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      return { user, error }
    } catch (error) {
      return { user: null, error: error as Error }
    }
  },

  // Get current session safely
  async getCurrentSession(): Promise<{ session: Session | null; error: Error | null }> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      return { session, error }
    } catch (error) {
      return { session: null, error: error as Error }
    }
  },

  // Test database connection
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.from('projects').select('count').limit(1)
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  },

  // Sign out safely
  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      return { error: error as Error }
    }
  }
}

// Legacy exports for backward compatibility
export type TeamMember = {
  id: string
  team_id: string
  user_id: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  joined_at: string
  created_at?: string
}

export type Team = {
  id: string
  name: string
  description: string
  is_public: boolean
  category: string
  owner_id: string
  created_at: string
  updated_at: string
}

export type ChatMessage = {
  id: string
  team_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'system' | 'file'
  file_url?: string
  created_at: string
}

export type UserProfile = {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  last_active: string
  status: 'online' | 'offline' | 'away'
}

// Connection status for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).supabaseDebug = {
    client: supabase,
    utils: supabaseUtils,
    config: supabaseUtils.isConfigured() ? 'configured' : 'not configured'
  }
} 