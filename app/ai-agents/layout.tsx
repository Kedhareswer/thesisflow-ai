"use client"

import React from "react"
import Sidebar from "@/app/ai-agents/components/Sidebar"

export default function AIAgentsLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] overscroll-contain">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className={`flex-1 flex flex-col`}>
        {/* Header + Main + Footer will be within the page component */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
