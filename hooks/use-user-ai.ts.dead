"use client"

import { useState } from 'react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  provider: string
  model: string
  usage?: {
    tokens: number
    cost?: number
  }
}

export interface AIRequestOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  preferredProvider?: string
}

interface UseUserAIResult {
  generateResponse: (messages: AIMessage[], options?: AIRequestOptions) => Promise<AIResponse>
  generateResearchIdeas: (topic: string, context?: string) => Promise<any>
  summarizeContent: (content: string, options?: any) => Promise<any>
  improveWriting: (text: string, task: 'grammar' | 'clarity' | 'academic' | 'creative' | 'professional') => Promise<any>
  isLoading: boolean
  error: string | null
}

export function useUserAI(): UseUserAIResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useSupabaseAuth()
  const { toast } = useToast()

  const makeAIRequest = async (
    messages: AIMessage[], 
    options: AIRequestOptions = {}
  ): Promise<{ response: AIResponse; meta: any }> => {
    if (!user) {
      throw new Error('Authentication required')
    }

    // Get the auth token from Supabase
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      throw new Error('No valid session token')
    }

    const response = await fetch('/api/ai/user-generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ messages, options })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'AI request failed')
    }

    return await response.json()
  }

  const generateResponse = async (
    messages: AIMessage[], 
    options: AIRequestOptions = {}
  ): Promise<AIResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      const { response, meta } = await makeAIRequest(messages, options)
      
      // Show usage info if using user's key
      if (meta.isUserKey && meta.usage) {
        toast({
          title: "AI Response Generated",
          description: `Used ${meta.provider} (${meta.usage.tokens} tokens, ~$${meta.usage.cost?.toFixed(4) || '0.0000'})`,
        })
      }

      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      
      // Show user-friendly error
      if (errorMessage.includes('No AI providers available')) {
        toast({
          title: "No AI Keys Configured",
          description: "Please add your AI API keys in Settings to use AI features.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "AI Request Failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
      
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const generateResearchIdeas = async (topic: string, context?: string) => {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a research assistant. Generate innovative, practical research ideas with detailed methodology and impact analysis. Return only valid JSON.'
      },
      {
        role: 'user',
        content: `Generate 3-5 research ideas for the topic: "${topic}"${context ? ` in the context of: ${context}` : ''}
        
        Return a JSON object with this structure:
        {
          "ideas": [
            {
              "title": "Research idea title",
              "description": "Brief description",
              "research_question": "Main research question",
              "methodology": "Proposed methodology",
              "impact": "Potential impact and applications", 
              "challenges": "Anticipated challenges"
            }
          ],
          "context": "Brief analysis of the research landscape",
          "references": ["Suggested reference areas"]
        }`
      }
    ]

    const response = await generateResponse(messages)
    
    try {
      return JSON.parse(response.content)
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        ideas: [{
          title: `Research on ${topic}`,
          description: response.content,
          research_question: `How can we advance understanding of ${topic}?`,
          methodology: 'Mixed methods approach with literature review and empirical analysis',
          impact: 'Potential to contribute to academic knowledge and practical applications',
          challenges: 'Data availability and methodological constraints'
        }],
        context: `Research in ${topic} is an active field with many opportunities for contribution.`
      }
    }
  }

  const summarizeContent = async (
    content: string, 
    options: { 
      style?: 'academic' | 'executive' | 'bullet-points' | 'detailed'
      length?: 'brief' | 'medium' | 'comprehensive'
    } = {}
  ) => {
    const { style = 'academic', length = 'medium' } = options
    
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are an expert content summarizer. Create ${style} summaries that are ${length} in length. Return only valid JSON.`
      },
      {
        role: 'user',
        content: `Analyze and summarize this content:

"${content}"

Return a JSON object with this structure:
{
  "summary": "${style} summary in ${length} detail",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "readingTime": estimated_reading_time_in_minutes,
  "sentiment": "positive|neutral|negative"
}`
      }
    ]

    const response = await generateResponse(messages)
    
    try {
      return JSON.parse(response.content)
    } catch (error) {
      // Fallback
      const wordCount = content.split(/\s+/).length
      return {
        summary: response.content,
        keyPoints: ['Content analysis completed', 'Key insights extracted', 'Summary generated'],
        readingTime: Math.ceil(wordCount / 200),
        sentiment: 'neutral'
      }
    }
  }

  const improveWriting = async (
    text: string,
    task: 'grammar' | 'clarity' | 'academic' | 'creative' | 'professional'
  ) => {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a professional writing assistant. Improve text for ${task} purposes. Return only valid JSON.`
      },
      {
        role: 'user',
        content: `Improve this text for ${task}:

"${text}"

Return a JSON object with this structure:
{
  "improvedText": "The improved version of the text",
  "suggestions": [
    {
      "type": "grammar|style|clarity|structure",
      "original": "original phrase",
      "improved": "improved phrase", 
      "reason": "explanation of improvement"
    }
  ],
  "metrics": {
    "readability": score_out_of_100,
    "sentiment": "positive|neutral|negative",
    "wordCount": number_of_words
  }
}`
      }
    ]

    const response = await generateResponse(messages)
    
    try {
      return JSON.parse(response.content)
    } catch (error) {
      // Fallback
      return {
        improvedText: response.content,
        suggestions: [{
          type: 'improvement',
          original: text.substring(0, 50) + '...',
          improved: response.content.substring(0, 50) + '...',
          reason: 'AI-assisted improvement applied'
        }],
        metrics: {
          readability: 75,
          sentiment: 'neutral',
          wordCount: text.split(/\s+/).length
        }
      }
    }
  }

  return {
    generateResponse,
    generateResearchIdeas,
    summarizeContent,
    improveWriting,
    isLoading,
    error
  }
}
