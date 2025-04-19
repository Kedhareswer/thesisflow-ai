
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Copy, Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useActivity } from "@/context/ActivityContext";

const IdeaGenerator = () => {
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<string[]>([]);
  const { toast } = useToast();
  const { addActivity } = useActivity();
  
  const generateIdeas = async () => {
    if (!topic.trim()) return;
    
    setIsGenerating(true);
    
    // In a real implementation, this would be an API call
    // Simulating API call with timeout
    setTimeout(() => {
      const ideas = [
        `Explore the impact of ${topic} on renewable energy technologies`,
        `Investigate the correlation between ${topic} and cognitive development in children`,
        `Analyze how ${topic} influences modern communication systems`,
        `Examine the historical evolution of ${topic} across different cultures`,
        `Research the potential applications of ${topic} in healthcare innovations`
      ];
      
      setGeneratedIdeas(ideas);
      setIsGenerating(false);
      
      // Add activity
      addActivity({
        user: {
          name: "John Doe",
          initials: "JD",
          color: "bg-research-300"
        },
        action: "generated ideas for",
        target: topic,
        targetType: "idea",
        path: "/explorer"
      });
      
      toast({
        title: "Ideas Generated",
        description: "5 research ideas have been generated based on your topic.",
      });
    }, 2000);
  };
  
  const copyIdea = (idea: string) => {
    navigator.clipboard.writeText(idea);
    toast({
      title: "Copied to clipboard",
      description: "The research idea has been copied to your clipboard.",
    });
  };
  
  const saveIdea = (idea: string) => {
    toast({
      title: "Idea Saved",
      description: "The research idea has been saved to your collection.",
    });
    
    // Add activity
    addActivity({
      user: {
        name: "John Doe",
        initials: "JD",
        color: "bg-research-300"
      },
      action: "saved",
      target: "research idea",
      targetType: "idea",
      path: "/explorer"
    });
  };
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center mb-4 gap-2">
          <Sparkles className="h-5 w-5 text-research-400" />
          <h2 className="text-xl font-medium">Research Idea Generator</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Enter a research topic and get AI-generated research ideas and questions
            </p>
            <Textarea
              placeholder="Enter a research topic or area of interest..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setTopic("quantum computing")}>
              Quantum Computing
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setTopic("climate change")}>
              Climate Change
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setTopic("artificial intelligence")}>
              Artificial Intelligence
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setTopic("neuroscience")}>
              Neuroscience
            </Badge>
          </div>
          
          <Button 
            onClick={generateIdeas} 
            disabled={isGenerating || !topic.trim()}
            className="w-full"
          >
            {isGenerating ? "Generating Ideas..." : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Research Ideas
              </>
            )}
          </Button>
        </div>
        
        {generatedIdeas.length > 0 && (
          <div className="mt-6 pt-6 border-t space-y-3">
            <h3 className="font-medium">Generated Research Ideas:</h3>
            {generatedIdeas.map((idea, index) => (
              <div key={index} className="p-3 bg-muted/30 rounded-lg relative group">
                <p>{idea}</p>
                <div className="absolute right-2 top-2 hidden group-hover:flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyIdea(idea)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => saveIdea(idea)}>
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IdeaGenerator;
