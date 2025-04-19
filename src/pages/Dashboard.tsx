import { FileText, Users, BarChart3, TrendingUp, MessageSquare, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsCard from "@/components/dashboard/StatsCard";
import ActivityCard from "@/components/dashboard/ActivityCard";
import ProjectCard from "@/components/dashboard/ProjectCard";
import AnalyticsSection from "@/components/dashboard/AnalyticsSection";
import { useActivity } from "@/context/ActivityContext";
import { useMemo } from "react";

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

  // Sample projects data
  const projects = [
    {
      id: "1",
      title: "Quantum Computing Research",
      description: "Exploring recent advances in quantum computing algorithms and their applications in cryptography and optimization problems.",
      progress: 75,
      updated: "2 hours ago",
      status: "active" as const,
      contributors: [
        { id: "1", name: "John Doe", initials: "JD" },
        { id: "2", name: "Alice Smith", initials: "AS" },
        { id: "3", name: "Bob Johnson", initials: "BJ" },
      ],
    },
    {
      id: "2",
      title: "Machine Learning for Climate Models",
      description: "Applying advanced machine learning techniques to improve climate prediction models and analyze climate change patterns.",
      progress: 45,
      updated: "1 day ago",
      status: "active" as const,
      contributors: [
        { id: "1", name: "John Doe", initials: "JD" },
        { id: "4", name: "Emma Wilson", initials: "EW" },
      ],
    },
    {
      id: "3",
      title: "Neural Network Architecture Review",
      description: "Comprehensive review of recent neural network architectures and their performance in various machine learning tasks.",
      progress: 100,
      updated: "5 days ago",
      status: "completed" as const,
      contributors: [
        { id: "2", name: "Alice Smith", initials: "AS" },
        { id: "3", name: "Bob Johnson", initials: "BJ" },
        { id: "4", name: "Emma Wilson", initials: "EW" },
        { id: "5", name: "Michael Brown", initials: "MB" },
      ],
    },
    {
      id: "4",
      title: "CRISPR Gene Editing Applications",
      description: "Research on the latest CRISPR gene editing techniques and their potential applications in medicine and biotechnology.",
      progress: 20,
      updated: "2 days ago",
      status: "draft" as const,
      contributors: [
        { id: "1", name: "John Doe", initials: "JD" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back to your research hub. Here's what's happening.
        </p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnalyticsSection />
          <div className="mt-6">
            <Tabs defaultValue="all">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-medium">Research Projects</h2>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="draft">Drafts</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <ProjectCard key={project.id} {...project} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="active" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects
                    .filter((project) => project.status === "active")
                    .map((project) => (
                      <ProjectCard key={project.id} {...project} />
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="completed" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects
                    .filter((project) => project.status === "completed")
                    .map((project) => (
                      <ProjectCard key={project.id} {...project} />
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="draft" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects
                    .filter((project) => project.status === "draft")
                    .map((project) => (
                      <ProjectCard key={project.id} {...project} />
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
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
