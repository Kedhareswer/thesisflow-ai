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
import { Loader2, Sparkles, Check, FileText, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const sectionTasks = [
  {
    id: "introduction",
    name: "Introduction",
    description: "Create an engaging introduction with background and motivation",
  },
  { id: "table", name: "Key Table", description: "Present findings or comparisons in a structured table" },
  { id: "diagram", name: "Diagram (Mermaid)", description: "Generate process workflows or relationship diagrams" },
  {
    id: "image",
    name: "Image Suggestion",
    description: "Suggest relevant images or figures with detailed descriptions",
  },
  { id: "conclusion", name: "Conclusion", description: "Summarize key points and provide closing thoughts" },
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
  const [currentStep, setCurrentStep] = useState<number>(0)

  // Helper to build section-specific prompts
  const buildPrompt = (sectionId: string, previousContent: string) => {
    let sectionInstruction = ""
    switch (sectionId) {
      case "introduction":
        sectionInstruction = "Write a comprehensive introduction for this research paper. Include background context, problem statement, research objectives, and a brief overview of the approach. Make it engaging and scholarly."
        break
      case "table":
        sectionInstruction = "Create a well-structured Markdown table that presents key findings, comparisons, or data relevant to the research. Include proper headers and organize information logically."
        break
      case "diagram":
        sectionInstruction = "If a process, workflow, architecture, or relationship can be visualized, create a Mermaid diagram enclosed in a Markdown code block (\`\`\`mermaid ... \`\`\`). Provide a clear explanation of the diagram and its significance."
        break
      case "image":
        sectionInstruction = "Suggest a relevant image, figure, or visualization that would enhance the paper. Use Markdown image syntax with a detailed alt text and comprehensive caption explaining what the image should show and why it's important."
        break
      case "conclusion":
        sectionInstruction = "Write a comprehensive conclusion that summarizes the key findings, discusses their implications, addresses limitations, and suggests future research directions."
        break
      default:
        sectionInstruction = "Write this section using proper Markdown formatting."
    }
    
    return `${writingStylePrompt}\n\n${templatePrompt}\n\n${researchContext ? `Research Context:\n${researchContext}\n\n` : ''}${previousContent ? `Previous Content:\n${previousContent}\n\n` : ''}Task: ${sectionInstruction}\n\nRequirements:\n- Format all output in clean Markdown\n- Use LaTeX notation for mathematical expressions\n- Create well-formatted tables using Markdown syntax\n- Use \`\`\`mermaid code blocks for diagrams\n- Suggest images with descriptive Markdown syntax and detailed captions\n- Maintain academic tone and scholarly standards`
  }

  // Enhanced streaming-style generation with better error handling
  const handleGenerateAll = async () => {
    if (!supabaseToken) {
      setError("Authentication error: Please log in again to use AI features.")
      return
    }
    
    setIsGenerating(true)
    setGeneratedSections([])
    setError("")
    setCurrentStep(0)
    
    let previousContent = ""
    
    for (let i = 0; i < sectionTasks.length; i++) {
      const section = sectionTasks[i]
      setCurrentStep(i + 1)
      
      // Add section with loading state
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
            maxTokens: 1000,
          }),
        })
        
        let sectionContent = ""
        
        if (response.ok) {
          const dataRes = await response.json()
          sectionContent = dataRes.content || dataRes.choices?.[0]?.text || "No content generated."
        } else {
          const errorData = await response.json().catch(() => ({}))
          sectionContent = `Error generating content: ${errorData.error || response.statusText}`
        }
        
        // Update previous content for context
        previousContent += `\n\n## ${section.name}\n${sectionContent}`
        
        // Update section with generated content
        setGeneratedSections(sections =>
          sections.map(s =>
            s.id === section.id ? { ...s, content: sectionContent, loading: false } : s
          )
        )
        
        // Small delay between sections for better UX
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (err) {
        console.error(`Error generating ${section.name}:`, err)
        setGeneratedSections(sections =>
          sections.map(s =>
            s.id === section.id ? { ...s, content: "Error generating content. Please try again.", loading: false } : s
          )
        )
      }
    }
    
    setIsGenerating(false)
    setCurrentStep(0)
  }

  const handleInsertContent = () => {
    const allContent = generatedSections
      .filter(s => s.content && !s.content.startsWith("Error"))
      .map(s => `## ${s.name}\n\n${s.content}`)
      .join("\n\n")
    
    onGenerateContent(allContent)
    onOpenChange(false)
    setGeneratedSections([])
    setCurrentStep(0)
  }

  const handleClose = () => {
    onOpenChange(false)
    setGeneratedSections([])
    setError("")
    setCurrentStep(0)
  }

  const completedSections = generatedSections.filter(s => !s.loading && s.content).length
  const hasErrors = generatedSections.some(s => s.content.startsWith("Error"))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] bg-white border-gray-200">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">AI Writing Assistant</DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                Generate comprehensive sections with tables, diagrams, and image suggestions
              </DialogDescription>
            </div>
          </div>
          
          {/* Progress indicator */}
          {isGenerating && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Generating sections... ({currentStep}/{sectionTasks.length})</span>
                <span>{Math.round((currentStep / sectionTasks.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / sectionTasks.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-1">
          <div className="space-y-6 py-4">
            {/* Configuration Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Generation Configuration</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Provider:</span>
                  <Badge variant="outline" className="ml-2">{selectedProvider}</Badge>
                </div>
                <div>
                  <span className="text-gray-500">Model:</span>
                  <Badge variant="outline" className="ml-2">{selectedModel}</Badge>
                </div>
                <div>
                  <span className="text-gray-500">Template:</span>
                  <Badge variant="outline" className="ml-2">{documentTemplate.toUpperCase()}</Badge>
                </div>
                <div>
                  <span className="text-gray-500">Sections:</span>
                  <Badge variant="outline" className="ml-2">{sectionTasks.length} sections</Badge>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateAll}
              disabled={isGenerating}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg transition-all duration-200"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  Generating sections... ({currentStep}/{sectionTasks.length})
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-3" />
                  Generate All Sections
                </>
              )}
            </Button>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Error</span>
                </div>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            )}

            {/* Generated Sections */}
            {generatedSections.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-gray-900">Generated Sections</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {completedSections}/{sectionTasks.length} completed
                    </Badge>
                    {hasErrors && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        Some errors
                      </Badge>
                    )}
                  </div>
                </div>

                {generatedSections.map((section, idx) => (
                  <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            section.loading 
                              ? 'bg-blue-100' 
                              : section.content.startsWith('Error') 
                                ? 'bg-red-100' 
                                : 'bg-green-100'
                          }`}>
                            {section.loading ? (
                              <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                            ) : section.content.startsWith('Error') ? (
                              <AlertCircle className="h-3 w-3 text-red-600" />
                            ) : (
                              <Check className="h-3 w-3 text-green-600" />
                            )}
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900 text-sm">{section.name}</h5>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {sectionTasks.find(t => t.id === section.id)?.description}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {idx + 1}/{sectionTasks.length}
                        </Badge>
                      </div>
                    
                    {section.content && (
                      <div className="p-4">
                        <div className="bg-white border border-gray-200 rounded-md p-4 max-h-60 overflow-y-auto">
                          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                            {section.content}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <Separator className="bg-gray-200" />

                {/* Summary */}
                {completedSections > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Generation Summary</span>
                    </div>
                    <div className="text-sm text-blue-700">
                      <p className="mb-1">✓ {completedSections} sections generated successfully</p>
                      <p className="mb-1">✓ Ready to insert into your document</p>
                      {hasErrors && (
                        <p className="text-red-600">⚠ Some sections had errors - please review before inserting</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}\
          </div>
        </div>

        <DialogFooter className="border-t border-gray-200 pt-4 bg-gray-50">
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-gray-500">
              {completedSections > 0 && (
                <span>{completedSections} sections ready to insert</span>
              )}
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="border-gray-300 bg-white hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInsertContent}
                disabled={completedSections === 0 || isGenerating}
                className="bg-black text-white hover:bg-gray-800 disabled:opacity-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Insert All Sections
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )\
}
