"use client"

import { DialogFooter } from "@/components/ui/dialog"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  ChevronDown,
  ChevronDownIcon,
  RefreshCw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VisualContentRenderer } from "./visual-content-renderer"
import { useSafeDOM } from "../hooks/use-safe-dom"
import { SafeDOMWrapper } from "./safe-dom-wrapper"

// Enhanced template configurations
const templates = {
  ieee: [
    {
      id: "title",
      title: "Title",
      prompt: "Write a concise, descriptive title for an IEEE research paper. Focus solely on the title content.",
      required: true,
      editable: true,
    },
    {
      id: "authors",
      title: "Authors & Affiliations",
      prompt: "List authors and affiliations in IEEE format. Provide only the author and affiliation details.",
      required: true,
      editable: true,
    },
    {
      id: "abstract",
      title: "Abstract",
      prompt:
        "Write an IEEE-style abstract (150-250 words) with motivation, methods, results, and significance. Do not include the 'Abstract' heading.",
      required: true,
      editable: true,
    },
    {
      id: "keywords",
      title: "Keywords",
      prompt: "List 3-6 relevant keywords, comma-separated. Do not include the 'Keywords' heading.",
      required: true,
      editable: true,
    },
    {
      id: "introduction",
      title: "1. Introduction",
      prompt:
        "Write the Introduction section with motivation, problem statement, contributions, and organization. Do not include the '1. Introduction' heading.",
      required: true,
      editable: true,
    },
    {
      id: "related",
      title: "2. Related Work",
      prompt: "Discuss previous research and cite relevant literature. Do not include the '2. Related Work' heading.",
      required: true,
      editable: true,
    },
    {
      id: "methods",
      title: "3. Methods",
      prompt:
        "Describe methods, datasets, algorithms, and experimental setup. Include flowcharts for methodology and procedures where appropriate. Do not include the '3. Methods' heading.",
      required: true,
      editable: true,
    },
    {
      id: "results",
      title: "4. Results",
      prompt:
        "Present results with tables, figures, and statistical analysis. Include tables for experimental data, performance metrics, and comparison results. Do not include the '4. Results' heading.",
      required: true,
      editable: true,
    },
    {
      id: "discussion",
      title: "5. Discussion",
      prompt:
        "Interpret results, compare with prior work, discuss limitations. Include tables for comparison with prior work and statistical analysis where appropriate. Do not include the '5. Discussion' heading.",
      required: true,
      editable: true,
    },
    {
      id: "conclusion",
      title: "6. Conclusion",
      prompt: "Summarize findings, contributions, and suggest future work. Do not include the '6. Conclusion' heading.",
      required: true,
      editable: true,
    },
    {
      id: "acknowledgments",
      title: "Acknowledgments",
      prompt: "Write acknowledgments (optional). Do not include the 'Acknowledgments' heading.",
      required: false,
      editable: true,
    },
    {
      id: "references",
      title: "References",
      prompt: "List references in IEEE format. Do not include the 'References' heading.",
      required: true,
      editable: true,
    },
  ],
  acm: [
    {
      id: "title",
      title: "Title",
      prompt: "Write a concise, descriptive title for an ACM research paper. Focus solely on the title content.",
      required: true,
      editable: true,
    },
    {
      id: "authors",
      title: "Authors & Affiliations",
      prompt: "List authors and affiliations in ACM format. Provide only the author and affiliation details.",
      required: true,
      editable: true,
    },
    {
      id: "abstract",
      title: "Abstract",
      prompt: "Write an ACM-style abstract (150-250 words). Do not include the 'Abstract' heading.",
      required: true,
      editable: true,
    },
    {
      id: "keywords",
      title: "Keywords",
      prompt: "List 3-6 relevant keywords. Do not include the 'Keywords' heading.",
      required: true,
      editable: true,
    },
    {
      id: "introduction",
      title: "1. Introduction",
      prompt: "Write the Introduction section for an ACM paper. Do not include the '1. Introduction' heading.",
      required: true,
      editable: true,
    },
    {
      id: "related",
      title: "2. Related Work",
      prompt: "Discuss previous research. Do not include the '2. Related Work' heading.",
      required: true,
      editable: true,
    },
    {
      id: "methods",
      title: "3. Methods",
      prompt:
        "Describe methodology in detail. Include flowcharts for algorithms and experimental procedures where appropriate. Do not include the '3. Methods' heading.",
      required: true,
      editable: true,
    },
    {
      id: "results",
      title: "4. Results",
      prompt:
        "Present results and analysis. Include tables for experimental data and performance metrics where appropriate. Do not include the '4. Results' heading.",
      required: true,
      editable: true,
    },
    {
      id: "discussion",
      title: "5. Discussion",
      prompt:
        "Interpret and discuss results. Include tables for comparison with prior work where appropriate. Do not include the '5. Discussion' heading.",
      required: true,
      editable: true,
    },
    {
      id: "conclusion",
      title: "6. Conclusion",
      prompt: "Summarize and conclude. Do not include the '6. Conclusion' heading.",
      required: true,
      editable: true,
    },
    {
      id: "acknowledgments",
      title: "Acknowledgments",
      prompt: "Write acknowledgments. Do not include the 'Acknowledgments' heading.",
      required: false,
      editable: true,
    },
    {
      id: "references",
      title: "References",
      prompt: "List references in ACM format. Do not include the 'References' heading.",
      required: true,
      editable: true,
    },
  ],
  springer: [
    {
      id: "title",
      title: "Title",
      prompt: "Write a concise, descriptive title for a Springer research paper. Focus solely on the title content.",
      required: true,
      editable: true,
    },
    {
      id: "authors",
      title: "Authors & Affiliations",
      prompt: "List authors and affiliations in Springer format. Provide only the author and affiliation details.",
      required: true,
      editable: true,
    },
    {
      id: "abstract",
      title: "Abstract",
      prompt:
        "Write a Springer-style abstract (150-250 words) summarizing the paper's content. Do not include the 'Abstract' heading.",
      required: true,
      editable: true,
    },
    {
      id: "keywords",
      title: "Keywords",
      prompt: "List 3-6 relevant keywords. Do not include the 'Keywords' heading.",
      required: true,
      editable: true,
    },
    {
      id: "introduction",
      title: "1. Introduction",
      prompt:
        "Write the Introduction section for a Springer paper, outlining the problem, motivation, and paper structure. Do not include the '1. Introduction' heading.",
      required: true,
      editable: true,
    },
    {
      id: "literature",
      title: "2. Literature Review",
      prompt:
        "Provide a comprehensive review of relevant literature. Do not include the '2. Literature Review' heading.",
      required: true,
      editable: true,
    },
    {
      id: "methods",
      title: "3. Materials and Methods",
      prompt:
        "Describe the materials and methods used in the research. Include flowcharts for experimental procedures and methodology where appropriate. Do not include the '3. Materials and Methods' heading.",
      required: true,
      editable: true,
    },
    {
      id: "results",
      title: "4. Results",
      prompt:
        "Present the findings and results of the study. Include tables for experimental data and statistical analysis where appropriate. Do not include the '4. Results' heading.",
      required: true,
      editable: true,
    },
    {
      id: "discussion",
      title: "5. Discussion",
      prompt:
        "Discuss the implications of the results and compare them with existing literature. Include tables for comparison with prior work where appropriate. Do not include the '5. Discussion' heading.",
      required: true,
      editable: true,
    },
    {
      id: "conclusion",
      title: "6. Conclusion",
      prompt: "Summarize the main conclusions and suggest future work. Do not include the '6. Conclusion' heading.",
      required: true,
      editable: true,
    },
    {
      id: "acknowledgments",
      title: "Acknowledgments",
      prompt: "Write acknowledgments (optional). Do not include the 'Acknowledgments' heading.",
      required: false,
      editable: true,
    },
    {
      id: "references",
      title: "References",
      prompt: "List references in Springer format. Do not include the 'References' heading.",
      required: true,
      editable: true,
    },
  ],
  elsevier: [
    {
      id: "title",
      title: "Title",
      prompt: "Write a concise, descriptive title for an Elsevier research paper. Focus solely on the title content.",
      required: true,
      editable: true,
    },
    {
      id: "authors",
      title: "Authors & Affiliations",
      prompt: "List authors and affiliations in Elsevier format. Provide only the author and affiliation details.",
      required: true,
      editable: true,
    },
    {
      id: "abstract",
      title: "Abstract",
      prompt:
        "Write an Elsevier-style abstract (150-250 words) with a clear summary of the paper. Do not include the 'Abstract' heading.",
      required: true,
      editable: true,
    },
    {
      id: "keywords",
      title: "Keywords",
      prompt: "List 3-6 relevant keywords. Do not include the 'Keywords' heading.",
      required: true,
      editable: true,
    },
    {
      id: "introduction",
      title: "1. Introduction",
      prompt:
        "Write the Introduction section for an Elsevier paper, providing background and objectives. Do not include the '1. Introduction' heading.",
      required: true,
      editable: true,
    },
    {
      id: "methods",
      title: "2. Materials and Methods",
      prompt:
        "Describe the experimental procedures, materials, and methods in detail. Include flowcharts for experimental procedures where appropriate. Do not include the '2. Materials and Methods' heading.",
      required: true,
      editable: true,
    },
    {
      id: "results",
      title: "3. Results",
      prompt:
        "Present the experimental results clearly and concisely. Include tables for experimental data and statistical analysis where appropriate. Do not include the '3. Results' heading.",
      required: true,
      editable: true,
    },
    {
      id: "discussion",
      title: "4. Discussion",
      prompt:
        "Discuss the interpretation of results, their significance, and comparison with previous studies. Include tables for comparison with prior work where appropriate. Do not include the '4. Discussion' heading.",
      required: true,
      editable: true,
    },
    {
      id: "conclusion",
      title: "5. Conclusion",
      prompt:
        "Summarize the main findings and conclusions of the research. Do not include the '5. Conclusion' heading.",
      required: true,
      editable: true,
    },
    {
      id: "acknowledgments",
      title: "Acknowledgments",
      prompt: "Write acknowledgments (optional). Do not include the 'Acknowledgments' heading.",
      required: false,
      editable: true,
    },
    {
      id: "references",
      title: "References",
      prompt: "List references in Elsevier format. Do not include the 'References' heading.",
      required: true,
      editable: true,
    },
  ],
  general: [
    {
      id: "title",
      title: "Title",
      prompt: "Write a concise, descriptive title for a general academic paper. Focus solely on the title content.",
      required: true,
      editable: true,
    },
    {
      id: "authors",
      title: "Authors & Affiliations",
      prompt: "List authors and affiliations. Provide only the author and affiliation details.",
      required: true,
      editable: true,
    },
    {
      id: "abstract",
      title: "Abstract",
      prompt:
        "Write a general academic abstract (150-250 words) summarizing the paper. Do not include the 'Abstract' heading.",
      required: true,
      editable: true,
    },
    {
      id: "keywords",
      title: "Keywords",
      prompt: "List 3-6 relevant keywords. Do not include the 'Keywords' heading.",
      required: true,
      editable: true,
    },
    {
      id: "introduction",
      title: "1. Introduction",
      prompt:
        "Write the Introduction section, providing background, problem statement, and objectives. Do not include the '1. Introduction' heading.",
      required: true,
      editable: true,
    },
    {
      id: "body",
      title: "2. Body",
      prompt:
        "Write the main body of the paper, including methodology, results, and discussion. Include tables for data presentation and flowcharts for methodology where appropriate. Do not include the '2. Body' heading.",
      required: true,
      editable: true,
    },
    {
      id: "conclusion",
      title: "3. Conclusion",
      prompt:
        "Write the Conclusion section, summarizing findings and implications. Do not include the '3. Conclusion' heading.",
      required: true,
      editable: true,
    },
    {
      id: "acknowledgments",
      title: "Acknowledgments",
      prompt: "Write acknowledgments (optional). Do not include the 'Acknowledgments' heading.",
      required: false,
      editable: true,
    },
    {
      id: "references",
      title: "References",
      prompt: "List references. Do not include the 'References' heading.",
      required: true,
      editable: true,
    },
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
  sectionType?: string,
) {
  if (!supabaseToken) {
    return "Authentication error: Please log in again."
  }

  // Enhanced prompt for sections that typically need tables or flowcharts
  const needsVisualContent =
    sectionType && ["methods", "results", "discussion", "introduction"].includes(sectionType.toLowerCase())

  let enhancedPrompt = prompt

  if (needsVisualContent) {
    enhancedPrompt = `${prompt}

IMPORTANT: If this section would benefit from structured data presentation, include the following where appropriate:

1. TABLES: Generate markdown tables for:
   - Experimental results and data
   - Comparison of methods or approaches
   - Statistical analysis results
   - Performance metrics
   - Literature comparison
   - Parameter settings

2. FLOWCHARTS: Generate mermaid flowcharts for:
   - Methodology and procedures
   - Algorithm flow
   - Experimental workflow
   - Decision trees
   - Process diagrams

Use this format for tables:
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |

Use this format for flowcharts:
\`\`\`mermaid
flowchart TD
    A[Start] --> B{Decision?}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E
\`\`\`

Only include tables and flowcharts where they add value to the content. Ensure all visual elements are properly labeled and referenced in the text.`
  }

  const fullPrompt = [
    writingStylePrompt,
    templatePrompt,
    researchContext ? `Research Context:\n${researchContext}` : "",
    context ? `Previous Content for Context:\n${context}` : "",
    `Generate ONLY the content for the following section, without including its title or any subsequent section titles. Focus strictly on the requested content:\n${enhancedPrompt}`,
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
        maxTokens: 2000, // Increased for visual content
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

type TemplateKey = "ieee" | "acm" | "springer" | "elsevier" | "general"

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
  const { safeDownload } = useSafeDOM()

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
      section.id, // Pass section ID for visual content detection
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
        section.id, // Pass section ID for visual content detection
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
    try {
      const md = sections
        .filter((s) => s.content.trim())
        .map((s) => `## ${s.title}\n\n${s.content}`)
        .join("\n\n")

      const blob = new Blob([md], { type: "text/markdown" })
      safeDownload(blob, "research-paper.md")
    } catch (error) {
      console.error("Error exporting markdown:", error)
    }
  }

  function exportLatex() {
    try {
      const latex = sections
        .filter((s) => s.content.trim())
        .map((s) => `\\section{${s.title.replace(/^[0-9. ]+/, "")}}\n${s.content}`)
        .join("\n\n")

      const blob = new Blob([latex], { type: "application/x-latex" })
      safeDownload(blob, "research-paper.tex")
    } catch (error) {
      console.error("Error exporting latex:", error)
    }
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
  // Type guard for generating status
  const isGenerating = (status: Section["status"]): status is "generating" => status === "generating"

  const StatusIcon = ({ status }: { status: Section["status"] }) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-gray-900" aria-label="Completed" />
      case "generating":
        return <Loader2 className="w-4 h-4 text-gray-600 animate-spin" aria-label="Generating" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" aria-label="Error" />
      default:
        return <Circle className="w-4 h-4 text-gray-400" aria-label="Pending" />
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-7xl w-[98vw] lg:w-[95vw] max-h-[90vh] bg-white border border-gray-200 shadow-2xl overflow-hidden">
        <SafeDOMWrapper>
          {/* Monochromatic Header */}
          <DialogHeader className="relative bg-black text-white p-8 -m-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/20">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-3xl font-medium text-white mb-2 tracking-wide">
                    AI Research Paper Generator
                  </DialogTitle>
                  <DialogDescription className="text-gray-300 text-base font-normal leading-relaxed">
                    Generate comprehensive academic papers with structured sections and intelligent content creation.
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge
                  variant="outline"
                  className="bg-white/10 text-white border-white/30 backdrop-blur-sm px-3 py-1 text-sm font-medium"
                >
                  {props.selectedProvider}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-white/10 text-white border-white/30 backdrop-blur-sm px-3 py-1 text-sm font-medium"
                >
                  {props.selectedModel}
                </Badge>
              </div>
            </div>

            {/* Progress indicator */}
            {isGeneratingAll && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-200">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5" />
                    <span className="font-medium">Generating sections...</span>
                  </div>
                  <span className="font-mono text-lg">{Math.round(generationProgress)}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 backdrop-blur-sm">
                  <div
                    className="bg-white h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>
            )}
          </DialogHeader>

          <div className="flex flex-col lg:flex-row gap-8 max-h-[60vh] overflow-hidden">
            {/* Left Panel - Configuration */}
            <div className="w-full lg:w-96 flex-shrink-0 space-y-6 overflow-y-auto pr-2 min-w-0 modal-scrollbar">
              {/* Template Configuration Card */}
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardHeader className="pb-4 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <Settings2 className="w-5 h-5 text-gray-700" />
                    <CardTitle className="text-lg font-medium text-gray-900">Configuration</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-3 block">Template Format</Label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                      <SelectTrigger className="h-12 bg-white border-2 border-gray-200 hover:border-gray-300 focus:border-black focus:ring-0 transition-all text-base">
                        <SelectValue className="text-gray-900 font-medium" />
                        <ChevronDown className="h-5 w-5 text-gray-600" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-2 border-gray-200 shadow-xl rounded-lg p-2 min-w-[350px]">
                        {Object.entries(templates).map(([key, sections]) => {
                          const templateInfo = {
                            ieee: {
                              name: "IEEE",
                              desc: "IEEE Conference/Journal Template",
                              words: "8,000",
                            },
                            acm: {
                              name: "ACM",
                              desc: "ACM Conference/Journal Template",
                              words: "10,000",
                            },
                            springer: {
                              name: "Springer",
                              desc: "Springer Journal Template",
                              words: "12,000",
                            },
                            elsevier: {
                              name: "Elsevier",
                              desc: "Elsevier Journal Template",
                              words: "15,000",
                            },
                            general: {
                              name: "General",
                              desc: "General Academic Template",
                              words: "10,000",
                            },
                          }[key as TemplateKey]!

                          return (
                            <SelectItem
                              key={key}
                              value={key}
                              className="flex items-start space-x-3 p-4 hover:bg-gray-50 rounded-lg cursor-pointer data-[state=checked]:bg-black data-[state=checked]:text-white transition-all"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-base">{templateInfo.name}</div>
                                <div className="text-sm text-gray-600 mt-1">{templateInfo.desc}</div>
                                <div className="text-xs text-gray-500 mt-1">~{templateInfo.words} words</div>
                              </div>
                              <div className="flex items-center space-x-2 text-xs">
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                  {sections.length} sections
                                </span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Research Context Display */}
                  {props.researchContext && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-900">Research Context</Label>
                      <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                          <BookOpen className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 mb-1">Available Context</div>
                            <div className="text-xs text-gray-700 line-clamp-3">
                              {props.researchContext.length > 200
                                ? `${props.researchContext.substring(0, 200)}...`
                                : props.researchContext}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom Section Addition */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900">Add Custom Section</Label>
                    <div className="space-y-3">
                      <Input
                        placeholder="Section title (e.g., 'Methodology')"
                        value={customSectionTitle}
                        onChange={(e) => setCustomSectionTitle(e.target.value)}
                        className="h-10 border-2 border-gray-200 focus:border-black focus:ring-0"
                      />
                      <Textarea
                        placeholder="Describe what this section should contain..."
                        value={customSectionPrompt}
                        onChange={(e) => setCustomSectionPrompt(e.target.value)}
                        className="min-h-[80px] border-2 border-gray-200 focus:border-black focus:ring-0 resize-none"
                      />
                      <Button
                        onClick={handleAddCustomSection}
                        disabled={!customSectionTitle.trim() || !customSectionPrompt.trim()}
                        className="w-full bg-black hover:bg-gray-800 text-white h-10"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Section
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Sections */}
            <div className="flex-1 min-w-0 overflow-y-auto modal-scrollbar">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="sections">
                  {(provided: any) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 pr-2">
                      {sections.map((section, idx) => (
                        <Draggable key={section.id} draggableId={section.id} index={idx}>
                          {(provided: any, snapshot: any) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`relative ${snapshot.isDragging ? "opacity-50" : ""}`}
                            >
                              <Card className="border-2 border-gray-200 hover:border-gray-300 transition-all bg-white shadow-sm">
                                <CardHeader className="pb-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
                                      >
                                        <GripVertical className="w-4 h-4 text-gray-400" />
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <StatusIcon status={section.status} />
                                        <CardTitle className="text-lg font-medium text-gray-900">
                                          {section.title}
                                        </CardTitle>
                                        {props.researchContext && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-gray-100 text-gray-700 border-gray-300"
                                          >
                                            Context
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {section.edited && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs bg-gray-50 text-gray-700 border-gray-400"
                                        >
                                          Edited
                                        </Badge>
                                      )}
                                      {section.required && (
                                        <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
                                          Required
                                        </Badge>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteClick(idx)}
                                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">Content</Label>
                                    <Textarea
                                      value={section.content}
                                      onChange={(e) => handleContentChange(idx, e.target.value)}
                                      placeholder={`Generate content for ${section.title.toLowerCase()}...`}
                                      className="min-h-[120px] border-2 border-gray-200 focus:border-black focus:ring-0 resize-none"
                                      onKeyDown={(e) => handleKeyDown(e, idx)}
                                    />
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                      <span>{section.content.length} characters</span>
                                      {section.content.length > 0 && <span>•</span>}
                                      {section.content.length > 0 && (
                                        <span>{Math.ceil(section.content.length / 5)} words</span>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {section.status === "completed" && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleGenerateSection(idx)}
                                          className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 h-8 px-3"
                                        >
                                          <RefreshCw className="w-3 h-3 mr-1" />
                                          Regenerate
                                        </Button>
                                      )}
                                      <Button
                                        onClick={() => handleGenerateSection(idx)}
                                        disabled={isGenerating(section.status)}
                                        className="bg-black hover:bg-gray-800 text-white h-8 px-4"
                                      >
                                        {isGenerating(section.status) ? (
                                          <>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Generating...
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            Generate
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Visual Content Display */}
                                  {section.content && <VisualContentRenderer content={section.content} />}
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Scroll indicator */}
              {sections.length > 3 && (
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <ChevronDownIcon className="w-4 h-4 animate-bounce" />
                    <span>Scroll for more sections</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Footer */}
          <DialogFooter className="border-t-2 border-gray-200 pt-6 bg-gray-50 -mx-6 -mb-6 px-8 pb-8 mt-6 sticky bottom-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportMarkdown}
                  disabled={completedSections === 0}
                  className="border-2 border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 bg-transparent transition-all h-10 px-4"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Markdown
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportLatex}
                  disabled={completedSections === 0}
                  className="border-2 border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 bg-transparent transition-all h-10 px-4"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Export LaTeX
                </Button>
              </div>

              <div className="flex items-center space-x-6">
                {completedSections > 0 && (
                  <div className="text-base text-gray-700 flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-gray-900" />
                    <span className="font-medium">{completedSections} sections ready</span>
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => props.onOpenChange(false)}
                    className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all h-11 px-6"
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={handleGenerateAll}
                    disabled={isGeneratingAll}
                    className="bg-gray-700 hover:bg-gray-900 text-white shadow-md hover:shadow-lg transition-all duration-200 h-11 px-6 font-medium"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    {isGeneratingAll ? "Generating All..." : "Generate All Sections"}
                  </Button>

                  <Button
                    onClick={handleInsertAll}
                    disabled={completedSections === 0 || isGeneratingAll}
                    className="bg-black hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all duration-200 h-11 px-6 font-medium"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Insert All Sections
                  </Button>
                </div>
              </div>
            </div>
          </DialogFooter>
        </SafeDOMWrapper>

        {/* Delete Confirmation Dialog */}
        {deleteConfirmIndex !== null && (
          <Dialog open={deleteConfirmIndex !== null} onOpenChange={() => setDeleteConfirmIndex(null)}>
            <DialogContent className="sm:max-w-md bg-white border-2 border-gray-200">
              <DialogHeader>
                <DialogTitle className="text-xl font-medium text-gray-900">Delete Section</DialogTitle>
                <DialogDescription className="text-base text-gray-600 leading-relaxed">
                  Are you sure you want to delete "{sections[deleteConfirmIndex]?.title}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmIndex(null)}
                  className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 h-10 px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleRemoveSection(deleteConfirmIndex)}
                  className="bg-black text-white hover:bg-gray-800 h-10 px-4"
                >
                  Delete Section
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
