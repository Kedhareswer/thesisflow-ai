"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Sparkles, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"

const writingTasks = [
  { id: "continue", name: "Continue writing", description: "Continue from where you left off" },
  { id: "introduction", name: "Write introduction", description: "Create an engaging introduction" },
  { id: "conclusion", name: "Write conclusion", description: "Summarize findings and implications" },
  { id: "abstract", name: "Write abstract", description: "Concise summary of the research" },
  { id: "methodology", name: "Write methodology", description: "Describe research methods" },
  { id: "results", name: "Write results", description: "Present findings clearly" },
  { id: "custom", name: "Custom prompt", description: "Use your own writing prompt" },
]

interface AIWritingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProvider: string
  selectedModel: string
  documentTemplate: string
  onGenerateContent: (text: string) => void
}

export function AIWritingModal({
  open,
  onOpenChange,
  selectedProvider,
  selectedModel,
  documentTemplate,
  onGenerateContent,
}: AIWritingModalProps) {
  const [selectedTask, setSelectedTask] = useState<string>("continue")
  const [customPrompt, setCustomPrompt] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [generatedContent, setGeneratedContent] = useState<string>("")

  // Generate AI content based on task
  const generateContent = async () => {
    setIsGenerating(true)
    setGeneratedContent("")
    try {
      const systemPrompt =
        "You are a professional academic writer. Write in a clear, academic style appropriate for publication. Focus on producing coherent, well-structured text suitable for a scholarly publication. "
      let taskPrompt = ""

      switch (selectedTask) {
        case "introduction":
          taskPrompt =
            "Write an engaging introduction that contextualizes the research, states the problem being addressed, and outlines the approach."
          break
        case "conclusion":
          taskPrompt =
            "Write a conclusion that summarizes the key findings, discusses their implications, and suggests future research directions."
          break
        case "abstract":
          taskPrompt =
            "Write a concise abstract summarizing the research objectives, methodology, results, and conclusions in 200-250 words."
          break
        case "methodology":
          taskPrompt =
            "Write a methodology section that clearly describes the research approach, data collection methods, and analytical techniques used."
          break
        case "results":
          taskPrompt =
            "Write a results section that presents the findings in a clear, logical manner, using appropriate academic language."
          break
        case "continue":
        case "custom":
        default:
          taskPrompt = customPrompt || "Continue the writing in a coherent and logical manner."
          break
      }

      const fullPrompt = `${systemPrompt}\n\n${taskPrompt}`

      // Get the user's access token
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
          prompt: fullPrompt,
          temperature: 0.7,
          maxTokens: 800,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate content")

      const dataRes = await response.json()
      setGeneratedContent(dataRes.content || dataRes.choices?.[0]?.text || "No content generated.")
    } catch (err) {
      setGeneratedContent("Error generating content. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleInsertContent = () => {
    onGenerateContent(generatedContent)
    onOpenChange(false)
    setGeneratedContent("")
    setCustomPrompt("")
  }

  const handleClose = () => {
    onOpenChange(false)
    setGeneratedContent("")
    setCustomPrompt("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white border-gray-200">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center space-x-2 text-lg font-semibold text-black">
            <Sparkles className="h-5 w-5" />
            <span>AI Writing Assistant</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Generate content using {selectedProvider} with {selectedModel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Writing Task</Label>
            <Select value={selectedTask} onValueChange={setSelectedTask}>
              <SelectTrigger className="border-gray-300 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {writingTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    <div>
                      <div className="font-medium">{task.name}</div>
                      <div className="text-xs text-gray-500">{task.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Prompt */}
          {selectedTask === "custom" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Custom Prompt</Label>
              <Textarea
                placeholder="Describe what you want the AI to write..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="h-24 border-gray-300 bg-white resize-none"
              />
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={generateContent}
            className="w-full bg-black text-white hover:bg-gray-800"
            disabled={isGenerating || (selectedTask === "custom" && !customPrompt.trim())}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating content...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>

          {/* Generated Content */}
          {generatedContent && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Generated Content</Label>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 max-h-[300px] overflow-y-auto">
                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{generatedContent}</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={handleClose} className="border-gray-300 bg-white hover:bg-gray-50">
            Cancel
          </Button>
          <Button
            onClick={handleInsertContent}
            disabled={!generatedContent}
            className="bg-black text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            Insert Content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
