import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PaperSummarizer from "@/components/paper-summarizer"
import ResearchExplorer from "@/components/research-explorer"
import IdeaWorkspace from "@/components/idea-workspace"
import CollaborativeWorkspace from "@/components/collaborative-workspace"

export default function ResearchAssistantPage() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">AI Research Assistant</h1>

      <Tabs defaultValue="explorer" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="explorer">Research Explorer</TabsTrigger>
          <TabsTrigger value="summarizer">Paper Summarizer</TabsTrigger>
          <TabsTrigger value="workspace">Idea Workspace</TabsTrigger>
          <TabsTrigger value="collaborative">Collaborative Research</TabsTrigger>
        </TabsList>

        <TabsContent value="explorer">
          <ResearchExplorer />
        </TabsContent>

        <TabsContent value="summarizer">
          <PaperSummarizer />
        </TabsContent>

        <TabsContent value="workspace">
          <IdeaWorkspace />
        </TabsContent>

        <TabsContent value="collaborative">
          <CollaborativeWorkspace />
        </TabsContent>
      </Tabs>
    </main>
  )
}
