"use client"

import React from "react"
import Sidebar from "../ai-agents/components/Sidebar"

export default function ExtractDataPage() {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Extract Data</h1>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-gray-600">
              Extract structured data from documents and research papers with ThesisFlow-AI.
            </p>
          </div>
          
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v6a2 2 0 002 2h6m-8-8L5 21l4 4m6-10h8a2 2 0 012 2v8a2 2 0 01-2 2h-8m0-12V9a2 2 0 012-2h8a2 2 0 012 2v8" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Extract Data - Coming Soon</h3>
              <p className="mt-2 text-sm text-gray-500">Extract structured data and insights from research documents.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
