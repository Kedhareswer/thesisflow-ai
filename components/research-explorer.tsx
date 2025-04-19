"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Brain, Loader2, Search, BookOpen, Lightbulb, ArrowRight, Copy, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function ResearchExplorer() {
  const [apiKey, setApiKey] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Topic exploration state
  const [researchTopic, setResearchTopic] = useState("")
  const [explorationDepth, setExplorationDepth] = useState(3)
  const [explorationResult, setExplorationResult] = useState("")

  // Literature search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState("keyword")
  const [searchResults, setSearchResults] = useState<any[]>([])

  // Idea generation state
  const [ideaTopic, setIdeaTopic] = useState("")
  const [ideaContext, setIdeaContext] = useState("")
  const [ideaCount, setIdeaCount] = useState(5)
  const [generatedIdeas, setGeneratedIdeas] = useState("")

  const handleExplore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!researchTopic.trim() || !apiKey.trim()) return

    setIsLoading(true)
    setExplorationResult("")

    try {
      // This is a mock implementation - in a real app, you'd call the Gemini API
      const result = await mockExploreResearchTopic(researchTopic, explorationDepth, apiKey)
      setExplorationResult(result)
    } catch (error) {
      setExplorationResult("Error: Failed to explore topic. Please check your API key and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || !apiKey.trim()) return

    setIsLoading(true)
    setSearchResults([])

    try {
      // This is a mock implementation - in a real app, you'd call an academic search API
      const results = await mockSearchLiterature(searchQuery, searchType, apiKey)
      setSearchResults(results)
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateIdeas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ideaTopic.trim() || !apiKey.trim()) return

    setIsLoading(true)
    setGeneratedIdeas("")

    try {
      // This is a mock implementation - in a real app, you'd call the Gemini API
      const ideas = await mockGenerateResearchIdeas(ideaTopic, ideaContext, ideaCount, apiKey)
      setGeneratedIdeas(ideas)
    } catch (error) {
      setGeneratedIdeas("Error: Failed to generate ideas. Please check your API key and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Copied to clipboard!")
      })
      .catch((err) => {
        console.error("Failed to copy: ", err)
      })
  }

  // Mock function to simulate API call for topic exploration
  const mockExploreResearchTopic = async (topic: string, depth: number, key: string) => {
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate network delay

    const depthText = depth <= 2 ? "brief" : depth <= 4 ? "comprehensive" : "in-depth"

    return `# ${topic.toUpperCase()}: RESEARCH EXPLORATION

## Overview
${topic} is a ${["fascinating", "complex", "emerging", "interdisciplinary"][Math.floor(Math.random() * 4)]} field of study that intersects with multiple domains including ${["computer science", "psychology", "economics", "biology", "engineering"][Math.floor(Math.random() * 5)]} and ${["social sciences", "healthcare", "education", "environmental studies", "business"][Math.floor(Math.random() * 5)]}.

## Key Concepts
1. **Foundational Principles**: The core theoretical frameworks that underpin ${topic}
2. **Methodological Approaches**: Common research methods used in ${topic} studies
3. **Current Challenges**: Ongoing problems and limitations in the field
${depth > 2 ? "4. **Emerging Trends**: New directions and innovations in research\n" : ""}${depth > 3 ? "5. **Interdisciplinary Connections**: How this field relates to other domains\n" : ""}

## Major Research Areas
- ${topic} in ${["educational contexts", "healthcare settings", "industrial applications", "policy development", "theoretical frameworks"][Math.floor(Math.random() * 5)]}
- Computational approaches to ${topic}
- Ethical considerations in ${topic} research
${depth > 2 ? "- Cross-cultural perspectives on ${topic}\n" : ""}${depth > 4 ? "- Historical development of ${topic} as a field\n" : ""}

## Leading Researchers & Institutions
- Prof. Sarah Johnson (Stanford University)
- Dr. Michael Chen (MIT)
- The ${topic} Research Group at Oxford University
${depth > 3 ? "- International Association for ${topic} Studies\n" : ""}

## Recommended Starting Points
1. "Introduction to ${topic}" by Williams et al. (2021)
2. "The ${topic} Handbook" edited by Roberts (2020)
3. Journal of ${topic} Studies (peer-reviewed journal)
${depth > 2 ? "4. Annual Review of ${topic} Research (comprehensive review series)\n" : ""}

${
  depth > 4
    ? `## Research Gaps & Opportunities
1. Limited studies on ${topic} in developing countries
2. Need for more longitudinal research on long-term impacts
3. Potential for integrating advanced computational methods
4. Unexplored connections with adjacent fields\n`
    : ""
}

## Next Steps for Your Research
1. Narrow your focus to a specific aspect of ${topic}
2. Review the most recent literature (last 2-3 years)
3. Identify methodological approaches that align with your research questions
4. Consider potential collaborations with experts in complementary fields
5. Develop a clear research plan with specific objectives and timeline

This exploration provides a ${depthText} overview of the ${topic} research landscape to help you begin your investigation. For more detailed guidance, consider consulting with subject matter experts in this field.`
  }

  // Mock function to simulate API call for literature search
  const mockSearchLiterature = async (query: string, type: string, key: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate network delay

    // Generate mock search results
    return [
      {
        title: `Recent Advances in ${query}: A Systematic Review`,
        authors: "Johnson, A., Smith, B., & Williams, C.",
        journal: "Journal of Advanced Research",
        year: "2023",
        abstract: `This paper provides a comprehensive review of recent developments in ${query}, highlighting key methodological advances and empirical findings from the past five years. The authors identify several promising research directions and discuss implications for theory and practice.`,
        citations: 42,
        keywords: ["systematic review", query.toLowerCase(), "research methods", "empirical findings"],
      },
      {
        title: `Exploring the Impact of ${query} on Educational Outcomes`,
        authors: "Chen, D. & Garcia, E.",
        journal: "Educational Research Quarterly",
        year: "2022",
        abstract: `This study investigates how ${query} influences various educational outcomes across different age groups and learning contexts. Using a mixed-methods approach, the researchers demonstrate significant positive effects on student engagement and knowledge retention.`,
        citations: 28,
        keywords: ["education", query.toLowerCase(), "student engagement", "mixed-methods"],
      },
      {
        title: `A Novel Framework for Understanding ${query}`,
        authors: "Patel, F., Rodriguez, G., & Kim, H.",
        journal: "Theoretical Perspectives in Science",
        year: "2023",
        abstract: `The authors propose a new theoretical framework for conceptualizing ${query}, integrating insights from multiple disciplines. This paper challenges conventional understanding and offers a more nuanced perspective on the underlying mechanisms and processes.`,
        citations: 15,
        keywords: ["theoretical framework", query.toLowerCase(), "interdisciplinary", "conceptual model"],
      },
      {
        title: `${query} in Practice: Case Studies from Industry`,
        authors: "Thompson, I. & Brown, J.",
        journal: "Applied Research in Business and Technology",
        year: "2021",
        abstract: `Through a series of case studies, this paper examines how ${query} is implemented in various industry settings. The findings reveal both common challenges and best practices, providing valuable insights for practitioners and researchers alike.`,
        citations: 36,
        keywords: ["case studies", query.toLowerCase(), "industry applications", "best practices"],
      },
    ]
  }

  // Mock function to simulate API call for research idea generation
  const mockGenerateResearchIdeas = async (topic: string, context: string, count: number, key: string) => {
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate network delay

    let ideas = `# ${count} RESEARCH IDEAS ON "${topic.toUpperCase()}"

## Research Context
${context || `Exploring innovative approaches and unexplored aspects of ${topic}`}

## Generated Research Ideas

`

    const researchIdeas = [
      `### Comparative Analysis of ${topic} Across Different Cultural Contexts
**Research Question**: How do cultural factors influence the manifestation and understanding of ${topic}?
**Methodology**: Cross-cultural comparative study using mixed methods
**Potential Impact**: Enhance understanding of cultural variations and develop more culturally-sensitive approaches`,

      `### Longitudinal Study on the Evolution of ${topic} Over Time
**Research Question**: How has ${topic} changed over the past decade, and what factors drive this evolution?
**Methodology**: Longitudinal data analysis with time-series modeling
**Potential Impact**: Identify trends and predict future developments in the field`,

      `### Integration of AI and Machine Learning in ${topic}
**Research Question**: How can advanced AI techniques enhance our understanding and application of ${topic}?
**Methodology**: Experimental design with AI model development and testing
**Potential Impact**: Create innovative computational tools and methodologies for the field`,

      `### Ethical Implications of ${topic} in Contemporary Society
**Research Question**: What are the ethical challenges and considerations associated with ${topic}?
**Methodology**: Philosophical inquiry and case study analysis
**Potential Impact**: Develop ethical frameworks and guidelines for researchers and practitioners`,

      `### ${topic} in Educational Settings: Effectiveness and Implementation
**Research Question**: How can ${topic} be effectively integrated into educational curricula?
**Methodology**: Action research in educational institutions
**Potential Impact**: Improve educational practices and learning outcomes`,

      `### Interdisciplinary Connections: ${topic} and Environmental Sustainability
**Research Question**: What is the relationship between ${topic} and environmental sustainability efforts?
**Methodology**: Mixed-methods research with stakeholder interviews and quantitative analysis
**Potential Impact**: Bridge disciplinary boundaries and address complex sustainability challenges`,

      `### Developing a New Theoretical Framework for ${topic}
**Research Question**: What new theoretical perspectives can enhance our understanding of ${topic}?
**Methodology**: Grounded theory approach with extensive literature review
**Potential Impact**: Advance theoretical foundations of the field`,

      `### ${topic} in Underrepresented Communities: Access and Equity
**Research Question**: How do issues of access and equity affect ${topic} in underrepresented communities?
**Methodology**: Community-based participatory research
**Potential Impact**: Address social justice issues and promote inclusive approaches`,

      `### Neuroscientific Foundations of ${topic}
**Research Question**: What are the neural mechanisms underlying processes related to ${topic}?
**Methodology**: Neuroimaging studies with behavioral correlates
**Potential Impact**: Establish biological basis and inform evidence-based interventions`,

      `### Meta-Analysis of Methodological Approaches in ${topic} Research
**Research Question**: What are the strengths and limitations of current methodological approaches in ${topic} research?
**Methodology**: Systematic review and meta-analysis
**Potential Impact**: Improve research quality and methodological rigor in the field`,
    ]

    // Select a random subset of ideas based on the requested count
    const selectedIdeas = []
    const availableIndices = Array.from({ length: researchIdeas.length }, (_, i) => i)

    for (let i = 0; i < Math.min(count, researchIdeas.length); i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length)
      const selectedIndex = availableIndices[randomIndex]
      availableIndices.splice(randomIndex, 1)
      selectedIdeas.push(researchIdeas[selectedIndex])
    }

    ideas += selectedIdeas.join("\n\n")

    ideas += `

## Next Steps
1. Select the most promising idea that aligns with your interests and expertise
2. Conduct a preliminary literature review to identify research gaps
3. Refine your research question and develop a detailed methodology
4. Consider potential collaborations and funding opportunities
5. Develop a research proposal with clear objectives and timeline`

    return ideas
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="apiKey">Gemini API Key</Label>
        <Input
          id="apiKey"
          placeholder="Enter your Gemini API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">Your API key is required to use the Gemini AI model</p>
      </div>

      <Tabs defaultValue="explore" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="explore">Topic Explorer</TabsTrigger>
          <TabsTrigger value="search">Literature Search</TabsTrigger>
          <TabsTrigger value="ideas">Idea Generator</TabsTrigger>
        </TabsList>

        <TabsContent value="explore" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                Research Topic Explorer
              </CardTitle>
              <CardDescription>
                Get an overview of any research topic to understand key concepts, major research areas, and leading
                researchers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleExplore} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="researchTopic">Research Topic</Label>
                  <Input
                    id="researchTopic"
                    placeholder="Enter a research topic (e.g., 'Machine Learning in Healthcare')"
                    value={researchTopic}
                    onChange={(e) => setResearchTopic(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="explorationDepth">Exploration Depth</Label>
                    <span className="text-sm text-muted-foreground">
                      {explorationDepth <= 2 ? "Brief" : explorationDepth <= 4 ? "Comprehensive" : "In-depth"}
                    </span>
                  </div>
                  <Slider
                    id="explorationDepth"
                    min={1}
                    max={5}
                    step={1}
                    value={[explorationDepth]}
                    onValueChange={(value) => setExplorationDepth(value[0])}
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exploring...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Explore Topic
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {explorationResult && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Topic Exploration Results</CardTitle>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(explorationResult)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost">
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap prose prose-sm max-w-none">{explorationResult}</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-500" />
                Literature Search
              </CardTitle>
              <CardDescription>Find relevant research papers and articles on your topic of interest</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="searchQuery">Search Query</Label>
                  <Input
                    id="searchQuery"
                    placeholder="Enter keywords or phrases (e.g., 'artificial intelligence ethics')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Search Type</Label>
                  <RadioGroup value={searchType} onValueChange={setSearchType} className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="keyword" id="keyword" />
                      <Label htmlFor="keyword">Keyword</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="title" id="title" />
                      <Label htmlFor="title">Title</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="author" id="author" />
                      <Label htmlFor="author">Author</Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search Literature
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {searchResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  {searchResults.length} papers found for "{searchQuery}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {searchResults.map((paper, index) => (
                    <Card key={index} className="bg-muted/50">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">{paper.title}</CardTitle>
                        <CardDescription>
                          {paper.authors} ({paper.year}) • {paper.journal}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <p className="text-sm mb-2">{paper.abstract}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {paper.keywords.map((keyword: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Citations: {paper.citations}</span>
                        <Button variant="ghost" size="sm" className="gap-1">
                          View Paper <ArrowRight className="h-3 w-3" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ideas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Research Idea Generator
              </CardTitle>
              <CardDescription>Generate novel research ideas and questions based on your interests</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateIdeas} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ideaTopic">Research Topic</Label>
                  <Input
                    id="ideaTopic"
                    placeholder="Enter your research area (e.g., 'Climate Change Adaptation')"
                    value={ideaTopic}
                    onChange={(e) => setIdeaTopic(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ideaContext">Research Context (Optional)</Label>
                  <Textarea
                    id="ideaContext"
                    placeholder="Provide additional context or specific aspects you're interested in..."
                    value={ideaContext}
                    onChange={(e) => setIdeaContext(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="ideaCount">Number of Ideas</Label>
                    <span className="text-sm text-muted-foreground">{ideaCount} ideas</span>
                  </div>
                  <Slider
                    id="ideaCount"
                    min={3}
                    max={10}
                    step={1}
                    value={[ideaCount]}
                    onValueChange={(value) => setIdeaCount(value[0])}
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Generate Ideas
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {generatedIdeas && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Generated Research Ideas</CardTitle>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedIdeas)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost">
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap prose prose-sm max-w-none">{generatedIdeas}</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
