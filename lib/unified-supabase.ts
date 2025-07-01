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
  
  return { supabaseUrl, supabaseAnonKey }
}

// Unified Supabase client
let supabaseClient: SupabaseClient<Database>

try {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
} catch (error) {
  console.error('Failed to initialize Supabase client:', error)
  
  // Fallback client
  supabaseClient = createClient<Database>(
    'https://placeholder.supabase.co', 
    'placeholder-key'
  )
}

export const supabase = supabaseClient
export type { Database, User, Session, AuthChangeEvent }
