"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Crown, Zap, Users, FileText, Search, Sparkles, CheckCircle, XCircle, ArrowRight, Star, PhoneCall, Loader2, CreditCard, Settings, BarChart3 } from "lucide-react"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useToast } from "@/hooks/use-toast"
import { RouteGuard } from "@/components/route-guard"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { loadStripe } from "@stripe/stripe-js"
import { BackBreadcrumb } from "@/components/ui/back-breadcrumb"
import { TokenOverviewCards } from "@/components/analytics/token-overview-cards"
import { UsageAnalyticsV2 } from "@/components/analytics/usage-analytics-v2"
import { TopEntitiesTable } from "@/components/analytics/top-entities-table"

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

export default function PlanPage() {
  const { planData, loading, getPlanType, getUsageForFeature, isProOrHigher, tokenStatus } = useUserPlan()
  const { toast } = useToast()
  const { session } = useSupabaseAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [processingCheckout, setProcessingCheckout] = useState(false)
  const [processingPortal, setProcessingPortal] = useState(false)
  const [activeTab, setActiveTab] = useState("subscription")

  // Handle success/cancel returns from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated. Thank you for upgrading!",
      })
      // Clear the URL params
      router.replace('/plan')
    } else if (searchParams.get('canceled') === 'true') {
      toast({
        title: "Payment Canceled",
        description: "Your upgrade was canceled. You can try again anytime.",
        variant: "destructive"
      })
      router.replace('/plan')
    } else if (searchParams.get('portal') === 'true') {
      toast({
        title: "Subscription Updated",
        description: "Your subscription changes have been saved.",
      })
      router.replace('/plan')
    }
  }, [searchParams, toast, router])

  const planType = getPlanType()
  const planConfig = {
    free: {
      name: "Free",
      icon: <Zap className="h-6 w-6" />,
      color: "bg-blue-500",
      description: "Limited access to core features",
      price: "$0",
      period: "forever"
    },
    pro: {
      name: "Pro",
      icon: <Crown className="h-6 w-6" />,
      color: "bg-purple-500",
      description: "Enhanced features with higher limits",
      price: "$29",
      period: "month"
    }
  }

  const config = planConfig[planType as keyof typeof planConfig] || planConfig.free

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'literature_searches':
        return <Search className="h-4 w-4" />
      case 'document_summaries':
        return <FileText className="h-4 w-4" />
      case 'team_members':
        return <Users className="h-4 w-4" />
      case 'document_uploads':
        return <FileText className="h-4 w-4" />
      case 'ai_generations':
        return <Sparkles className="h-4 w-4" />
      default:
        return <Zap className="h-4 w-4" />
    }
  }

  const getFeatureName = (feature: string) => {
    switch (feature) {
      case 'literature_searches':
        return 'Literature Searches'
      case 'document_summaries':
        return 'Document Summaries'
      case 'team_members':
        return 'Team Members'
      case 'team_collaboration':
        return 'Team Collaboration'
      case 'document_uploads':
        return 'Document Uploads'
      case 'ai_generations':
        return 'AI Generations'
      default:
        return feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const handleGetStarted = () => {
    // For free users, this could redirect to a signup or onboarding flow
    toast({
      title: "Get Started",
      description: "You're already on the Free plan! Explore our features to get the most out of Thesis Flow AI.",
    })
  }

  const handleCheckout = async (priceId: string, planType: string, billingPeriod: string) => {
    if (!session?.access_token) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upgrade your plan.",
        variant: "destructive"
      })
      return
    }

    setProcessingCheckout(true)
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          priceId,
          planType,
          billingPeriod
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      
      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast({
        title: "Checkout Failed",
        description: "Unable to start checkout process. Please try again.",
        variant: "destructive"
      })
    } finally {
      setProcessingCheckout(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!session?.access_token) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to manage your subscription.",
        variant: "destructive"
      })
      return
    }

    setProcessingPortal(true)
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const { url } = await response.json()
      
      // Redirect to Stripe Customer Portal
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Portal error:', error)
      toast({
        title: "Portal Access Failed",
        description: "Unable to access subscription management. Please try again.",
        variant: "destructive"
      })
    } finally {
      setProcessingPortal(false)
    }
  }

  const handleStartFreeTrial = () => {
    // Pro plan monthly with 7-day trial
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY || 'price_pro_monthly'
    handleCheckout(priceId, 'pro', 'monthly')
  }

  const handleContactSales = () => {
    // Open email client or contact form
    const subject = encodeURIComponent("Enterprise Plan Inquiry - Thesis Flow AI")
    const body = encodeURIComponent(`Hello,

I'm interested in learning more about the Enterprise plan for Thesis Flow AI.

Please provide information about:
- Custom pricing options
- Enterprise features and benefits
- Implementation timeline
- Support and training options

Thank you!`)
    
    window.open(`mailto:sales@boltresearchhub.com?subject=${subject}&body=${body}`, '_blank')
    
    toast({
      title: "Contact Sales",
      description: "Email client opened. We'll get back to you within 24 hours!",
    })
  }

  if (loading) {
    return (
      <RouteGuard>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <BackBreadcrumb className="mb-2" />
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Plan & Analytics</h1>
              <p className="text-gray-600">Manage your subscription and view project insights</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Subscription
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subscription" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Current Plan */}
                <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {config.icon}
                  Current Plan
                </CardTitle>
                <CardDescription>
                  {config.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className={`${config.color} text-white`}>
                      {config.name}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{config.price}</div>
                    <div className="text-sm text-gray-500">per {config.period}</div>
                  </div>
                </div>

                {tokenStatus && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Tokens</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Monthly</span>
                        <span className="font-medium">
                          {tokenStatus.monthlyUsed} / {tokenStatus.monthlyLimit} used • {tokenStatus.monthlyRemaining} left
                        </span>
                      </div>
                      <Progress value={tokenStatus.monthlyLimit ? (tokenStatus.monthlyUsed / tokenStatus.monthlyLimit) * 100 : 0} className="h-2" />
                    </div>
                    {(() => {
                      if (!tokenStatus.lastMonthlyReset) return null
                      const d = new Date(tokenStatus.lastMonthlyReset)
                      if (isNaN(d.getTime())) return null
                      return (
                        <p className="text-xs text-muted-foreground">
                          Resets — Monthly: {d.toLocaleDateString()}
                        </p>
                      )
                    })()}
                  </div>
                )}

                {planData?.usage && planData.usage.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Usage This Month</h3>
                    {planData.usage.map((usage) => (
                      <div key={usage.feature} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {getFeatureIcon(usage.feature)}
                            <span className="font-medium">{getFeatureName(usage.feature)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {usage.is_unlimited ? (
                              <span className="text-green-600 text-xs">Unlimited</span>
                            ) : (
                              <span className="text-gray-600 text-xs">
                                {usage.usage_count} / {usage.limit_count}
                              </span>
                            )}
                            {!usage.is_unlimited && (
                              usage.remaining > 0 ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )
                            )}
                          </div>
                        </div>
                        {!usage.is_unlimited && (
                          <Progress 
                            value={(usage.usage_count / usage.limit_count) * 100} 
                            className="h-2"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
                </Card>

                {/* Available Plans */}
                <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Available Plans
                  </CardTitle>
                  <CardDescription>
                    Choose the plan that fits your research needs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {planType === 'free' && (
                    <div className={`p-4 rounded-lg border ${planType === 'free' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold">Free</span>
                        </div>
                        <span className="text-lg font-bold">$0</span>
                      </div>
                      <ul className="text-sm space-y-1 text-gray-600 mb-4">
                        <li>• 50 monthly tokens</li>
                        <li>• Core features (Explorer, Summarizer)</li>
                        <li className="text-gray-400 line-through">• Team collaboration</li>
                      </ul>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        disabled
                      >
                        Current Plan
                        <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                      </Button>
                    </div>
                  )}

                  {/* Pro Plan */}
                  <div className={`p-4 rounded-lg border ${planType === 'pro' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'} relative`}>
                    <Badge className="absolute -top-2 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                      Most Popular
                    </Badge>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-purple-500" />
                        <span className="font-semibold">Pro</span>
                      </div>
                      <div>
                        <span className="text-2xl font-bold">$29</span>
                        <span className="text-sm text-gray-500">/month</span>
                      </div>
                    </div>
                    <ul className="text-sm space-y-1 text-gray-600 mb-4">
                      <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> 500 monthly tokens</li>
                      <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Team collaboration (up to 10 members)</li>
                      <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Priority support</li>
                    </ul>
                    {planType === 'pro' ? (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={handleManageSubscription}
                        disabled={processingPortal}
                      >
                        {processingPortal ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            Manage Plan
                            <Settings className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={handleStartFreeTrial}
                        disabled={processingCheckout}
                      >
                        {processingCheckout ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Start 7-Day Trial
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {!isProOrHigher() && (
                    <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
                      <DialogTrigger asChild>
                        <Button className="w-full" size="lg">
                          <Crown className="h-4 w-4 mr-2" />
                          Upgrade to Pro
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upgrade Your Plan</DialogTitle>
                          <DialogDescription>
                            Get more features and higher limits with our Pro plan.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>500 monthly tokens</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Team collaboration (up to 10 members)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Priority support</span>
                          </div>
                          <div className="pt-4 space-y-2">
                            <Button 
                              onClick={handleStartFreeTrial} 
                              className="w-full"
                              disabled={processingCheckout}
                            >
                              {processingCheckout ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Start 7-Day Free Trial
                                </>
                              )}
                            </Button>
                            <p className="text-xs text-center text-gray-500">
                              Cancel anytime. No credit card required for trial.
                            </p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Nova AI Status */}
            <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-green-800">Nova AI Usage Overview</h3>
                </div>
                <p className="text-sm text-green-700 mb-4">
                  All AI features powered by <strong>Nova AI</strong> with plan-optimized pricing. 
                  Your costs are included in your subscription - no surprise charges!
                </p>
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>High-performance inference • Academic-focused • Cost-efficient</span>
                </div>
              </CardContent>
            </Card>

            {/* Overview Cards */}
            {tokenStatus && (
              <TokenOverviewCards
                monthlyUsed={tokenStatus.monthlyUsed}
                monthlyLimit={tokenStatus.monthlyLimit}
                monthlyRemaining={tokenStatus.monthlyRemaining}
              />
            )}

            {/* Enhanced Analytics Chart */}
            <UsageAnalyticsV2 />

            {/* Top Entities Table */}
            <TopEntitiesTable />

            
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </RouteGuard>
  )
}