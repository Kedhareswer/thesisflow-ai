"use client"

import React from "react"
import Sidebar from "../ai-agents/components/Sidebar"

export default function FindTopicsPage() {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Find Topics</h1>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-gray-600">
              Discover trending research topics and areas of interest using ThesisFlow-AI.
            </p>
          </div>
          
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-8.515 8.515a2.003 2.003 0 01-2.828 0L1.172 21.172a2 2 0 010-2.828L9.687 9.829a2.003 2.003 0 012.828 0L21 18.343M15 15l6 6m-6-6v6m6-6h-6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Find Topics - Coming Soon</h3>
              <p className="mt-2 text-sm text-gray-500">Explore trending research topics and discover new areas of interest.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
