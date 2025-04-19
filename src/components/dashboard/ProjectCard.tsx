
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Contributor {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
}

interface ProjectCardProps {
  title: string;
  description: string;
  progress: number;
  updated: string;
  status: "active" | "completed" | "draft";
  contributors: Contributor[];
}

const statusColors = {
  active: "bg-green-100 text-green-800 hover:bg-green-100",
  completed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  draft: "bg-orange-100 text-orange-800 hover:bg-orange-100"
};

const ProjectCard = ({ 
  title, 
  description, 
  progress, 
  updated, 
  status, 
  contributors 
}: ProjectCardProps) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          <Badge variant="outline" className={statusColors[status]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{description}</p>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t bg-muted/50 px-6 py-3">
        <div className="flex -space-x-2">
          {contributors.slice(0, 3).map((contributor) => (
            <Avatar key={contributor.id} className="h-7 w-7 border-2 border-background">
              <AvatarImage src={contributor.avatar} alt={contributor.name} />
              <AvatarFallback className="bg-research-300 text-white text-xs">
                {contributor.initials}
              </AvatarFallback>
            </Avatar>
          ))}
          {contributors.length > 3 && (
            <Avatar className="h-7 w-7 border-2 border-background">
              <AvatarFallback className="bg-muted-foreground text-white text-xs">
                +{contributors.length - 3}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        <div className="text-xs text-muted-foreground">Updated {updated}</div>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;
