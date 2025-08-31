"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  trigger: React.ReactNode
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  className?: string
  alignOffset?: number
  sideOffset?: number
  // Optional: open the menu on hover instead of click
  openOnHover?: boolean
  // Optional delays (ms) for hover open/close
  hoverOpenDelay?: number
  hoverCloseDelay?: number
}

export function DropdownMenu({
  trigger,
  children,
  open,
  onOpenChange,
  className,
  side = 'bottom',
  align = 'start',
  alignOffset = 0,
  sideOffset = 4,
  openOnHover = false,
  hoverOpenDelay = 0,
  hoverCloseDelay = 100,
  ...props
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const openTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleOpenChange(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleItemClick = () => {
    handleOpenChange(false)
  }

  // Clone children to add onClick handlers that close the menu
  const childrenWithCloseHandler = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const childElement = child as React.ReactElement<React.HTMLAttributes<HTMLElement>>
      const originalOnClick = childElement.props?.onClick
      
      return React.cloneElement(childElement, {
        onClick: (e: React.MouseEvent<HTMLElement>) => {
          // Call original onClick if it exists
          if (originalOnClick && typeof originalOnClick === 'function') {
            originalOnClick(e)
          }
          // Close the menu
          handleOpenChange(false)
        }
      })
    }
    return child
  })

  // Hover handlers (optional)
  const clearTimers = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const handleMouseEnter = () => {
    if (!openOnHover) return
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    openTimerRef.current = setTimeout(() => {
      handleOpenChange(true)
    }, Math.max(0, hoverOpenDelay))
  }

  const handleMouseLeave = () => {
    if (!openOnHover) return
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    closeTimerRef.current = setTimeout(() => {
      handleOpenChange(false)
    }, Math.max(0, hoverCloseDelay))
  }

  React.useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [])

  return (
    <div
      className="relative"
      ref={menuRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div
        onClick={() => handleOpenChange(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            // Side placement classes (base positioning, offset handled via style)
            side === 'top' && 'bottom-full',
            side === 'bottom' && 'top-full',
            side === 'right' && 'left-full',
            side === 'left' && 'right-full',
            // Center alignment transforms
            align === 'center' && (side === 'left' || side === 'right' ? 'top-1/2 -translate-y-1/2' : 'left-1/2 -translate-x-1/2'),
            className
          )}
          style={{
            // Offset away from trigger depending on side
            ...(side === 'top' ? { bottom: `calc(100% + ${sideOffset}px)` } : {}),
            ...(side === 'bottom' ? { top: `calc(100% + ${sideOffset}px)` } : {}),
            ...(side === 'right' ? { left: `calc(100% + ${sideOffset}px)` } : {}),
            ...(side === 'left' ? { right: `calc(100% + ${sideOffset}px)` } : {}),
            // Align along the perpendicular axis
            ...((side === 'left' || side === 'right')
              ? (align === 'end' ? { bottom: `${alignOffset}px` } : (align === 'start' ? { top: `${alignOffset}px` } : {}))
              : (align === 'end' ? { right: `${alignOffset}px` } : (align === 'start' ? { left: `${alignOffset}px` } : {}))
            )
          } as React.CSSProperties}
        >
          {childrenWithCloseHandler}
        </div>
      )}
    </div>
  )
}

interface DropdownMenuTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

export function DropdownMenuTrigger({
  className,
  asChild,
  children,
  ...props
}: DropdownMenuTriggerProps) {
  return (
    <div className={cn("cursor-pointer", className)} {...props}>
      {children}
    </div>
  )
}

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "center"
  sideOffset?: number
}

export function DropdownMenuContent({
  className,
  align = "start",
  sideOffset = 4,
  ...props
}: DropdownMenuContentProps) {
  return (
    <div
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        align === "end" && "right-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        className
      )}
      style={{ marginTop: sideOffset }}
      {...props}
    />
  )
}

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean
  asChild?: boolean
}

export function DropdownMenuItem({
  className,
  inset,
  asChild,
  ...props
}: DropdownMenuItemProps) {
  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  )
}

interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean
}

export function DropdownMenuLabel({
  className,
  inset,
  ...props
}: DropdownMenuLabelProps) {
  return (
    <div
      className={cn(
        "px-2 py-1.5 text-sm font-semibold",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  )
}

export function DropdownMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  )
}
