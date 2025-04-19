import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FileText, 
  Share2, 
  Download, 
  Save, 
  Edit,
  GitBranch
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useActivity } from "@/context/ActivityContext";
import { useToast } from "@/hooks/use-toast";
import CollaborateTabs from "./CollaborateTabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const CollaborationWorkspace = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [documentText, setDocumentText] = useState(`# Quantum Computing: Current Trends and Future Prospects

## Abstract
This collaborative review examines the recent advancements in quantum computing, focusing on hardware developments, algorithm innovations, and potential applications across various domains. We analyze the challenges facing practical quantum advantage and propose research directions to address these obstacles.

## 1. Introduction
Quantum computing leverages the principles of quantum mechanics to perform computations that would be intractable for classical computers. The field has progressed rapidly over the past decade, transitioning from theoretical constructs to working prototypes with increasing qubit counts and improving coherence times.

### 1.1 Historical Context
The concept of quantum computing was first proposed by Richard Feynman in 1982, who suggested that quantum systems could be used to simulate other quantum systems more efficiently than classical computers. Since then, the field has evolved through theoretical developments, experimental breakthroughs, and increasing commercial interest.

### 1.2 Current Landscape
Today, quantum computing sits at a critical juncture. While quantum supremacy demonstrations have shown the potential for quantum advantage in specific problems, achieving practical quantum advantage for real-world applications remains challenging. This paper examines the current state of quantum computing and identifies key research directions.

## 2. Hardware Platforms
Several competing hardware platforms are being developed for quantum computing:

- **Superconducting Qubits**: Currently the most mature platform, used by IBM, Google, and others.
- **Ion Trap Quantum Computers**: Offering high fidelity operations and connectivity.
- **Silicon Quantum Dots**: Promising for scalability due to semiconductor industry compatibility.
- **Topological Qubits**: Potentially more resistant to errors, though still largely theoretical.
- **Photonic Quantum Computing**: Offering advantages for certain algorithms and room-temperature operation.

## 3. Quantum Algorithms and Applications

TODO: Expand this section with recent algorithm developments
`);
  
  const { addActivity } = useActivity();
  const { toast } = useToast();
  
  const saveChanges = () => {
    setIsEditing(false);
    
    toast({
      title: "Changes Saved",
      description: "Your document changes have been saved.",
    });
    
    // Add activity
    addActivity({
      user: {
        name: "John Doe",
        initials: "JD",
        color: "bg-research-300"
      },
      action: "edited",
      target: "Quantum Computing Review",
      targetType: "document",
      path: "/collaborate"
    });
  };
  
  const shareDocument = () => {
    toast({
      title: "Document Shared",
      description: "A shareable link has been copied to your clipboard.",
    });
    
    // Add activity
    addActivity({
      user: {
        name: "John Doe",
        initials: "JD",
        color: "bg-research-300"
      },
      action: "shared",
      target: "Quantum Computing Review",
      targetType: "share",
      path: "/collaborate"
    });
  };
  
  const downloadDocument = () => {
    toast({
      title: "Document Downloaded",
      description: "The document has been downloaded as a markdown file.",
    });
    
    // Create a download link
    const blob = new Blob([documentText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quantum_computing_review.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const createVersion = () => {
    toast({
      title: "Version Created",
      description: "A new version of this document has been saved.",
    });
    
    // Add activity
    addActivity({
      user: {
        name: "John Doe",
        initials: "JD",
        color: "bg-research-300"
      },
      action: "created version of",
      target: "Quantum Computing Review",
      targetType: "version",
      path: "/collaborate"
    });
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Collaboration Workspace</h1>
          <p className="text-muted-foreground">
            Work together on research papers, share ideas, and collaborate in real-time
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={createVersion} className="gap-1">
            <GitBranch className="h-4 w-4" />
            Save Version
          </Button>
          <Button variant="outline" onClick={downloadDocument} className="gap-1">
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" onClick={shareDocument} className="gap-1">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          {isEditing ? (
            <Button onClick={saveChanges} className="gap-1">
              <Save className="h-4 w-4" />
              Save
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="gap-1">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardContent className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-research-100 rounded-md flex items-center justify-center text-research-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium">Quantum Computing Review</h2>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Collaborative</Badge>
                      <span className="text-xs text-muted-foreground">
                        Last edited 5 minutes ago
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="bg-primary text-primary-foreground">JD</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="bg-blue-500 text-white">AS</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="bg-green-500 text-white">BJ</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto bg-muted/20 rounded-lg p-4">
                {isEditing ? (
                  <textarea
                    value={documentText}
                    onChange={(e) => setDocumentText(e.target.value)}
                    className="w-full h-full resize-none bg-transparent border-none focus:outline-none font-mono text-sm"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-mono text-sm">{documentText}</pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <CollaborateTabs />
        </div>
      </div>
    </div>
  );
};

export default CollaborationWorkspace;
