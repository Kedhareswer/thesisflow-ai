
import { FileText, MessageSquare, Users, Search } from "lucide-react";
import { useActivity } from "@/context/ActivityContext";
import { useMemo } from "react";
import ActivityCard from "@/components/dashboard/ActivityCard";
import AnalyticsSection from "@/components/dashboard/AnalyticsSection";
import StatsSection from "@/components/dashboard/StatsSection";
import ProjectsSection from "@/components/dashboard/ProjectsSection";

const Dashboard = () => {
  const { activities } = useActivity();
  
  // Add icons to activities based on their type
  const recentActivities = useMemo(() => {
    return activities.map(activity => {
      let icon;
      
      switch (activity.targetType) {
        case "document":
          icon = <FileText className="h-4 w-4" />;
          break;
        case "comment":
          icon = <MessageSquare className="h-4 w-4" />;
          break;
        case "workspace":
          icon = <Users className="h-4 w-4" />;
          break;
        case "summary":
          icon = <FileText className="h-4 w-4" />;
          break;
        case "query":
          icon = <Search className="h-4 w-4" />;
          break;
        default:
          icon = <FileText className="h-4 w-4" />;
      }
      
      return {
        ...activity,
        icon
      };
    });
  }, [activities]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back to your research hub. Here's what's happening.
        </p>
      </div>

      <StatsSection />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnalyticsSection />
          <ProjectsSection />
        </div>

        <div>
          <h2 className="text-xl font-medium mb-4">Activity Feed</h2>
          <ActivityCard activities={recentActivities} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
