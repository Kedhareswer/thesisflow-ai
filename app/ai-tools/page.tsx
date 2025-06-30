"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Brain,
  Wand2,
  FileText,
  Languages,
  Search,
  Copy,
  Download,
  Zap,
  Target,
  Lightbulb,
  ArrowRight,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AIProviderService } from "@/lib/ai-providers"
import { enhancedAIService } from "@/lib/enhanced-ai-service"

interface AITool {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: string
  isPopular?: boolean
}

interface GeneratedContent {
  id: string
  tool: string
  input: string
  output: string
  timestamp: Date
}

export default function AIToolsPage() {
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<GeneratedContent[]>([])
  const { toast } = useToast()

  const aiTools: AITool[] = [
    {
      id: "text-generator",
      name: "Academic Text Generator",
      description: "Generate high-quality academic content, abstracts, and research documentation",
      icon: <FileText className="h-5 w-5" />,
      category: "Content",
      isPopular: true,
    },
    {
      id: "idea-expander",
      name: "Research Idea Expander",
      description: "Transform brief concepts into detailed research proposals and methodologies",
      icon: <Lightbulb className="h-5 w-5" />,
      category: "Research",
      isPopular: true,
    },
    {
      id: "translator",
      name: "Academic Translator",
      description: "Translate research content while maintaining technical accuracy and context",
      icon: <Languages className="h-5 w-5" />,
      category: "Language",
    },
    {
      id: "optimizer",
      name: "Content Optimizer",
      description: "Improve clarity, readability, and academic tone of your research writing",
      icon: <Target className="h-5 w-5" />,
      category: "Content",
    },
    {
      id: "keyword-extractor",
      name: "Keyword Extractor",
      description: "Extract relevant keywords and phrases from research papers and documents",
      icon: <Search className="h-5 w-5" />,
      category: "Analysis",
    },
    {
      id: "hypothesis-generator",
      name: "Hypothesis Generator",
      description: "Generate testable hypotheses based on your research questions and data",
      icon: <Brain className="h-5 w-5" />,
      category: "Research",
      isPopular: true,
    },
  ]

  const categories = Array.from(new Set(aiTools.map((tool) => tool.category)))

  const handleGenerate = async (toolId: string) => {
    if (!input.trim()) return

    setLoading(true)
    try {
      const tool = aiTools.find((t) => t.id === toolId)
      let generatedOutput = ""

      switch (toolId) {
        case "text-generator":
          const textPrompt = `Generate high-quality academic content based on this topic or outline: "${input}"

Please create well-structured, professional academic text that:
- Uses appropriate scholarly language and tone
- Includes relevant concepts and terminology
- Maintains logical flow and coherence
- Follows academic writing conventions
- Is substantial and informative

Content:`
          const textResponse = await AIProviderService.generateResponse(textPrompt)
          generatedOutput = textResponse.content
          break

        case "idea-expander":
          try {
            const result = await enhancedAIService.generateResearchIdeas(
              input,
              `Expand this research concept: ${input}`
            )
            
            generatedOutput = result.ideas.map((idea, index) => `
**Research Proposal ${index + 1}: ${idea.title}**

**Description:** ${idea.description}

**Research Question:** ${idea.research_question || 'To be determined'}

**Methodology:** ${idea.methodology || 'To be developed'}

**Potential Impact:** ${idea.impact || 'To be assessed'}

**Anticipated Challenges:** ${idea.challenges || 'To be identified'}

---`).join('\n')
          } catch (error) {
            // Fallback to simpler expansion
            const expandPrompt = `Expand this research idea into a detailed proposal: "${input}"

Provide:
1. Detailed description and objectives
2. Proposed methodology
3. Expected outcomes and impact
4. Potential challenges
5. Implementation timeline`
            const expandResponse = await AIProviderService.generateResponse(expandPrompt)
            generatedOutput = expandResponse.content
          }
          break

        case "translator":
          const translatePrompt = `Translate the following academic text while maintaining technical accuracy, scholarly tone, and preserving all technical terms and concepts:

Original text: "${input}"

Please specify the target language if not obvious from context. If no target language is specified, provide a high-quality English revision that improves clarity and academic style.

Translation:`
          const translateResponse = await AIProviderService.generateResponse(translatePrompt)
          generatedOutput = translateResponse.content
          break

        case "optimizer":
          const optimizePrompt = `Improve the following text for clarity, readability, and academic tone while preserving the original meaning and technical content:

Original text: "${input}"

Optimized version should:
- Enhance clarity and flow
- Improve sentence structure
- Use appropriate academic language
- Maintain technical accuracy
- Fix any grammatical issues

Optimized text:`
          const optimizeResponse = await AIProviderService.generateResponse(optimizePrompt)
          generatedOutput = optimizeResponse.content
          break

        case "keyword-extractor":
          const keywordPrompt = `Extract and categorize relevant keywords and phrases from this research content: "${input}"

Provide:
1. Primary Keywords (most important terms)
2. Secondary Keywords (supporting concepts)
3. Technical Terms (domain-specific terminology)
4. Long-tail Keywords (specific phrases)
5. Related Concepts (connected ideas)

Format as organized lists with brief explanations where helpful.`
          const keywordResponse = await AIProviderService.generateResponse(keywordPrompt)
          generatedOutput = keywordResponse.content
          break

        case "hypothesis-generator":
          const hypothesisPrompt = `Generate testable research hypotheses based on this research question or topic: "${input}"

For each hypothesis, provide:
1. Clear, testable statement
2. Null hypothesis (H0)
3. Alternative hypothesis (H1)
4. Variables involved
5. Suggested testing approach
6. Expected significance level

Generate 3-5 well-formed hypotheses.`
          const hypothesisResponse = await AIProviderService.generateResponse(hypothesisPrompt)
          generatedOutput = hypothesisResponse.content
          break

        default:
          const defaultPrompt = `Process this input for the ${tool?.name || 'AI tool'}: "${input}"

Provide a helpful, detailed response appropriate for academic and research use.`
          const defaultResponse = await AIProviderService.generateResponse(defaultPrompt)
          generatedOutput = defaultResponse.content
      }

      setOutput(generatedOutput)

      const newContent: GeneratedContent = {
        id: Date.now().toString(),
        tool: tool?.name || "Unknown Tool",
        input,
        output: generatedOutput,
        timestamp: new Date(),
      }

      setHistory((prev) => [newContent, ...prev.slice(0, 9)])

      toast({
        title: "Content generated",
        description: `${tool?.name} has processed your input successfully`,
      })
    } catch (error) {
      console.error("AI generation error:", error)
      toast({
        title: "Generation failed",
        description: "Please check your AI provider configuration and try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied successfully",
    })
  }

  const downloadContent = (content: GeneratedContent) => {
    const blob = new Blob([`Tool: ${content.tool}\n\nInput:\n${content.input}\n\nOutput:\n${content.output}`], {
      type: "text/plain",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ai-generated-${content.tool.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedToolData = aiTools.find((tool) => tool.id === selectedTool)

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-8 py-12 max-w-7xl">


        <div className="grid lg:grid-cols-3 gap-12">
          {/* Tools Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Popular Tools */}
            <div className="border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-black flex items-center gap-3">
                  <div className="w-1 h-6 bg-black"></div>
                  Popular Tools
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {aiTools
                  .filter((tool) => tool.isPopular)
                  .map((tool) => (
                    <div
                      key={tool.id}
                      className={`p-4 cursor-pointer transition-all duration-200 border ${
                        selectedTool === tool.id
                          ? "bg-black text-white border-black"
                          : "hover:bg-gray-50 border-gray-100"
                      }`}
                      onClick={() => setSelectedTool(tool.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 ${selectedTool === tool.id ? "bg-white text-black" : "bg-gray-100"}`}>
                          {tool.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium mb-2">{tool.name}</h4>
                          <p
                            className={`text-sm leading-relaxed ${selectedTool === tool.id ? "text-gray-300" : "text-gray-600"}`}
                          >
                            {tool.description}
                          </p>
                          <div className="mt-3">
                            <Badge
                              variant="outline"
                              className={`text-xs ${selectedTool === tool.id ? "border-white text-white" : ""}`}
                            >
                              {tool.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* All Tools by Category */}
            <div className="border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-black">All Tools</h3>
              </div>
              <div className="p-6">
                <Tabs defaultValue={categories[0]} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1">
                    {categories.map((category) => (
                      <TabsTrigger
                        key={category}
                        value={category}
                        className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-black"
                      >
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {categories.map((category) => (
                    <TabsContent key={category} value={category} className="space-y-3">
                      {aiTools
                        .filter((tool) => tool.category === category)
                        .map((tool) => (
                          <div
                            key={tool.id}
                            className={`p-3 cursor-pointer transition-all duration-200 border ${
                              selectedTool === tool.id
                                ? "bg-black text-white border-black"
                                : "hover:bg-gray-50 border-gray-100"
                            }`}
                            onClick={() => setSelectedTool(tool.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-1.5 ${selectedTool === tool.id ? "bg-white text-black" : "bg-gray-100"}`}
                              >
                                {tool.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-sm">{tool.name}</h5>
                                <p
                                  className={`text-xs mt-1 ${selectedTool === tool.id ? "text-gray-300" : "text-gray-600"}`}
                                >
                                  {tool.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {selectedToolData ? (
              <>
                {/* Tool Interface */}
                <div className="border border-gray-200">
                  <div className="p-8 border-b border-gray-200">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-black text-white">{selectedToolData.icon}</div>
                      <div>
                        <h2 className="text-2xl font-light text-black mb-2">{selectedToolData.name}</h2>
                        <p className="text-gray-600 font-light">{selectedToolData.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-8 space-y-8">
                    {/* Input Section */}
                    <div className="space-y-4">
                      <label className="text-sm font-medium text-black uppercase tracking-wide">Input</label>
                      <Textarea
                        placeholder={`Enter your content for ${selectedToolData.name.toLowerCase()}...`}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        rows={6}
                        className="resize-none border-gray-300 focus:border-black focus:ring-black font-light"
                      />
                      <Button
                        onClick={() => handleGenerate(selectedTool!)}
                        disabled={loading || !input.trim()}
                        className="w-full bg-black hover:bg-gray-800 text-white font-medium py-4 transition-colors"
                      >
                        {loading ? (
                          <>
                            <Zap className="mr-2 h-4 w-4 animate-pulse" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Generate with AI
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Output Section */}
                    {output && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-black uppercase tracking-wide">
                            Generated Output
                          </label>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(output)}
                              className="border-gray-300 hover:bg-gray-50"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                downloadContent({
                                  id: Date.now().toString(),
                                  tool: selectedToolData.name,
                                  input,
                                  output,
                                  timestamp: new Date(),
                                })
                              }
                              className="border-gray-300 hover:bg-gray-50"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-6 border border-gray-200">
                          <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-light">
                            {output}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent History */}
                {history.length > 0 && (
                  <div className="border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-black">Recent Generations</h3>
                      <p className="text-gray-600 text-sm mt-1">Your latest AI-generated content</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {history.slice(0, 5).map((item) => (
                          <div key={item.id} className="border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <Badge variant="outline" className="text-xs">
                                {item.tool}
                              </Badge>
                              <span className="text-xs text-gray-500">{item.timestamp.toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Input:</span> {item.input}
                            </p>
                            <p className="text-sm text-gray-800 line-clamp-3">
                              <span className="font-medium">Output:</span> {item.output}
                            </p>
                            <div className="flex gap-2 mt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(item.output)}
                                className="text-xs h-8"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadContent(item)}
                                className="text-xs h-8"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Welcome State */
              <div className="border border-gray-200">
                <div className="text-center py-20 px-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 mb-8">
                    <Brain className="h-8 w-8 text-gray-600" />
                  </div>
                  <h3 className="text-2xl font-light text-black mb-4">Select an AI Tool</h3>
                  <p className="text-gray-600 max-w-md mx-auto leading-relaxed font-light mb-8">
                    Choose from our collection of powerful AI tools to enhance your research workflow and boost
                    productivity
                  </p>
                  <div className="flex justify-center gap-6">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-black mb-2 mx-auto"></div>
                      <span className="text-xs text-gray-600 uppercase tracking-wide">AI Processing</span>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-gray-300 mb-2 mx-auto"></div>
                      <span className="text-xs text-gray-600 uppercase tracking-wide">Content Generation</span>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-gray-500 mb-2 mx-auto"></div>
                      <span className="text-xs text-gray-600 uppercase tracking-wide">Research Tools</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
