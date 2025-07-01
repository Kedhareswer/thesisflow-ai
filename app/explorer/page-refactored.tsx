"use client"

import { Brain, BookOpen, Lightbulb, MessageCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { ResearchChatbot } from "@/components/research-chatbot"
import { TopicExplorer } from "./components/TopicExplorer"
import { LiteratureSearch } from "./components/LiteratureSearch"
import { IdeaGenerator } from "./components/IdeaGenerator"

export default function ResearchExplorer() {
  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="explore" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 bg-gray-50">
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
            <TabsTrigger value="assistant" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Research Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explore" className="space-y-6">
            <TopicExplorer />
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <LiteratureSearch />
          </TabsContent>

          <TabsContent value="ideas" className="space-y-6">
            <IdeaGenerator />
          </TabsContent>

          <TabsContent value="assistant" className="space-y-6">
            <ResearchChatbot />
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  )
} 