"use client"

import * as React from "react"
import { ChevronDown, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface SourcesContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const SourcesContext = React.createContext<SourcesContextValue | null>(null)

function useSourcesContext() {
  const ctx = React.useContext(SourcesContext)
  if (!ctx) {
    throw new Error("Sources components must be used within <Sources>")
  }
  return ctx
}

export function Sources({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [open, setOpen] = React.useState(false)

  return (
    <SourcesContext.Provider value={{ open, setOpen }}>
      <div className={cn("relative inline-block", className)} {...props}>
        {children}
      </div>
    </SourcesContext.Provider>
  )
}

export function SourcesTrigger({
  count,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { count?: number }) {
  const { open, setOpen } = useSourcesContext()

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border bg-white px-2.5 py-1.5 text-xs font-medium shadow-sm hover:bg-gray-50",
        className
      )}
      aria-expanded={open}
      {...props}
    >
      {children ?? (
        <>
          Sources{typeof count === "number" ? ` (${count})` : ""}
        </>
      )}
      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
    </button>
  )
}

export function SourcesContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSourcesContext()
  if (!open) return null

  return (
    <div
      className={cn(
        "absolute z-20 mt-2 min-w-[240px] rounded-md border bg-white p-2 shadow-lg",
        "max-h-72 overflow-auto",
        className
      )}
      role="region"
      {...props}
    >
      {children}
    </div>
  )
}

export function Source({
  className,
  children,
  href,
  title,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const display = children ?? title ?? href
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50",
        className
      )}
      title={typeof display === "string" ? display : undefined}
      {...props}
    >
      <span className="truncate text-gray-700">{display}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-500" />
    </a>
  )
}
