
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  MessageCircle,
  FileText,
  Copy,
  Share2,
  Sparkles,
  Send,
  Plus,
  Book
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useActivity } from "@/context/ActivityContext";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Collaborator {
  id: string;
  name: string;
  initials: string;
  image?: string;
  role: string;
  status: "online" | "offline" | "idle";
  lastActive?: string;
}

interface Comment {
  id: string;
  user: {
    name: string;
    initials: string;
    image?: string;
  };
  content: string;
  timestamp: string;
}

const CollaborateTabs = () => {
  const [message, setMessage] = useState("");
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "1",
      user: {
        name: "Alice Smith",
        initials: "AS",
      },
      content: "I think we should focus more on the quantum error correction section. The recent developments at IBM are particularly relevant.",
      timestamp: "10:32 AM"
    },
    {
      id: "2",
      user: {
        name: "John Doe",
        initials: "JD",
      },
      content: "Good point. I've also found some papers from Google's quantum AI team that support this direction.",
      timestamp: "10:45 AM"
    }
  ]);
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: "1",
      name: "John Doe",
      initials: "JD",
      role: "Owner",
      status: "online"
    },
    {
      id: "2",
      name: "Alice Smith",
      initials: "AS",
      role: "Editor",
      status: "online"
    },
    {
      id: "3",
      name: "Bob Johnson",
      initials: "BJ",
      role: "Viewer",
      status: "offline",
      lastActive: "2 hours ago"
    }
  ]);
  
  const [references, setReferences] = useState([
    {
      id: "1",
      title: "Quantum Supremacy Using a Programmable Superconducting Processor",
      authors: "Arute, F., et al.",
      journal: "Nature",
      year: 2019,
      doi: "10.1038/s41586-019-1666-5"
    },
    {
      id: "2",
      title: "A blueprint for demonstrating quantum supremacy with superconducting qubits",
      authors: "Neill, C., et al.",
      journal: "Science",
      year: 2018,
      doi: "10.1126/science.aao4309"
    },
    {
      id: "3",
      title: "Quantum error correction for quantum memories",
      authors: "Terhal, B.M.",
      journal: "Reviews of Modern Physics",
      year: 2015,
      doi: "10.1103/RevModPhys.87.307"
    }
  ]);
  
  const { toast } = useToast();
  const { addActivity } = useActivity();
  
  const sendMessage = () => {
    if (!message.trim()) return;
    
    const newComment: Comment = {
      id: Date.now().toString(),
      user: {
        name: "John Doe",
        initials: "JD",
      },
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setComments([...comments, newComment]);
    setMessage("");
    
    // Add activity
    addActivity({
      user: {
        name: "John Doe",
        initials: "JD",
        color: "bg-research-300"
      },
      action: "commented on",
      target: "Quantum Research Paper",
      targetType: "comment",
      path: "/collaborate"
    });
    
    toast({
      title: "Comment Added",
      description: "Your comment has been added to the discussion.",
    });
  };
  
  const inviteCollaborator = () => {
    toast({
      title: "Invitation Sent",
      description: "An invitation has been sent to collaborate on this document.",
    });
    
    // Add activity
    addActivity({
      user: {
        name: "John Doe",
        initials: "JD",
        color: "bg-research-300"
      },
      action: "invited collaborator to",
      target: "Quantum Research Project",
      targetType: "invite",
      path: "/collaborate"
    });
  };
  
  const addReference = () => {
    toast({
      title: "Reference Added",
      description: "The new reference has been added to the bibliography.",
    });
    
    // Add activity
    addActivity({
      user: {
        name: "John Doe",
        initials: "JD",
        color: "bg-research-300"
      },
      action: "added reference to",
      target: "Quantum Research Paper",
      targetType: "reference",
      path: "/collaborate"
    });
  };
  
  const suggestIdea = () => {
    toast({
      title: "Idea Suggested",
      description: "Your research idea has been shared with collaborators.",
    });
    
    // Add activity
    addActivity({
      user: {
        name: "John Doe",
        initials: "JD",
        color: "bg-research-300"
      },
      action: "suggested idea for",
      target: "Quantum Research Project",
      targetType: "idea",
      path: "/collaborate"
    });
  };
  
  return (
    <Tabs defaultValue="comments" className="w-full">
      <TabsList className="grid grid-cols-4 mb-4">
        <TabsTrigger value="comments" className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          <span>Comments</span>
        </TabsTrigger>
        <TabsTrigger value="collaborators" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>Collaborators</span>
        </TabsTrigger>
        <TabsTrigger value="references" className="flex items-center gap-2">
          <Book className="h-4 w-4" />
          <span>References</span>
        </TabsTrigger>
        <TabsTrigger value="ideas" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span>Ideas</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="comments" className="m-0">
        <Card>
          <CardContent className="p-4">
            <div className="h-[400px] flex flex-col">
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar>
                      {comment.user.image ? (
                        <AvatarImage src={comment.user.image} alt={comment.user.name} />
                      ) : (
                        <AvatarFallback>{comment.user.initials}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="bg-muted/50 rounded-lg p-3 flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{comment.user.name}</span>
                        <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                  <Button 
                    className="shrink-0" 
                    onClick={sendMessage}
                    disabled={!message.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="collaborators" className="m-0">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Current Collaborators</h3>
              <Button variant="outline" size="sm" className="gap-1" onClick={inviteCollaborator}>
                <Plus className="h-4 w-4" />
                Invite
              </Button>
            </div>
            
            <div className="space-y-3">
              {collaborators.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {user.image ? (
                        <AvatarImage src={user.image} alt={user.name} />
                      ) : (
                        <AvatarFallback>{user.initials}</AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {user.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {user.status === "online" ? (
                            <span className="flex items-center">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1"></span>
                              Online
                            </span>
                          ) : (
                            <span>Last active {user.lastActive}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Message</Button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Collaborators can view, comment, and edit this document based on their permissions.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="references" className="m-0">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Bibliography</h3>
              <Button variant="outline" size="sm" className="gap-1" onClick={addReference}>
                <Plus className="h-4 w-4" />
                Add Reference
              </Button>
            </div>
            
            <div className="space-y-3">
              {references.map((ref) => (
                <div key={ref.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between">
                    <h4 className="font-medium text-sm">{ref.title}</h4>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{ref.authors}</p>
                  <div className="flex text-xs text-muted-foreground gap-3 mt-1">
                    <span>{ref.journal}</span>
                    <span>{ref.year}</span>
                    <span>DOI: {ref.doi}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="ideas" className="m-0">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Research Ideas</h3>
              <Button variant="outline" size="sm" className="gap-1" onClick={suggestIdea}>
                <Sparkles className="h-4 w-4" />
                Suggest Idea
              </Button>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 bg-research-100/50 rounded-lg border border-research-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-research-500" />
                  <h4 className="font-medium">Quantum Error Correction Improvements</h4>
                </div>
                <p className="text-sm">
                  We should investigate the potential of topological quantum codes for improving error correction in noisy intermediate-scale quantum (NISQ) devices.
                </p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-research-200">
                  <span className="text-xs text-muted-foreground">Suggested by John Doe</span>
                  <Button variant="ghost" size="sm">Develop</Button>
                </div>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4" />
                  <h4 className="font-medium">Quantum-Classical Hybrid Algorithms</h4>
                </div>
                <p className="text-sm">
                  Consider exploring how quantum-classical hybrid algorithms can be optimized for near-term hardware constraints.
                </p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground">Suggested by Alice Smith</span>
                  <Button variant="ghost" size="sm">Develop</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default CollaborateTabs;
