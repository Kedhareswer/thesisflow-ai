"use client"

import React from "react"
import Sidebar from "../ai-agents/components/Sidebar"

export default function CitationsPage() {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Citation Generator</h1>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-gray-600">
              Generate accurate citations in various formats with ThesisFlow-AI.
            </p>
          </div>
          
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Citation Generator - Coming Soon</h3>
              <p className="mt-2 text-sm text-gray-500">Generate citations in APA, MLA, Chicago, and other formats.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
