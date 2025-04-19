"use client"

import { useTheme } from "next-themes"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface DataPoint {
  name: string
  values: number[]
}

interface ChartData {
  labels: string[]
  datasets: DataPoint[]
}

interface UsageChartProps {
  data: ChartData
}

export function UsageChart({ data }: UsageChartProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  // Transform the data for recharts
  const chartData = data.labels.map((label, index) => {
    const dataPoint: Record<string, any> = { name: label }
    data.datasets.forEach((dataset) => {
      dataPoint[dataset.name] = dataset.values[index]
    })
    return dataPoint
  })

  // Define colors for each dataset
  const colors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#8b5cf6", // purple
    "#f97316", // orange
    "#ef4444", // red
  ]

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
          <XAxis
            dataKey="name"
            stroke={isDark ? "#9ca3af" : "#6b7280"}
            tick={{ fill: isDark ? "#d1d5db" : "#374151" }}
          />
          <YAxis stroke={isDark ? "#9ca3af" : "#6b7280"} tick={{ fill: isDark ? "#d1d5db" : "#374151" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1f2937" : "#ffffff",
              borderColor: isDark ? "#374151" : "#e5e7eb",
              color: isDark ? "#f9fafb" : "#111827",
            }}
          />
          <Legend />
          {data.datasets.map((dataset, index) => (
            <Line
              key={dataset.name}
              type="monotone"
              dataKey={dataset.name}
              stroke={colors[index % colors.length]}
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
