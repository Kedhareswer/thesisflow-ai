"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen grid place-items-center bg-[#F8F9FA] px-4">
      <div className="text-center max-w-xl">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-semibold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-gray-600">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        {error?.message && (
          <p className="mt-2 text-sm text-gray-500 break-words">{error.message}</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={() => reset()}>
            Try Again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go to Home</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
