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
  ChevronDown,
  ChevronDown as ChevronDownIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VisualContentRenderer } from "./visual-content-renderer"

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
      prompt: "Describe methodology in detail. Include flowcharts for algorithms and experimental procedures where appropriate. Do not include the '3. Methods' heading.",
      required: true,
      editable: true,
    },
    {
      id: "results",
      title: "4. Results",
      prompt: "Present results and analysis. Include tables for experimental data and performance metrics where appropriate. Do not include the '4. Results' heading.",
      required: true,
      editable: true,
    },
    {
      id: "discussion",
      title: "5. Discussion",
      prompt: "Interpret and discuss results. Include tables for comparison with prior work where appropriate. Do not include the '5. Discussion' heading.",
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
      prompt: "Present the findings and results of the study. Include tables for experimental data and statistical analysis where appropriate. Do not include the '4. Results' heading.",
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
      prompt: "Present the experimental results clearly and concisely. Include tables for experimental data and statistical analysis where appropriate. Do not include the '3. Results' heading.",
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
  const needsVisualContent = sectionType && ['methods', 'results', 'discussion', 'introduction'].includes(sectionType.toLowerCase())
  
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
  // Type guard for generating status
  const isGenerating = (status: Section["status"]): status is "generating" => status === "generating"

  const StatusIcon = ({ status }: { status: Section["status"] }) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-black" aria-label="Completed" />
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
                            desc: "Springer Conference/Journal Template",
                            words: "12,000",
                          },
                          elsevier: {
                            name: "Elsevier",
                            desc: "Elsevier Journal Template",
                            words: "15,000",
                          },
                          general: {
                            name: "General Academic",
                            desc: "Standard Academic Paper Template",
                            words: "10,000",
                          },
                        }[key] || {
                          name: key.toUpperCase(),
                          desc: "Academic Template",
                          words: "N/A",
                        }

                          return (
                            <SelectItem
                              key={key}
                              value={key}
                            className="p-4 hover:bg-gray-50 focus:bg-gray-100 cursor-pointer rounded-md border-0 data-[highlighted]:bg-gray-100"
                            >
                            <div className="flex flex-col space-y-2 w-full">
                                <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-900 text-lg">{templateInfo.name}</span>
                                <span className="text-sm text-gray-500 font-medium">{sections.length} sections</span>
                                </div>
                              <div className="text-sm text-gray-600 leading-relaxed">{templateInfo.desc}</div>
                              <div className="text-sm text-gray-500">
                                Recommended length: {templateInfo.words} words
                              </div>
                              </div>
                  </SelectItem>
                        )
                        })}
              </SelectContent>
            </Select>
          </div>
          
                {/* Research Context Display */}
                {props.researchContext ? (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900 mb-2 block">Research Context</Label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                        {props.researchContext}
                      </pre>
                    </div>
                    <div className="text-xs text-gray-500">
                      This context includes your current research topic, selected papers, ideas, and recent searches. 
                      It will be used to inform the AI generation for all sections, making the content more relevant and accurate.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900 mb-2 block">Research Context</Label>
                    <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 text-gray-500">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs">No research context available</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Visit the Explorer page to set up your research topic, select papers, and generate ideas to enhance AI generation.
                    </div>
                  </div>
                )}

          <Button 
                    onClick={handleGenerateAll}
                    disabled={isGeneratingAll || !props.supabaseToken}
                  className="w-full h-12 bg-black hover:bg-gray-800 text-white font-medium text-base shadow-md hover:shadow-lg transition-all duration-200 rounded-lg"
                  >
                    {isGeneratingAll ? (
              <>
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                      <Sparkles className="h-5 w-5 mr-3" />
                        Generate All Sections
              </>
            )}
          </Button>
              </CardContent>
            </Card>

            {/* Progress Overview Card */}
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="w-5 h-5 text-gray-700" />
                    <CardTitle className="text-lg font-medium text-gray-900">Progress Overview</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-gray-50 text-gray-900 border-gray-300 text-sm font-mono">
                    {completedSections}/{totalSections}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between text-base">
                  <span className="text-gray-700">Completed</span>
                  <span className="font-semibold text-gray-900">{completedSections}</span>
                </div>
                {generatingSections > 0 && (
                  <div className="flex justify-between text-base">
                    <span className="text-gray-700">Generating</span>
                    <span className="font-semibold text-gray-600">{generatingSections}</span>
                  </div>
                )}
                  {hasErrors && (
                  <div className="flex justify-between text-base">
                    <span className="text-gray-700">Errors</span>
                    <span className="font-semibold text-red-600">
                      {sections.filter((s) => s.status === "error").length}
                    </span>
                  </div>
                )}
                <div className="pt-3">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-black h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(completedSections / totalSections) * 100}%` }}
                    />
                </div>
              </div>
              </CardContent>
            </Card>

            {/* Add Custom Section Card */}
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader className="pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <Plus className="w-5 h-5 text-gray-700" />
                  <CardTitle className="text-lg font-medium text-gray-900">Add Custom Section</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-2 block">Section Title</Label>
                  <Input
                    value={customSectionTitle}
                    onChange={(e) => setCustomSectionTitle(e.target.value)}
                    placeholder="e.g., Methodology"
                    className="h-11 text-base border-2 border-gray-200 focus:border-black focus:ring-0 transition-all"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-2 block">AI Prompt</Label>
                  <Input
                    value={customSectionPrompt}
                    onChange={(e) => setCustomSectionPrompt(e.target.value)}
                    placeholder="Describe what to write..."
                    className="h-11 text-base border-2 border-gray-200 focus:border-black focus:ring-0 transition-all"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleAddCustomSection}
                  disabled={!customSectionTitle.trim() || !customSectionPrompt.trim()}
                  className="w-full h-10 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Sections */}
          <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-y-auto pr-3 space-y-4 pb-4 modal-scrollbar" id="sections-container">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="sections-droppable">
                  {(provided: any) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
                      {sections.map((section, idx) => (
                        <Draggable key={section.id} draggableId={section.id} index={idx}>
                          {(dragProvided: any, snapshot: any) => (
                            <Card
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 bg-white ${
                                snapshot.isDragging ? "shadow-xl ring-2 ring-gray-300" : ""
                              }`}
                            >
                              {/* Section Header */}
                              <CardHeader className="pb-4 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                  <span
                                    {...dragProvided.dragHandleProps}
                                      className="cursor-move text-gray-400 hover:text-gray-600 transition-colors p-1"
                                      aria-label="Drag to reorder section"
                                  >
                                      <GripVertical className="w-5 h-5" />
                                  </span>

                                    <StatusIcon status={section.status} />

                                    <div className="flex items-center space-x-4">
                                      <span className="font-semibold text-gray-900 text-base">{section.title}</span>

                                  <div className="flex items-center space-x-2">
                                        {props.researchContext && (
                                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                            <BookOpen className="w-3 h-3 mr-1" />
                                            Context
                                          </Badge>
                                        )}
                                    {section.required ? (
                                      <Badge
                                        variant="outline"
                                            className="text-xs bg-gray-100 text-gray-800 border-gray-300 px-2 py-1 font-medium"
                                      >
                                        Required
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                            className="text-xs bg-white text-gray-600 border-gray-300 px-2 py-1 font-medium"
                                      >
                                        Optional
                                      </Badge>
                                    )}

                                    {section.edited && (
                                      <Badge
                                        variant="outline"
                                            className="text-xs bg-gray-50 text-gray-700 border-gray-400 px-2 py-1 font-medium"
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
                                      disabled={isGenerating(section.status) || isGeneratingAll}
                                      className="h-9 px-4 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                                  >
                                      {isGenerating(section.status) ? (
                                        <Loader2 className="w-4 h-4 animate-spin" aria-label="Generating" />
                                    ) : (
                                        <Sparkles className="w-4 h-4" aria-label="Generate section" />
                                    )}
                                  </Button>

                                  {!section.required && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                        onClick={() => handleDeleteClick(idx)} // Use handleDeleteClick for confirmation
                                        className="h-9 w-9 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
                                        aria-label={`Remove ${section.title} section`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              </CardHeader>

                              {/* Section Content */}
                              <CardContent className="pt-6">
                                {isGenerating(section.status) ? (
                                  <div className="min-h-[140px] flex items-center justify-center">
                                    <div className="text-gray-500">Generating content...</div>
                                  </div>
                                ) : section.content ? (
                                  <div className="space-y-4">
                                    {/* Visual Content Renderer */}
                                    <VisualContentRenderer content={section.content} />
                                    
                                    {/* Raw Content Editor */}
                                    <div className="border-t pt-4">
                                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Raw Content (Editable)
                                      </Label>
                                <Textarea
                                  value={section.content}
                                  onChange={(e) => handleContentChange(idx, e.target.value)}
                                  placeholder={`${section.title} content will be generated here...`}
                                        className="min-h-[120px] text-sm border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-black focus:ring-0 transition-all resize-none leading-relaxed font-mono"
                                        onKeyDown={(e) => handleKeyDown(e, idx)}
                                        aria-label={`${section.title} content`}
                                />
                                  </div>
                                    
                                    <div className="flex items-center justify-between text-sm text-gray-500">
                                      <span className="font-mono">
                                        {section.content.split(" ").filter(Boolean).length} words •{" "}
                                        {section.content.length} characters
                                      </span>
                                      {section.status === "completed" && !section.content.startsWith("Error") && (
                                        <Badge
                                          variant="outline"
                                          className="bg-gray-100 text-gray-800 border-gray-300 text-xs font-medium"
                                        >
                                          Ready
                                        </Badge>
                                )}
                              </div>
                            </div>
                                ) : (
                                  <Textarea
                                    value={section.content}
                                    onChange={(e) => handleContentChange(idx, e.target.value)}
                                    placeholder={`${section.title} content will be generated here...`}
                                    className="min-h-[140px] text-base border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-black focus:ring-0 transition-all resize-none leading-relaxed"
                                    disabled={isGenerating(section.status)}
                                    onKeyDown={(e) => handleKeyDown(e, idx)}
                                    aria-label={`${section.title} content`}
                                  />
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

            {/* Scroll Indicator */}
            {sections.length > 6 && (
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
                  <CheckCircle2 className="w-5 h-5 text-black" />
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
      </DialogContent>

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
    </Dialog>
  )
}
