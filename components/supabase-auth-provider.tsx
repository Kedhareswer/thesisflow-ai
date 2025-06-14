"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import type { User, SupabaseClient, Session, AuthChangeEvent } from "@supabase/supabase-js"

import { useToast } from "@/hooks/use-toast"

// Securely access environment variables
const getSupabaseConfig = () => {
  const supabaseUrl = "https://hpobxsdixpkfiwonhszv.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Validate environment variables are set
  if (!supabaseUrl || supabaseUrl.trim() === '') {
    console.error('NEXT_PUBLIC_SUPABASE_URL is missing or invalid');
    throw new Error('Missing Supabase URL. Please check your environment variables.');
  }
  
  if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or invalid');
    throw new Error('Missing Supabase key. Please check your environment variables.');
  }
  
  return { supabaseUrl, supabaseAnonKey };
};

// Initialize supabase client with proper type
let supabase: SupabaseClient;

try {
  // Get config from environment variables only
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  console.log("Using Supabase URL:", supabaseUrl); // Log only the domain for verification, not credentials
  
  // Create the Supabase client with validated values
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // In a real app, you might want to show a more user-friendly error or fallback UI
  // For development, we'll create a minimal mock client that won't break the app
  if (typeof window !== 'undefined') {
    window.alert('Supabase environment variables are missing. Authentication features will not work.');
  }
  // Create a minimal mock client to prevent TypeScript errors
  supabase = createClient('https://example.com', 'mock-key');
}

type SupabaseAuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  authError: Error | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: any) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<Error | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    // Check active sessions and set the user
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast({
        title: "Logged in successfully",
        description: "Welcome back!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign in",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
        },
      })

      if (error) throw error

      toast({
        title: "Account created",
        description: "Please check your email for verification link",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign up",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      toast({
        title: "Password reset email sent",
        description: "Check your email for password reset instructions",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reset email",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      toast({
        title: "Password updated",
        description: "Your password has been successfully updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update password",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign out",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SupabaseAuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        authError,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  )
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext)
  if (context === undefined) {
    throw new Error("useSupabaseAuth must be used within a SupabaseAuthProvider")
  }
  return context
}
