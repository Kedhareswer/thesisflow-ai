
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface ActivityItem {
  id: string;
  user: {
    name: string;
    avatar?: string;
    initials: string;
    color?: string;
  };
  action: string;
  target: string;
  timestamp: string;
  icon: ReactNode;
  path?: string;
}

interface ActivityCardProps {
  activities: ActivityItem[];
}

const ActivityCard = ({ activities }: ActivityCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 animate-fade-in">
              <Avatar className="h-8 w-8">
                <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                <AvatarFallback className={`${activity.user.color || "bg-research-300"} text-white`}>
                  {activity.user.initials}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  <span className="font-semibold">{activity.user.name}</span> {activity.action}
                  {activity.path ? (
                    <Link to={activity.path} className="font-medium text-research-400 hover:underline">
                      {" "}{activity.target}
                    </Link>
                  ) : (
                    <span className="font-medium text-research-400"> {activity.target}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
              </div>
              
              <div className="text-research-400">{activity.icon}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityCard;
