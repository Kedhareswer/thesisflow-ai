
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Sparkles, Copy } from "lucide-react";
import { useApiKey } from "@/hooks/useApiKey";
import { generateContent } from "@/utils/api";
import { ApiKeyInput } from "@/components/common/ApiKeyInput";
import { useActivity } from "@/context/ActivityContext";
import { toast } from "sonner";

const PaperSummarizer = () => {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { apiKey } = useApiKey();
  const { addActivity } = useActivity();

  const handleSummarize = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to summarize");
      return;
    }

    if (!apiKey) {
      toast.error("Please set your Gemini API key first");
      return;
    }

    setIsGenerating(true);

    try {
      const prompt = `Please provide a concise academic summary of the following text:\n\n${text}`;
      const result = await generateContent(prompt, apiKey);
      setSummary(result);
      
      addActivity({
        user: {
          name: "John Doe",
          initials: "JD",
          color: "bg-research-300"
        },
        action: "summarized",
        target: "research paper",
        targetType: "summary",
        path: "/summarizer"
      });

      toast.success("Summary generated successfully!");
    } catch (error) {
      console.error("Summarization error:", error);
      toast.error("Failed to generate summary. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <ApiKeyInput />
      
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center mb-4 gap-2">
            <FileText className="h-5 w-5 text-research-400" />
            <h2 className="text-xl font-medium">Paper Summarizer</h2>
          </div>
          
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your research paper text here..."
            className="min-h-[200px] mb-4"
          />
          
          <Button 
            onClick={handleSummarize}
            disabled={isGenerating || !text.trim() || !apiKey}
            className="w-full"
          >
            {isGenerating ? (
              "Generating Summary..."
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Summary
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {summary && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium">Generated Summary</h3>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(summary)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="prose max-w-none">
              {summary.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaperSummarizer;
