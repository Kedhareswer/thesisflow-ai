
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Upload, Check, Copy, Share2, Download, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useActivity } from "@/context/ActivityContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface Summary {
  executive: string;
  overview: string;
  significance: string;
  context: string;
}

interface KeyFindings {
  title: string;
  description: string;
}

interface Methodology {
  content: string;
  steps: string[];
}

interface Conclusion {
  main: string[];
  future: string[];
}

interface SummaryData {
  summary: Summary;
  keyFindings: KeyFindings[];
  methodology: Methodology;
  conclusions: Conclusion;
}

const PaperSummarizer = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [paperUploaded, setPaperUploaded] = useState(false);
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  const [paperContent, setPaperContent] = useState("");
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  
  const { addActivity } = useActivity();
  const { toast } = useToast();
  
  const handleUpload = () => {
    setIsUploading(true);
    // Simulate file upload
    setTimeout(() => {
      setIsUploading(false);
      setPaperUploaded(true);
      setPaperContent(`
        Quantum Mechanics: Current Trends and Future Prospects
        
        Abstract: This paper reviews the current state of quantum mechanics, 
        focusing on recent experimental advances and theoretical developments. We explore the 
        implications of these findings for quantum computing, quantum communication, and 
        quantum sensing technologies. Additionally, we discuss the philosophical interpretations 
        of quantum mechanics and their scientific significance.
        
        Keywords: quantum mechanics, quantum computing, entanglement, 
        quantum superposition, wave-particle duality, quantum field theory
        
        1. Introduction
        Quantum mechanics remains one of the most successful yet conceptually challenging 
        theories in modern physics. Since its inception in the early 20th century, it has 
        transformed our understanding of the physical world at the microscopic level and 
        led to numerous technological innovations.
        
        The purpose of this review is to provide a comprehensive overview of recent advances 
        in quantum mechanics, both experimental and theoretical, and to discuss their implications
        for emerging quantum technologies. We also aim to clarify the current status of various 
        interpretations of quantum mechanics and their relevance to ongoing research.
        
        2. Recent Experimental Advances
        The past decade has witnessed remarkable progress in experimental quantum physics...
      `);
      
      // Add activity for upload
      addActivity({
        user: {
          name: "John Doe",
          initials: "JD",
          color: "bg-research-300"
        },
        action: "uploaded",
        target: "Quantum_Physics_Research.pdf",
        targetType: "document",
        path: "/summarizer"
      });
      
      toast({
        title: "Paper Uploaded",
        description: "Quantum_Physics_Research.pdf has been uploaded successfully.",
      });
    }, 1500);
  };
  
  const generateSummary = async () => {
    if (!apiKey && !showApiKeyInput) {
      setShowApiKeyInput(true);
      toast({
        title: "API Key Required",
        description: "Please enter your Gemini API key to continue.",
        variant: "destructive"
      });
      return;
    }
    
    if (!apiKey && showApiKeyInput) {
      toast({
        title: "API Key Required",
        description: "Please enter your Gemini API key to continue.",
        variant: "destructive"
      });
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      // Prepare prompt for Gemini
      const prompt = `
        Please analyze the following research paper and generate a comprehensive summary with the following sections:
        
        1. Executive Summary (1-2 short paragraphs)
        2. Overview (2-3 paragraphs explaining the paper)
        3. Significance (1-2 paragraphs on why this research matters)
        4. Research Context (1-2 paragraphs on how this fits into the field)
        5. Key Findings (4-5 bullet points with titles and descriptions)
        6. Methodology (summary and list of steps)
        7. Main Conclusions (4-5 bullet points)
        8. Future Research Directions (list of bullet points)
        
        Format the response as structured JSON with these sections. Make the summary professional, accurate, and accessible to someone with background knowledge in the field.
        
        Here is the paper text:
        ${paperContent}
      `;
      
      // For demo purposes, we'll simulate the API call
      // In a real implementation, this would call the Gemini API using the API key
      setTimeout(() => {
        // Simulated API response
        const mockSummaryData: SummaryData = {
          summary: {
            executive: "This paper provides a comprehensive review of quantum mechanics, focusing on recent experimental advances, theoretical developments, and their implications for quantum technologies. The authors discuss the current state of quantum computing, communication, and sensing, as well as philosophical interpretations of quantum mechanics.",
            overview: "The paper \"Quantum Mechanics: Current Trends and Future Prospects\" offers a thorough examination of recent developments in quantum physics and their potential applications. The authors highlight several breakthrough experiments that have validated theoretical predictions and opened new avenues for research.",
            significance: "This work is significant as it synthesizes diverse strands of research across theoretical and experimental quantum physics. It identifies emerging trends and potential breakthrough areas, particularly in quantum computing where recent advances in error correction and quantum gate fidelity have brought practical quantum computers closer to reality.",
            context: "The paper positions itself within the broader context of quantum physics research, acknowledging foundational work while emphasizing recent innovations. It connects theoretical advances with experimental validations and technological applications, providing a holistic view of the field's current state and future directions."
          },
          keyFindings: [
            {
              title: "Quantum Superposition Limits",
              description: "Experimental confirmation of quantum superposition in larger systems than previously achieved, with objects containing thousands of atoms demonstrating quantum behavior."
            },
            {
              title: "Entanglement Distribution",
              description: "Record-breaking quantum entanglement distribution over 1,200 kilometers using satellite-based quantum communication, demonstrating feasibility of global quantum networks."
            },
            {
              title: "Quantum Computing Error Correction",
              description: "Implementation of fault-tolerant quantum error correction protocols that significantly extend qubit coherence times, a critical step toward practical quantum computing."
            },
            {
              title: "Quantum Sensing",
              description: "Development of quantum sensors achieving measurement precision beyond classical limits in detecting gravitational fields, magnetic fields, and time measurements."
            }
          ],
          methodology: {
            content: "The authors employed a systematic review methodology, analyzing over 200 peer-reviewed publications from the past five years. Their approach included:",
            steps: [
              "Comprehensive literature search across major physics and quantum information databases",
              "Classification of research by experimental technique, theoretical approach, and application domain",
              "Critical evaluation of experimental results and their statistical significance",
              "Comparative analysis of competing theoretical frameworks",
              "Assessment of technological readiness levels for quantum applications"
            ]
          },
          conclusions: {
            main: [
              "Quantum Computing Viability: Practical quantum computers with 100+ logical qubits are likely achievable within the next decade, capable of solving specific problems beyond classical computing capabilities.",
              "Quantum Networks: Global quantum communication networks are technically feasible, with remaining challenges primarily in engineering rather than fundamental physics.",
              "Quantum Sensing Applications: Quantum sensors will find immediate applications in medicine, geology, and navigation, potentially revolutionizing these fields within 5-10 years.",
              "Interpretational Questions: While philosophical debates about quantum mechanics continue, the pragmatic approach of focusing on predictions and applications has proven most fruitful for advancing the field."
            ],
            future: [
              "Improving quantum error correction efficiency",
              "Developing room-temperature quantum computing platforms",
              "Creating standardized interfaces between quantum and classical systems",
              "Exploring quantum effects in biological systems"
            ]
          }
        };
        
        setSummaryData(mockSummaryData);
        setIsAnalyzing(false);
        setSummaryGenerated(true);
        
        // Add activity for summary generation
        addActivity({
          user: {
            name: "John Doe",
            initials: "JD",
            color: "bg-research-300"
          },
          action: "summarized",
          target: "Quantum Mechanics Paper",
          targetType: "summary",
          path: "/summarizer"
        });
        
        toast({
          title: "Summary Generated",
          description: "AI-powered summary of your paper is now ready.",
        });
      }, 2000);
      
    } catch (error) {
      setIsAnalyzing(false);
      toast({
        title: "Error",
        description: "Failed to generate summary. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to Clipboard",
      description: "Content has been copied to your clipboard.",
    });
  };
  
  const downloadSummary = () => {
    if (!summaryData) return;
    
    const summaryText = `
# Paper Summary: Quantum Mechanics: Current Trends and Future Prospects

## Executive Summary
${summaryData.summary.executive}

## Overview
${summaryData.summary.overview}

## Significance
${summaryData.summary.significance}

## Research Context
${summaryData.summary.context}

## Key Findings
${summaryData.keyFindings.map(finding => `- **${finding.title}**: ${finding.description}`).join('\n')}

## Methodology
${summaryData.methodology.content}
${summaryData.methodology.steps.map(step => `- ${step}`).join('\n')}

## Main Conclusions
${summaryData.conclusions.main.map(conclusion => `- ${conclusion}`).join('\n')}

## Future Research Directions
${summaryData.conclusions.future.map(direction => `- ${direction}`).join('\n')}

Generated on ${new Date().toLocaleDateString()}
    `;
    
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paper_summary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Summary Downloaded",
      description: "The summary has been downloaded as a text file.",
    });
  };
  
  const shareSummary = () => {
    toast({
      title: "Share Link Created",
      description: "A shareable link has been copied to your clipboard.",
    });
    
    navigator.clipboard.writeText("https://research-hub.example/shared/summary/qm-trends-prospects");
    
    addActivity({
      user: {
        name: "John Doe",
        initials: "JD",
        color: "bg-research-300"
      },
      action: "shared",
      target: "paper summary",
      targetType: "share",
      path: "/summarizer"
    });
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Paper Summarizer</h1>
          <p className="text-muted-foreground">
            Upload research papers to get AI-generated summaries and key insights
          </p>
        </div>
      </div>
      
      {showApiKeyInput && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h3 className="font-medium">API Key Required</h3>
            </div>
            <p className="text-sm mb-4">
              To use the Gemini API for paper summarization, please enter your API key below. 
              This key will only be used for this session and will not be stored.
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key..."
                className="flex-1"
              />
              <Button onClick={() => setShowApiKeyInput(false)} disabled={!apiKey}>
                Save Key
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Upload Area */}
        <div className="lg:col-span-5">
          <Card className="h-full flex flex-col">
            <CardContent className="flex-1 p-6 flex flex-col">
              {!paperUploaded ? (
                <div className="border-2 border-dashed rounded-lg border-muted-foreground/25 flex-1 flex flex-col items-center justify-center p-6">
                  <div className="flex flex-col items-center max-w-xs text-center">
                    <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="font-medium text-lg mb-2">Upload Research Paper</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Drag and drop your PDF file, or click the button below to upload
                    </p>
                    <Button 
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="gap-2"
                    >
                      {isUploading ? (
                        <>Uploading...</>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Select PDF File
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-research-100 rounded-md flex items-center justify-center text-research-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">Quantum_Physics_Research.pdf</h3>
                        <p className="text-xs text-muted-foreground">3.2 MB • Uploaded 2 minutes ago</p>
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm" onClick={() => setPaperUploaded(false)}>
                      Replace
                    </Button>
                  </div>
                  
                  <div className="flex-1 overflow-auto bg-muted/50 rounded-lg p-4 mb-4">
                    <div className="prose prose-sm max-w-none">
                      <h2>Quantum Mechanics: Current Trends and Future Prospects</h2>
                      <p>
                        <strong>Abstract:</strong> This paper reviews the current state of quantum mechanics, 
                        focusing on recent experimental advances and theoretical developments. We explore the 
                        implications of these findings for quantum computing, quantum communication, and 
                        quantum sensing technologies. Additionally, we discuss the philosophical interpretations 
                        of quantum mechanics and their scientific significance.
                      </p>
                      <p>
                        <strong>Keywords:</strong> quantum mechanics, quantum computing, entanglement, 
                        quantum superposition, wave-particle duality, quantum field theory
                      </p>
                      <p>
                        <strong>1. Introduction</strong><br />
                        Quantum mechanics remains one of the most successful yet conceptually challenging 
                        theories in modern physics. Since its inception in the early 20th century, it has 
                        transformed our understanding of the physical world at the microscopic level and 
                        led to numerous technological innovations.
                      </p>
                      <p>
                        The purpose of this review is to provide a comprehensive overview of recent advances 
                        in quantum mechanics, both experimental and theoretical, and to discuss their implications
                        for emerging quantum technologies. We also aim to clarify the current status of various 
                        interpretations of quantum mechanics and their relevance to ongoing research.
                      </p>
                      <p>
                        <strong>2. Recent Experimental Advances</strong><br />
                        The past decade has witnessed remarkable progress in experimental quantum physics...
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <Button 
                      onClick={generateSummary} 
                      disabled={isAnalyzing || (!apiKey && !showApiKeyInput)}
                      className="w-full"
                    >
                      {isAnalyzing ? (
                        <>Analyzing Paper...</>
                      ) : summaryGenerated ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Summary Generated
                        </>
                      ) : (
                        <>Generate Summary</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Summary Area */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col">
            <CardContent className="flex-1 p-6 flex flex-col">
              {!summaryGenerated ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <div className="max-w-md">
                    <div className="bg-research-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-research-400" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">AI-Powered Summary</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload a research paper and generate a comprehensive summary highlighting key findings, 
                      methodologies, and conclusions.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                      <Badge variant="outline">Key Findings</Badge>
                      <Badge variant="outline">Methodology</Badge>
                      <Badge variant="outline">Results</Badge>
                      <Badge variant="outline">Implications</Badge>
                    </div>
                  </div>
                </div>
              ) : summaryData ? (
                <div className="flex-1 flex flex-col">
                  <Tabs defaultValue="summary" className="flex-1 flex flex-col">
                    <TabsList className="mb-4">
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      <TabsTrigger value="keyFindings">Key Findings</TabsTrigger>
                      <TabsTrigger value="methodology">Methodology</TabsTrigger>
                      <TabsTrigger value="conclusions">Conclusions</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="summary" className="flex-1 mt-0 space-y-4">
                      <div className="bg-muted/30 p-4 rounded-lg text-sm">
                        <p className="font-medium text-research-500 mb-1">Executive Summary</p>
                        <p>{summaryData.summary.executive}</p>
                      </div>
                      
                      <h3 className="font-medium text-lg">Overview</h3>
                      <p>{summaryData.summary.overview}</p>
                      
                      <h3 className="font-medium text-lg">Significance</h3>
                      <p>{summaryData.summary.significance}</p>
                      
                      <h3 className="font-medium text-lg">Research Context</h3>
                      <p>{summaryData.summary.context}</p>
                    </TabsContent>
                    
                    <TabsContent value="keyFindings" className="flex-1 mt-0">
                      <div className="space-y-4">
                        {summaryData.keyFindings.map((finding, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <h4 className="font-medium text-research-500">{finding.title}</h4>
                            <p className="text-sm">{finding.description}</p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="methodology" className="flex-1 mt-0">
                      <p className="mb-4">{summaryData.methodology.content}</p>
                      
                      <ul className="space-y-2 ml-6 list-disc mb-4">
                        {summaryData.methodology.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ul>
                    </TabsContent>
                    
                    <TabsContent value="conclusions" className="flex-1 mt-0">
                      <h3 className="font-medium text-lg mb-3">Main Conclusions</h3>
                      
                      <div className="space-y-4 mb-6">
                        {summaryData.conclusions.main.map((conclusion, index) => (
                          <p key={index}>
                            {index + 1}. <strong>{conclusion.split(':')[0]}:</strong> {conclusion.split(':')[1]}
                          </p>
                        ))}
                      </div>
                      
                      <h3 className="font-medium text-lg mb-3">Future Research Directions</h3>
                      <p>The authors identify several promising areas for future research, including:</p>
                      <ul className="space-y-2 ml-6 list-disc">
                        {summaryData.conclusions.future.map((direction, index) => (
                          <li key={index}>{direction}</li>
                        ))}
                      </ul>
                    </TabsContent>
                  </Tabs>
                  
                  <div className="flex justify-between items-center border-t pt-4 mt-4">
                    <div className="text-sm text-muted-foreground">
                      Generated April 19, 2025 • 2-minute read
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyContent(JSON.stringify(summaryData, null, 2))}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadSummary}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button size="sm" onClick={shareSummary}>
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaperSummarizer;
