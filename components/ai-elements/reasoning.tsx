"use client"

import React, { useEffect, useState, useContext } from "react"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"

// Internal context to share state with Trigger/Content
type ReasoningCtx = { isStreaming?: boolean; open: boolean }
const ReasoningContext = React.createContext<ReasoningCtx>({ isStreaming: false, open: false })

export interface ReasoningProps extends React.ComponentProps<typeof Collapsible> {
  /** Whether the reasoning is currently streaming (auto-opens and closes) */
  isStreaming?: boolean
}

/**
 * Composable Reasoning container built on shadcn/ui Collapsible.
 * - Auto-opens when `isStreaming` is true and closes when false
 * - Use with <ReasoningTrigger /> and <ReasoningContent /> as children
 */
export function Reasoning({ isStreaming, className, children, ...props }: ReasoningProps) {
  const [open, setOpen] = useState<boolean>(false)

  // Auto-open/close based on streaming state
  useEffect(() => {
    setOpen(!!isStreaming)
  }, [isStreaming])

  return (
    <ReasoningContext.Provider value={{ isStreaming, open }}>
      <Collapsible open={open} onOpenChange={setOpen} {...props}>
        <div className={cn("mb-3 mx-4 md:mx-6", className)}>{children}</div>
      </Collapsible>
    </ReasoningContext.Provider>
  )
}

export interface ReasoningTriggerProps extends React.ComponentProps<typeof CollapsibleTrigger> {
  title?: string
}

export function ReasoningTrigger({ title = "Reasoning", className, children, ...props }: ReasoningTriggerProps) {
  const { isStreaming, open } = useContext(ReasoningContext)
  return (
    <div className="rounded-lg border bg-muted/40">
      <CollapsibleTrigger
        {...props}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm",
          "hover:bg-muted/60",
          className,
        )}
      >
        <span className="inline-flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isStreaming ? "bg-primary animate-pulse" : "bg-muted-foreground/40"
            )}
          />
          <span className="font-medium">{title}</span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 opacity-70" />
        ) : (
          <ChevronDown className="h-4 w-4 opacity-70" />
        )}
      </CollapsibleTrigger>
    </div>
  )
}

export function ReasoningContent({ className, children, ...props }: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent {...props}>
      <div className={cn("px-3 pt-2 pb-3", className)}>{children}</div>
    </CollapsibleContent>
  )
}
