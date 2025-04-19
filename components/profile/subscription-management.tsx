"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { type SubscriptionTier, useAuth } from "@/lib/auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SubscriptionPlans } from "@/components/premium/subscription-plans"
import { AlertCircle, Calendar, CreditCard, Loader2, Zap } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function SubscriptionManagement() {
  const { user, subscription } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [autoRenew, setAutoRenew] = useState(subscription?.autoRenew || false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  const handleAutoRenewToggle = async (checked: boolean) => {
    setIsLoading(true)

    try {
      // In a real app, this would call an API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setAutoRenew(checked)

      toast({
        title: checked ? "Auto-renewal enabled" : "Auto-renewal disabled",
        description: checked
          ? "Your subscription will automatically renew at the end of the billing period."
          : "Your subscription will not renew automatically.",
      })
    } catch (error) {
      console.error("Error updating auto-renewal:", error)
      toast({
        title: "Error",
        description: "There was a problem updating your auto-renewal settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    setIsLoading(true)

    try {
      // In a real app, this would call an API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Subscription cancelled",
        description:
          "Your subscription has been cancelled. You will still have access to premium features until the end of your billing period.",
      })
    } catch (error) {
      console.error("Error cancelling subscription:", error)
      toast({
        title: "Error",
        description: "There was a problem cancelling your subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Format subscription tier for display
  const formatTier = (tier: SubscriptionTier) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1)
  }

  // Get subscription badge color
  const getSubscriptionBadgeColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case "free":
        return "bg-gray-100 text-gray-800"
      case "basic":
        return "bg-blue-100 text-blue-800"
      case "premium":
        return "bg-purple-100 text-purple-800"
      case "enterprise":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (!user || !subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Loading your subscription details...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>Manage your subscription plan and billing</CardDescription>
            </div>
            <Badge className={getSubscriptionBadgeColor(user.subscription)}>{formatTier(user.subscription)} Plan</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Plan</h3>
              <p className="text-sm">{formatTier(user.subscription)}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Price</h3>
              <p className="text-sm">{subscription.price === 0 ? "Free" : `$${subscription.price.toFixed(2)}/month`}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Billing Period</h3>
              <p className="text-sm">
                {subscription.startDate
                  ? `${new Date(subscription.startDate).toLocaleDateString()} - ${
                      subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : "Ongoing"
                    }`
                  : "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Next Billing Date</h3>
              <p className="text-sm">
                {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>

          {user.subscription !== "free" && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="auto-renew">Auto-renew subscription</Label>
                <p className="text-sm text-muted-foreground">
                  Your subscription will automatically renew at the end of each billing period
                </p>
              </div>
              <Switch
                id="auto-renew"
                checked={autoRenew}
                onCheckedChange={handleAutoRenewToggle}
                disabled={isLoading}
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Change Plan</Button>
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

          {user.subscription !== "free" && (
            <Button variant="outline" onClick={handleCancelSubscription} disabled={isLoading}>
              {isLoading ? "Processing..." : "Cancel Subscription"}
            </Button>
          )}
        </CardFooter>
      </Card>

      {user.subscription !== "free" && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Manage your payment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="bg-muted p-2 rounded-md">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Visa ending in 4242</p>
                <p className="text-sm text-muted-foreground">Expires 12/2025</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-muted p-2 rounded-md">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Billing Address</p>
                <p className="text-sm text-muted-foreground">123 Research St, Academic City, AC 12345</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline">Update Payment Method</Button>
          </CardFooter>
        </Card>
      )}

      {user.subscription === "free" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Free Plan Limitations</AlertTitle>
          <AlertDescription>
            You're currently on the Free plan, which has limited features. Upgrade to access more AI prompts, paper
            summaries, and collaboration tools.
          </AlertDescription>
          <div className="mt-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  <Zap className="mr-2 h-4 w-4" />
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
          </div>
        </Alert>
      )}
    </div>
  )
}
