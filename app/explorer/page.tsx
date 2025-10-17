"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { BookOpen, Brain, Lightbulb, MessageCircle, Database, BarChart3, GraduationCap, Compass, FileText, AlertTriangle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import type { AIProvider } from "@/lib/ai-providers"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { EnhancedLiteratureSearch } from "./components/EnhancedLiteratureSearch"
import { TopicExplorer } from "./components/TopicExplorer"
import { IdeaGenerator } from "./components/IdeaGenerator"
import { ResearchAssistant } from "./components/ResearchAssistant"
import { RouteGuard } from "@/components/route-guard"
import Sidebar from "@/app/ai-agents/components/Sidebar"
import { ResearchSessionProvider } from "@/components/research-session-provider"
import { ResearchSessionManager } from "@/components/research-session-manager"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const containerStyle = "mx-auto w-full max-w-6xl flex-1 px-4 py-8"
const sectionTitleStyle = "text-2xl font-semibold text-gray-900 mb-4"
const sectionDescriptionStyle = "text-gray-600"

const personalities = [
  {
    key: 'analytical',
    name: 'Analytical',
    description: 'Clear, evidence-based, logical reasoning.',
    systemPrompt: 'You are an analytical research assistant. Focus on evidence-based reasoning, logical structure, and breaking down complex concepts. Use clear, systematic approaches to data analysis and structured arguments.',
    icon: BarChart3,
    color: [34, 197, 94] as [number, number, number],
  },
  {
    key: 'scholarly',
    name: 'Scholarly',
    description: 'Academic, well-cited, thorough, and rigorous.',
    systemPrompt: 'You are a scholarly research assistant. Provide academic, well-cited, thorough responses aligned with research papers and literature reviews. Use rigorous methodology and formal academic language.',
    icon: GraduationCap,
    color: [59, 130, 246] as [number, number, number],
  },
  {
    key: 'exploratory',
    name: 'Exploratory',
    description: 'Curious, open-ended, idea-generating.',
    systemPrompt: 'You are an exploratory research assistant. Be curious and open-ended in your approach. Focus on brainstorming hypotheses, exploring alternative approaches, and identifying research gaps. Encourage creative thinking.',
    icon: Compass,
    color: [245, 158, 11] as [number, number, number],
  },
  {
    key: 'critical',
    name: 'Critical',
    description: 'Provides constructive criticism and challenges ideas.',
    systemPrompt: 'You are a critical thinker. Challenge assumptions and provide constructive feedback.',
    icon: AlertTriangle,
    color: [239, 68, 68] as [number, number, number],
  },
  {
    key: 'concise',
    name: 'Concise',
    description: 'Direct, minimal, to the point.',
    systemPrompt: 'You are a concise research assistant. Provide direct, minimal responses without unnecessary elaboration. Focus on summaries, abstracts, and quick explanations that get straight to the point.',
    icon: FileText,
    color: [168, 85, 247] as [number, number, number],
  },
]

export default function ResearchExplorer() {
  const { toast } = useToast()
  const searchParams = useSearchParams()

  // State for research chatbot
  const [chatTopic, setChatTopic] = useState("")
  const [chatPapers, setChatPapers] = useState<any[]>([])
  const [chatIdeas, setChatIdeas] = useState("")

  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>(undefined)
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined)
  const [selectedPersonality, setSelectedPersonality] = useState(personalities[0])
  const [collapsed, setCollapsed] = useState(false)
  const [initialQuery, setInitialQuery] = useState<string>("")
  const [activeTab, setActiveTab] = useState("search")

  // Handle query parameter from AI Agent redirects
  useEffect(() => {
    const query = searchParams?.get('query')
    if (query) {
      setInitialQuery(query)
      setActiveTab("search") // Ensure we're on the search tab
    }
  }, [searchParams])

  return (
    <RouteGuard requireAuth={true}>
      <ResearchSessionProvider>
        <ErrorBoundary>
          <div className="flex min-h-screen bg-[#F8F9FA]">
            {/* Sidebar (sticky, collapsible) */}
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

            {/* Right column */}
            <div className="flex min-h-screen flex-1 flex-col">
              <main className={containerStyle}>
                <header className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Research Explorer</h1>
                  <p className={sectionDescriptionStyle}>
                    AI-powered tools to discover research papers, generate ideas, and explore topics.
                  </p>
                </header>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-5 bg-gray-100 rounded-md">
                    <TabsTrigger value="search" className="data-[state=active]:bg-gray-200">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Search
                    </TabsTrigger>
                    <TabsTrigger value="explore" className="data-[state=active]:bg-gray-200">
                      <Brain className="h-4 w-4 mr-2" />
                      Explore
                    </TabsTrigger>
                    <TabsTrigger value="ideas" className="data-[state=active]:bg-gray-200">
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Ideas
                    </TabsTrigger>
                    <TabsTrigger value="assistant" className="data-[state=active]:bg-gray-200">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Assistant
                    </TabsTrigger>
                    <TabsTrigger value="session" className="data-[state=active]:bg-gray-200">
                      <Database className="h-4 w-4 mr-2" />
                      Session
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="search">
                    <EnhancedLiteratureSearch initialQuery={initialQuery} />
                  </TabsContent>
                  <TabsContent value="explore">
                    <TopicExplorer />
                  </TabsContent>
                  <TabsContent value="ideas">
                    <IdeaGenerator />
                  </TabsContent>
                  <TabsContent value="assistant">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        <h2 className="text-xl font-semibold">Research Assistant</h2>
                      </div>
                      <p className="text-sm text-gray-600">Get AI-powered assistance for your research questions.</p>
                      <ResearchAssistant 
                        personalities={personalities}
                        selectedPersonality={selectedPersonality}
                        onPersonalityChange={setSelectedPersonality}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="session">
                    <ResearchSessionManager />
                  </TabsContent>
                </Tabs>
              </main>
            </div>
          </div>
        </ErrorBoundary>
      </ResearchSessionProvider>
    </RouteGuard>
  )
}
