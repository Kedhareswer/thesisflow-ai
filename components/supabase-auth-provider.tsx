"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import type { User, SupabaseClient, Session, AuthChangeEvent } from "@supabase/supabase-js"

import { useToast } from "@/hooks/use-toast"

// Securely access environment variables
const sanitize = (val?: string) => val?.replace(/^"|"$/g, '').trim() ?? '';
const getSupabaseConfig = () => {
  const supabaseUrl = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
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
  console.log("Using Supabase URL:", supabaseUrl ? supabaseUrl.split('.')[0] + '.supabase.co' : 'Not configured'); // Log only the domain for verification, not credentials
  
  // Create the Supabase client with validated values and custom storage key
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'ai-research-platform-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  });
} catch (error) {
  throw error;
}

// Ensure server can see the auth state: sync tokens into HttpOnly cookies
async function postAuthSync(event: string, session: Session | null) {
  try {
    await fetch('/api/auth/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      // keepalive helps ensure the request is delivered even during navigation
      keepalive: true,
      body: JSON.stringify({
        event,
        session: session
          ? {
              access_token: (session as any).access_token,
              refresh_token: (session as any).refresh_token,
              expires_at: (session as any).expires_at ?? null,
              expires_in: (session as any).expires_in ?? null,
            }
          : null,
      }),
    })
  } catch (_) {
    // best-effort; do not block UI on sync errors
  }
}

type SupabaseAuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  authError: Error | null
  signIn: (email: string, password: string) => Promise<any>
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
      // Sync any existing session to HttpOnly cookies so middleware can see it
      if (session) {
        void postAuthSync('INITIAL_SESSION', session)
      }
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
      // Sync cookies on every auth transition (sign in/out, token refresh)
      void postAuthSync(_event, session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      
      // Log the Supabase URL being used (for debugging)
      console.log("Signing in with Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      // Attempt to sign in with enhanced error logging
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      // Log the response for debugging
      console.log("Auth response:", { data: data ? "[DATA EXISTS]" : "[NO DATA]", error });

      if (error) throw error

      // IMPORTANT: sync session tokens to server cookies before redirecting
      await postAuthSync('SIGNED_IN', (data as any)?.session ?? null)

      toast({
        title: "Logged in successfully",
        description: "Welcome back!",
      })
      return data;
    } catch (error) {
      // Enhanced error logging
      console.error("Sign-in error details:", error);
      
      toast({
        title: "Sign-In Failed",
        description: error instanceof Error 
          ? `Error: ${error.message}` 
          : "Failed to sign in. Please check your credentials and try again.",
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
      
      // First, attempt the auth signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
        },
      })

      if (error) throw error

      // NEW: Manually create user profile and plan after successful auth signup
      if (data.user) {
        console.log("Auth signup successful, creating user profile and plan...");
        
        // Try RPC function first
        const { error: profileError } = await supabase.rpc('create_user_profile_and_plan', {
          user_id: data.user.id,
          user_email: email,
          user_full_name: metadata?.full_name || ''
        })
        
        if (profileError) {
          console.error('RPC failed, trying API fallback:', profileError);
          
          // Fallback to API route
          try {
            const response = await fetch('/api/auth/create-user-profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                user_id: data.user.id,
                email: email,
                full_name: metadata?.full_name || ''
              })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              console.error('API fallback failed:', errorData);
            } else {
              console.log("User profile and plan created via API fallback");
            }
          } catch (apiError) {
            console.error('API fallback error:', apiError);
            // Don't fail the signup, just log the error and continue
            // The user can still verify their email and we can create the profile later
          }
        } else {
          console.log("User profile and plan created successfully via RPC");
        }

        // Also set user preferences (accepted terms, marketing opt-in) if provided
        try {
          const acceptedTerms = Boolean(metadata?.accepted_terms)
          const acceptedAt = metadata?.accepted_terms_at ? new Date(metadata.accepted_terms_at).toISOString() : null
          const marketingOptIn = Boolean(metadata?.email_marketing_opt_in)

          // Only call when at least one preference is present
          if (acceptedTerms || marketingOptIn || acceptedAt) {
            const { error: prefsError } = await supabase.rpc('set_user_preferences', {
              p_user_id: data.user.id,
              p_accepted_terms: acceptedTerms,
              p_accepted_terms_at: acceptedAt,
              p_email_marketing_opt_in: marketingOptIn,
            })
            if (prefsError) {
              console.error('Failed to set user preferences via RPC:', prefsError)
            } else {
              console.log('User preferences saved via RPC')
            }
          }
        } catch (prefsCatchErr) {
          console.error('Error while setting user preferences:', prefsCatchErr)
          // Non-fatal: do not block signup completion
        }
      }

      toast({
        title: "Account created",
        description: "Please check your email for verification link",
      })
    } catch (error) {
      console.error("Signup error:", error);
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

      // Clear all caches on logout
      if (typeof window !== 'undefined') {
        const { clearAllCaches } = await import('@/lib/services/cache.service')
        clearAllCaches()
      }

      // Ensure cookies are cleared server-side too
      await postAuthSync('SIGNED_OUT', null)

      toast({
        title: "Logged out successfully",
        description: "See you next time!",
      })
    } catch (error) {
      toast({
        title: "Sign-Out Failed",
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
