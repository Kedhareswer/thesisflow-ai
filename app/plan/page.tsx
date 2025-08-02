"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Crown, Zap, Users, FileText, Search, Sparkles, CheckCircle, XCircle, ArrowRight, Star } from "lucide-react"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useToast } from "@/hooks/use-toast"
import { RouteGuard } from "@/components/route-guard"

export default function PlanPage() {
  const { planData, loading, getPlanType, getUsageForFeature, isProfessionalOrHigher, isEnterprise } = useUserPlan()
  const { toast } = useToast()
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

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
    professional: {
      name: "Professional",
      icon: <Crown className="h-6 w-6" />,
      color: "bg-purple-500",
      description: "Enhanced features with higher limits",
      price: "$29",
      period: "month"
    },
    enterprise: {
      name: "Enterprise",
      icon: <Sparkles className="h-6 w-6" />,
      color: "bg-gradient-to-r from-purple-500 to-pink-500",
      description: "Unlimited access to all features",
      price: "Custom",
      period: "contact us"
    }
  }

  const config = planConfig[planType as keyof typeof planConfig] || planConfig.free

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'literature_searches':
        return <Search className="h-4 w-4" />
      case 'summaries':
        return <FileText className="h-4 w-4" />
      case 'team_members':
        return <Users className="h-4 w-4" />
      case 'documents':
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
      case 'summaries':
        return 'Document Summaries'
      case 'team_members':
        return 'Team Members'
      case 'documents':
        return 'Document Uploads'
      case 'ai_generations':
        return 'AI Generations'
      default:
        return feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const handleUpgrade = () => {
    toast({
      title: "Upgrade Feature",
      description: "Contact support to upgrade your plan. This feature is coming soon!",
    })
    setShowUpgradeDialog(false)
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Your Plan</h1>
            <p className="text-gray-600">Manage your subscription and usage</p>
          </div>

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
                {/* Free Plan */}
                <div className={`p-4 rounded-lg border ${planType === 'free' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span className="font-semibold">Free</span>
                    </div>
                    <span className="text-lg font-bold">$0</span>
                  </div>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• 50 literature searches/month</li>
                    <li>• 20 document summaries/month</li>
                    <li>• 10 document uploads/month</li>
                    <li>• 30 AI generations/month</li>
                    <li className="text-red-500">• No team collaboration</li>
                  </ul>
                </div>

                {/* Professional Plan */}
                <div className={`p-4 rounded-lg border ${planType === 'professional' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-purple-500" />
                      <span className="font-semibold">Professional</span>
                    </div>
                    <span className="text-lg font-bold">$29</span>
                  </div>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• 500 literature searches/month</li>
                    <li>• 200 document summaries/month</li>
                    <li>• 100 document uploads/month</li>
                    <li>• 300 AI generations/month</li>
                    <li>• Team collaboration (up to 10 members)</li>
                  </ul>
                </div>

                {/* Enterprise Plan */}
                <div className={`p-4 rounded-lg border ${planType === 'enterprise' ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-pink-500" />
                      <span className="font-semibold">Enterprise</span>
                    </div>
                    <span className="text-lg font-bold">Custom</span>
                  </div>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Unlimited literature searches</li>
                    <li>• Unlimited document summaries</li>
                    <li>• Unlimited document uploads</li>
                    <li>• Unlimited AI generations</li>
                    <li>• Unlimited team collaboration</li>
                  </ul>
                </div>

                {!isProfessionalOrHigher() && (
                  <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full" size="lg">
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade to Professional
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upgrade Your Plan</DialogTitle>
                        <DialogDescription>
                          Get more features and higher limits with our Professional plan.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>500 literature searches per month</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>200 document summaries per month</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Team collaboration (up to 10 members)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>100 document uploads per month</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>300 AI generations per month</span>
                        </div>
                        <div className="pt-4">
                          <Button onClick={handleUpgrade} className="w-full">
                            Contact Support to Upgrade
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
} 