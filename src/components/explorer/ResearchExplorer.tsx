
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Bookmark, ExternalLink, ThumbsUp, ThumbsDown, Copy, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivity } from "@/context/ActivityContext";

const ResearchExplorer = () => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const { addActivity } = useActivity();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setIsSearching(false);
      setHasSearched(true);
      
      // Add activity for search
      addActivity({
        user: {
          name: "John Doe",
          initials: "JD",
          color: "bg-research-300"
        },
        action: "searched for",
        target: query.substring(0, 30) + (query.length > 30 ? "..." : ""),
        targetType: "query",
        path: "/explorer"
      });
    }, 1500);
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Research Explorer</h1>
          <p className="text-muted-foreground">
            Ask questions about research papers and get AI-powered answers
          </p>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about quantum physics, machine learning, or any research topic..."
                className="pr-20 py-6 text-base"
              />
              <Button 
                type="submit" 
                className="absolute right-1 top-1 bottom-1"
                disabled={isSearching || !query.trim()}
              >
                {isSearching ? "Searching..." : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
            
            {!hasSearched && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setQuery("What are the latest advances in quantum computing?")}>
                  Quantum computing advances
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setQuery("Explain transformer models in natural language processing")}>
                  Transformer models explained
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setQuery("Current research on climate change mitigation")}>
                  Climate change research
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setQuery("CRISPR technology applications in medicine")}>
                  CRISPR applications
                </Badge>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
      
      {hasSearched && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 pb-4 border-b flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-medium mb-1">
                      Recent Advances in Quantum Computing
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Based on 15 research papers from the past 3 years
                    </p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Bookmark className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="prose prose-sm max-w-none">
                  <p>
                    Quantum computing has seen significant advances in the past few years across hardware, 
                    software, and theoretical foundations. Here's a summary of key developments:
                  </p>
                  
                  <h3>Hardware Breakthroughs</h3>
                  <p>
                    Recent hardware advances have focused on increasing qubit count while reducing error rates:
                  </p>
                  <ul>
                    <li>
                      <strong>Superconducting Qubits:</strong> IBM and Google have made substantial progress 
                      with superconducting qubits, with Google's Sycamore processor demonstrating quantum 
                      supremacy in 2019, and IBM recently unveiling their 127-qubit Eagle processor with 
                      improved coherence times.
                    </li>
                    <li>
                      <strong>Ion Trap Quantum Computers:</strong> IonQ and Honeywell have advanced ion trap 
                      technology, with IonQ claiming record-high quantum volume measurements and Honeywell 
                      achieving unprecedented gate fidelities exceeding 99.99%.
                    </li>
                    <li>
                      <strong>Silicon Quantum Dots:</strong> Research teams at UNSW Australia and TU Delft 
                      have made progress with silicon-based qubits, which offer potential scalability 
                      advantages due to their compatibility with existing semiconductor manufacturing.
                    </li>
                  </ul>
                  
                  <h3>Quantum Error Correction</h3>
                  <p>
                    Error correction represents one of the most critical advances:
                  </p>
                  <ul>
                    <li>
                      <strong>Surface Code Implementation:</strong> Google's quantum AI team demonstrated the 
                      first implementation of a distance-3 surface code, showing that quantum error correction 
                      can provide a net benefit in real hardware systems.
                    </li>
                    <li>
                      <strong>Logical Qubits:</strong> Several teams have demonstrated logical qubits with 
                      error rates lower than their constituent physical qubits, a crucial milestone toward 
                      fault-tolerant quantum computing.
                    </li>
                  </ul>
                  
                  <h3>Quantum Algorithms and Applications</h3>
                  <p>
                    Algorithm development has focused on near-term applications:
                  </p>
                  <ul>
                    <li>
                      <strong>Variational Quantum Algorithms:</strong> Researchers have improved QAOA 
                      (Quantum Approximate Optimization Algorithm) and VQE (Variational Quantum Eigensolver) 
                      for optimization and chemistry problems, making them more resilient to noise.
                    </li>
                    <li>
                      <strong>Quantum Machine Learning:</strong> Quantum versions of machine learning 
                      algorithms have shown potential speedups for specific problems, including 
                      quantum neural networks and quantum support vector machines.
                    </li>
                    <li>
                      <strong>Quantum Simulation:</strong> Quantum computers have successfully simulated 
                      complex molecular systems and quantum materials that would be intractable for 
                      classical computers.
                    </li>
                  </ul>
                  
                  <h3>Commercial and Industry Developments</h3>
                  <p>
                    The quantum computing ecosystem has expanded rapidly:
                  </p>
                  <ul>
                    <li>
                      <strong>Cloud Quantum Computing:</strong> Amazon, Microsoft, IBM, and Google now offer 
                      cloud access to quantum processors, democratizing access to quantum hardware.
                    </li>
                    <li>
                      <strong>Industry Applications:</strong> Financial institutions, pharmaceutical companies, 
                      and materials science firms have begun exploring practical quantum applications through 
                      partnerships with quantum hardware providers.
                    </li>
                  </ul>
                  
                  <h3>Future Outlook</h3>
                  <p>
                    While practical quantum advantage for commercially relevant problems remains elusive, 
                    the field is progressing faster than many had predicted. Experts anticipate that the 
                    next few years will see quantum computers with 1,000+ physical qubits and the first 
                    demonstrations of error-corrected logical qubits with sufficient fidelity for practical 
                    applications.
                  </p>
                </div>
                
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      Helpful
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1">
                      <ThumbsDown className="h-4 w-4" />
                      Not helpful
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-3">Related Research Papers</h3>
              <div className="space-y-4">
                <Card className="overflow-hidden">
                  <div className="p-4 flex justify-between">
                    <div>
                      <h4 className="font-medium mb-1">
                        Quantum Advantage with Noisy Intermediate-Scale Quantum Processors
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Zhang et al. (2023) • Nature Physics
                      </p>
                      <p className="text-sm line-clamp-2">
                        This paper demonstrates quantum advantage for a specific sampling problem using 
                        a 72-qubit processor with error mitigation techniques.
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
                
                <Card className="overflow-hidden">
                  <div className="p-4 flex justify-between">
                    <div>
                      <h4 className="font-medium mb-1">
                        Fault-Tolerant Quantum Error Correction with Low Overhead
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Johnson et al. (2024) • Science
                      </p>
                      <p className="text-sm line-clamp-2">
                        A novel approach to quantum error correction that significantly reduces the 
                        number of physical qubits required per logical qubit.
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
                
                <Card className="overflow-hidden">
                  <div className="p-4 flex justify-between">
                    <div>
                      <h4 className="font-medium mb-1">
                        Quantum Machine Learning for Drug Discovery Applications
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Patel et al. (2022) • Chemical Science
                      </p>
                      <p className="text-sm line-clamp-2">
                        An experimental demonstration of quantum algorithms for molecular property prediction 
                        with potential applications in pharmaceutical research.
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <History className="h-4 w-4 text-research-400" />
                  Search History
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="p-2 rounded-md hover:bg-muted">
                    <p className="font-medium line-clamp-1">What are the latest advances in quantum computing?</p>
                    <p className="text-xs text-muted-foreground">2 mins ago</p>
                  </div>
                  
                  <div className="p-2 rounded-md hover:bg-muted">
                    <p className="font-medium line-clamp-1">CRISPR gene editing techniques for cancer treatment</p>
                    <p className="text-xs text-muted-foreground">Yesterday</p>
                  </div>
                  
                  <div className="p-2 rounded-md hover:bg-muted">
                    <p className="font-medium line-clamp-1">Compare transformer and RNN models in NLP</p>
                    <p className="text-xs text-muted-foreground">2 days ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-4">Explore Topics</h3>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">Quantum Computing</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">Machine Learning</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">Climate Science</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">Biotechnology</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">Robotics</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">Neuroscience</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">Astrophysics</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">Materials Science</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-4">Saved Responses</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="p-2 rounded-md hover:bg-muted">
                    <p className="font-medium">Neural Network Architectures</p>
                    <p className="text-xs text-muted-foreground">Saved Apr 15, 2025</p>
                  </div>
                  
                  <div className="p-2 rounded-md hover:bg-muted">
                    <p className="font-medium">Climate Change Mitigation Strategies</p>
                    <p className="text-xs text-muted-foreground">Saved Apr 10, 2025</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {isSearching && (
        <div className="flex-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 pb-4 border-b flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-7 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
              
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                
                <div className="py-2">
                  <Skeleton className="h-5 w-1/3 mb-3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                
                <div className="py-2">
                  <Skeleton className="h-5 w-1/4 mb-3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {!hasSearched && !isSearching && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="max-w-lg">
            <div className="bg-research-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="h-10 w-10 text-research-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Explore Research with AI</h2>
            <p className="text-muted-foreground mb-6">
              Ask questions about any research topic and get comprehensive, accurate answers powered 
              by AI analysis of academic papers and scientific literature.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge className="bg-research-300 hover:bg-research-400 text-white">Real-time analysis</Badge>
              <Badge className="bg-research-300 hover:bg-research-400 text-white">Citation sources</Badge>
              <Badge className="bg-research-300 hover:bg-research-400 text-white">Expert insights</Badge>
              <Badge className="bg-research-300 hover:bg-research-400 text-white">Latest research</Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchExplorer;
