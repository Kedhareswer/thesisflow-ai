"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot, PenLine, MessageSquare, BookOpen, Search, RefreshCcw, Quote, Database, ShieldCheck, Plus, Clock, Trash2, Lightbulb, ArrowUpRight, Calendar, Users, User, Settings, LogOut, Crown, Home } from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { useAIChat } from "@/lib/hooks/use-ai-chat"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

// External destination for QuantumPDF ChatApp
const QUANTUM_PDF_URL = (process.env.NEXT_PUBLIC_QUANTUM_PDF_URL as string) || "https://quantumn-pdf-chatapp.netlify.app/"

// Lazy load the notification bell to avoid heavy initial render
const NotificationBell = React.lazy(() => import("@/app/collaborate/components/notification-bell"))

const navItems = [
  { label: "Thesis Flow", href: "/", id: "home", icon: Home },
  { label: "AI Agent", href: "/ai-agents", id: "ai-agent", icon: Bot },
  { label: "Explorer", href: "/explorer", id: "explorer", icon: Lightbulb },
  { label: "AI Writer", href: "/writer", id: "ai-writer", icon: PenLine },
  { label: "Chat with PDF", href: "/chat-pdf", id: "chat-pdf", icon: MessageSquare, external: true, externalHref: QUANTUM_PDF_URL },
  { label: "Literature Review", href: "/literature-review", id: "lit-review", icon: BookOpen },
  { label: "Find Topics", href: "/topics", id: "find-topics", icon: Search },
  { label: "Planner", href: "/planner", id: "planner", icon: Calendar },
  { label: "Collaborate", href: "/collaborate", id: "collaborate", icon: Users },
  { label: "Paraphraser", href: "/paraphraser", id: "paraphraser", icon: RefreshCcw },
  { label: "Citation Generator", href: "/citations", id: "citations", icon: Quote },
  { label: "Extract Data", href: "/extract", id: "extract", icon: Database },
  { label: "AI Detector", href: "/ai-detector", id: "ai-detector", icon: ShieldCheck },
]

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, isLoading, signOut } = useSupabaseAuth()
  const { sessions, clearAllSessions } = useAIChat()
  
  // Get recent chats (max 5, most recent first)
  const recentChats = sessions.slice(0, 5)
  
  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
      clearAllSessions()
    }
  }

  // Simple avatar used in profile dropdown
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

  return (
    <aside
      className={`sticky top-0 h-screen overflow-y-auto border-r border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header row with brand + toggle */}
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-orange-400 to-orange-600 text-[11px] font-bold text-white">
          T
        </div>
        {!collapsed && <span className="text-sm font-semibold text-gray-900">ThesisFlow-AI</span>}
        <button
          aria-label="Toggle sidebar"
          onClick={onToggle}
          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {/* Chevron */}
          <svg
            className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="px-3 pb-3">
        {collapsed ? (
          <button
            aria-label="New Chat"
            title="New Chat"
            className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-orange-500 text-white shadow hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : (
          <button className="w-full rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow hover:bg-orange-600">
            + New Chat
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="px-1">
        {navItems.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          const content = (
            <div
              className={`relative mx-2 my-0.5 flex items-center rounded-md py-2 text-sm transition-colors ${
                active ? "text-orange-600 bg-orange-50" : "text-gray-700 hover:bg-gray-50"
              } ${collapsed ? "justify-center" : "gap-3 px-2"}`}
            >
              {/* Left rail only when expanded */}
              {!collapsed && (
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 rounded-sm ${active ? "w-1 bg-orange-500" : "w-0"}`}
                />
              )}
              {/* Icon */}
              <Icon className={`h-4 w-4 ${active ? "text-orange-600" : "text-gray-500"}`} />
              {/* Label + external arrow for Chat with PDF */}
              {!collapsed && (
                <span className="flex items-center gap-1">
                  {item.label}
                  {item.id === "chat-pdf" && (
                    <ArrowUpRight className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                  )}
                </span>
              )}
            </div>
          )

          if ((item as any).external && (item as any).externalHref && item.id === "chat-pdf") {
            return (
              <a
                key={item.id}
                href={(item as any).externalHref}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
                title={`${item.label} – opens in new tab`}
                aria-label={`${item.label} (external)`}
              >
                {content}
              </a>
            )
          }

          return (
            <Link key={item.id} href={item.href} className="block" title={item.label} aria-label={item.label}>
              {content}
            </Link>
          )
        })}
      </nav>

      {/* Recent Chats Section */}
      {recentChats.length > 0 && (
        <div className="mt-4 px-1">
          {/* Section Header */}
          {!collapsed && (
            <div className="mx-2 mb-2 flex items-center justify-between px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Recent Chats
              </div>
              {recentChats.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors normal-case"
                  title="Clear all chat history"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          )}
          
          {/* Chat List */}
          <div className="space-y-0.5">
            {recentChats.map((chat) => {
              const isCurrentChat = pathname.includes(`/ai-agents/chat/${chat.id}`)
              const timeAgo = new Date().getTime() - chat.updatedAt.getTime() < 3600000 
                ? `${Math.floor((new Date().getTime() - chat.updatedAt.getTime()) / 60000)}m ago`
                : `${Math.floor((new Date().getTime() - chat.updatedAt.getTime()) / 3600000)}h ago`
              
              return (
                <Link 
                  key={chat.id} 
                  href={`/ai-agents/chat/${chat.id}`} 
                  className="block" 
                  title={collapsed ? chat.title : `${chat.title} • ${timeAgo}`}
                >
                  <div
                    className={`relative mx-2 flex items-center rounded-md py-2 text-sm transition-colors ${
                      isCurrentChat ? "text-orange-600 bg-orange-50" : "text-gray-600 hover:bg-gray-50"
                    } ${collapsed ? "justify-center" : "gap-3 px-2"}`}
                  >
                    {/* Left rail only when expanded */}
                    {!collapsed && (
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 rounded-sm ${isCurrentChat ? "w-1 bg-orange-500" : "w-0"}`}
                      />
                    )}
                    
                    {/* Chat Icon */}
                    <MessageSquare className={`h-4 w-4 flex-shrink-0 ${isCurrentChat ? "text-orange-600" : "text-gray-400"}`} />
                    
                    {/* Chat Details */}
                    {!collapsed && (
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{chat.title}</div>
                        <div className="text-xs text-gray-400">{timeAgo}</div>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom card - show only when not collapsed AND unauthenticated */}
      {!collapsed && !isLoading && !user && (
        <div className="mt-4 px-3 pb-6">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm text-yellow-800">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <span>Tip: Save tasks to reuse later.</span>
            </div>
            <div className="flex gap-2">
              <Link href="/login" className="flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-center text-xs font-medium text-gray-700 hover:bg-gray-50">Login</Link>
              <Link href="/signup" className="flex-1 rounded-md bg-orange-500 px-2 py-1.5 text-center text-xs font-medium text-white hover:bg-orange-600">Sign up</Link>
            </div>
          </div>
        </div>
      )}

      {/* Authenticated footer: Notification bell + Profile menu */}
      {user && !isLoading && (
        <div className="sticky bottom-0 mt-3 border-t bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 px-2 py-3">
          <div className={collapsed ? "flex flex-col items-center gap-2" : "flex items-center justify-between gap-2"}>
            <React.Suspense fallback={<Button variant="ghost" size="icon" disabled><div className="h-5 w-5" /></Button>}>
              <NotificationBell />
            </React.Suspense>

            <DropdownMenu
              trigger={
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-gray-100">
                  <SimpleAvatar size="sm" />
                </Button>
              }
              className="w-56 right-0"
              side="top"
              align="end"
              sideOffset={8}
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
          </div>
        </div>
      )}
    </aside>
  )
}
