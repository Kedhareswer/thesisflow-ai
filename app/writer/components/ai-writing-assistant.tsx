"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useResearchSession } from "@/components/research-session-provider"
import { AI_PROVIDERS, type AIProvider } from "@/lib/ai-providers"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import MinimalAIProviderSelector from "@/components/ai-provider-selector-minimal"
import { 
  Sparkles, 
  ChevronUp, 
  ChevronDown, 
  Settings, 
  AlertTriangle,
  Loader2,
  CheckCircle,
  Copy,
  Download,
  PenLine,
  ArrowRight
} from "lucide-react"

interface AIWritingAssistantProps {
  selectedProvider: string
  selectedModel: string
  onInsertText: (text: string) => void
  documentTemplate: string
  currentDocumentContent?: string // Add current document content for better context
  isAuthenticated?: boolean // Add authentication state
  onProviderChange?: (provider: AIProvider) => void
  onModelChange?: (model: string) => void
}

export function AIWritingAssistant({ 
  selectedProvider, 
  selectedModel, 
  onInsertText,
  documentTemplate,
  currentDocumentContent = "",
  isAuthenticated = false,
  onProviderChange,
  onModelChange
}: AIWritingAssistantProps) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedText, setGeneratedText] = useState('')
  const [writingTask, setWritingTask] = useState<string>('continue')
  const [showSettings, setShowSettings] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string>('')
  
  const { toast } = useToast()
  const { session } = useResearchSession()
  
  // Writing task options
  const writingTasks = [
    { id: 'continue', name: 'Continue Writing', description: 'Continue from where you left off' },
    { id: 'introduction', name: 'Introduction', description: 'Write an introduction for your document' },
    { id: 'conclusion', name: 'Conclusion', description: 'Write a conclusion for your document' },
    { id: 'abstract', name: 'Abstract', description: 'Generate a concise abstract' },
    { id: 'methodology', name: 'Methodology', description: 'Describe research methodology' },
    { id: 'results', name: 'Results', description: 'Summarize results and findings' },
    { id: 'custom', name: 'Custom', description: 'Write based on custom instructions' },
    { id: 'analyze', name: 'Analyze & Improve', description: 'Analyze current content and suggest improvements' },
  ]

  // Get available models for the selected provider
  const getAvailableModels = (provider: AIProvider) => {
    const providerConfig = AI_PROVIDERS[provider]
    return providerConfig?.models || ['gpt-4']
  }

  // Template-specific writing styles
  const getTemplateStyle = () => {
    switch (documentTemplate) {
      case 'ieee':
        return 'IEEE format with technical precision and third-person formal academic style';
      case 'acm':
        return 'ACM format with clear technical descriptions and formal academic style';
      case 'springer':
        return 'Springer format with concise, formal academic writing';
      case 'elsevier':
        return 'Elsevier format with structured academic writing and formal tone';
      default:
        return 'standard academic style';
    }
  }
  
  // Get research context for AI prompt
  const getResearchContext = () => {
    let context = 'Research Context:\n'
    
    // Add session data if available
    if (session?.currentTopic) {
      context += `Current Topic: ${session.currentTopic}\n`
    }
    
    if (session?.selectedPapers?.length > 0) {
      context += `Selected Papers: ${session.selectedPapers.length} papers\n`
      session.selectedPapers.slice(0, 3).forEach((paper: any, index: number) => {
        context += `  ${index + 1}. ${paper.title || 'Untitled'}\n`
      })
    }
    
    if (session?.selectedIdeas?.length > 0) {
      context += `Selected Ideas: ${session.selectedIdeas.length} ideas\n`
      session.selectedIdeas.slice(0, 3).forEach((idea: any, index: number) => {
        context += `  ${index + 1}. ${idea.title || 'Untitled'}\n`
      })
    }
    
    // Add current document content for context
    if (currentDocumentContent && currentDocumentContent.trim()) {
      const contentPreview = currentDocumentContent.slice(0, 500) // First 500 characters
      context += `\nCurrent Document Content (preview):\n${contentPreview}${currentDocumentContent.length > 500 ? '...' : ''}\n`
    }
    
    context += `Using: ${selectedProvider} with ${selectedModel}\n`
    context += `Template: ${documentTemplate || 'Standard Academic'}\n`
    
    return context
  }
  
  // Generate AI writing based on task and context
  const generateText = async () => {
    if (isGenerating) return
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to use the AI Writing Assistant. Your API keys are stored securely in your account.",
        variant: "destructive",
      })
      return
    }
    
    try {
      setIsGenerating(true)
      
      // Get current Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error("No valid session found")
      }
      
      const templateStyle = getTemplateStyle()
      const researchContext = getResearchContext()
      
      let systemPrompt = `You are a professional academic writer assisting with a research document in ${templateStyle}. `
      systemPrompt += `Write in a clear, academic style appropriate for publication. `
      systemPrompt += `Focus on producing coherent, well-structured text that would be suitable for a scholarly publication. `
      systemPrompt += `Always maintain academic integrity and provide well-reasoned arguments.`
      
      let taskPrompt = ''
      
      switch (writingTask) {
        case 'continue':
          taskPrompt = `Continue writing the document from where it left off. Maintain the same style, tone, and academic rigor.`
          break
        case 'introduction':
          taskPrompt = `Write a compelling introduction for this research document. Include background context, research question, and significance.`
          break
        case 'conclusion':
          taskPrompt = `Write a comprehensive conclusion that summarizes key findings, discusses implications, and suggests future research directions.`
          break
        case 'abstract':
          taskPrompt = `Write a concise abstract (150-250 words) that summarizes the research problem, methodology, key findings, and conclusions.`
          break
        case 'methodology':
          taskPrompt = `Write a detailed methodology section describing the research design, data collection methods, and analysis procedures.`
          break
        case 'results':
          taskPrompt = `Write a results section presenting the key findings with appropriate statistical analysis and data interpretation.`
          break
        case 'analyze':
          taskPrompt = `Analyze the current document content for structure, clarity, academic tone, and coherence. Provide specific suggestions for improvement.`
          break
        default:
          taskPrompt = `Continue writing the document in a professional academic style.`
      }
      
      const fullPrompt = `${systemPrompt}\n\n${researchContext}\n\nTask: ${taskPrompt}`
      
      // Call the AI generation API with authentication
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          provider: selectedProvider,
          model: selectedModel,
          maxTokens: 1000,
          temperature: 0.7
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate content')
      }
      
      const data = await response.json()
      
      if (!data.success || !data.content) {
        throw new Error(data.error || 'No content generated')
      }
      
      setGeneratedText(data.content)
      
      toast({
        title: "Content generated",
        description: `AI writing assistant has generated ${writingTask} content using ${data.provider || selectedProvider}.`,
      })
    } catch (error) {
      console.error("Error generating text:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "There was an error generating the content. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }
  
  // Insert the generated text into the editor
  const handleInsert = () => {
    if (!generatedText) return
    
    // Add a newline before insertion if the document already has content
    const insertText = currentDocumentContent && currentDocumentContent.trim() 
      ? `\n\n${generatedText}` 
      : generatedText
    
    onInsertText(insertText)
    setGeneratedText('') // Clear the generated text after insertion
    toast({
      title: "Text inserted",
      description: "Generated text has been inserted into your document.",
    })
  }
  
  return (
    <div className="space-y-4">
      {/* Settings Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex flex-wrap gap-2">
          {writingTasks.map(task => (
            <Badge 
              key={task.id}
              variant={writingTask === task.id ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10"
              onClick={() => setWritingTask(task.id)}
            >
              {task.name}
            </Badge>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      
      {/* AI Provider Settings */}
      {showSettings && (
        <Card>
          <CardContent className="pt-4">
            <MinimalAIProviderSelector
              selectedProvider={selectedProvider as AIProvider}
              selectedModel={selectedModel}
              onProviderChange={onProviderChange || (() => {})}
              onModelChange={onModelChange || (() => {})}
              variant="compact"
              showModelSelector={true}
              showConfigLink={false}
            />
          </CardContent>
        </Card>
      )}
      
      {writingTask === 'custom' && (
        <div className="space-y-2">
          <Textarea 
            placeholder="Describe what you want the AI to write about..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
      )}
      
      <div className="flex gap-2">
        <Button
          onClick={generateText}
          disabled={isGenerating || !isAuthenticated}
          className="w-full bg-black hover:bg-gray-800 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : !isAuthenticated ? (
            <>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Login Required
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate
            </>
          )}
        </Button>
        
        {generatedText && writingTask !== 'analyze' && (
          <Button variant="outline" onClick={handleInsert}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {generatedText && (
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm mb-2 flex items-center gap-1 text-muted-foreground">
              <PenLine className="h-3 w-3" />
              <span>{writingTask === 'analyze' ? 'Document Analysis' : 'AI Generated Content'}</span>
            </div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {generatedText}
            </div>
            {writingTask !== 'analyze' && (
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="ghost" onClick={handleInsert}>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Insert
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <div className="text-xs text-muted-foreground mt-2">
        {isAuthenticated ? (
          <>
            Using {AI_PROVIDERS[selectedProvider as AIProvider]?.name || selectedProvider} / {selectedModel} with {documentTemplate || 'standard'} template style
          </>
        ) : (
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            <span>Please log in to use AI features. Your API keys are stored securely in your account.</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default AIWritingAssistant
