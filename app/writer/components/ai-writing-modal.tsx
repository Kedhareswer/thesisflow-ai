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
import { Loader2, Sparkles, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"

const sectionTasks = [
  { id: "introduction", name: "Introduction" },
  { id: "table", name: "Key Table" },
  { id: "diagram", name: "Diagram (Mermaid)" },
  { id: "image", name: "Image Suggestion" },
  { id: "conclusion", name: "Conclusion" },
]

interface AIWritingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProvider: string
  selectedModel: string
  documentTemplate: string
  researchContext: string
  writingStylePrompt: string
  templatePrompt: string
  supabaseToken: string | null
  onGenerateContent: (text: string) => void
}

export function AIWritingModal({
  open,
  onOpenChange,
  selectedProvider,
  selectedModel,
  documentTemplate,
  researchContext,
  writingStylePrompt,
  templatePrompt,
  supabaseToken,
  onGenerateContent,
}: AIWritingModalProps) {
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [generatedSections, setGeneratedSections] = useState<{ id: string, name: string, content: string, loading: boolean }[]>([])
  const [error, setError] = useState<string>("")

  // Helper to build section-specific prompts
  const buildPrompt = (sectionId: string, previousContent: string) => {
    let sectionInstruction = ""
    switch (sectionId) {
      case "introduction":
        sectionInstruction = "Write the introduction for this paper. Include background and motivation."
        break
      case "table":
        sectionInstruction = "Present the key findings or comparisons in a Markdown table."
        break
      case "diagram":
        sectionInstruction = "If a process, workflow, or relationship can be visualized, include a Mermaid diagram in a Markdown code block (```mermaid ... ```), and explain it briefly."
        break
      case "image":
        sectionInstruction = "Suggest an image or figure that would help, and describe in detail what it should show. Use a Markdown image placeholder with a detailed caption."
        break
      case "conclusion":
        sectionInstruction = "Write the conclusion for this paper, summarizing the key points."
        break
      default:
        sectionInstruction = "Write this section in Markdown."
    }
    return `${writingStylePrompt}\n${templatePrompt}\n\n${researchContext}\n\n${previousContent ? `Here is what has been written so far:\n${previousContent}\n` : ''}Now, ${sectionInstruction}\n- Format all output in Markdown.\n- Use LaTeX for math.\n- Use Markdown tables for data.\n- Use \`\`\`mermaid for diagrams.\n- Suggest images with Markdown image syntax and a detailed caption.`
  }

  // Streaming-style chunked generation
  const handleGenerateAll = async () => {
    if (!supabaseToken) {
      setError("Authentication error: Please log in again.")
      return
    }
    setIsGenerating(true)
    setGeneratedSections([])
    setError("")
    let previousContent = ""
    for (const section of sectionTasks) {
      setGeneratedSections(sections => [...sections, { ...section, content: "", loading: true }])
      try {
        const prompt = buildPrompt(section.id, previousContent)
        const response = await fetch("/api/ai/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseToken}`,
          },
          body: JSON.stringify({
            provider: selectedProvider,
            model: selectedModel,
            prompt,
            temperature: 0.7,
            maxTokens: 800,
          }),
        })
        let sectionContent = ""
        if (response.ok) {
          const dataRes = await response.json()
          sectionContent = dataRes.content || dataRes.choices?.[0]?.text || "No content generated."
        } else {
          sectionContent = "Error generating content."
        }
        previousContent += `\n\n# ${section.name}\n${sectionContent}`
        setGeneratedSections(sections =>
          sections.map(s =>
            s.id === section.id ? { ...s, content: sectionContent, loading: false } : s
          )
        )
      } catch (err) {
        setGeneratedSections(sections =>
          sections.map(s =>
            s.id === section.id ? { ...s, content: "Error generating content.", loading: false } : s
          )
        )
      }
    }
    setIsGenerating(false)
  }

  const handleInsertContent = () => {
    const allContent = generatedSections.map(s => `# ${s.name}\n${s.content}`).join("\n\n")
    onGenerateContent(allContent)
    onOpenChange(false)
    setGeneratedSections([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-white border-gray-200">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <DialogTitle className="text-lg font-semibold text-black">AI Writing Assistant</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Streaming multi-section generation (tables, diagrams, images, etc.)
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Button
            onClick={handleGenerateAll}
            className="w-full bg-black text-white hover:bg-gray-800"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate All Sections
              </>
            )}
          </Button>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          {generatedSections.map((section, idx) => (
            <div key={section.id} className="space-y-2 border-b pb-4 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-black">{section.name}</span>
                {section.loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                {!section.loading && <Check className="h-4 w-4 text-green-600" />}
              </div>
              <div className="border border-gray-200 rounded-md p-4 bg-gray-50 overflow-x-auto text-sm whitespace-pre-wrap">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="border-t border-gray-200 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-300">
            Cancel
          </Button>
          <Button
            onClick={handleInsertContent}
            disabled={generatedSections.length === 0 || generatedSections.some(s => s.loading)}
            className="bg-black text-white hover:bg-gray-800"
          >
            Insert All into Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
