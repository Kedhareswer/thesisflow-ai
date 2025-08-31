"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Crown, Zap } from "lucide-react";
import { useState } from "react";

const plans = [
  {
    name: "Starter",
    tagline: "Perfect for individuals getting started",
    price: 12,
    yearlyPrice: 99,
    features: [
      "Up to 10 boards per workspace",
      "Up to 10GB storage",
      "Limited analytics",
      "Unlimited cards",
      "Custom background & stickers",
      "2-factor authentication",
      "Up to 2 individual users",
      "Up to 2 workspaces"
    ],
    button: {
      text: "Get Started",
      variant: "outline" as const,
    },
    popular: false,
  },
  {
    name: "Business",
    tagline: "Best value for growing teams",
    price: 48,
    yearlyPrice: 399,
    features: [
      "Everything in Starter, plus:",
      "Unlimited boards",
      "Storage (250MB/file)",
      "100 workspace command runs",
      "Advanced checklists",
      "Custom fields",
      "Serverless functions",
      "Up to 10 individual users",
      "Up to 10 workspaces"
    ],
    button: {
      text: "Start Free Trial",
      variant: "default" as const,
    },
    popular: true,
  },
  {
    name: "Enterprise",
    tagline: "For organizations with advanced needs",
    price: 96,
    yearlyPrice: 899,
    features: [
      "Everything in Business, plus:",
      "Unlimited boards",
      "Unlimited storage",
      "Unlimited workspaces",
      "Multi-board management",
      "Multi-board guest",
      "Attachment permissions",
      "Custom roles",
      "Custom boards"
    ],
    button: {
      text: "Contact Sales",
      variant: "outline" as const,
    },
    popular: false,
  },
];

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const toggleBillingCycle = () => {
    setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly");
  };

  return (
    <div className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Choose the perfect plan for your needs. No hidden fees.
          </p>
          
          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">Monthly</span>
            <button
              onClick={toggleBillingCycle}
              className="mx-4 flex h-6 w-11 items-center rounded-full bg-gray-200 p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              <span
                className={`h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                  billingCycle === "yearly" ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700">Yearly</span>
              <span className="ml-2 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                Save 20%
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3 lg:gap-6 xl:gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative rounded-2xl border border-gray-200 bg-white shadow-sm",
                plan.popular && "border-orange-500 ring-2 ring-orange-500"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
                  <div className="flex items-center rounded-full bg-orange-500 px-4 py-1.5 text-xs font-medium text-white">
                    <Zap className="mr-1 h-3 w-3" />
                    Most Popular
                  </div>
                </div>
              )}
              
              <CardHeader className="pb-6 pt-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  {plan.popular && (
                    <div className="rounded-full bg-orange-100 p-1">
                      <Crown className="h-5 w-5 text-orange-600" />
                    </div>
                  )}
                </div>
                <p className="mt-1 text-gray-600">{plan.tagline}</p>
                
                <div className="mt-6 flex items-baseline">
                  <span className="text-5xl font-bold text-gray-900">
                    ${billingCycle === "monthly" ? plan.price : plan.yearlyPrice}
                  </span>
                  <span className="ml-1 text-lg text-gray-500">
                    /{billingCycle === "monthly" ? "month" : "year"}
                  </span>
                </div>
                
                <button
                  className={cn(
                    "mt-6 w-full rounded-lg px-4 py-3 text-center text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2",
                    plan.button.variant === "default"
                      ? "bg-orange-600 text-white hover:bg-orange-700"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {plan.button.text}
                </button>
              </CardHeader>
              
              <CardContent className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-gray-900">What's included:</h4>
                <ul className="mt-4 space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
                      <span className="ml-3 text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </motion.div>
          ))}
        </div>
        
        {/* FAQ Section */}
        <div className="mt-16 border-t border-gray-200 pt-12">
          <h3 className="text-center text-2xl font-bold text-gray-900">Frequently asked questions</h3>
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                question: "Can I change plans later?",
                answer: "Yes, you can upgrade or downgrade your plan at any time."
              },
              {
                question: "Is there a free trial available?",
                answer: "Yes, you can try any plan free for 14 days with no credit card required."
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards and PayPal."
              }
            ].map((faq, i) => (
              <div key={i} className="rounded-lg bg-gray-50 p-6">
                <h4 className="font-medium text-gray-900">{faq.question}</h4>
                <p className="mt-2 text-sm text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
