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
import { Loader2, Sparkles, FileText, GripVertical, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"

// Enhanced template configurations
const templates = {
  ieee: [
    {
      id: "title",
      title: "Title",
      prompt: "Write a concise, descriptive title for an IEEE research paper.",
      required: true,
      editable: true,
    },
    {
      id: "authors",
      title: "Authors & Affiliations",
      prompt: "List authors and affiliations in IEEE format.",
      required: true,
      editable: true,
    },
    {
      id: "abstract",
      title: "Abstract",
      prompt: "Write an IEEE-style abstract (150-250 words) with motivation, methods, results, and significance.",
      required: true,
      editable: true,
    },
    {
      id: "keywords",
      title: "Keywords",
      prompt: "List 3-6 relevant keywords, comma-separated.",
      required: true,
      editable: true,
    },
    {
      id: "introduction",
      title: "1. Introduction",
      prompt: "Write the Introduction with motivation, problem statement, contributions, and organization.",
      required: true,
      editable: true,
    },
    {
      id: "related",
      title: "2. Related Work",
      prompt: "Discuss previous research and cite relevant literature.",
      required: true,
      editable: true,
    },
    {
      id: "methods",
      title: "3. Methods",
      prompt: "Describe methods, datasets, algorithms, and experimental setup.",
      required: true,
      editable: true,
    },
    {
      id: "results",
      title: "4. Results",
      prompt: "Present results with tables, figures, and statistical analysis.",
      required: true,
      editable: true,
    },
    {
      id: "discussion",
      title: "5. Discussion",
      prompt: "Interpret results, compare with prior work, discuss limitations.",
      required: true,
      editable: true,
    },
    {
      id: "conclusion",
      title: "6. Conclusion",
      prompt: "Summarize findings, contributions, and suggest future work.",
      required: true,
      editable: true,
    },
    {
      id: "acknowledgments",
      title: "Acknowledgments",
      prompt: "Write acknowledgments (optional).",
      required: false,
      editable: true,
    },
    {
      id: "references",
      title: "References",
      prompt: "List references in IEEE format.",
      required: true,
      editable: true,
    },
  ],
  acm: [
    {
      id: "title",
      title: "Title",
      prompt: "Write a concise, descriptive title for an ACM research paper.",
      required: true,
      editable: true,
    },
    {
      id: "authors",
      title: "Authors & Affiliations",
      prompt: "List authors and affiliations in ACM format.",
      required: true,
      editable: true,
    },
    {
      id: "abstract",
      title: "Abstract",
      prompt: "Write an ACM-style abstract (150-250 words).",
      required: true,
      editable: true,
    },
    { id: "keywords", title: "Keywords", prompt: "List 3-6 relevant keywords.", required: true, editable: true },
    {
      id: "introduction",
      title: "1. Introduction",
      prompt: "Write the Introduction for ACM paper.",
      required: true,
      editable: true,
    },
    { id: "related", title: "2. Related Work", prompt: "Discuss previous research.", required: true, editable: true },
    { id: "methods", title: "3. Methods", prompt: "Describe methodology in detail.", required: true, editable: true },
    { id: "results", title: "4. Results", prompt: "Present results and analysis.", required: true, editable: true },
    {
      id: "discussion",
      title: "5. Discussion",
      prompt: "Interpret and discuss results.",
      required: true,
      editable: true,
    },
    { id: "conclusion", title: "6. Conclusion", prompt: "Summarize and conclude.", required: true, editable: true },
    {
      id: "acknowledgments",
      title: "Acknowledgments",
      prompt: "Write acknowledgments.",
      required: false,
      editable: true,
    },
    { id: "references", title: "References", prompt: "List references in ACM format.", required: true, editable: true },
  ],
}

// AI generation function
async function generateSectionContent(
  prompt: string,
  context: string,
  provider: string,
  model: string,
  supabaseToken: string | null,
  writingStylePrompt: string,
  templatePrompt: string,
  researchContext: string,
) {
  if (!supabaseToken) {
    return "Authentication error: Please log in again."
  }

  const fullPrompt = [
    writingStylePrompt,
    templatePrompt,
    researchContext ? `Research Context:\n${researchContext}` : "",
    context ? `Previous Content:\n${context}` : "",
    prompt,
  ]
    .filter(Boolean)
    .join("\n\n")

  try {
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseToken}`,
      },
      body: JSON.stringify({
        provider,
        model,
        prompt: fullPrompt,
        temperature: 0.7,
        maxTokens: 1200,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return `Error: ${errorData.error || response.statusText}`
    }

    const data = await response.json()
    return data.content || data.result || "No content generated."
  } catch (err) {
    return "Error: Failed to connect to AI service."
  }
}

type Section = {
  id: string
  title: string
  prompt: string
  required: boolean
  editable: boolean
  content: string
  edited: boolean
  status: "pending" | "generating" | "completed" | "error"
}

type TemplateKey = "ieee" | "acm"

interface AIWritingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProvider: string
  selectedModel: string
  supabaseToken: string | null
  writingStylePrompt: string
  templatePrompt: string
  researchContext: string
  onGenerateContent: (text: string) => void
}

export function AIWritingModal(props: AIWritingModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("ieee")
  const [sections, setSections] = useState<Section[]>(() =>
    templates[selectedTemplate].map((s) => ({
      ...s,
      content: "",
      edited: false,
      status: "pending" as const,
    })),
  )
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [customSectionTitle, setCustomSectionTitle] = useState("")
  const [customSectionPrompt, setCustomSectionPrompt] = useState("")

  // Template change handler
  const handleTemplateChange = (template: TemplateKey) => {
    setSelectedTemplate(template)
    setSections(
      templates[template].map((s) => ({
        ...s,
        content: "",
        edited: false,
        status: "pending" as const,
      })),
    )
  }

  // Drag and drop handler
  function handleDragEnd(result: any) {
    if (!result.destination) return
    const reordered = Array.from(sections)
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)
    setSections(reordered)
  }

  // Content change handler
  function handleContentChange(idx: number, value: string) {
    setSections((sections) =>
      sections.map((s, i) => (i === idx ? { ...s, content: value, edited: true, status: "completed" as const } : s)),
    )
  }

  // Generate single section
  async function handleGenerateSection(idx: number) {
    setSections((sections) => sections.map((s, i) => (i === idx ? { ...s, status: "generating" } : s)))

    const section = sections[idx]
    const context = sections
      .slice(0, idx)
      .map((s) => s.content)
      .join("\n\n")

    const content = await generateSectionContent(
      section.prompt,
      context,
      props.selectedProvider,
      props.selectedModel,
      props.supabaseToken,
      props.writingStylePrompt,
      props.templatePrompt,
      props.researchContext,
    )

    setSections((sections) =>
      sections.map((s, i) =>
        i === idx ? { ...s, content, status: content.startsWith("Error") ? "error" : "completed", edited: false } : s,
      ),
    )
  }

  // Generate all sections
  async function handleGenerateAll() {
    setIsGeneratingAll(true)
    setGenerationProgress(0)

    for (let i = 0; i < sections.length; i++) {
      if (sections[i].content && !sections[i].edited) continue // Skip already generated sections

      setSections((sections) => sections.map((s, idx) => (idx === i ? { ...s, status: "generating" } : s)))

      const section = sections[i]
      const context = sections
        .slice(0, i)
        .map((s) => s.content)
        .join("\n\n")

      const content = await generateSectionContent(
        section.prompt,
        context,
        props.selectedProvider,
        props.selectedModel,
        props.supabaseToken,
        props.writingStylePrompt,
        props.templatePrompt,
        props.researchContext,
      )

      setSections((sections) =>
        sections.map((s, idx) =>
          idx === i ? { ...s, content, status: content.startsWith("Error") ? "error" : "completed", edited: false } : s,
        ),
      )

      setGenerationProgress(((i + 1) / sections.length) * 100)

      // Small delay between sections
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    setIsGeneratingAll(false)
    setGenerationProgress(0)
  }

  // Add custom section
  function handleAddCustomSection() {
    if (!customSectionTitle.trim() || !customSectionPrompt.trim()) return

    setSections((sections) => [
      ...sections,
      {
        id: `custom-${Date.now()}`,
        title: customSectionTitle,
        prompt: customSectionPrompt,
        required: false,
        editable: true,
        content: "",
        edited: false,
        status: "pending" as const,
      },
    ])

    setCustomSectionTitle("")
    setCustomSectionPrompt("")
  }

  // Remove section
  function handleRemoveSection(idx: number) {
    setSections((sections) => sections.filter((_, i) => i !== idx))
  }

  // Export functions
  function exportMarkdown() {
    const md = sections
      .filter((s) => s.content.trim())
      .map((s) => `## ${s.title}\n\n${s.content}`)
      .join("\n\n")

    const blob = new Blob([md], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "research-paper.md"
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportLatex() {
    const latex = sections
      .filter((s) => s.content.trim())
      .map((s) => `\\section{${s.title.replace(/^[0-9. ]+/, "")}}\n${s.content}`)
      .join("\n\n")

    const blob = new Blob([latex], { type: "text/x-tex" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "research-paper.tex"
    a.click()
    URL.revokeObjectURL(url)
  }

  // Insert all content
  function handleInsertAll() {
    const allContent = sections
      .filter((s) => s.content.trim() && !s.content.startsWith("Error"))
      .map((s) => `## ${s.title}\n\n${s.content}`)
      .join("\n\n")

    props.onGenerateContent(allContent)
    props.onOpenChange(false)
  }

  const completedSections = sections.filter((s) => s.status === "completed" && s.content.trim()).length
  const totalSections = sections.length
  const hasErrors = sections.some((s) => s.status === "error")

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] bg-white border-gray-200 shadow-xl">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">AI Research Paper Generator</DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                Generate comprehensive academic papers with structured sections, drag-and-drop reordering, and export
                options
              </DialogDescription>
            </div>
          </div>

          {/* Progress indicator */}
          {isGeneratingAll && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Generating sections...</span>
                <span>{Math.round(generationProgress)}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
            </div>
          )}
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-1">
          <div className="space-y-6 py-4">
            {/* Template and Configuration */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Configuration</h4>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-white border-gray-300">
                    {props.selectedProvider}
                  </Badge>
                  <Badge variant="outline" className="bg-white border-gray-300">
                    {props.selectedModel}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-2 block">Template</Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                    <SelectTrigger className="h-9 bg-white border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ieee">IEEE Conference/Journal</SelectItem>
                      <SelectItem value="acm">ACM Conference/Journal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleGenerateAll}
                    disabled={isGeneratingAll || !props.supabaseToken}
                    className="w-full h-9 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-sm"
                  >
                    {isGeneratingAll ? (
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
                </div>
              </div>
            </div>

            {/* Sections List with Drag and Drop */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">Paper Sections</h4>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {completedSections}/{totalSections} completed
                  </Badge>
                  {hasErrors && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Some errors
                    </Badge>
                  )}
                </div>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="sections-droppable">
                  {(provided: any) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                      {sections.map((section, idx) => (
                        <Draggable key={section.id} draggableId={section.id} index={idx}>
                          {(dragProvided: any) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                            >
                              {/* Section Header */}
                              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                <div className="flex items-center space-x-3">
                                  <span
                                    {...dragProvided.dragHandleProps}
                                    className="cursor-move text-gray-400 hover:text-gray-600"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </span>

                                  <div className="flex items-center space-x-2">
                                    <div
                                      className={`w-3 h-3 rounded-full ${
                                        section.status === "generating"
                                          ? "bg-blue-500 animate-pulse"
                                          : section.status === "completed"
                                            ? "bg-green-500"
                                            : section.status === "error"
                                              ? "bg-red-500"
                                              : "bg-gray-300"
                                      }`}
                                    />
                                    <span className="font-semibold text-gray-900">{section.title}</span>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    {section.required ? (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                      >
                                        Required
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-gray-50 text-gray-600 border-gray-300"
                                      >
                                        Optional
                                      </Badge>
                                    )}

                                    {section.edited && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                                      >
                                        Edited
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleGenerateSection(idx)}
                                    disabled={section.status === "generating" || isGeneratingAll}
                                    className="h-8 px-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                                  >
                                    {section.status === "generating" ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-3 h-3" />
                                    )}
                                  </Button>

                                  {!section.required && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemoveSection(idx)}
                                      className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Section Content */}
                              <div className="p-4">
                                <Textarea
                                  value={section.content}
                                  onChange={(e) => handleContentChange(idx, e.target.value)}
                                  placeholder={`${section.title} content will be generated here...`}
                                  className="min-h-[120px] text-sm border-gray-300 bg-gray-50 focus:bg-white transition-colors"
                                  disabled={section.status === "generating"}
                                />

                                {section.content && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    {section.content.split(" ").length} words • {section.content.length} characters
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {/* Add Custom Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Section
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Section Title</Label>
                  <Input
                    value={customSectionTitle}
                    onChange={(e) => setCustomSectionTitle(e.target.value)}
                    placeholder="e.g., Methodology"
                    className="h-8 text-sm border-gray-300 bg-white"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">AI Prompt</Label>
                  <Input
                    value={customSectionPrompt}
                    onChange={(e) => setCustomSectionPrompt(e.target.value)}
                    placeholder="Describe what to write..."
                    className="h-8 text-sm border-gray-300 bg-white"
                  />
                </div>
              </div>

              <Button
                size="sm"
                onClick={handleAddCustomSection}
                disabled={!customSectionTitle.trim() || !customSectionPrompt.trim()}
                className="h-8 bg-gray-900 text-white hover:bg-gray-800"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Section
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-gray-200 pt-4 bg-gray-50">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={exportMarkdown}
                disabled={completedSections === 0}
                className="border-gray-300 text-gray-700 hover:bg-white bg-transparent"
              >
                Export Markdown
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportLatex}
                disabled={completedSections === 0}
                className="border-gray-300 text-gray-700 hover:bg-white bg-transparent"
              >
                Export LaTeX
              </Button>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-xs text-gray-500">
                {completedSections > 0 && `${completedSections} sections ready`}
              </div>

              <Button
                variant="outline"
                onClick={() => props.onOpenChange(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>

              <Button
                onClick={handleInsertAll}
                disabled={completedSections === 0 || isGeneratingAll}
                className="bg-gray-900 text-white hover:bg-gray-800 shadow-sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Insert All Sections
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
