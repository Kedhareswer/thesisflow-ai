"use client"

import React, { useEffect, useMemo, useRef } from "react"
import { Brain, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"

export interface ReasoningProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  lines?: string[]
  progress?: number
  className?: string
}

/**
 * Reasoning panel that shows live progress messages and a percentage bar.
 * Controlled via `open` prop. Auto-scrolls to latest line when lines update.
 */
export function Reasoning({
  open,
  onOpenChange,
  title = "Reasoning",
  lines = [],
  progress,
  className,
}: ReasoningProps) {
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to bottom when lines update and panel is open
  useEffect(() => {
    if (!open) return
    const el = contentRef.current
    if (!el) return
    // Scroll smoothly to bottom
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [lines, open])

  const hasProgress = typeof progress === "number" && progress >= 0
  const safeProgress = useMemo(() => {
    if (!hasProgress) return undefined
    if (progress! < 0) return 0
    if (progress! > 100) return 100
    return Math.round(progress!)
  }, [progress, hasProgress])

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div
        className={cn(
          "mb-3 mx-4 md:mx-6",
          open ? "" : "hidden",
          className
        )}
        role="region"
        aria-label="AI Reasoning Panel"
      >
        <div className="rounded-xl border bg-emerald-50/60 border-emerald-200/70 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-emerald-100/60 border-b border-emerald-200/70">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="text-sm font-medium text-emerald-800">{title}</div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange?.(false)}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1"
              aria-label="Close reasoning panel"
              title="Close reasoning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress */}
          {hasProgress && (
            <div className="px-4 pt-3">
              <Progress value={safeProgress} />
              <div className="mt-1 flex items-center justify-end">
                <span className="text-[11px] text-emerald-700 font-medium">{safeProgress}%</span>
              </div>
            </div>
          )}

          {/* Content */}
          <CollapsibleContent forceMount>
            <div ref={contentRef} className={cn(
              "px-4 pb-4 mt-2 max-h-44 overflow-auto",
              !hasProgress ? "pt-2" : ""
            )}>
              {lines.length === 0 ? (
                <div className="text-xs text-emerald-700/80">Initializing...</div>
              ) : (
                <ul className="space-y-1.5">
                  {lines.map((line, idx) => (
                    <li key={idx} className="text-xs leading-5 text-emerald-900">
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  )
}

// Optional primitive wrappers for future extensibility to mirror AI SDK API
export const ReasoningContent = ({ children }: { children: React.ReactNode }) => (
  <div className="px-4 pb-4 mt-2 max-h-44 overflow-auto">{children}</div>
)

export const ReasoningTrigger = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
  <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900">
    {children}
  </button>
)
