
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, MessageCircle, Copy, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useActivity } from "@/context/ActivityContext";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
}

const ResearchAssistant = () => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const { toast } = useToast();
  const { addActivity } = useActivity();
  
  const sendMessage = () => {
    if (!message.trim()) return;
    
    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      role: "user",
      timestamp: new Date().toLocaleTimeString()
    };
    
    // Add user message to conversation
    setConversation(prev => [...prev, userMessage]);
    
    // Clear input
    setMessage("");
    
    // Simulate sending
    setIsSending(true);
    
    // Add activity
    addActivity({
      user: {
        name: "John Doe",
        initials: "JD",
        color: "bg-research-300"
      },
      action: "sent message to",
      target: "Research Assistant",
      targetType: "message",
      path: "/explorer"
    });
    
    // Simulate AI response after delay
    setTimeout(() => {
      // Create AI response based on user message
      let responseContent = "";
      
      if (userMessage.content.toLowerCase().includes("literature review")) {
        responseContent = "A literature review is a comprehensive summary and analysis of existing research on a specific topic. To conduct an effective literature review, start by defining your research question, then search for relevant papers using academic databases like Google Scholar, PubMed, or JSTOR. Read and analyze each source, looking for key findings, methodologies, and gaps in the research. Organize your review thematically or chronologically, and be sure to critically evaluate each source rather than just summarizing.";
      } 
      else if (userMessage.content.toLowerCase().includes("research methodology")) {
        responseContent = "When selecting a research methodology, consider your research question, the nature of your data, and your research objectives. Quantitative methods are best for measuring numerical data and testing hypotheses, while qualitative methods are ideal for exploring complex phenomena and generating theories. Mixed methods combine both approaches. For data collection, options include surveys, interviews, experiments, observations, and existing data analysis. Each method has strengths and limitations, so align your choice with your research goals.";
      }
      else if (userMessage.content.toLowerCase().includes("data analysis")) {
        responseContent = "Data analysis techniques vary based on your research type. For quantitative data, consider descriptive statistics (mean, median, mode), inferential statistics (t-tests, ANOVA, regression), and software like SPSS, R, or Python. For qualitative data, methods include thematic analysis, content analysis, grounded theory, and tools like NVivo or ATLAS.ti. Begin with data cleaning and organization, then proceed with analysis, interpretation, and validation. Always ensure your analysis approach aligns with your research question and methodological framework.";
      }
      else {
        responseContent = "I'd be happy to help with your research question. Could you provide more specific details about your research topic, methodology, or the stage of research you're currently in? I can assist with literature reviews, research design, data analysis approaches, or help you brainstorm potential research directions.";
      }
      
      // Create assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        role: "assistant",
        timestamp: new Date().toLocaleTimeString()
      };
      
      // Add assistant message to conversation
      setConversation(prev => [...prev, assistantMessage]);
      setIsSending(false);
      
      // Show toast notification
      toast({
        title: "New Response",
        description: "Research Assistant has responded to your question.",
      });
    }, 2000);
  };
  
  const copyResponse = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "The response has been copied to your clipboard.",
    });
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-6 flex-1 flex flex-col">
        <div className="flex items-center mb-4 gap-2">
          <MessageCircle className="h-5 w-5 text-research-400" />
          <h2 className="text-xl font-medium">Research Assistant</h2>
        </div>
        
        <div className="flex-1 overflow-auto mb-4 space-y-4">
          {conversation.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Research Assistant</h3>
              <p className="text-muted-foreground mb-4">
                Ask questions about research methodologies, literature reviews, 
                data analysis, or any other research-related topics.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-md">
                <Button variant="outline" onClick={() => setMessage("How do I conduct a literature review?")}>
                  Literature review tips
                </Button>
                <Button variant="outline" onClick={() => setMessage("What research methodology should I use?")}>
                  Research methodology
                </Button>
                <Button variant="outline" onClick={() => setMessage("Help me with data analysis approaches")}>
                  Data analysis help
                </Button>
                <Button variant="outline" onClick={() => setMessage("How do I structure my research paper?")}>
                  Paper structure
                </Button>
              </div>
            </div>
          ) : (
            <>
              {conversation.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 ${msg.role === "assistant" ? "ml-0" : "ml-auto"} max-w-[85%]`}
                >
                  {msg.role === "assistant" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-research-100 text-research-500">RA</AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`rounded-lg p-3 relative group ${
                    msg.role === "assistant" 
                      ? "bg-muted/30" 
                      : "bg-research-100 text-research-900"
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {msg.timestamp}
                    </span>
                    
                    {msg.role === "assistant" && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyResponse(msg.content)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  {msg.role === "user" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">JD</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
        
        <div className="mt-auto border-t pt-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask a question about your research..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button 
              onClick={sendMessage} 
              disabled={isSending || !message.trim()}
              className="shrink-0"
            >
              {isSending ? "Sending..." : <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResearchAssistant;
