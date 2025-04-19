"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Clock, Zap } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { trackEvent } from "@/lib/analytics"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SubscriptionPlans } from "@/components/premium/subscription-plans"

interface EnhancedUsageTrackerProps {
  feature: "aiPrompts" | "paperSummaries" | "mindMaps" | "storage"
  onLimitReached?: () => void
  showUpgradeButton?: boolean
}

export function EnhancedUsageTracker({ feature, onLimitReached, showUpgradeButton = true }: EnhancedUsageTrackerProps) {
  const { user, subscription } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Track component view
  useEffect(() => {
    if (user) {
      trackEvent("usage_tracker_viewed", user.id, { feature })
    }
  }, [user, feature])

  if (!user || !subscription) {
    return null
  }

  const featureData = subscription.features[feature]
  if (!featureData) return null

  // For features with usage limits
  if ("limit" in featureData && "used" in featureData) {
    const usagePercentage = Math.min(Math.round((featureData.used / featureData.limit) * 100), 100)
    const isNearLimit = usagePercentage >= 80
    const isAtLimit = featureData.used >= featureData.limit

    // Call the onLimitReached callback if we're at the limit
    if (isAtLimit && onLimitReached) {
      onLimitReached()
    }

    // Format feature name for display
    const featureDisplayName = {
      aiPrompts: "AI Prompts",
      paperSummaries: "Paper Summaries",
      mindMaps: "Mind Maps",
      storage: "Storage (MB)",
    }[feature]

    return (
      <Card className={`${isAtLimit ? "border-amber-200" : "border"}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{featureDisplayName} Usage</CardTitle>
          <CardDescription>
            {isAtLimit
              ? `You've reached your ${featureDisplayName.toLowerCase()} limit`
              : `${featureData.used} of ${featureData.limit === Number.POSITIVE_INFINITY ? "unlimited" : featureData.limit} used`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress
            value={usagePercentage}
            className={`h-2 ${isAtLimit ? "bg-amber-100" : "bg-muted"}`}
            indicatorClassName={isAtLimit ? "bg-amber-500" : isNearLimit ? "bg-amber-400" : undefined}
          />
          {isNearLimit && !isAtLimit && (
            <p className="text-xs text-amber-600 mt-2 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              You're approaching your limit
            </p>
          )}
        </CardContent>
        {(isNearLimit || isAtLimit) && showUpgradeButton && user.subscription !== "enterprise" && (
          <CardFooter>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className={`w-full ${
                    isAtLimit
                      ? "bg-gradient-to-r from-amber-500 to-orange-500"
                      : "bg-gradient-to-r from-blue-500 to-indigo-500"
                  } text-white`}
                  onClick={() => {
                    if (user) {
                      trackEvent("upgrade_button_clicked", user.id, {
                        feature,
                        context: "usage_tracker",
                        isAtLimit,
                      })
                    }
                  }}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Upgrade to {user.subscription === "free" ? "Basic" : "Premium"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Choose a Plan</DialogTitle>
                  <DialogDescription>Select the plan that best fits your research needs</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <SubscriptionPlans />
                </div>
              </DialogContent>
            </Dialog>
          </CardFooter>
        )}
      </Card>
    )
  }

  return null
}
