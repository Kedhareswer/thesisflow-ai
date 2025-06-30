"use client"

import { useSupabaseAuth } from "@/components/supabase-auth-provider"

export function AuthDebug() {
  const { user, isLoading, session } = useSupabaseAuth()

  // Only show in development and make it minimal
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-2 right-2 bg-black text-white p-2 rounded text-xs max-w-xs z-50 opacity-75">
      <div className="space-y-1">
        <p><strong>Auth:</strong> {user ? `✅ ${user.email?.split('@')[0]}` : '❌ None'}</p>
        {user && <p><strong>ID:</strong> {user.id.slice(0, 8)}...</p>}
      </div>
    </div>
  )
} 