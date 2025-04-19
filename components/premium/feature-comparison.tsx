"use client"

import { Check, X } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function FeatureComparison() {
  const features = [
    {
      name: "AI Paper Summaries",
      free: "5 per month",
      basic: "25 per month",
      premium: "Unlimited",
      enterprise: "Unlimited",
    },
    {
      name: "Research Searches",
      free: "10 per month",
      basic: "Unlimited",
      premium: "Unlimited",
      enterprise: "Unlimited",
    },
    {
      name: "Collaboration",
      free: "Basic",
      basic: "Advanced",
      premium: "Advanced",
      enterprise: "Advanced + Team Management",
    },
    {
      name: "Storage",
      free: "1 GB",
      basic: "5 GB",
      premium: "20 GB",
      enterprise: "Unlimited",
    },
    {
      name: "Citation Management",
      free: false,
      basic: true,
      premium: true,
      enterprise: true,
    },
    {
      name: "Analytics",
      free: false,
      basic: "Basic",
      premium: "Advanced",
      enterprise: "Advanced + Custom Reports",
    },
    {
      name: "API Access",
      free: false,
      basic: false,
      premium: "Limited",
      enterprise: "Full",
    },
    {
      name: "Support",
      free: "Email",
      basic: "Email",
      premium: "Priority Email",
      enterprise: "Dedicated Support",
    },
    {
      name: "Custom Integrations",
      free: false,
      basic: false,
      premium: false,
      enterprise: true,
    },
    {
      name: "Training Sessions",
      free: false,
      basic: false,
      premium: false,
      enterprise: true,
    },
  ]

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Feature</TableHead>
            <TableHead>Free</TableHead>
            <TableHead>Basic</TableHead>
            <TableHead>Premium</TableHead>
            <TableHead>Enterprise</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {features.map((feature) => (
            <TableRow key={feature.name}>
              <TableCell className="font-medium">{feature.name}</TableCell>
              <TableCell>
                {typeof feature.free === "boolean" ? (
                  feature.free ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )
                ) : (
                  feature.free
                )}
              </TableCell>
              <TableCell>
                {typeof feature.basic === "boolean" ? (
                  feature.basic ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )
                ) : (
                  feature.basic
                )}
              </TableCell>
              <TableCell>
                {typeof feature.premium === "boolean" ? (
                  feature.premium ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )
                ) : (
                  feature.premium
                )}
              </TableCell>
              <TableCell>
                {typeof feature.enterprise === "boolean" ? (
                  feature.enterprise ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )
                ) : (
                  feature.enterprise
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
