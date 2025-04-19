"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Clock, Zap } from "lucide-react"

interface UsageTrackerProps {
  limit?: number
  onLimitReached?: () => void
}

export function UsageTracker({ limit = 10, onLimitReached }: UsageTrackerProps) {
  const [usageData, setUsageData] = useState({
    promptsUsed: 0,
    promptsLimit: limit,
    resetDate: new Date(),
    isPremium: false,
  })

  const [showAlert, setShowAlert] = useState(false)

  // Load usage data from localStorage on component mount
  useEffect(() => {
    const savedUsage = localStorage.getItem("ai-usage-data")
    if (savedUsage) {
      try {
        const parsedUsage = JSON.parse(savedUsage)

        // Check if we need to reset the counter (new day)
        const lastResetDate = new Date(parsedUsage.resetDate)
        const today = new Date()

        if (lastResetDate.toDateString() !== today.toDateString()) {
          // It's a new day, reset the counter
          const newUsageData = {
            ...parsedUsage,
            promptsUsed: 0,
            resetDate: today.toISOString(),
          }
          setUsageData(newUsageData)
          localStorage.setItem("ai-usage-data", JSON.stringify(newUsageData))
        } else {
          // Same day, use the saved data
          setUsageData({
            ...parsedUsage,
            resetDate: new Date(parsedUsage.resetDate),
          })
        }
      } catch (error) {
        console.error("Failed to parse usage data:", error)
        initializeUsageData()
      }
    } else {
      initializeUsageData()
    }
  }, [limit])

  const initializeUsageData = () => {
    const newUsageData = {
      promptsUsed: 0,
      promptsLimit: limit,
      resetDate: new Date().toISOString(),
      isPremium: false,
    }
    setUsageData({
      ...newUsageData,
      resetDate: new Date(newUsageData.resetDate),
    })
    localStorage.setItem("ai-usage-data", JSON.stringify(newUsageData))
  }

  // Function to increment the usage counter
  const incrementUsage = () => {
    if (usageData.promptsUsed >= usageData.promptsLimit && !usageData.isPremium) {
      setShowAlert(true)
      if (onLimitReached) {
        onLimitReached()
      }
      return false
    }

    const newUsageData = {
      ...usageData,
      promptsUsed: usageData.promptsUsed + 1,
    }

    setUsageData(newUsageData)
    localStorage.setItem(
      "ai-usage-data",
      JSON.stringify({
        ...newUsageData,
        resetDate: newUsageData.resetDate.toISOString(),
      }),
    )

    // Check if we just reached the limit
    if (newUsageData.promptsUsed === newUsageData.promptsLimit && !usageData.isPremium) {
      setShowAlert(true)
      if (onLimitReached) {
        onLimitReached()
      }
    }

    return true
  }

  // Calculate percentage used
  const percentageUsed = Math.min(Math.round((usageData.promptsUsed / usageData.promptsLimit) * 100), 100)

  // Format reset date
  const formattedResetDate = usageData.resetDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  // Make the incrementUsage function available globally
  React.useEffect(() => {
    // @ts-ignore
    window.incrementAIUsage = incrementUsage

    return () => {
      // @ts-ignore
      delete window.incrementAIUsage
    }
  }, [usageData])

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">AI Usage</CardTitle>
            {usageData.isPremium && (
              <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                <Zap className="h-3 w-3 mr-1" />
                Premium
              </div>
            )}
          </div>
          <CardDescription>
            {usageData.isPremium
              ? "Unlimited AI prompts available"
              : `${usageData.promptsUsed} of ${usageData.promptsLimit} prompts used today`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!usageData.isPremium && (
            <>
              <Progress value={percentageUsed} className="h-2" />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{usageData.promptsUsed} used</span>
                <span>{usageData.promptsLimit - usageData.promptsUsed} remaining</span>
              </div>
              <div className="flex items-center mt-3 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                <span>Resets at midnight (currently {formattedResetDate})</span>
              </div>
            </>
          )}
        </CardContent>
        {!usageData.isPremium && (
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full">
              Upgrade to Premium
            </Button>
          </CardFooter>
        )}
      </Card>

      {showAlert && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
          <h4 className="font-medium mb-1">Usage Limit Reached</h4>
          <p className="text-sm">
            You've used all your free AI prompts for today. Upgrade to premium for unlimited access or wait until
            tomorrow.
          </p>
          <Button size="sm" className="mt-2">
            <Zap className="mr-2 h-4 w-4" />
            Upgrade Now
          </Button>
        </div>
      )}
    </>
  )
}
