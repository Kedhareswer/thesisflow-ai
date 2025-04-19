
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Users, MessageSquare, History } from "lucide-react";
import { useActivity } from "@/context/ActivityContext";

// Simulated user presence data
const USERS = [
  { id: "1", name: "John Doe", avatar: "", initials: "JD", color: "bg-research-300", status: "active" },
  { id: "2", name: "Alice Smith", avatar: "", initials: "AS", color: "bg-blue-500", status: "active" },
  { id: "3", name: "Bob Johnson", avatar: "", initials: "BJ", color: "bg-green-500", status: "idle" },
];

const CollaborationWorkspace = () => {
  const [connectedUsers, setConnectedUsers] = useState(USERS);
  const [userCursors, setUserCursors] = useState<Record<string, { x: number, y: number }>>({});
  const { addActivity } = useActivity();
  
  // Simulate cursor movement and collaborative activity
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      const updatedCursors: Record<string, { x: number, y: number }> = {};
      
      // Only update for active users
      connectedUsers
        .filter(user => user.status === "active")
        .forEach(user => {
          updatedCursors[user.id] = {
            x: Math.random() * 100,
            y: Math.random() * 100 + 200 // Keep cursors in document area
          };
        });
      
      setUserCursors(updatedCursors);
    }, 3000);
    
    // Simulate collaborative editing events
    const activityInterval = setInterval(() => {
      // Only trigger collaborative events occasionally
      if (Math.random() > 0.7) {
        const activeUsers = connectedUsers.filter(user => user.status === "active" && user.id !== "1");
        if (activeUsers.length > 0) {
          const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];
          const actions = ["edited", "commented on", "highlighted text in"];
          const randomAction = actions[Math.floor(Math.random() * actions.length)];
          
          addActivity({
            user: {
              name: randomUser.name,
              initials: randomUser.initials,
              color: randomUser.color
            },
            action: randomAction,
            target: "Quantum Mechanics Research",
            targetType: randomAction === "commented on" ? "comment" : "document",
            path: "/collaborate"
          });
        }
      }
    }, 30000);
    
    return () => {
      clearInterval(cursorInterval);
      clearInterval(activityInterval);
    };
  }, [connectedUsers, addActivity]);
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Research Paper Collaboration</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-research-500 bg-research-100">Quantum Physics</Badge>
            <span className="text-sm text-muted-foreground">Last edited 2 mins ago</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <History className="h-4 w-4" />
            History
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <MessageSquare className="h-4 w-4" />
            Comments
          </Button>
          <Button size="sm" className="gap-1">
            <Users className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        <div className="lg:col-span-3 h-full flex flex-col">
          <Tabs defaultValue="document" className="flex-1 flex flex-col">
            <TabsList className="w-fit mb-4">
              <TabsTrigger value="document" className="gap-1">
                <FileText className="h-4 w-4" />
                Document
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-1">
                <MessageSquare className="h-4 w-4" />
                Comments
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="document" className="flex-1 relative mt-0">
              <Card className="h-full">
                <CardContent className="p-6 h-full">
                  <div className="prose max-w-none">
                    <h2>Quantum Mechanics: A Collaborative Analysis</h2>
                    <p className="lead">
                      This collaborative paper explores the fundamental principles of quantum mechanics and 
                      their practical applications in modern technology.
                    </p>
                    <h3>Abstract</h3>
                    <p>
                      Quantum mechanics is a fundamental theory in physics that provides a description of the 
                      physical properties of nature at the scale of atoms and subatomic particles. It is the 
                      foundation of all quantum physics including quantum chemistry, quantum field theory, 
                      quantum technology, and quantum information science.
                    </p>
                    <p>
                      In this collaborative research, we examine the historical development, theoretical 
                      frameworks, and practical applications of quantum mechanical principles, with a focus 
                      on recent advances in quantum computing and quantum communication technologies.
                    </p>
                    <h3>Introduction</h3>
                    <p>
                      The development of quantum mechanics began in the early 20th century to explain 
                      phenomena that classical physics could not account for. The theory has since evolved 
                      into a sophisticated mathematical framework with wide-ranging applications.
                    </p>
                    <p>
                      The collaborative nature of this research allows us to bring together expertise from 
                      various subfields of physics, mathematics, and computer science to provide a 
                      comprehensive and up-to-date analysis of quantum mechanical principles and their 
                      practical implementations.
                    </p>
                    {/* Simulated user cursors */}
                    {Object.entries(userCursors).map(([userId, position]) => {
                      const user = connectedUsers.find(u => u.id === userId);
                      if (!user || user.id === "1") return null; // Don't show own cursor
                      
                      return (
                        <div 
                          key={userId}
                          className="absolute pointer-events-none transition-all duration-700"
                          style={{ 
                            left: `${position.x}%`, 
                            top: position.y,
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          <div className="flex flex-col items-center">
                            <div className={`w-5 h-5 ${user.color} text-white flex items-center justify-center text-[10px] font-bold rounded-full`}>
                              {user.initials}
                            </div>
                            <span className="text-xs bg-gray-800 text-white px-2 py-0.5 rounded mt-1 whitespace-nowrap">
                              {user.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="comments" className="flex-1 mt-0">
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-500 text-white">AS</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">Alice Smith</span>
                            <span className="text-xs text-muted-foreground">10:23 AM</span>
                          </div>
                          <p className="text-sm">
                            I think we should expand the section on quantum entanglement. It's a crucial concept
                            and deserves more explanation.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-green-500 text-white">BJ</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">Bob Johnson</span>
                            <span className="text-xs text-muted-foreground">11:05 AM</span>
                          </div>
                          <p className="text-sm">
                            Agreed. I can contribute the section on Bell's inequality and recent experimental 
                            confirmations. Let me know what you think.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="lg:col-span-1 h-full">
          <Card className="h-full">
            <CardContent className="p-4">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-research-400" />
                Collaborators
              </h3>
              
              <div className="space-y-3">
                {connectedUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className={`${user.color} text-white`}>
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                        user.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user.status}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <History className="h-4 w-4 text-research-400" />
                  Recent Changes
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">10:45 AM</span>
                    <p>
                      <span className="font-medium text-blue-500">Alice</span> edited Introduction section
                    </p>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">10:32 AM</span>
                    <p>
                      <span className="font-medium text-green-500">Bob</span> added Abstract
                    </p>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">10:15 AM</span>
                    <p>
                      <span className="font-medium text-research-400">You</span> created document
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CollaborationWorkspace;
