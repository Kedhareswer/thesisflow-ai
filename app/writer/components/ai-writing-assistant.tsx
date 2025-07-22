"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Sparkles, Lightbulb, ArrowRight, PenLine, Check } from 'lucide-react'
import { useResearchSession } from '@/components/research-session-provider'

interface AIWritingAssistantProps {
  selectedProvider: string
  selectedModel: string
  onInsertText: (text: string) => void
  documentTemplate: string
}

export function AIWritingAssistant({ 
  selectedProvider, 
  selectedModel, 
  onInsertText,
  documentTemplate
}: AIWritingAssistantProps) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedText, setGeneratedText] = useState('')
  const [writingTask, setWritingTask] = useState<string>('continue')
  
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
  ]

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
  
  // Get research context for AI prompt - simplified to avoid type issues
  const getResearchContext = () => {
    // Create a simple research context based on provider and model selection
    // In a real implementation, this would extract data from session
    let context = 'Research Context:\n'
    
    // Add basic context information
    context += `Topic: AI-Assisted Academic Writing\n`
    context += `Using: ${selectedProvider || 'Default AI Provider'} with ${selectedModel || 'Default Model'}\n`
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
      
      // Add task-specific instructions
      let taskPrompt = ''
      switch (writingTask) {
        case 'introduction':
          taskPrompt = 'Write an engaging introduction that contextualizes the research, states the problem being addressed, and outlines the approach.'
          break
        case 'conclusion':
          taskPrompt = 'Write a conclusion that summarizes the key findings, discusses their implications, and suggests future research directions.'
          break
        case 'abstract':
          taskPrompt = 'Write a concise abstract summarizing the research objectives, methodology, results, and conclusions in 200-250 words.'
          break
        case 'methodology':
          taskPrompt = 'Write a methodology section that clearly describes the research approach, data collection methods, and analytical techniques used.'
          break
        case 'results':
          taskPrompt = 'Write a results section that presents the findings in a clear, logical manner, using appropriate academic language.'
          break
        case 'continue':
        case 'custom':
        default:
          taskPrompt = prompt || 'Continue the writing in a coherent and logical manner.'
          break
      }
      
      // Mock API call - in a real implementation, this would call the selected AI provider
      // For now, simulate a response for demo purposes
      // In production, this would be:
      // const response = await fetch('/api/ai/generate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     provider: selectedProvider,
      //     model: selectedModel,
      //     systemPrompt,
      //     taskPrompt,
      //     researchContext
      //   })
      // })
      // const data = await response.json()
      
      // For demonstration, generate mock text based on the research context
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const mockResponses = {
        introduction: `In recent years, the field of ${selectedProvider || 'artificial intelligence'} has witnessed significant advancements, particularly in ${selectedModel || 'language models'}. This research explores the applications and implications of these technologies in academic contexts. By examining the current literature and conducting experimental analysis, we aim to address critical gaps in understanding how these technologies can enhance research productivity while maintaining academic integrity.`,
        
        conclusion: `This study has demonstrated the potential of ${selectedProvider || 'AI'} technologies to transform academic writing and research processes. Our findings suggest that while ${selectedModel || 'advanced language models'} offer significant benefits in terms of efficiency and idea generation, careful consideration must be given to ethical implementation and verification processes. Future research should focus on developing more transparent systems and establishing clearer guidelines for AI assistance in academic contexts.`,
        
        abstract: `This paper investigates the integration of ${selectedProvider || 'artificial intelligence'} technologies, specifically ${selectedModel || 'language models'}, into academic research workflows. Through systematic analysis of usage patterns and outcomes across multiple disciplines, we identify key benefits and challenges associated with AI-assisted writing. Results indicate a 37% increase in research productivity when using appropriate AI tools, while maintaining quality standards. However, significant concerns regarding originality verification and proper attribution remain. We propose a framework for responsible AI integration that balances efficiency gains with academic integrity requirements.`,
        
        methodology: `This study employed a mixed-methods approach to evaluate the effectiveness of ${selectedProvider || 'AI'}-assisted academic writing. We collected data from 120 researchers across 15 universities who used ${selectedModel || 'language models'} during their writing process. Quantitative metrics included time-to-completion, revision counts, and quality assessments from blind reviewers. Qualitative data was gathered through semi-structured interviews and analyzed using thematic coding to identify patterns in user experience and workflow integration.`,
        
        results: `Our analysis revealed that researchers using ${selectedProvider || 'AI'} tools completed initial drafts 42% faster than the control group. Quality assessments showed no statistically significant difference in final output quality between AI-assisted and traditional writing methods (p=0.78). Interestingly, we observed that ${selectedModel || 'language model'} assistance was most beneficial for early-career researchers, who reported a 58% increase in confidence regarding their writing structure. Figure 1 illustrates the comparative performance across different academic disciplines, with humanities scholars showing the most significant improvements in productivity.`,
        
        continue: `Building on these findings, we can observe that ${selectedProvider || 'AI'} technologies serve as complementary tools rather than replacements for human expertise. The ${selectedModel || 'language model'}'s ability to process and synthesize information provides researchers with valuable starting points and alternative perspectives. However, the distinctly human elements of critical thinking, domain expertise, and ethical judgment remain irreplaceable. This synergistic relationship between human researchers and AI tools points toward a future where technological assistance enhances rather than diminishes the value of scholarly contribution.`,
        
        custom: prompt ? `Regarding "${prompt}": This aspect of ${selectedProvider || 'AI'} research merits careful consideration, especially when examining the capabilities of ${selectedModel || 'advanced language models'}. The available evidence suggests a nuanced relationship between technological capabilities and practical applications in this domain. Further investigation would benefit from controlled studies specifically designed to isolate the variables most relevant to this question.` : `The integration of ${selectedProvider || 'AI'} technologies into academic workflows represents both an opportunity and a challenge for the research community. As ${selectedModel || 'language models'} continue to evolve, their ability to assist with literature review, draft generation, and idea formulation will likely improve. However, maintaining appropriate boundaries between AI assistance and original human contribution will remain an important consideration for academic integrity.`
      }
      
      // Use the task-specific mock response, falling back to "continue" for custom prompts
      const generatedContent = mockResponses[writingTask as keyof typeof mockResponses] || mockResponses.custom
      
      setGeneratedText(generatedContent)
      
      toast({
        title: "Content generated",
        description: "AI writing assistant has generated content based on your request.",
      })
    } catch (error) {
      console.error("Error generating text:", error)
      toast({
        title: "Generation failed",
        description: "There was an error generating the content. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }
  
  // Insert the generated text into the editor
  const handleInsert = () => {
    if (!generatedText) return
    
    onInsertText(generatedText)
    toast({
      title: "Text inserted",
      description: "Generated text has been inserted into your document.",
    })
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {writingTasks.map(task => (
          <Badge 
            key={task.id}
            variant={writingTask === task.id ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setWritingTask(task.id)}
          >
            {task.name}
          </Badge>
        ))}
      </div>
      
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
          <Sparkles className="h-4 w-4 mr-2" />
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
        
        {generatedText && (
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
              <span>AI Generated Content</span>
            </div>
            <div className="text-sm whitespace-pre-wrap">
              {generatedText}
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="ghost" onClick={handleInsert}>
                <Check className="h-3 w-3 mr-1" />
                Insert
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="text-xs text-muted-foreground mt-2">
        Using {selectedProvider || 'Default'} / {selectedModel || 'Default'} with {documentTemplate || 'standard'} template style
      </div>
    </div>
  )
}

export default AIWritingAssistant
