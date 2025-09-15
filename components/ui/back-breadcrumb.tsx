"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface BackBreadcrumbProps {
  label?: string
  className?: string
  fallbackHref?: string
  showDivider?: boolean
}

export function BackBreadcrumb({
  label = "Back",
  className,
  fallbackHref = "/explorer",
  showDivider = false,
}: BackBreadcrumbProps) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Button variant="ghost" size="sm" onClick={handleBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />
        {label}
      </Button>
      {showDivider && <span className="text-muted-foreground select-none">/</span>}
    </div>
  )
}
