
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Upload, Check, Copy, Share2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useActivity } from "@/context/ActivityContext";

const PaperSummarizer = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [paperUploaded, setPaperUploaded] = useState(false);
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  
  const { addActivity } = useActivity();
  
  const handleUpload = () => {
    setIsUploading(true);
    // Simulate file upload
    setTimeout(() => {
      setIsUploading(false);
      setPaperUploaded(true);
      
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
    }, 1500);
  };
  
  const generateSummary = () => {
    setIsAnalyzing(true);
    // Simulate AI processing
    setTimeout(() => {
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
    }, 2000);
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
                      disabled={isAnalyzing || summaryGenerated}
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
              ) : (
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
                        <p>
                          This paper provides a comprehensive review of quantum mechanics, focusing on recent 
                          experimental advances, theoretical developments, and their implications for quantum 
                          technologies. The authors discuss the current state of quantum computing, communication, 
                          and sensing, as well as philosophical interpretations of quantum mechanics.
                        </p>
                      </div>
                      
                      <h3 className="font-medium text-lg">Overview</h3>
                      <p>
                        The paper "Quantum Mechanics: Current Trends and Future Prospects" offers a thorough 
                        examination of recent developments in quantum physics and their potential applications. 
                        The authors highlight several breakthrough experiments that have validated theoretical 
                        predictions and opened new avenues for research.
                      </p>
                      
                      <p>
                        Key areas of focus include quantum computing advancements, quantum communication protocols, 
                        and improvements in quantum sensing technologies. The review also addresses ongoing debates 
                        regarding the interpretation of quantum mechanical phenomena and their philosophical implications.
                      </p>
                      
                      <h3 className="font-medium text-lg">Significance</h3>
                      <p>
                        This work is significant as it synthesizes diverse strands of research across theoretical 
                        and experimental quantum physics. It identifies emerging trends and potential breakthrough 
                        areas, particularly in quantum computing where recent advances in error correction and 
                        quantum gate fidelity have brought practical quantum computers closer to reality.
                      </p>
                      
                      <h3 className="font-medium text-lg">Research Context</h3>
                      <p>
                        The paper positions itself within the broader context of quantum physics research, 
                        acknowledging foundational work while emphasizing recent innovations. It connects 
                        theoretical advances with experimental validations and technological applications, 
                        providing a holistic view of the field's current state and future directions.
                      </p>
                    </TabsContent>
                    
                    <TabsContent value="keyFindings" className="flex-1 mt-0">
                      <div className="space-y-4">
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium text-research-500">Quantum Superposition Limits</h4>
                          <p className="text-sm">
                            Experimental confirmation of quantum superposition in larger systems than previously 
                            achieved, with objects containing thousands of atoms demonstrating quantum behavior.
                          </p>
                        </div>
                        
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium text-research-500">Entanglement Distribution</h4>
                          <p className="text-sm">
                            Record-breaking quantum entanglement distribution over 1,200 kilometers using 
                            satellite-based quantum communication, demonstrating feasibility of global 
                            quantum networks.
                          </p>
                        </div>
                        
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium text-research-500">Quantum Computing Error Correction</h4>
                          <p className="text-sm">
                            Implementation of fault-tolerant quantum error correction protocols that significantly 
                            extend qubit coherence times, a critical step toward practical quantum computing.
                          </p>
                        </div>
                        
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium text-research-500">Quantum Sensing</h4>
                          <p className="text-sm">
                            Development of quantum sensors achieving measurement precision beyond classical 
                            limits in detecting gravitational fields, magnetic fields, and time measurements.
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="methodology" className="flex-1 mt-0">
                      <p className="mb-4">
                        The authors employed a systematic review methodology, analyzing over 200 peer-reviewed 
                        publications from the past five years. Their approach included:
                      </p>
                      
                      <ul className="space-y-2 ml-6 list-disc mb-4">
                        <li>
                          Comprehensive literature search across major physics and quantum information databases
                        </li>
                        <li>
                          Classification of research by experimental technique, theoretical approach, and application domain
                        </li>
                        <li>
                          Critical evaluation of experimental results and their statistical significance
                        </li>
                        <li>
                          Comparative analysis of competing theoretical frameworks
                        </li>
                        <li>
                          Assessment of technological readiness levels for quantum applications
                        </li>
                      </ul>
                      
                      <p>
                        The review methodology emphasized reproducible results and practical applications, 
                        with particular attention to studies demonstrating scalable techniques applicable 
                        to real-world quantum technologies.
                      </p>
                    </TabsContent>
                    
                    <TabsContent value="conclusions" className="flex-1 mt-0">
                      <h3 className="font-medium text-lg mb-3">Main Conclusions</h3>
                      
                      <div className="space-y-4 mb-6">
                        <p>
                          1. <strong>Quantum Computing Viability:</strong> Practical quantum computers with 
                          100+ logical qubits are likely achievable within the next decade, capable of solving 
                          specific problems beyond classical computing capabilities.
                        </p>
                        
                        <p>
                          2. <strong>Quantum Networks:</strong> Global quantum communication networks are 
                          technically feasible, with remaining challenges primarily in engineering rather 
                          than fundamental physics.
                        </p>
                        
                        <p>
                          3. <strong>Quantum Sensing Applications:</strong> Quantum sensors will find immediate 
                          applications in medicine, geology, and navigation, potentially revolutionizing these 
                          fields within 5-10 years.
                        </p>
                        
                        <p>
                          4. <strong>Interpretational Questions:</strong> While philosophical debates about 
                          quantum mechanics continue, the pragmatic approach of focusing on predictions and 
                          applications has proven most fruitful for advancing the field.
                        </p>
                      </div>
                      
                      <h3 className="font-medium text-lg mb-3">Future Research Directions</h3>
                      <p>
                        The authors identify several promising areas for future research, including:
                      </p>
                      <ul className="space-y-2 ml-6 list-disc">
                        <li>Improving quantum error correction efficiency</li>
                        <li>Developing room-temperature quantum computing platforms</li>
                        <li>Creating standardized interfaces between quantum and classical systems</li>
                        <li>Exploring quantum effects in biological systems</li>
                      </ul>
                    </TabsContent>
                  </Tabs>
                  
                  <div className="flex justify-between items-center border-t pt-4 mt-4">
                    <div className="text-sm text-muted-foreground">
                      Generated April 19, 2025 • 2-minute read
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button size="sm">
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaperSummarizer;
