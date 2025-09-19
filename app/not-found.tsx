"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center bg-[#F8F9FA] px-4">
      <div className="text-center max-w-xl">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-semibold text-gray-900">Page not found</h1>
        <p className="mt-2 text-gray-600">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/">Go to Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/explorer">Open Explorer</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
