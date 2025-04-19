
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface ActivityItem {
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
  targetType: "document" | "comment" | "workspace" | "summary" | "query";
  path?: string;
}

interface ActivityContextType {
  activities: ActivityItem[];
  addActivity: (activity: Omit<ActivityItem, "id" | "timestamp">) => void;
  clearActivities: () => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

// Sample initial activities
const initialActivities: ActivityItem[] = [
  {
    id: "1",
    user: {
      name: "Alice Smith",
      initials: "AS",
      color: "bg-blue-500",
    },
    action: "commented on",
    target: "Quantum Physics Research",
    timestamp: "2 minutes ago",
    targetType: "document",
    path: "/collaborate",
  },
  {
    id: "2",
    user: {
      name: "Bob Johnson",
      initials: "BJ",
      color: "bg-green-500",
    },
    action: "edited",
    target: "Machine Learning Paper",
    timestamp: "15 minutes ago",
    targetType: "document",
    path: "/collaborate",
  },
  {
    id: "3",
    user: {
      name: "John Doe",
      initials: "JD",
      color: "bg-research-300",
    },
    action: "summarized",
    target: "Neural Networks Research",
    timestamp: "1 hour ago",
    targetType: "summary",
    path: "/summarizer",
  },
  {
    id: "4",
    user: {
      name: "Emma Wilson",
      initials: "EW",
      color: "bg-purple-500",
    },
    action: "joined workspace",
    target: "Climate Change Study",
    timestamp: "3 hours ago",
    targetType: "workspace",
    path: "/collaborate",
  },
];

interface ActivityProviderProps {
  children: ReactNode;
}

export function ActivityProvider({ children }: ActivityProviderProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);

  // Simulate real-time updates with random activities
  useEffect(() => {
    const possibleActions = [
      { action: "edited", targetType: "document" },
      { action: "commented on", targetType: "document" },
      { action: "summarized", targetType: "summary" },
      { action: "searched for", targetType: "query" },
      { action: "shared", targetType: "document" },
    ];

    const possibleTargets = [
      "Quantum Physics Paper",
      "Machine Learning Models",
      "Climate Research",
      "Neural Network Architecture",
      "CRISPR Applications",
    ];

    const users = [
      { name: "Alice Smith", initials: "AS", color: "bg-blue-500" },
      { name: "Bob Johnson", initials: "BJ", color: "bg-green-500" },
      { name: "Emma Wilson", initials: "EW", color: "bg-purple-500" },
      { name: "Michael Brown", initials: "MB", color: "bg-yellow-500" },
    ];

    const interval = setInterval(() => {
      // Only add new activity occasionally (30% chance)
      if (Math.random() > 0.7) {
        const randomAction = possibleActions[Math.floor(Math.random() * possibleActions.length)];
        const randomTarget = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
        const randomUser = users[Math.floor(Math.random() * users.length)];
        
        const path = randomAction.targetType === "document" || randomAction.targetType === "workspace" 
          ? "/collaborate" 
          : randomAction.targetType === "summary" 
            ? "/summarizer" 
            : "/explorer";

        const newActivity: ActivityItem = {
          id: Date.now().toString(),
          user: randomUser,
          action: randomAction.action,
          target: randomTarget,
          timestamp: "Just now",
          targetType: randomAction.targetType as any,
          path,
        };

        setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const addActivity = (activity: Omit<ActivityItem, "id" | "timestamp">) => {
    const newActivity: ActivityItem = {
      ...activity,
      id: Date.now().toString(),
      timestamp: "Just now",
    };

    setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
  };

  const clearActivities = () => {
    setActivities([]);
  };

  return (
    <ActivityContext.Provider value={{ activities, addActivity, clearActivities }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }
  return context;
}
