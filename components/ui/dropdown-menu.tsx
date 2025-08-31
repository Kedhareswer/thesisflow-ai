"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  trigger: React.ReactNode
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: 'top' | 'bottom'
  align?: 'start' | 'center' | 'end'
  className?: string
  alignOffset?: number
  sideOffset?: number
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
  ...props
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

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

  return (
    <div className="relative" ref={menuRef} {...props}>
      <div onClick={() => handleOpenChange(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            side === 'top' ? 'bottom-full mb-2' : 'mt-2',
            align === 'end' && 'right-0',
            align === 'center' && 'left-1/2 -translate-x-1/2',
            className
          )}
          style={{
            ...(side === 'top' ? { bottom: `calc(100% + ${sideOffset}px)` } : { top: `calc(100% + ${sideOffset}px)` }),
            ...(align === 'end' ? { right: `${alignOffset}px` } : {}),
            ...(align === 'start' ? { left: `${alignOffset}px` } : {})
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
