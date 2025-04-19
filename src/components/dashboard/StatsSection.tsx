
import { FileText, Users, BarChart3, TrendingUp } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";

const StatsSection = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Total Papers"
        value="37"
        icon={<FileText className="h-5 w-5" />}
        description="12 papers this month"
        trend={{ value: 8, positive: true }}
      />
      <StatsCard
        title="Active Collaborations"
        value="12"
        icon={<Users className="h-5 w-5" />}
        description="3 new this week"
        trend={{ value: 15, positive: true }}
      />
      <StatsCard
        title="Research Queries"
        value="128"
        icon={<BarChart3 className="h-5 w-5" />}
        description="24 hours activity"
        trend={{ value: 5, positive: true }}
      />
      <StatsCard
        title="Productivity"
        value="86%"
        icon={<TrendingUp className="h-5 w-5" />}
        description="Higher than last week"
        trend={{ value: 12, positive: true }}
      />
    </div>
  );
};

export default StatsSection;
