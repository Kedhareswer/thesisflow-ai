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
import { Loader2, Sparkles, Check, FileText, AlertCircle, GripVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import type { DropResult, DraggableProvided, DroppableProvided } from 'react-beautiful-dnd'
import { useRef } from "react"

// 1. Template config for multiple publishers
const templates = {
  ieee: [
    { id: "title", title: "Title", prompt: "Write a concise, descriptive title for an IEEE research paper on the given topic.", required: true, editable: true },
    { id: "authors", title: "Authors & Affiliations", prompt: "List the authors and their affiliations in IEEE format.", required: true, editable: true },
    { id: "abstract", title: "Abstract", prompt: "Write an IEEE-style abstract (150-250 words) summarizing the motivation, methods, results, and significance. No citations or figures/tables.", required: true, editable: true },
    { id: "keywords", title: "Keywords", prompt: "List 3-6 keywords relevant to the paper, comma-separated.", required: true, editable: true },
    { id: "introduction", title: "1. Introduction", prompt: "Write the Introduction section for an IEEE research paper. Include motivation, problem statement, contributions, and paper organization.", required: true, editable: true },
    { id: "related", title: "2. Related Work", prompt: "Write the Related Work section, discussing previous research and citing relevant literature.", required: true, editable: true },
    { id: "methods", title: "3. Methods", prompt: "Describe the methods, datasets, algorithms, and experimental setup in detail.", required: true, editable: true },
    { id: "results", title: "4. Results", prompt: "Present the results with tables, figures, and statistical analysis.", required: true, editable: true },
    { id: "discussion", title: "5. Discussion", prompt: "Interpret the results, compare with prior work, and discuss limitations.", required: true, editable: true },
    { id: "conclusion", title: "6. Conclusion", prompt: "Summarize the findings, contributions, and suggest future work.", required: true, editable: true },
    { id: "acknowledgments", title: "Acknowledgments", prompt: "Write the acknowledgments section (optional).", required: false, editable: true },
    { id: "references", title: "References", prompt: "List all references cited in the paper in IEEE format.", required: true, editable: true },
  ],
  acm: [
    { id: "title", title: "Title", prompt: "Write a concise, descriptive title for an ACM research paper on the given topic.", required: true, editable: true },
    { id: "authors", title: "Authors & Affiliations", prompt: "List the authors and their affiliations in ACM format.", required: true, editable: true },
    { id: "abstract", title: "Abstract", prompt: "Write an ACM-style abstract (150-250 words) summarizing the motivation, methods, results, and significance. No citations or figures/tables.", required: true, editable: true },
    { id: "keywords", title: "Keywords", prompt: "List 3-6 keywords relevant to the paper, comma-separated.", required: true, editable: true },
    { id: "introduction", title: "1. Introduction", prompt: "Write the Introduction section for an ACM research paper. Include motivation, problem statement, contributions, and paper organization.", required: true, editable: true },
    { id: "related", title: "2. Related Work", prompt: "Write the Related Work section, discussing previous research and citing relevant literature.", required: true, editable: true },
    { id: "methods", title: "3. Methods", prompt: "Describe the methods, datasets, algorithms, and experimental setup in detail.", required: true, editable: true },
    { id: "results", title: "4. Results", prompt: "Present the results with tables, figures, and statistical analysis.", required: true, editable: true },
    { id: "discussion", title: "5. Discussion", prompt: "Interpret the results, compare with prior work, and discuss limitations.", required: true, editable: true },
    { id: "conclusion", title: "6. Conclusion", prompt: "Summarize the findings, contributions, and suggest future work.", required: true, editable: true },
    { id: "acknowledgments", title: "Acknowledgments", prompt: "Write the acknowledgments section (optional).", required: false, editable: true },
    { id: "references", title: "References", prompt: "List all references cited in the paper in ACM format.", required: true, editable: true },
  ],
}

// Real AI integration for section generation
async function generateSectionContent(
  prompt: string,
  context: string,
  provider: string,
  model: string,
  supabaseToken: string | null,
  writingStylePrompt: string,
  templatePrompt: string,
  researchContext: string
) {
  if (!supabaseToken) {
    return 'Authentication error: Please log in again.'
  }
  // Compose the full prompt
  const fullPrompt = [
    writingStylePrompt,
    templatePrompt,
    researchContext ? `Research Context:\n${researchContext}` : '',
    context ? `Previous Content:\n${context}` : '',
    prompt
  ].filter(Boolean).join('\n\n')

  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseToken}`,
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
    return data.content || data.result || 'No content generated.'
  } catch (err) {
    return 'Error: Failed to connect to AI service.'
  }
}

type Section = {
  id: string;
  title: string;
  prompt: string;
  required: boolean;
  editable: boolean;
  content: string;
  edited: boolean;
}

type TemplateKey = 'ieee' | 'acm';

interface AIWritingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProvider: string;
  selectedModel: string;
  supabaseToken: string | null;
  writingStylePrompt: string;
  templatePrompt: string;
  researchContext: string;
}

export function AIWritingModal(props: AIWritingModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('ieee')
  const [sections, setSections] = useState<Section[]>(() => templates[selectedTemplate].map(s => ({ ...s, content: '', edited: false })))
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null)
  const [customSectionTitle, setCustomSectionTitle] = useState('')
  const [customSectionPrompt, setCustomSectionPrompt] = useState('')
  const exportRef = useRef<HTMLDivElement>(null)

  // When template changes, reset sections
  const handleTemplateChange = (template: TemplateKey) => {
    setSelectedTemplate(template)
    setSections(templates[template].map(s => ({ ...s, content: '', edited: false })))
  }

  // Drag-and-drop handlers
  function handleDragEnd(result: any) {
    if (!result.destination) return
    const reordered = Array.from(sections)
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)
    setSections(reordered)
  }

  // Handle content edit
  function handleContentChange(idx: number, value: string) {
    setSections(sections => sections.map((s, i) => i === idx ? { ...s, content: value, edited: true } : s))
  }

  // Handle AI generation for a section
  async function handleGenerate(idx: number) {
    setGeneratingIdx(idx)
    const section = sections[idx]
    const context = sections.slice(0, idx).map(s => s.content).join('\n\n')
    const content = await generateSectionContent(
      section.prompt,
      context,
      props.selectedProvider,
      props.selectedModel,
      props.supabaseToken,
      props.writingStylePrompt,
      props.templatePrompt,
      props.researchContext
    )
    setSections(sections => sections.map((s, i) => i === idx ? { ...s, content, edited: false } : s))
    setGeneratingIdx(null)
  }

  // Add custom section
  function handleAddCustomSection() {
    if (!customSectionTitle.trim() || !customSectionPrompt.trim()) return
    setSections(sections => [
      ...sections,
      {
        id: `custom-${Date.now()}`,
        title: customSectionTitle,
        prompt: customSectionPrompt,
        required: false,
        editable: true,
        content: '',
        edited: false,
      },
    ])
    setCustomSectionTitle('')
    setCustomSectionPrompt('')
  }

  // Remove section
  function handleRemoveSection(idx: number) {
    setSections(sections => sections.filter((_, i) => i !== idx))
  }

  // Export as Markdown
  function exportMarkdown() {
    const md = sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'paper.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export as LaTeX (basic)
  function exportLatex() {
    const latex = sections.map(s => `\\section{${s.title.replace(/^[0-9. ]+/, '')}}\n${s.content}`).join('\n\n')
    const blob = new Blob([latex], { type: 'text/x-tex' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'paper.tex'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export as PDF (print dialog as placeholder)
  function exportPDF() {
    if (exportRef.current) {
      const printContents = exportRef.current.innerHTML
      const win = window.open('', '', 'height=800,width=800')
      if (win) {
        win.document.write('<html><head><title>Paper PDF</title></head><body>')
        win.document.write(printContents)
        win.document.write('</body></html>')
        win.document.close()
        win.print()
      }
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Research Paper Generator</DialogTitle>
          <DialogDescription>
            Select a publisher template and generate/edit each section. You can reorder, edit, or regenerate sections as needed.
          </DialogDescription>
        </DialogHeader>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Template</label>
          <select
            value={selectedTemplate}
            onChange={e => handleTemplateChange(e.target.value as TemplateKey)}
            className="border rounded px-2 py-1"
          >
            <option value="ieee">IEEE</option>
            <option value="acm">ACM</option>
          </select>
        </div>
        {/* Section List with Drag-and-Drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sections-droppable">
            {(provided: any) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {sections.map((section, idx) => (
                  <Draggable key={section.id} draggableId={section.id} index={idx}>
                    {(dragProvided: any) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className="mb-4 bg-white border rounded shadow p-4 flex flex-col"
                      >
                        <div className="flex items-center mb-2">
                          <span {...dragProvided.dragHandleProps} className="mr-2 cursor-move"><GripVertical className="w-4 h-4 text-gray-400" /></span>
                          <span className="font-semibold text-gray-900">{section.title}</span>
                          {section.required ? (
                            <Badge className="ml-2" variant="outline">Required</Badge>
                          ) : (
                            <Badge className="ml-2" variant="secondary">Optional</Badge>
                          )}
                          {!section.required && (
                            <Button size="sm" variant="ghost" className="ml-auto text-red-500" onClick={() => handleRemoveSection(idx)}>
                              Remove
                            </Button>
                          )}
                        </div>
                        <textarea
                          className="border rounded p-2 w-full min-h-[80px] text-sm mb-2"
                          value={section.content}
                          onChange={e => handleContentChange(idx, e.target.value)}
                          placeholder={`Enter or generate content for ${section.title}`}
                          disabled={generatingIdx === idx}
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerate(idx)}
                            disabled={generatingIdx !== null}
                          >
                            {generatingIdx === idx ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-2" />
                            )}
                            Generate
                          </Button>
                          {section.edited && <span className="text-xs text-blue-600 ml-2">Edited</span>}
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
        {/* Add custom section UI */}
        <div className="mt-6 mb-4 p-4 bg-gray-50 rounded">
          <div className="font-semibold mb-2">Add Custom Section</div>
          <input
            className="border rounded px-2 py-1 mr-2 mb-2 w-1/3"
            placeholder="Section Title"
            value={customSectionTitle}
            onChange={e => setCustomSectionTitle(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1 mr-2 mb-2 w-1/2"
            placeholder="Section Prompt (for AI)"
            value={customSectionPrompt}
            onChange={e => setCustomSectionPrompt(e.target.value)}
          />
          <Button size="sm" onClick={handleAddCustomSection} disabled={!customSectionTitle.trim() || !customSectionPrompt.trim()}>
            Add Section
          </Button>
        </div>
        {/* Export controls */}
        <div className="flex gap-3 mt-6 mb-2">
          <Button size="sm" variant="outline" onClick={exportMarkdown}>Export Markdown</Button>
          <Button size="sm" variant="outline" onClick={exportLatex}>Export LaTeX</Button>
          <Button size="sm" variant="outline" onClick={exportPDF}>Export PDF</Button>
        </div>
        {/* Hidden export content for PDF printing */}
        <div style={{ display: 'none' }} ref={exportRef}>
          {sections.map(s => (
            <div key={s.id}>
              <h2>{s.title}</h2>
              <div style={{ whiteSpace: 'pre-wrap' }}>{s.content}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
