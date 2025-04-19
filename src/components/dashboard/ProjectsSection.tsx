
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectCard from "@/components/dashboard/ProjectCard";

interface Project {
  id: string;
  title: string;
  description: string;
  progress: number;
  updated: string;
  status: "active" | "completed" | "draft";
  contributors: {
    id: string;
    name: string;
    initials: string;
  }[];
}

const projects: Project[] = [
  {
    id: "1",
    title: "Quantum Computing Research",
    description: "Exploring recent advances in quantum computing algorithms and their applications in cryptography and optimization problems.",
    progress: 75,
    updated: "2 hours ago",
    status: "active",
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
    status: "active",
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
    status: "completed",
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
    status: "draft",
    contributors: [
      { id: "1", name: "John Doe", initials: "JD" },
    ],
  },
];

const ProjectsSection = () => {
  return (
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
  );
};

export default ProjectsSection;
