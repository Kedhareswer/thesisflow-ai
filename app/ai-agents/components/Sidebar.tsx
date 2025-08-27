"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot, PenLine, MessageSquare, BookOpen, Search, RefreshCcw, Quote, Database, ShieldCheck, Plus } from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { label: "AI Agent", href: "/ai-agents", id: "ai-agent", icon: Bot },
  { label: "AI Writer", href: "/writer", id: "ai-writer", icon: PenLine },
  { label: "Chat with PDF", href: "/chat-pdf", id: "chat-pdf", icon: MessageSquare },
  { label: "Literature Review", href: "/literature-review", id: "lit-review", icon: BookOpen },
  { label: "Find Topics", href: "/topics", id: "find-topics", icon: Search },
  { label: "Paraphraser", href: "/paraphraser", id: "paraphraser", icon: RefreshCcw },
  { label: "Citation Generator", href: "/citations", id: "citations", icon: Quote },
  { label: "Extract Data", href: "/extract", id: "extract", icon: Database },
  { label: "AI Detector", href: "/ai-detector", id: "ai-detector", icon: ShieldCheck },
]

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, isLoading } = useSupabaseAuth()

  return (
    <aside
      className={`sticky top-0 h-screen overflow-y-auto border-r border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center px-3 py-3">
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
          return (
            <Link key={item.id} href={item.href} className="block" title={item.label} aria-label={item.label}>
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
                {/* Label */}
                <span className={`${collapsed ? "hidden" : "block"}`}>{item.label}</span>
              </div>
            </Link>
          )
        })}
      </nav>

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
