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
import { Loader2, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase"

const writingTasks = [
  { id: "continue", name: "Continue writing" },
  { id: "introduction", name: "Write introduction" },
  { id: "conclusion", name: "Write conclusion" },
  { id: "abstract", name: "Write abstract" },
  { id: "methodology", name: "Write methodology" },
  { id: "results", name: "Write results" },
  { id: "custom", name: "Custom prompt" },
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

  // Generate mock AI content based on task
  const generateContent = async () => {
    setIsGenerating(true)
    setGeneratedContent("")
    try {
      // Build the prompt
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
      setGeneratedContent("Error generating content.")
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-white border-gray-200">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <DialogTitle className="text-lg font-semibold text-black">AI Writing Assistant</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Generate content using {selectedProvider} with {selectedModel}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Task selection */}
          <div className="space-y-2">
            <label htmlFor="task" className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Writing Task
            </label>
            <Select value={selectedTask} onValueChange={setSelectedTask}>
              <SelectTrigger className="border-gray-300">
                <SelectValue placeholder="Select task" />
              </SelectTrigger>
              <SelectContent>
                {writingTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom prompt (visible only for custom task) */}
          {selectedTask === "custom" && (
            <div className="space-y-2">
              <label htmlFor="custom-prompt" className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Custom Prompt
              </label>
              <Textarea
                id="custom-prompt"
                placeholder="Enter your writing prompt here..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="h-24 border-gray-300 resize-none"
              />
            </div>
          )}

          {/* Generation button */}
          <Button
            onClick={generateContent}
            className="w-full bg-black text-white hover:bg-gray-800"
            disabled={isGenerating || (selectedTask === "custom" && !customPrompt.trim())}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>

          {/* Generated content */}
          {generatedContent && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Generated Content</label>
              <div className="border border-gray-200 rounded-md p-4 bg-gray-50 overflow-y-auto max-h-[300px]">
                <div className="whitespace-pre-wrap text-sm text-gray-800">{generatedContent}</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-gray-200 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-300">
            Cancel
          </Button>
          <Button
            onClick={handleInsertContent}
            disabled={!generatedContent}
            className="bg-black text-white hover:bg-gray-800"
          >
            Insert into Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
