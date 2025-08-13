"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CheckoutSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to plan page with query param so PlanPage shows success toast
    const navigate = async () => {
      try {
        await router.replace('/plan?success=true')
      } catch (error) {
        console.error('Failed to redirect to plan page:', error)
        // Fallback to location href
        window.location.href = '/plan?success=true'
      }
    }
    navigate()
  }, [router])

  return null
}
