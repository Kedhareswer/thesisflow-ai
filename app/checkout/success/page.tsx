"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CheckoutSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to plan page with query param so PlanPage shows success toast
    router.replace('/plan?success=true')
  }, [router])

  return null
}
