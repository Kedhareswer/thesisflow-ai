"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Crown, Zap, Users, FileText, Search, Sparkles, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { useUserPlan } from "@/hooks/use-user-plan"

interface PlanStatusProps {
  className?: string
  showDetails?: boolean
}

export function PlanStatus({ className, showDetails = false }: PlanStatusProps) {
  const { planData, loading, getPlanType, getUsageForFeature, isProfessionalOrHigher } = useUserPlan()
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Plan Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!planData) {
    return null
  }

  const planType = getPlanType()
  const planConfig = {
    free: {
      name: "Free",
      icon: <Zap className="h-4 w-4" />,
      color: "bg-blue-500",
      description: "Limited access to core features"
    },
    professional: {
      name: "Professional",
      icon: <Crown className="h-4 w-4" />,
      color: "bg-purple-500",
      description: "Enhanced features with higher limits"
    },
    enterprise: {
      name: "Enterprise",
      icon: <Sparkles className="h-4 w-4" />,
      color: "bg-gradient-to-r from-purple-500 to-pink-500",
      description: "Unlimited access to all features"
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

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {config.icon}
              Plan Status
            </div>
            <Badge className={`${config.color} text-white`}>
              {config.name}
            </Badge>
          </CardTitle>
          <CardDescription>
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showDetails && planData.usage.length > 0 && (
            <div className="space-y-4">
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
          
          {!isProfessionalOrHigher() && (
            <div className="mt-4 pt-4 border-t">
              <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade Plan
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
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
} 