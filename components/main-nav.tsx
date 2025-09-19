"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Search, FileText, Bot, Calendar, Users, Settings, User, LogOut, PenLine, Crown, Menu, Sparkles, AlertTriangle, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TokenMeter } from "@/components/token/token-meter"
import { useUserPlan } from "@/hooks/use-user-plan"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { useEffect, useState, lazy, Suspense } from "react"

// Lazy load the notification bell
const NotificationBell = lazy(() => import("@/app/collaborate/components/notification-bell"))

const navigation = [
  { name: "AI Agents", href: "/ai-agents", icon: Bot },
  { name: "Explorer", href: "/explorer", icon: Search },
  { name: "Summarizer", href: "/summarizer", icon: FileText },
  { name: "Writer", href: "/writer", icon: PenLine },
  { name: "Planner", href: "/planner", icon: Calendar },
  { name: "Collaborate", href: "/collaborate", icon: Users },
]

export function MainNav() {
  const pathname = usePathname()
  const { user, isLoading, signOut } = useSupabaseAuth()
  const [mounted, setMounted] = useState(false)
  const { getPlanType, tokenStatus, isProOrHigher } = useUserPlan()
  const [lowTokenDismissed, setLowTokenDismissed] = useState(false)

  // Low-token threshold config
  const LOW_TOKEN_PERCENT = 0.15 // 15%
  const LOW_TOKEN_MIN_MONTHLY = 25 // absolute monthly tokens

  useEffect(() => {
    setMounted(true)
  }, [])

  // Low tokens banner dismissal persistence
  useEffect(() => {
    if (!user) return
    try {
      const key = `low_token_banner_dismissed:${user.id}`
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
      if (raw) {
        const ts = Number(raw)
        if (Number.isFinite(ts) && Date.now() < ts) setLowTokenDismissed(true)
      }
    } catch {}
  }, [user?.id])

  const dismissLowTokenBanner = () => {
    try {
      if (!user) return
      const key = `low_token_banner_dismissed:${user.id}`
      const until = Date.now() + 24 * 60 * 60 * 1000
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, String(until))
      }
      setLowTokenDismissed(true)
    } catch {}
  }

  const lowToken = (() => {
    if (!tokenStatus) return false
    const monthlyPercentLow = tokenStatus.monthlyLimit > 0 && (tokenStatus.monthlyRemaining / tokenStatus.monthlyLimit) < LOW_TOKEN_PERCENT
    const monthlyCountLow = tokenStatus.monthlyRemaining <= LOW_TOKEN_MIN_MONTHLY
    return monthlyPercentLow || monthlyCountLow
  })()

  // Simple avatar component
  const SimpleAvatar = ({ size = "sm" }: { size?: "sm" | "md" }) => {
    const getInitials = () => {
      if (user?.user_metadata?.display_name) {
        return user.user_metadata.display_name[0].toUpperCase()
      }
      if (user?.email) {
        return user.email[0].toUpperCase()
      }
      return "U"
    }

    const sizeClass = size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base"

    // Try to get avatar URL from user metadata or profile
    const avatarUrl = user?.user_metadata?.avatar_url

    if (avatarUrl) {
      return (
        <img
          src={`${avatarUrl}?v=${Date.now()}`}
          alt="Profile"
          className={`${sizeClass} rounded-full object-cover`}
        />
      )
    }

    return (
      <div
        className={`${sizeClass} bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold rounded-full flex items-center justify-center`}
      >
        {getInitials()}
      </div>
    )
  }

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="inline-flex h-8 items-center justify-center rounded bg-black text-white text-xs font-bold px-2 whitespace-nowrap">
                Thesis
              </div>
              <span className="text-lg font-semibold text-black">Flow-AI</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="inline-flex h-8 items-center justify-center rounded bg-black text-white text-xs font-bold px-2 whitespace-nowrap">
              Thesis
            </div>
            <span className="text-lg font-semibold text-black">Flow-AI</span>
          </Link>

          {/* Navigation (visible to all users) */}
          <nav className="hidden md:flex items-center space-x-1">
            <TooltipProvider>
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                const tip = (() => {
                  switch (item.name) {
                    case "Explorer":
                      return "Deep Research • consumes tokens";
                    case "Summarizer":
                      return "Summarizer • consumes tokens";
                    case "AI Agents":
                      return "AI Chat & Tools • consumes tokens";
                    case "Planner":
                      return "Plan & Execute • may consume tokens";
                    default:
                      return undefined;
                  }
                })();

                const button = (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-9 px-3 text-sm font-medium transition-colors",
                        "hover:bg-gray-100 hover:text-black",
                        isActive ? "bg-gray-100 text-black" : "text-gray-600",
                      )}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Button>
                  </Link>
                );

                return tip ? (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent>{tip}</TooltipContent>
                  </Tooltip>
                ) : (
                  button
                );
              })}
            </TooltipProvider>
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pr-0">
                <nav className="flex flex-col gap-2 p-4">
                  {navigation.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    const tip = (() => {
                      switch (item.name) {
                        case "Explorer":
                          return "Deep Research • consumes tokens";
                        case "Summarizer":
                          return "Summarizer • consumes tokens";
                        case "AI Agents":
                          return "AI Chat & Tools • consumes tokens";
                        case "Planner":
                          return "Plan & Execute • may consume tokens";
                        default:
                          return undefined;
                      }
                    })();

                    return (
                      <div key={item.name} className="flex flex-col">
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                            isActive ? "bg-gray-100 text-black" : "text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {item.name}
                        </Link>
                        {tip && (
                          <span className="pl-9 pr-3 pb-2 -mt-1 text-xs text-muted-foreground">{tip}</span>
                        )}
                      </div>
                    )
                  })}
                  {/* Auth actions */}
                  {!user && !isLoading && (
                    <div className="mt-2 flex gap-2">
                      <Link href="/login" className="flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100">Sign In</Link>
                      <Link href="/signup" className="flex-1 rounded-md bg-black px-3 py-2 text-center text-sm font-medium text-white">Sign Up</Link>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user && !isLoading ? (
              <>
                {/* Mini Token Meter */}
                <TokenMeter compact />
                {/* Notification Bell */}
                <Suspense fallback={<Button variant="ghost" size="icon" disabled><div className="h-5 w-5" /></Button>}>
                  <NotificationBell />
                </Suspense>

                {/* Always-visible tiny token chip next to avatar */}
                {tokenStatus && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 rounded-full border bg-white px-2 h-7 text-xs cursor-default select-none">
                          <Sparkles className="h-3.5 w-3.5 text-[#FF6B2C]" />
                          <span className="tabular-nums">{tokenStatus.monthlyRemaining}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Monthly: {tokenStatus.monthlyUsed}/{tokenStatus.monthlyLimit}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
              <DropdownMenu
                trigger={
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-gray-100">
                    <SimpleAvatar size="sm" />
                  </Button>
                }
                className="w-56 right-0"
              >
                <div className="flex items-center justify-start gap-3 p-3 border-b">
                  <SimpleAvatar size="md" />
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">
                      {user.user_metadata?.full_name || user.user_metadata?.display_name || user.user_metadata?.name || (user.email ? user.email.split("@")[0] : "User")}
                    </p>
                    <p className="w-[180px] truncate text-xs text-gray-600">{user.email}</p>
                  </div>
                </div>
                {/* Plan + Usage card */}
                <div className="p-3 border-b">
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">
                        {getPlanType() === 'pro' ? 'Pro Plan' : 'Free Plan'}
                      </span>
                      <span className="inline-flex items-center text-xs text-muted-foreground">
                        <Sparkles className="h-3 w-3 mr-1 text-[#FF6B2C]" />
                        {tokenStatus ? `${tokenStatus.monthlyRemaining} left` : '—'}
                      </span>
                    </div>
                    {tokenStatus && (
                      <div className="text-[11px] text-muted-foreground">
                        Monthly: {tokenStatus.monthlyUsed}/{tokenStatus.monthlyLimit}
                      </div>
                    )}
                    <div className="mt-2">
                      <Link href="/plan">
                        <Button variant="outline" size="sm" className="w-full h-7 text-xs">
                          {isProOrHigher() ? 'Manage Plan' : 'Upgrade Plan'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
                <DropdownMenuItem>
                  <Link href="/profile" className="flex items-center w-full">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/settings" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/tokens" className="flex items-center w-full">
                    <Crown className="mr-2 h-4 w-4" />
                    Tokens
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/plan" className="flex items-center w-full">
                    <Crown className="mr-2 h-4 w-4" />
                    Plan
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  onClick={() => signOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
        {/* Global low-tokens banner */}
        {user && tokenStatus && lowToken && !lowTokenDismissed && (
          <div className="mt-2">
            <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Low on tokens</span>
                <span className="text-amber-900/80">
                  Month: {tokenStatus.monthlyRemaining} left
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/plan">
                  <Button size="sm" variant="outline" className="h-7">Manage</Button>
                </Link>
                <button aria-label="Dismiss" onClick={dismissLowTokenBanner} className="rounded p-1 hover:bg-amber-100">
                  <X className="h-4 w-4 text-amber-700" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
