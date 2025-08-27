"use client"

import { Suspense, useState } from "react"
import SearchBox from "./components/SearchBox"
import Sidebar from "./components/Sidebar"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import type { SelectionState } from "./components/SearchBox"

export default function ClientAIAgentsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [selection, setSelection] = useState<SelectionState>({
    want: "",
    use: [],
    make: []
  })

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Agents
        </h1>
        <p className="text-lg text-gray-600">
          Powerful AI agents to streamline your research workflow and boost productivity
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Suspense fallback={<LoadingSpinner />}>
            <Sidebar 
              collapsed={sidebarCollapsed} 
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
            />
          </Suspense>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <Suspense fallback={<LoadingSpinner />}>
              <SearchBox 
                selection={selection}
                setSelection={setSelection}
                value={searchValue}
                setValue={setSearchValue}
              />
            </Suspense>
          </div>
          
          {/* Welcome Content */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014.846 21H9.154a3.374 3.374 0 00-2.53-1.103l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 ml-3">Research Assistant</h3>
              </div>
              <p className="text-gray-700 text-sm">
                Get intelligent help with literature reviews, data analysis, and research methodology guidance.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 ml-3">Writing Coach</h3>
              </div>
              <p className="text-gray-700 text-sm">
                Improve your academic writing with suggestions for clarity, structure, and scholarly tone.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-100 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 ml-3">Data Analyst</h3>
              </div>
              <p className="text-gray-700 text-sm">
                Analyze datasets, generate insights, and create visualizations for your research projects.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
