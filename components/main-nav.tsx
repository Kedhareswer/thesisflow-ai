"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Search, FileText, Bot, Calendar, Users, Settings, User, LogOut, PenLine, Crown, Menu } from "lucide-react"
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

  useEffect(() => {
    setMounted(true)
  }, [])

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
            <span className="text-lg font-semibold text-black">Flow AI</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {user && !isLoading ? (
              navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
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
                )
              })
            ) : (
              // Show limited navigation for unauthenticated users
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Sign in to access research tools</span>
              </div>
            )}
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
                  {user && !isLoading ? (
                    navigation.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                            isActive ? "bg-gray-100 text-black" : "text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {item.name}
                        </Link>
                      )
                    })
                  ) : (
                    <>
                      <Link href="/login" className="px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100">Sign In</Link>
                      <Link href="/signup" className="px-3 py-2 text-sm font-medium text-white bg-black rounded-md">Sign Up</Link>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user && !isLoading ? (
              <>
                {/* Notification Bell */}
                <Suspense fallback={<Button variant="ghost" size="icon" disabled><div className="h-5 w-5" /></Button>}>
                  <NotificationBell />
                </Suspense>
                
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
      </div>
    </header>
  )
}
