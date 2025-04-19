
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const analyticsData = [
  { name: "Mon", papers: 4, queries: 12, collaborations: 3 },
  { name: "Tue", papers: 6, queries: 18, collaborations: 5 },
  { name: "Wed", papers: 8, queries: 15, collaborations: 4 },
  { name: "Thu", papers: 5, queries: 20, collaborations: 6 },
  { name: "Fri", papers: 7, queries: 25, collaborations: 8 },
  { name: "Sat", papers: 3, queries: 10, collaborations: 2 },
  { name: "Sun", papers: 2, queries: 8, collaborations: 1 },
];

const config = {
  papers: {
    color: "#8B5CF6",
  },
  queries: {
    color: "#F97316",
  },
  collaborations: {
    color: "#0EA5E9",
  },
};

const AnalyticsSection = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium">Usage Analytics</h2>
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ChartContainer config={config}>
              <BarChart data={analyticsData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="papers" fill="#8B5CF6" name="Papers" />
                <Bar dataKey="queries" fill="#F97316" name="Queries" />
                <Bar dataKey="collaborations" fill="#0EA5E9" name="Collaborations" />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsSection;
