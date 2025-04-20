"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/src/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

type SupabaseAuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // No auth state listener or session check needed
  useEffect(() => {
    // Set default state
    setUser(null)
    setSession(null)
    setIsLoading(false)
  }, [])

  // Simplified auth functions that don't require actual authentication
  const signIn = async () => {
    setUser({ id: 'guest', email: 'guest@example.com' } as User)
    return
  }

  const signUp = async () => {
    setUser({ id: 'guest', email: 'guest@example.com' } as User)
    return
  }

  const signOut = async () => {
    setUser(null)
    return
  }

  return (
    <SupabaseAuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
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
