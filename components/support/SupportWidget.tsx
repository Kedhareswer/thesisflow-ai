"use client"

import { useState, useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

// Lazy load the panel to avoid affecting LCP
const SupportPanel = dynamic(() => import('@/components/support/SupportPanel'), {
  ssr: false,
  loading: () => <div className="w-96 h-96 bg-white rounded-lg shadow-xl animate-pulse" />
}) as any

interface SupportWidgetProps {
  className?: string
}

export default function SupportWidget({ className }: SupportWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [prefillMessage, setPrefillMessage] = useState('')

  // Check for deep-link parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const shouldOpen = urlParams.get('support') === 'open'
    const prefill = urlParams.get('prefill') || ''

    if (shouldOpen) {
      setIsOpen(true)
      setPrefillMessage(prefill)
      // Clean up URL without page reload
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('support')
      newUrl.searchParams.delete('prefill')
      window.history.replaceState({}, '', newUrl.toString())
    }

    // Check for broadcasts or unread messages
    checkForUnreadContent()
  }, [])

  const checkForUnreadContent = () => {
    // Check localStorage for dismissed broadcasts and unread messages
    const dismissedBroadcasts = JSON.parse(localStorage.getItem('support:dismissed-broadcasts') || '[]')
    const lastVisit = localStorage.getItem('support:last-visit')
    
    // Simple logic: show unread dot if there are new broadcasts or it's been a while
    const now = Date.now()
    const lastVisitTime = lastVisit ? parseInt(lastVisit) : 0
    const daysSinceLastVisit = (now - lastVisitTime) / (1000 * 60 * 60 * 24)
    
    setHasUnread(daysSinceLastVisit > 7) // Show unread if more than a week
  }

  const handleOpen = () => {
    setIsOpen(true)
    setHasUnread(false)
    localStorage.setItem('support:last-visit', Date.now().toString())
    
    // Analytics event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'support_open', {
        event_category: 'support',
        event_label: 'widget_bubble'
      })
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    
    // Analytics event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'support_close', {
        event_category: 'support',
        event_label: 'widget_panel'
      })
    }
  }

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <>
      {/* Support Bubble (FAB) */}
      <div className={cn(
        "fixed bottom-6 right-6 z-50",
        className
      )}>
        <Button
          onClick={handleOpen}
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
            "bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B2C] focus-visible:ring-offset-2",
            isOpen && "scale-0 opacity-0"
          )}
          aria-label="Open support chat"
        >
          <MessageCircle className="h-6 w-6" />
          {hasUnread && (
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-white" />
          )}
        </Button>
      </div>

      {/* Support Panel */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={handleClose}
          />
          
          {/* Panel */}
          <div className={cn(
            "fixed z-50 transition-all duration-300",
            // Mobile: bottom sheet
            "bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto",
            // Desktop: positioned panel
            "md:w-96 md:max-h-[600px]",
            // Animation
            "animate-in slide-in-from-bottom-4 md:slide-in-from-right-4"
          )}>
            <div className="bg-white rounded-t-lg md:rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
              {/* Close button for mobile */}
              <div className="md:hidden flex justify-end p-2 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <SupportPanel 
                onClose={handleClose}
                prefillMessage={prefillMessage}
                onClearPrefill={() => setPrefillMessage('')}
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}
