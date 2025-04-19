"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatAssistant } from "../components/chat-assistant"
import { SharedDocuments } from "../components/shared-documents"
import { TeamMembers } from "../components/team-members"
import { MessageSquare, FileText, Users } from "lucide-react"

export default function WorkspacePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Collaborative Workspace</h1>
        <p className="text-gray-500 mt-2">
          Work together with your team in real-time. Chat, share documents, and use AI assistance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <TeamMembers />
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="chat" className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Team Chat
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Shared Documents
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="h-[600px]">
              <ChatAssistant
                topic="research"
                placeholder="Ask a question or discuss with your team..."
                contextWindowSize={5}
              />
            </TabsContent>

            <TabsContent value="documents">
              <SharedDocuments />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
} 