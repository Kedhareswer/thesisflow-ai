import { Suspense } from 'react'
import CollaborateClient from './page-client'
import { AuthProvider } from '@/lib/contexts/auth-context'

export default function CollaboratePage() {
  return (
    <AuthProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <CollaborateClient />
      </Suspense>
    </AuthProvider>
  )
}
