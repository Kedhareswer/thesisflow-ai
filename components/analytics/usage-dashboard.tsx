"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsageChart } from "./usage-chart"
import { FeatureUsageTable } from "./feature-usage-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "../ui/date-range-picker"
import { addDays } from "date-fns"

export function UsageDashboard() {
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  })

  const [timeframe, setTimeframe] = useState("30d")

  // Sample data for the charts
  const usageData = {
    summaries: [
      12, 8, 15, 22, 16, 8, 10, 5, 12, 18, 15, 20, 25, 22, 18, 15, 12, 8, 10, 15, 18, 20, 22, 25, 28, 24, 20, 18, 15,
      12,
    ],
    searches: [
      25, 30, 28, 32, 36, 30, 28, 24, 28, 32, 35, 38, 42, 38, 35, 32, 30, 28, 32, 35, 38, 42, 45, 48, 52, 48, 45, 42,
      38, 35,
    ],
    collaborations: [
      5, 8, 10, 12, 15, 18, 20, 18, 15, 12, 10, 8, 10, 12, 15, 18, 20, 22, 25, 28, 25, 22, 20, 18, 15, 12, 10, 8, 5, 8,
    ],
    aiPrompts: [
      42, 45, 48, 52, 55, 58, 62, 58, 55, 52, 48, 45, 48, 52, 55, 58, 62, 65, 68, 72, 68, 65, 62, 58, 55, 52, 48, 45,
      42, 45,
    ],
  }

  // Function to handle timeframe change
  const handleTimeframeChange = (value: string) => {
    setTimeframe(value)

    // Update date range based on selected timeframe
    const today = new Date()
    let from = today

    switch (value) {
      case "7d":
        from = addDays(today, -7)
        break
      case "30d":
        from = addDays(today, -30)
        break
      case "90d":
        from = addDays(today, -90)
        break
      case "1y":
        from = addDays(today, -365)
        break
    }

    setDateRange({ from, to: today })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Usage Overview</CardTitle>
            <CardDescription>Monitor your feature usage and activity</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={timeframe} onValueChange={handleTimeframeChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Features</TabsTrigger>
              <TabsTrigger value="summaries">Paper Summaries</TabsTrigger>
              <TabsTrigger value="searches">Research Searches</TabsTrigger>
              <TabsTrigger value="collaborations">Collaborations</TabsTrigger>
              <TabsTrigger value="ai">AI Prompts</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4">
              <UsageChart
                data={{
                  labels: Array.from({ length: 30 }, (_, i) => (i + 1).toString()),
                  datasets: [
                    {
                      name: "Paper Summaries",
                      values: usageData.summaries,
                    },
                    {
                      name: "Research Searches",
                      values: usageData.searches,
                    },
                    {
                      name: "Collaborations",
                      values: usageData.collaborations,
                    },
                    {
                      name: "AI Prompts",
                      values: usageData.aiPrompts,
                    },
                  ],
                }}
              />
            </TabsContent>
            <TabsContent value="summaries">
              <UsageChart
                data={{
                  labels: Array.from({ length: 30 }, (_, i) => (i + 1).toString()),
                  datasets: [
                    {
                      name: "Paper Summaries",
                      values: usageData.summaries,
                    },
                  ],
                }}
              />
            </TabsContent>
            <TabsContent value="searches">
              <UsageChart
                data={{
                  labels: Array.from({ length: 30 }, (_, i) => (i + 1).toString()),
                  datasets: [
                    {
                      name: "Research Searches",
                      values: usageData.searches,
                    },
                  ],
                }}
              />
            </TabsContent>
            <TabsContent value="collaborations">
              <UsageChart
                data={{
                  labels: Array.from({ length: 30 }, (_, i) => (i + 1).toString()),
                  datasets: [
                    {
                      name: "Collaborations",
                      values: usageData.collaborations,
                    },
                  ],
                }}
              />
            </TabsContent>
            <TabsContent value="ai">
              <UsageChart
                data={{
                  labels: Array.from({ length: 30 }, (_, i) => (i + 1).toString()),
                  datasets: [
                    {
                      name: "AI Prompts",
                      values: usageData.aiPrompts,
                    },
                  ],
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Usage Details</CardTitle>
          <CardDescription>Detailed breakdown of your feature usage</CardDescription>
        </CardHeader>
        <CardContent>
          <FeatureUsageTable />
        </CardContent>
      </Card>
    </div>
  )
}
