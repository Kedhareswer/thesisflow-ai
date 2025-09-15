"use client"

import React from "react"
import Sidebar from "../ai-agents/components/Sidebar"

export default function ChatPDFPage() {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Chat with PDF</h1>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-gray-600">
              Upload and chat with your PDF documents using ThesisFlow-AI.
            </p>
          </div>
          
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Chat with PDF - Coming Soon</h3>
              <p className="mt-2 text-sm text-gray-500">Upload your PDF documents and ask questions about their content.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
