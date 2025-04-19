
import { useEffect, useState } from "react";
import { useActivity } from "@/context/ActivityContext";
import { Card, CardContent } from "@/components/ui/card";
import { ActivityItem } from "@/context/ActivityContext";
import { AnimatePresence, motion } from "framer-motion";

export function RealTimeNotification() {
  const { activities } = useActivity();
  const [notification, setNotification] = useState<ActivityItem | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (activities.length > 0) {
      const latestActivity = activities[0];
      
      // Only show notification for new activities
      if (latestActivity.timestamp === "Just now") {
        setNotification(latestActivity);
        setVisible(true);
        
        // Auto hide after 5 seconds
        const timer = setTimeout(() => {
          setVisible(false);
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [activities]);

  return (
    <AnimatePresence>
      {visible && notification && (
        <motion.div
          className="fixed bottom-4 right-4 z-50 max-w-sm"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-research-100 border-research-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex gap-3 items-center">
                <div className={`w-8 h-8 rounded-full ${notification.user.color || "bg-research-300"} text-white flex items-center justify-center text-sm`}>
                  {notification.user.initials}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    <span className="font-semibold">{notification.user.name}</span> {notification.action}{" "}
                    <span className="text-research-500">{notification.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{notification.timestamp}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
