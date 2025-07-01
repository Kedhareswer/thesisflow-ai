import { Suspense } from 'react'
import CollaborateClient from './page-client'
import { SupabaseAuthProvider } from '@/components/supabase-auth-provider'

export default function CollaboratePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CollaborateClient />
    </Suspense>
  )
}
