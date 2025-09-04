"use client"

import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useImperativeHandle,
  createContext,
  useContext,
} from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export interface StickToBottomContext {
  isAtBottom: boolean
  scrollToBottom: (opts?: { smooth?: boolean }) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

export type StickToBottomInstance = StickToBottomContext

const ConversationContext = createContext<StickToBottomContext | null>(null)

interface ConversationProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  contextRef?: React.Ref<StickToBottomContext>
  instance?: StickToBottomInstance
  children: ((context: StickToBottomContext) => React.ReactNode) | React.ReactNode
}

export const Conversation = React.forwardRef<HTMLDivElement, ConversationProps>(
  ({ className, style, children, contextRef, instance, ...props }, _ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isAtBottom, setIsAtBottom] = useState(true)

    const updateIsAtBottom = useCallback(() => {
      const el = containerRef.current
      if (!el) return
      const threshold = 24 // px
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold
      setIsAtBottom(atBottom)
    }, [])

    const scrollToBottom = useCallback(
      (opts?: { smooth?: boolean }) => {
        const el = containerRef.current
        if (!el) return
        const behavior = opts?.smooth ? ("smooth" as ScrollBehavior) : ("auto" as ScrollBehavior)
        el.scrollTo({ top: el.scrollHeight, behavior })
      },
      []
    )

    const contextValue = useMemo<StickToBottomContext>(
      () => ({ isAtBottom, scrollToBottom, containerRef }),
      [isAtBottom, scrollToBottom]
    )

    useImperativeHandle(contextRef, () => contextValue, [contextValue])

    // Track scroll and resize
    useEffect(() => {
      const el = containerRef.current
      if (!el) return
      const onScroll = () => updateIsAtBottom()
      el.addEventListener("scroll", onScroll, { passive: true })
      updateIsAtBottom()
      return () => {
        el.removeEventListener("scroll", onScroll)
      }
    }, [updateIsAtBottom])

    useEffect(() => {
      const onResize = () => updateIsAtBottom()
      window.addEventListener("resize", onResize)
      return () => window.removeEventListener("resize", onResize)
    }, [updateIsAtBottom])

    // Ensure initial scroll to bottom on mount
    useEffect(() => {
      const id = requestAnimationFrame(() => scrollToBottom({ smooth: false }))
      return () => cancelAnimationFrame(id)
    }, [scrollToBottom])

    return (
      <div
        ref={containerRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className={cn("relative w-full overflow-y-auto", className)}
        style={style}
        {...props}
      >
        <ConversationContext.Provider value={contextValue}>
          {(() => {
            const rendered: React.ReactNode =
              typeof children === "function"
                ? (children as (c: StickToBottomContext) => React.ReactNode)(contextValue)
                : (children as React.ReactNode)
            return rendered
          })()}
        </ConversationContext.Provider>
      </div>
    )
  }
)
Conversation.displayName = "Conversation"

interface ConversationContentProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children: ((context: StickToBottomContext) => React.ReactNode) | React.ReactNode
}

export const ConversationContent: React.FC<ConversationContentProps> = ({
  className,
  children,
  ...props
}) => {
  const ctx = useContext(ConversationContext)
  const contentRef = useRef<HTMLDivElement>(null)

  // Observe content changes and auto-scroll if currently at bottom
  useEffect(() => {
    if (!contentRef.current || !ctx) return

    const observer = new MutationObserver(() => {
      if (ctx.isAtBottom) {
        ctx.scrollToBottom({ smooth: true })
      }
    })

    observer.observe(contentRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => observer.disconnect()
  }, [ctx])

  return (
    <div ref={contentRef} className={cn("space-y-6", className)} {...props}>
      {(() => {
        const rendered: React.ReactNode =
          typeof children === "function" && ctx
            ? (children as (c: StickToBottomContext) => React.ReactNode)(ctx)
            : (children as React.ReactNode)
        return rendered
      })()}
    </div>
  )
}

export const ConversationScrollButton: React.FC<React.ComponentProps<typeof Button>> = ({
  className,
  children,
  onClick,
  ...props
}) => {
  const ctx = useContext(ConversationContext)
  if (!ctx) return null

  return (
    <Button
      type="button"
      size="sm"
      onClick={(e) => {
        onClick?.(e)
        ctx.scrollToBottom({ smooth: true })
      }}
      className={cn(
        "absolute bottom-3 right-3 rounded-full shadow-md transition-all",
        ctx.isAtBottom
          ? "opacity-0 pointer-events-none translate-y-2"
          : "opacity-100 translate-y-0",
        className
      )}
      aria-label="Scroll to bottom"
      {...props}
    >
      <ChevronDown className="h-4 w-4 mr-1" />
      {children ?? "Scroll"}
    </Button>
  )
}
