
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileSearch, 
  ExternalLink, 
  Bookmark, 
  Calendar, 
  Users, 
  BookOpen,
  Search
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useActivity } from "@/context/ActivityContext";

interface Paper {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  abstract: string;
  doi: string;
  citations: number;
}

const LiteratureSearch = () => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Paper[]>([]);
  const { toast } = useToast();
  const { addActivity } = useActivity();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    
    // Add activity
    addActivity({
      user: {
        name: "John Doe",
        initials: "JD",
        color: "bg-research-300"
      },
      action: "searched for literature on",
      target: query,
      targetType: "search",
      path: "/explorer"
    });
    
    // Simulate API call with timeout
    setTimeout(() => {
      // Generate fake search results based on query
      const results: Paper[] = [
        {
          id: "1",
          title: `Recent Advances in ${query.charAt(0).toUpperCase() + query.slice(1)} Research`,
          authors: ["J. Smith", "A. Johnson", "M. Williams"],
          journal: "Journal of Advanced Research",
          year: 2024,
          abstract: `This comprehensive review examines the latest developments in ${query} over the past five years. The paper highlights breakthrough methodologies, key findings, and emerging trends that are shaping this rapidly evolving field.`,
          doi: "10.1234/jar.2024.0123",
          citations: 87
        },
        {
          id: "2",
          title: `${query.charAt(0).toUpperCase() + query.slice(1)} Applications in Healthcare Systems`,
          authors: ["R. Chen", "S. Patel", "D. Garcia"],
          journal: "Medical Technology & Innovation",
          year: 2023,
          abstract: `This study explores the practical applications of ${query} in modern healthcare systems. Through a series of case studies and experimental data, the authors demonstrate how these technologies can improve patient outcomes and operational efficiency.`,
          doi: "10.1234/mti.2023.0456",
          citations: 42
        },
        {
          id: "3",
          title: `Theoretical Foundations of ${query.charAt(0).toUpperCase() + query.slice(1)}`,
          authors: ["L. Brown", "T. Wilson", "E. Taylor"],
          journal: "Theoretical Sciences Quarterly",
          year: 2022,
          abstract: `This paper presents a unified theoretical framework for understanding ${query}. Building on previous work, the authors introduce novel mathematical models that better predict and explain observed phenomena in experimental settings.`,
          doi: "10.1234/tsq.2022.0789",
          citations: 124
        },
        {
          id: "4",
          title: `Ethical Considerations in ${query.charAt(0).toUpperCase() + query.slice(1)} Development`,
          authors: ["N. Ahmed", "K. Lee", "O. Miller"],
          journal: "Ethics & Technology Review",
          year: 2023,
          abstract: `As ${query} becomes increasingly integrated into society, this paper addresses the critical ethical questions that arise. The authors propose a comprehensive ethical framework to guide researchers, policymakers, and practitioners in this field.`,
          doi: "10.1234/etr.2023.1012",
          citations: 56
        },
        {
          id: "5",
          title: `Comparative Analysis of ${query.charAt(0).toUpperCase() + query.slice(1)} Methods`,
          authors: ["V. Rodriguez", "F. Kim", "H. Nguyen"],
          journal: "Comparative Research Studies",
          year: 2024,
          abstract: `This study offers a comprehensive comparison of different approaches to ${query}. Through rigorous experimental testing and statistical analysis, the authors identify the most effective methodologies for various application contexts.`,
          doi: "10.1234/crs.2024.1345",
          citations: 31
        }
      ];
      
      setSearchResults(results);
      setIsSearching(false);
      
      toast({
        title: "Search Complete",
        description: `Found ${results.length} papers on ${query}`,
      });
    }, 2000);
  };
  
  const saveToCollection = (paper: Paper) => {
    toast({
      title: "Paper Saved",
      description: "The paper has been added to your collection.",
    });
    
    // Add activity
    addActivity({
      user: {
        name: "John Doe",
        initials: "JD",
        color: "bg-research-300"
      },
      action: "saved",
      target: paper.title.substring(0, 30) + (paper.title.length > 30 ? "..." : ""),
      targetType: "document",
      path: "/explorer"
    });
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-6 flex-1 flex flex-col">
        <div className="flex items-center mb-4 gap-2">
          <FileSearch className="h-5 w-5 text-research-400" />
          <h2 className="text-xl font-medium">Literature Search</h2>
        </div>
        
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for research papers, articles, and journals..."
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
          
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setQuery("machine learning")}>
              Machine Learning
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setQuery("genomics")}>
              Genomics
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setQuery("renewable energy")}>
              Renewable Energy
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setQuery("neural networks")}>
              Neural Networks
            </Badge>
          </div>
        </form>
        
        <div className="flex-1 overflow-auto">
          {isSearching ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-4">
              {searchResults.map((paper) => (
                <div key={paper.id} className="p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-base">{paper.title}</h3>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => saveToCollection(paper)}>
                        <Bookmark className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap text-sm text-muted-foreground gap-x-4 gap-y-1 mb-2">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{paper.authors.join(", ")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{paper.journal}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{paper.year}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm mb-2">{paper.abstract}</p>
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>DOI: {paper.doi}</span>
                    <span>Citations: {paper.citations}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <FileSearch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Search for Research Papers</h3>
              <p className="text-muted-foreground mb-4">
                Enter keywords, authors, or topics to find relevant research papers
                across various academic databases and journals.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiteratureSearch;
