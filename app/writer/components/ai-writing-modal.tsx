"use client"

import type React from "react"

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
import {
  Loader2,
  Sparkles,
  FileText,
  GripVertical,
  Plus,
  Trash2,
  Download,
  FileDown,
  Settings2,
  BookOpen,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null)

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
    setDeleteConfirmIndex(null)
  }

  // Show delete confirmation
  function handleDeleteClick(idx: number) {
    if (sections[idx].required) return
    setDeleteConfirmIndex(idx)
  }

  // Handle keyboard shortcuts
  function handleKeyDown(event: React.KeyboardEvent, idx: number) {
    if (event.key === "Delete" && !sections[idx].required) {
      event.preventDefault()
      handleDeleteClick(idx)
    }
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
  const generatingSections = sections.filter((s) => s.status === "generating").length

  // Status icon component
  const StatusIcon = ({ status }: { status: Section["status"] }) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case "generating":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Circle className="w-4 h-4 text-gray-300" />
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] bg-gradient-to-br from-slate-50 to-white border-0 shadow-2xl overflow-hidden">
        {/* Enhanced Header */}
        <DialogHeader className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white p-6 -m-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-white mb-1">AI Research Paper Generator</DialogTitle>
              <DialogDescription className="text-blue-100 text-sm">
                Generate comprehensive academic papers with structured sections and intelligent content creation
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                {props.selectedProvider}
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                {props.selectedModel}
              </Badge>
            </div>
          </div>

          {/* Progress indicator */}
          {isGeneratingAll && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm text-blue-100">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Generating sections...</span>
                </div>
                <span className="font-medium">{Math.round(generationProgress)}% complete</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 backdrop-blur-sm">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="flex gap-6 max-h-[70vh] overflow-hidden">
          {/* Left Panel - Configuration */}
          <div className="w-80 flex-shrink-0 space-y-4">
            {/* Template Configuration Card */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Settings2 className="w-4 h-4 text-slate-600" />
                  <CardTitle className="text-sm font-semibold text-slate-800">Configuration</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-slate-700 mb-2 block">Template Format</Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                    <SelectTrigger className="h-10 bg-white border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 shadow-xl rounded-lg">
                      {Object.entries(templates).map(([key, sections]) => {
                        const templateInfo = {
                          ieee: {
                            name: "IEEE",
                            desc: "IEEE Conference/Journal",
                            words: "8,000",
                            color: "text-blue-600",
                          },
                          acm: {
                            name: "ACM",
                            desc: "ACM Conference/Journal",
                            words: "10,000",
                            color: "text-purple-600",
                          },
                        }[key] || {
                          name: key.toUpperCase(),
                          desc: "Academic Template",
                          words: "N/A",
                          color: "text-slate-600",
                        }

                        return (
                          <SelectItem
                            key={key}
                            value={key}
                            className="p-3 hover:bg-slate-50 focus:bg-blue-50 cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`font-semibold ${templateInfo.color}`}>{templateInfo.name}</span>
                                <span className="text-xs text-slate-400">{sections.length} sections</span>
                              </div>
                              <div className="text-xs text-slate-600">{templateInfo.desc}</div>
                              <div className="text-xs text-slate-400 mt-1">{templateInfo.words} words</div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerateAll}
                  disabled={isGeneratingAll || !props.supabaseToken}
                  className="w-full h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
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
              </CardContent>
            </Card>

            {/* Progress Overview Card */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-slate-600" />
                    <CardTitle className="text-sm font-semibold text-slate-800">Progress Overview</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                    {completedSections}/{totalSections}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Completed</span>
                  <span className="font-medium text-emerald-600">{completedSections}</span>
                </div>
                {generatingSections > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Generating</span>
                    <span className="font-medium text-blue-600">{generatingSections}</span>
                  </div>
                )}
                {hasErrors && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Errors</span>
                    <span className="font-medium text-red-600">
                      {sections.filter((s) => s.status === "error").length}
                    </span>
                  </div>
                )}
                <div className="pt-2">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(completedSections / totalSections) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add Custom Section Card */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-slate-600" />
                  <CardTitle className="text-sm font-semibold text-slate-800">Add Custom Section</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-slate-700 mb-1 block">Section Title</Label>
                  <Input
                    value={customSectionTitle}
                    onChange={(e) => setCustomSectionTitle(e.target.value)}
                    placeholder="e.g., Methodology"
                    className="h-9 text-sm border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-700 mb-1 block">AI Prompt</Label>
                  <Input
                    value={customSectionPrompt}
                    onChange={(e) => setCustomSectionPrompt(e.target.value)}
                    placeholder="Describe what to write..."
                    className="h-9 text-sm border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleAddCustomSection}
                  disabled={!customSectionTitle.trim() || !customSectionPrompt.trim()}
                  className="w-full h-8 bg-slate-800 hover:bg-slate-900 text-white text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Section
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Sections */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto pr-2 space-y-3">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="sections-droppable">
                  {(provided: any) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                      {sections.map((section, idx) => (
                        <Draggable key={section.id} draggableId={section.id} index={idx}>
                          {(dragProvided: any, snapshot: any) => (
                            <Card
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 ${
                                snapshot.isDragging ? "shadow-lg ring-2 ring-blue-200" : ""
                              }`}
                            >
                              {/* Section Header */}
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <span
                                      {...dragProvided.dragHandleProps}
                                      className="cursor-move text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </span>

                                    <StatusIcon status={section.status} />

                                    <div className="flex items-center space-x-3">
                                      <span className="font-semibold text-slate-800 text-sm">{section.title}</span>

                                      <div className="flex items-center space-x-2">
                                        {section.required ? (
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-blue-50 text-blue-700 border-blue-200 px-2 py-0.5"
                                          >
                                            Required
                                          </Badge>
                                        ) : (
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-slate-50 text-slate-600 border-slate-300 px-2 py-0.5"
                                          >
                                            Optional
                                          </Badge>
                                        )}

                                        {section.edited && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-amber-50 text-amber-700 border-amber-200 px-2 py-0.5"
                                          >
                                            Edited
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleGenerateSection(idx)}
                                      disabled={section.status === "generating" || isGeneratingAll}
                                      className="h-8 px-3 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
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
                                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>

                              {/* Section Content */}
                              <CardContent className="pt-0">
                                <Textarea
                                  value={section.content}
                                  onChange={(e) => handleContentChange(idx, e.target.value)}
                                  placeholder={`${section.title} content will be generated here...`}
                                  className="min-h-[120px] text-sm border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                                  disabled={section.status === "generating"}
                                />

                                {section.content && (
                                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                    <span>
                                      {section.content.split(" ").length} words • {section.content.length} characters
                                    </span>
                                    {section.status === "completed" && !section.content.startsWith("Error") && (
                                      <Badge
                                        variant="outline"
                                        className="bg-emerald-50 text-emerald-600 border-emerald-200 text-xs"
                                      >
                                        Ready
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <DialogFooter className="border-t border-slate-200 pt-4 bg-slate-50/50 -mx-6 -mb-6 px-6 pb-6 mt-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={exportMarkdown}
                disabled={completedSections === 0}
                className="border-slate-300 text-slate-700 hover:bg-white hover:border-slate-400 bg-transparent transition-all"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Markdown
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportLatex}
                disabled={completedSections === 0}
                className="border-slate-300 text-slate-700 hover:bg-white hover:border-slate-400 bg-transparent transition-all"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export LaTeX
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              {completedSections > 0 && (
                <div className="text-sm text-slate-600 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{completedSections} sections ready</span>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => props.onOpenChange(false)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleInsertAll}
                  disabled={completedSections === 0 || isGeneratingAll}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Insert All Sections
                </Button>
              </div>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmIndex !== null && (
        <Dialog open={deleteConfirmIndex !== null} onOpenChange={() => setDeleteConfirmIndex(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900">Delete Section</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Are you sure you want to delete "{sections[deleteConfirmIndex]?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmIndex(null)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRemoveSection(deleteConfirmIndex)}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Delete Section
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}
