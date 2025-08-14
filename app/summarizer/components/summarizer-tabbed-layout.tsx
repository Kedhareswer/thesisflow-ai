"use client"

import { useState, useCallback, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { FileText, BarChart3, Upload } from "lucide-react"

// Types for the tabbed layout
export type SummarizerTab = 'input' | 'summary' | 'analytics'

export interface SummarizerState {
  activeTab: SummarizerTab
  currentSummary: any | null
  summaryHistory: any[]
  inputData: any
  processingState: any
  userPreferences: any
}

export interface SummarizerTabbedLayoutProps {
  activeTab: SummarizerTab
  onTabChange: (tab: SummarizerTab) => void
  hasActiveSummary: boolean
  isProcessing: boolean
  children: {
    inputTab: React.ReactNode
    summaryTab: React.ReactNode
    analyticsTab: React.ReactNode
  }
  className?: string
}

export function SummarizerTabbedLayout({
  activeTab,
  onTabChange,
  hasActiveSummary,
  isProcessing,
  children,
  className
}: SummarizerTabbedLayoutProps) {
  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case '1':
          event.preventDefault()
          onTabChange('input')
          break
        case '2':
          event.preventDefault()
          if (hasActiveSummary || isProcessing) {
            onTabChange('summary')
          }
          break
        case '3':
          event.preventDefault()
          if (hasActiveSummary) {
            onTabChange('analytics')
          }
          break
      }
    }
  }, [onTabChange, hasActiveSummary, isProcessing])

  // Auto-switch to Summary tab when processing completes
  useEffect(() => {
    if (hasActiveSummary && !isProcessing && activeTab === 'input') {
      // Small delay to allow for smooth transition
      const timer = setTimeout(() => {
        onTabChange('summary')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [hasActiveSummary, isProcessing, activeTab, onTabChange])

  // Determine tab states
  const getTabState = (tab: SummarizerTab) => {
    switch (tab) {
      case 'input':
        return 'enabled' // Always enabled
      case 'summary':
        return hasActiveSummary || isProcessing ? 'enabled' : 'disabled'
      case 'analytics':
        return hasActiveSummary ? 'enabled' : 'disabled'
      default:
        return 'disabled'
    }
  }

  const getTabIcon = (tab: SummarizerTab) => {
    switch (tab) {
      case 'input':
        return Upload
      case 'summary':
        return FileText
      case 'analytics':
        return BarChart3
      default:
        return FileText
    }
  }

  const getTabLabel = (tab: SummarizerTab) => {
    switch (tab) {
      case 'input':
        return 'Input'
      case 'summary':
        return 'Summary'
      case 'analytics':
        return 'Analytics'
      default:
        return ''
    }
  }

  const getTabDescription = (tab: SummarizerTab) => {
    switch (tab) {
      case 'input':
        return 'Upload files, enter URLs, or paste text'
      case 'summary':
        return 'View generated summaries and statistics'
      case 'analytics':
        return 'Analyze content and view history'
      default:
        return ''
    }
  }

  return (
    <div 
      className={cn("w-full", className)}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => onTabChange(value as SummarizerTab)}
        className="w-full"
      >
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6">
            <TabsList className="grid w-full max-w-md grid-cols-3 bg-transparent p-0 h-auto border-0">
              {(['input', 'summary', 'analytics'] as const).map((tab) => {
                const Icon = getTabIcon(tab)
                const isDisabled = getTabState(tab) === 'disabled'
                const isActive = activeTab === tab
                const isProcessing = tab === 'summary' && isProcessing
                
                return (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    disabled={isDisabled}
                    className={cn(
                      // Base styles
                      "flex flex-col items-center justify-center px-4 py-4 text-sm font-light transition-all duration-200",
                      "border-b-2 border-transparent bg-transparent rounded-none",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
                      
                      // Hover states
                      "hover:bg-gray-50 hover:text-black",
                      
                      // Active states
                      isActive && [
                        "border-b-black text-black bg-white",
                        "data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-none"
                      ],
                      
                      // Disabled states
                      isDisabled && [
                        "opacity-50 cursor-not-allowed",
                        "hover:bg-transparent hover:text-gray-500"
                      ],
                      
                      // Processing states
                      isProcessing && "animate-pulse",
                      
                      // Default text color
                      !isActive && !isDisabled && "text-gray-600"
                    )}
                    aria-label={`${getTabLabel(tab)} tab - ${getTabDescription(tab)}`}
                    aria-describedby={`${tab}-tab-description`}
                  >
                    <Icon className={cn(
                      "h-5 w-5 mb-1 transition-colors",
                      isProcessing && "animate-pulse"
                    )} />
                    <span className="font-light tracking-wide">
                      {getTabLabel(tab)}
                    </span>
                    
                    {/* Processing indicator */}
                    {isProcessing && (
                      <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                    
                    {/* Hidden description for screen readers */}
                    <span 
                      id={`${tab}-tab-description`}
                      className="sr-only"
                    >
                      {getTabDescription(tab)}
                    </span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>
        </div>

        {/* Tab Content */}
        <div className="w-full">
          <TabsContent 
            value="input" 
            className="mt-0 focus-visible:outline-none focus-visible:ring-0"
            tabIndex={-1}
          >
            <div 
              role="tabpanel"
              aria-labelledby="input-tab"
              className="w-full"
            >
              {children.inputTab}
            </div>
          </TabsContent>

          <TabsContent 
            value="summary" 
            className="mt-0 focus-visible:outline-none focus-visible:ring-0"
            tabIndex={-1}
          >
            <div 
              role="tabpanel"
              aria-labelledby="summary-tab"
              className="w-full"
            >
              {children.summaryTab}
            </div>
          </TabsContent>

          <TabsContent 
            value="analytics" 
            className="mt-0 focus-visible:outline-none focus-visible:ring-0"
            tabIndex={-1}
          >
            <div 
              role="tabpanel"
              aria-labelledby="analytics-tab"
              className="w-full"
            >
              {children.analyticsTab}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Keyboard shortcuts hint */}
      <div className="sr-only" aria-live="polite">
        Use Ctrl+1, Ctrl+2, Ctrl+3 to navigate between tabs
      </div>
    </div>
  )
}

// Hook for managing tabbed layout state
export function useSummarizerTabs(initialTab: SummarizerTab = 'input') {
  const [activeTab, setActiveTab] = useState<SummarizerTab>(initialTab)
  const [hasActiveSummary, setHasActiveSummary] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleTabChange = useCallback((tab: SummarizerTab) => {
    // Prevent navigation to disabled tabs
    if (tab === 'summary' && !hasActiveSummary && !isProcessing) {
      return
    }
    if (tab === 'analytics' && !hasActiveSummary) {
      return
    }
    
    setActiveTab(tab)
  }, [hasActiveSummary, isProcessing])

  const resetTabs = useCallback(() => {
    setActiveTab('input')
    setHasActiveSummary(false)
    setIsProcessing(false)
  }, [])

  const startProcessing = useCallback(() => {
    setIsProcessing(true)
    setActiveTab('summary') // Auto-switch to summary tab when processing starts
  }, [])

  const completeProcessing = useCallback((hasResult: boolean) => {
    setIsProcessing(false)
    setHasActiveSummary(hasResult)
    if (hasResult) {
      setActiveTab('summary') // Stay on summary tab when complete
    }
  }, [])

  return {
    activeTab,
    hasActiveSummary,
    isProcessing,
    handleTabChange,
    resetTabs,
    startProcessing,
    completeProcessing,
    setHasActiveSummary,
    setIsProcessing
  }
}