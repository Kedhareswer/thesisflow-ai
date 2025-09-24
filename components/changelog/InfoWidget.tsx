"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, MessageCircle, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import changelogData from '@/data/changelog.json'

interface ChangelogEntry {
  version: string
  title: string
  date: string
  description: string
  items: string[]
  button?: {
    url: string
    text: string
  }
  image?: string
}

interface InfoWidgetProps {
  className?: string
}

export default function InfoWidget({ className }: InfoWidgetProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [latestEntry, setLatestEntry] = useState<ChangelogEntry | null>(null)

  useEffect(() => {
    // Get the latest changelog entry
    const entries = changelogData as ChangelogEntry[]
    if (entries && entries.length > 0) {
      setLatestEntry(entries[0])
    }

    // Check if user has dismissed this version
    const dismissedVersion = localStorage.getItem('changelog:dismissed-version')
    if (dismissedVersion === entries[0]?.version) {
      setIsVisible(false)
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    if (latestEntry) {
      localStorage.setItem('changelog:dismissed-version', latestEntry.version)
    }
  }

  const handleAskSupport = () => {
    const supportUrl = `/?support=open&prefill=${encodeURIComponent(`Tell me what's new in ${latestEntry?.version}`)}`
    window.open(supportUrl, '_blank')
    
    // Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'changelog_support_cta', {
        event_category: 'changelog',
        event_label: latestEntry?.version
      })
    }
  }

  if (!isVisible || !latestEntry) {
    return null
  }

  // Get highlights from the latest entry
  const highlights = latestEntry.items.slice(0, 3)

  return (
    <div className={cn(
      "mx-auto max-w-5xl w-full mb-8",
      className
    )}>
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#FF6B2C]/10 via-orange-50 to-amber-50 border border-orange-200 p-6">
        {/* Dismiss button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="absolute top-4 right-4 h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF6B2C]/20">
              <Sparkles className="h-6 w-6 text-[#FF6B2C]" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-[#FF6B2C]/10 text-[#FF6B2C] border-[#FF6B2C]/20">
                New Release
              </Badge>
              <span className="text-sm font-medium text-gray-900">
                {latestEntry.version}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {latestEntry.title}
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              {latestEntry.description}
            </p>

            {/* Highlights */}
            {highlights.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Key Updates
                </div>
                <ul className="space-y-1">
                  {highlights.map((highlight: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="flex-shrink-0 w-1.5 h-1.5 bg-[#FF6B2C] rounded-full mt-2" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleAskSupport}
                size="sm"
                className="bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 text-white"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Ask Support about this release
              </Button>
              
              <Link href="/changelog">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto border-gray-300 hover:bg-gray-50"
                >
                  View full changelog
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-[#FF6B2C]/20 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-16 h-16 bg-gradient-to-tr from-amber-200/30 to-transparent rounded-full blur-xl" />
      </div>
    </div>
  )
}
