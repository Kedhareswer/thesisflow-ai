"use client"

import { useState } from "react"
import { Brain, Search, Lightbulb, BookOpen } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { useAsync } from "@/lib/hooks/useAsync"
import { useToast } from "@/hooks/use-toast"
import { ResearchService } from "@/lib/services/research.service"
import { FormField, TextareaField } from "@/components/forms/FormField"
import { SearchInput } from "@/components/common/SearchInput"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { EmptyState } from "@/components/common/EmptyState"
import { SkeletonCard, SkeletonList } from "@/components/common/SkeletonCard"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"

export default function ResearchExplorer() {
  const { toast } = useToast()

  // Topic exploration state
  const [topic, setTopic] = useState("")
  const [depth, setDepth] = useState(3)
  const topicExploration = useAsync(ResearchService.exploreTopics)

  // Literature search state
  const [searchType, setSearchType] = useState("keyword")
  const paperSearch = useAsync(ResearchService.searchPapers)

  // Idea generation state
  const [ideaTopic, setIdeaTopic] = useState("")
  const [ideaContext, setIdeaContext] = useState("")
  const [ideaCount, setIdeaCount] = useState(5)
  const ideaGeneration = useAsync(ResearchService.generateIdeas)

  const handleTopicExploration = async () => {
    if (!topic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please enter a research topic to explore.",
        variant: "destructive",
      })
      return
    }

    try {
      await topicExploration.execute(topic, depth)
      toast({
        title: "Topic Explored",
        description: "Research overview generated successfully.",
      })
    } catch (error) {
      toast({
        title: "Exploration Failed",
        description: "Failed to explore topic. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePaperSearch = async (query: string) => {
    if (!query.trim()) return

    try {
      await paperSearch.execute(query, searchType)
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Failed to search papers. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleIdeaGeneration = async () => {
    if (!ideaTopic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please enter a topic for idea generation.",
        variant: "destructive",
      })
      return
    }

    try {
      await ideaGeneration.execute(ideaTopic, ideaContext, ideaCount)
      toast({
        title: "Ideas Generated",
        description: `Generated ${ideaCount} research ideas successfully.`,
      })
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate ideas. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-light mb-4">Research Explorer</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Discover research topics, find relevant papers, and generate innovative ideas with AI assistance.
          </p>
        </div>

        <Tabs defaultValue="explore" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 bg-gray-50">
            <TabsTrigger value="explore" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Topic Explorer
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Literature Search
            </TabsTrigger>
            <TabsTrigger value="ideas" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Idea Generator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explore" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Research Topic Explorer
                </CardTitle>
                <CardDescription>
                  Get comprehensive insights into any research topic including key concepts, trends, and leading
                  researchers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  label="Research Topic"
                  value={topic}
                  onChange={setTopic}
                  placeholder="e.g., Machine Learning in Healthcare"
                  required
                />

                <div className="space-y-3">
                  <Label>Exploration Depth</Label>
                  <Slider
                    value={[depth]}
                    onValueChange={(value) => setDepth(value[0])}
                    max={5}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Basic</span>
                    <span>Comprehensive</span>
                  </div>
                </div>

                <Button onClick={handleTopicExploration} disabled={topicExploration.loading} className="w-full">
                  {topicExploration.loading ? (
                    <LoadingSpinner size="sm" text="Exploring..." />
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Explore Topic
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {topicExploration.loading && <SkeletonCard lines={6} />}

            {topicExploration.data && (
              <Card>
                <CardHeader>
                  <CardTitle>Exploration Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm">{topicExploration.data.data}</pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {topicExploration.error && (
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <p className="text-red-600">{topicExploration.error}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Literature Search
                </CardTitle>
                <CardDescription>Find relevant research papers and articles on your topic of interest.</CardDescription>
              </CardHeader>
              <CardContent>
                <SearchInput
                  placeholder="Search for papers, authors, or keywords..."
                  onSearch={handlePaperSearch}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {paperSearch.loading && <SkeletonList count={3} />}

            {paperSearch.data && paperSearch.data.data?.length > 0 ? (
              <div className="space-y-4">
                {paperSearch.data.data.map((paper: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">{paper.title}</CardTitle>
                      <CardDescription>
                        {paper.authors?.join(", ")} • {paper.year}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">{paper.abstract}</p>
                      {paper.url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={paper.url} target="_blank" rel="noopener noreferrer">
                            View Paper
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              paperSearch.data && (
                <EmptyState
                  icon={BookOpen}
                  title="No papers found"
                  description="Try adjusting your search terms or exploring different keywords."
                />
              )
            )}
          </TabsContent>

          <TabsContent value="ideas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Research Idea Generator
                </CardTitle>
                <CardDescription>
                  Generate innovative research ideas and questions based on your interests.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  label="Research Area"
                  value={ideaTopic}
                  onChange={setIdeaTopic}
                  placeholder="e.g., Quantum Computing"
                  required
                />

                <TextareaField
                  label="Additional Context"
                  value={ideaContext}
                  onChange={setIdeaContext}
                  placeholder="Provide any specific focus areas, constraints, or interests..."
                  description="Optional: Help us generate more targeted ideas"
                />

                <div className="space-y-3">
                  <Label>Number of Ideas: {ideaCount}</Label>
                  <Slider
                    value={[ideaCount]}
                    onValueChange={(value) => setIdeaCount(value[0])}
                    max={10}
                    min={3}
                    step={1}
                    className="w-full"
                  />
                </div>

                <Button onClick={handleIdeaGeneration} disabled={ideaGeneration.loading} className="w-full">
                  {ideaGeneration.loading ? (
                    <LoadingSpinner size="sm" text="Generating..." />
                  ) : (
                    <>
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Generate Ideas
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {ideaGeneration.loading && <SkeletonCard lines={8} />}

            {ideaGeneration.data && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Ideas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm">{ideaGeneration.data.data}</pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  )
}
