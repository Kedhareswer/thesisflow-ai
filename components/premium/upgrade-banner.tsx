"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Zap, X } from "lucide-react"
import { useAuth } from "@/lib/auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SubscriptionPlans } from "@/components/premium/subscription-plans"

interface UpgradeBannerProps {
  feature?: "aiPrompts" | "paperSummaries" | "mindMaps" | "storage"
  showCloseButton?: boolean
}

export function UpgradeBanner({ feature, showCloseButton = true }: UpgradeBannerProps) {
  const { user, subscription } = useAuth()
  const [isVisible, setIsVisible] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  if (!isVisible || user?.subscription === "enterprise") {
    return null
  }

  // If no specific feature is provided, show a general upgrade banner
  if (!feature) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Zap className="h-5 w-5 text-blue-500 mr-2" />
            <p className="text-sm font-medium">
              Upgrade to Premium for unlimited AI prompts, more storage, and advanced features.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  Upgrade Now
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
            {showCloseButton && (
              <Button variant="ghost" size="icon" onClick={() => setIsVisible(false)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Feature-specific upgrade banner
  if (!subscription) return null

  const featureData = subscription.features[feature]
  if (!featureData) return null

  // For features with usage limits
  if ("limit" in featureData && "used" in featureData) {
    const usagePercentage = Math.min(Math.round((featureData.used / featureData.limit) * 100), 100)
    const isNearLimit = usagePercentage >= 80
    const isAtLimit = featureData.used >= featureData.limit

    if (!isNearLimit && !isAtLimit) return null

    return (
      <Card className={`${isAtLimit ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"}`}>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center">
              <Zap className={`h-5 w-5 ${isAtLimit ? "text-amber-500" : "text-blue-500"} mr-2`} />
              <p className="text-sm font-medium">
                {isAtLimit
                  ? `You've reached your ${feature} limit for the ${user?.subscription} plan.`
                  : `You're using ${featureData.used} of ${featureData.limit} ${feature}.`}
              </p>
            </div>
            <div className="mt-2 w-full max-w-xs">
              <Progress value={usagePercentage} className="h-2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className={`${
                    isAtLimit
                      ? "bg-gradient-to-r from-amber-500 to-orange-500"
                      : "bg-gradient-to-r from-blue-500 to-indigo-500"
                  } text-white`}
                >
                  Upgrade Now
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
            {showCloseButton && (
              <Button variant="ghost" size="icon" onClick={() => setIsVisible(false)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
