"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Sparkles, Lightbulb, ArrowRight, PenLine, Check, Loader2, Settings } from 'lucide-react'
import { useResearchSession } from '@/components/research-session-provider'
import { AI_PROVIDERS, type AIProvider } from '@/lib/ai-providers'
import { Label } from '@/components/ui/label'

interface AIWritingAssistantProps {
  selectedProvider: string
  selectedModel: string
  onInsertText: (text: string) => void
  documentTemplate: string
  currentDocumentContent?: string // Add current document content for better context
}

export function AIWritingAssistant({ 
  selectedProvider, 
  selectedModel, 
  onInsertText,
  documentTemplate,
  currentDocumentContent = ""
}: AIWritingAssistantProps) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedText, setGeneratedText] = useState('')
  const [writingTask, setWritingTask] = useState<string>('continue')
  const [showSettings, setShowSettings] = useState(false)
  const [currentProvider, setCurrentProvider] = useState<AIProvider>('openai')
  const [currentModel, setCurrentModel] = useState('gpt-4')
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
    
    context += `Using: ${currentProvider} with ${currentModel}\n`
    context += `Template: ${documentTemplate || 'Standard Academic'}\n`
    
    return context
  }
  
  // Generate AI writing based on task and context
  const generateText = async () => {
    if (isGenerating) return
    
    try {
      setIsGenerating(true)
      
      const templateStyle = getTemplateStyle()
      const researchContext = getResearchContext()
      
      let systemPrompt = `You are a professional academic writer assisting with a research document in ${templateStyle}. `
      systemPrompt += `Write in a clear, academic style appropriate for publication. `
      systemPrompt += `Focus on producing coherent, well-structured text that would be suitable for a scholarly publication. `
      systemPrompt += `Always maintain academic integrity and provide well-reasoned arguments.`
      
      // Add task-specific instructions
      let taskPrompt = ''
      switch (writingTask) {
        case 'introduction':
          taskPrompt = 'Write an engaging introduction that contextualizes the research, states the problem being addressed, and outlines the approach. Include relevant background information and clearly state the research objectives.'
          break
        case 'conclusion':
          taskPrompt = 'Write a conclusion that summarizes the key findings, discusses their implications, and suggests future research directions. Connect back to the research objectives and highlight the significance of the work.'
          break
        case 'abstract':
          taskPrompt = 'Write a concise abstract summarizing the research objectives, methodology, results, and conclusions in 200-250 words. Use clear, precise language and avoid jargon when possible.'
          break
        case 'methodology':
          taskPrompt = 'Write a methodology section that clearly describes the research approach, data collection methods, and analytical techniques used. Include sufficient detail for reproducibility while maintaining clarity.'
          break
        case 'results':
          taskPrompt = 'Write a results section that presents the findings in a clear, logical manner, using appropriate academic language. Organize the results systematically and include relevant statistical information where applicable.'
          break
        case 'analyze':
          if (!currentDocumentContent || currentDocumentContent.trim().length < 50) {
            throw new Error('Please add more content to your document before analyzing.')
          }
          taskPrompt = `Analyze the following document content and provide specific suggestions for improvement. Focus on:
1. Structure and organization
2. Clarity and readability
3. Academic tone and style
4. Logical flow and coherence
5. Specific areas that need expansion or clarification

Document content to analyze:
${currentDocumentContent.slice(0, 2000)}${currentDocumentContent.length > 2000 ? '...' : ''}`
          break
        case 'continue':
        case 'custom':
        default:
          taskPrompt = prompt || 'Continue the writing in a coherent and logical manner, maintaining the academic tone and style of the document.'
          break
      }
      
      // Combine system prompt, research context, and task prompt
      const fullPrompt = `${systemPrompt}\n\n${researchContext}\n\nTask: ${taskPrompt}`
      
      // Call the AI generation API
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          provider: currentProvider,
          model: currentModel,
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
        description: `AI writing assistant has generated ${writingTask} content using ${data.provider || currentProvider}.`,
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">AI Provider</Label>
                <Select value={currentProvider} onValueChange={(value: AIProvider) => setCurrentProvider(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(AI_PROVIDERS).map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {AI_PROVIDERS[provider as AIProvider].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Model</Label>
                <Select value={currentModel} onValueChange={setCurrentModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableModels(currentProvider).map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
          disabled={isGenerating}
          className="flex-1"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {writingTask === 'analyze' ? 'Analyzing...' : 'Generating...'}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {writingTask === 'analyze' ? 'Analyze Document' : 'Generate'}
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
                  <Check className="h-3 w-3 mr-1" />
                  Insert
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <div className="text-xs text-muted-foreground mt-2">
        Using {AI_PROVIDERS[currentProvider]?.name || currentProvider} / {currentModel} with {documentTemplate || 'standard'} template style
      </div>
    </div>
  )
}

export default AIWritingAssistant
