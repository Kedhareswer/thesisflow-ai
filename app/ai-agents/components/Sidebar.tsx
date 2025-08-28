"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot, PenLine, MessageSquare, BookOpen, Search, RefreshCcw, Quote, Database, ShieldCheck, Plus, Clock, Trash2, Lightbulb, ArrowUpRight, Calendar, Users } from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { useAIChat } from "@/lib/hooks/use-ai-chat"

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

// External destination for QuantumPDF ChatApp
const QUANTUM_PDF_URL = (process.env.NEXT_PUBLIC_QUANTUM_PDF_URL as string) || "https://quantumn-pdf-chatapp.netlify.app/"

const navItems = [
  { label: "AI Agent", href: "/ai-agents", id: "ai-agent", icon: Bot },
  { label: "Research Suggestions", href: "/ai-assistant", id: "research-suggestions", icon: Lightbulb },
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
  const { user, isLoading } = useSupabaseAuth()
  const { sessions, clearAllSessions } = useAIChat()
  
  // Get recent chats (max 5, most recent first)
  const recentChats = sessions.slice(0, 5)
  
  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
      clearAllSessions()
    }
  }

  return (
    <aside
      className={`sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 transition-all duration-300 ${
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
    </aside>
  )
}
