/**
 * Simple Sidebar component for Extract Data v2
 * Phase 0: Basic collapsible sidebar
 */

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-200 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <div className="text-lg font-semibold text-gray-900">
            AI Planner
          </div>
        )}
        <button
          onClick={onToggle}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
      
      {!collapsed && (
        <nav className="px-4 py-4">
          <div className="space-y-2">
            <a
              href="/"
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Home
            </a>
            <a
              href="/extract"
              className="block rounded-md px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50"
            >
              Extract Data
            </a>
            <a
              href="/extract-v2"
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Extract Data v2
            </a>
          </div>
        </nav>
      )}
    </div>
  )
}
