"use client"

import { useState } from "react"
import { Check, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"

export function SubscriptionPlans() {
  const { user, upgrade } = useAuth()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const plans = [
    {
      id: "free",
      name: "Free",
      description: "Basic access to research tools",
      price: 0,
      features: [
        "5 AI paper summaries per month",
        "10 research searches per month",
        "Basic collaboration tools",
        "1 GB storage",
      ],
      limitations: ["Limited AI prompts", "No advanced analytics", "No citation management", "No API access"],
      cta: "Current Plan",
      disabled: user?.subscription === "free",
    },
    {
      id: "basic",
      name: "Basic",
      description: "Enhanced research capabilities",
      price: 9.99,
      features: [
        "25 AI paper summaries per month",
        "Unlimited research searches",
        "Advanced collaboration tools",
        "5 GB storage",
        "Citation management",
      ],
      limitations: ["Limited AI prompts", "Basic analytics", "No API access"],
      cta: "Upgrade to Basic",
      disabled: user?.subscription === "basic",
    },
    {
      id: "premium",
      name: "Premium",
      description: "Professional research suite",
      price: 19.99,
      features: [
        "Unlimited AI paper summaries",
        "Unlimited research searches",
        "Advanced collaboration tools",
        "20 GB storage",
        "Citation management",
        "Advanced analytics",
        "Priority support",
      ],
      limitations: ["Limited API access"],
      cta: "Upgrade to Premium",
      disabled: user?.subscription === "premium",
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "Institutional research platform",
      price: 49.99,
      features: [
        "Everything in Premium",
        "Unlimited storage",
        "Full API access",
        "Team management",
        "Custom integrations",
        "Dedicated support",
        "Training sessions",
      ],
      limitations: [],
      cta: "Contact Sales",
      disabled: user?.subscription === "enterprise",
    },
  ]

  const handleUpgrade = async (planId: string) => {
    if (planId === "enterprise") {
      // For enterprise, we would typically redirect to a contact form
      window.open("/contact-sales", "_blank")
      return
    }

    setIsLoading(planId)

    try {
      // Mock payment details - in a real app, this would be collected via a payment form
      const paymentDetails = {
        cardNumber: "4242424242424242",
        expiry: "12/25",
        cvc: "123",
      }

      await upgrade(planId as any, paymentDetails)

      // In a real app, you might redirect to a success page or show a success message
    } catch (error) {
      console.error("Error upgrading subscription:", error)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={`flex flex-col ${plan.popular ? "border-primary shadow-md dark:border-primary" : ""}`}
        >
          {plan.popular && <Badge className="absolute right-4 top-4 bg-primary text-primary-foreground">Popular</Badge>}
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
            <div className="mt-4 flex items-baseline text-primary">
              <span className="text-3xl font-bold tracking-tight">${plan.price}</span>
              <span className="ml-1 text-sm font-medium text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-medium">Features</h4>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {plan.limitations.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">Limitations</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.limitations.map((limitation) => (
                      <li key={limitation}>{limitation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className={`w-full ${plan.popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              disabled={plan.disabled || isLoading === plan.id}
              onClick={() => handleUpgrade(plan.id)}
            >
              {isLoading === plan.id ? (
                <>Loading...</>
              ) : plan.popular ? (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  {plan.cta}
                </>
              ) : (
                plan.cta
              )}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
