"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSupabaseAuth } from "./supabase-auth-provider"

export default function MainNav() {
  const pathname = usePathname()

  return (
    <header className="bg-background border-b">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="font-bold text-xl">
          ResearchBolt
        </Link>
        <nav className="ml-8 flex items-center space-x-6">
          <Link
            href="/dashboard"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/explorer"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/explorer" ? "text-primary" : "text-muted-foreground"
            )}
          >
            Research Explorer
          </Link>
          <Link
            href="/collaborate"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/collaborate" ? "text-primary" : "text-muted-foreground"
            )}
          >
            Collaborate
          </Link>
          <Link
            href="/summarizer"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/summarizer" ? "text-primary" : "text-muted-foreground"
            )}
          >
            Summarization
          </Link>
          <Link
            href="/ideas"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/ideas" ? "text-primary" : "text-muted-foreground"
            )}
          >
            Ideas
          </Link>
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
