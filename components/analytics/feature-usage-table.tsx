"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export function FeatureUsageTable() {
  // Sample data for the feature usage table
  const features = [
    {
      name: "Paper Summaries",
      used: 25,
      limit: 50,
      status: "good",
    },
    {
      name: "Research Searches",
      used: 120,
      limit: 150,
      status: "warning",
    },
    {
      name: "AI Prompts",
      used: 450,
      limit: 500,
      status: "critical",
    },
    {
      name: "Collaborations",
      used: 15,
      limit: 30,
      status: "good",
    },
    {
      name: "File Storage",
      used: 2.5,
      limit: 5,
      unit: "GB",
      status: "good",
    },
  ]

  // Function to get badge color based on status
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "good":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
    }
  }

  // Function to get progress color based on usage percentage
  const getProgressColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100
    if (percentage < 60) return "bg-green-500"
    if (percentage < 80) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Feature</TableHead>
          <TableHead>Usage</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Usage Bar</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {features.map((feature) => (
          <TableRow key={feature.name}>
            <TableCell className="font-medium">{feature.name}</TableCell>
            <TableCell>
              {feature.used} / {feature.limit} {feature.unit || ""}
            </TableCell>
            <TableCell>
              <Badge className={getBadgeVariant(feature.status)}>
                {feature.status === "good" && "Good"}
                {feature.status === "warning" && "Warning"}
                {feature.status === "critical" && "Critical"}
              </Badge>
            </TableCell>
            <TableCell className="w-[30%]">
              <div className="flex items-center">
                <Progress
                  value={(feature.used / feature.limit) * 100}
                  className={`h-2 ${getProgressColor(feature.used, feature.limit)}`}
                />
                <span className="ml-2 text-xs text-muted-foreground">
                  {Math.round((feature.used / feature.limit) * 100)}%
                </span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
