import { api } from "@/lib/api-client"
import { supabase } from "@/integrations/supabase/client"
import type { Summary, SummaryInsert } from "@/integrations/supabase/types"
import { ErrorHandler } from "@/lib/utils/error-handler"
import { ChunkedProcessor, type ProcessingProgress, type SynthesizedResult } from "@/lib/utils/chunked-processor"

// Define response types for API calls
interface GenerateResponse {
  content: string
}

interface FetchUrlResponse {
  content: string
  title?: string
  description?: string
  author?: string
  publishedDate?: string
  url: string
  finalUrl?: string
  wordCount: number
  length: number
  contentType?: string
  qualityScore?: number
  extractionSuccess?: boolean
  metadata?: {
    hasTitle: boolean
    hasAuthor: boolean
    hasDate: boolean
    hasDescription: boolean
    isHighQuality: boolean
    estimatedReadingTime: number
  }
}

interface ExtractFileResponse {
  text: string
  filename: string
  size: number
  type: string
  metadata?: {
    wordCount: number
    pages?: number
    processingMethod: string
  }
}

export interface SummaryResult {
  summary: string
  keyPoints: string[]
  readingTime?: number
  id?: string // Add ID for database reference
  processingMethod?: 'direct' | 'chunked' | 'fallback'
  confidence?: number
  warnings?: string[]
  suggestions?: string[]
  metadata?: {
    originalLength: number
    totalChunks?: number
    averageChunkSize?: number
    totalProcessingTime?: number
    chunkingStrategy?: string
  }
  fallbackInfo?: {
    providersAttempted: number
    totalRetries: number
    finalProvider?: string
    errors?: string
  }
}

export interface SummaryOptions {
  provider?: string
  model?: string
  style?: "academic" | "executive" | "bullet-points" | "detailed"
  length?: "brief" | "medium" | "comprehensive"
}

export class SummarizerService {
  /**
   * Summarize text content using AI with intelligent chunking for large documents
   */
  static async summarizeText(
    text: string,
    saveToDatabase = true,
    onProgress?: (progress: ProcessingProgress) => void,
    options?: SummaryOptions
  ): Promise<SummaryResult> {
    try {
      console.log("SummarizerService: Starting text summarization, length:", text.length)
      console.log("SummarizerService: Options received:", options)

      // Determine if chunking is needed
      const needsChunking = text.length > 8000 // Conservative threshold

      let result: SummaryResult

      if (needsChunking) {
        console.log("SummarizerService: Using chunked processing for large content")

        const synthesizedResult = await ChunkedProcessor.processLargeContent(
          text,
          'summarize',
          onProgress,
          {
            maxChunkSize: 3000,
            preserveStructure: true,
            provider: options?.provider,
            model: options?.model
          }
        )

        result = {
          summary: synthesizedResult.summary,
          keyPoints: synthesizedResult.keyPoints,
          readingTime: synthesizedResult.readingTime,
          processingMethod: synthesizedResult.processingMethod,
          confidence: synthesizedResult.confidence,
          warnings: synthesizedResult.warnings,
          suggestions: synthesizedResult.suggestions,
          metadata: synthesizedResult.metadata
        }
      } else {
        console.log("SummarizerService: Using direct processing for small content")

        onProgress?.({
          stage: 'processing',
          progress: 50,
          message: 'Processing content...'
        })

        const response = await api.post<GenerateResponse>("/api/ai/generate", {
          prompt: `You are an expert research paper summarizer. Summarize the following text in a clear, concise manner. 
          Focus on the main findings, methodology, and implications. 
          
          After the summary, provide exactly 5 key points from the text.
          
          Format your response as:
          
          SUMMARY:
          [Your summary here, about 3-4 paragraphs]
          
          KEY_POINTS:
          - [Key point 1]
          - [Key point 2]
          - [Key point 3]
          - [Key point 4]
          - [Key point 5]
          
          Here is the text to summarize:
          
          ${text}`,
          provider: options?.provider,
          model: options?.model
        })

        const parsedResult = this.parseSummaryResponse(response, text.length)

        result = {
          ...parsedResult,
          processingMethod: 'direct',
          confidence: 0.95,
          warnings: [],
          suggestions: [],
          metadata: {
            originalLength: text.length,
            totalChunks: 1,
            averageChunkSize: text.length,
            chunkingStrategy: 'none'
          }
        }

        onProgress?.({
          stage: 'complete',
          progress: 100,
          message: 'Processing complete'
        })
      }

      // Save to database if user is authenticated and saveToDatabase is true
      if (saveToDatabase) {
        try {
          const title = text.length > 50
            ? text.substring(0, 50) + "..."
            : text

          const savedSummary = await this.saveSummary(
            title,
            text,
            result.summary,
            result.keyPoints,
            'text',
            undefined,
            result.readingTime
          )

          result.id = savedSummary.id
        } catch (dbError) {
          console.warn("Failed to save summary to database:", dbError)
          // Don't throw error here, just continue without saving
        }
      }

      return result
    } catch (error) {
      console.error("Error summarizing text:", error)
      const processedError = ErrorHandler.processError(error, {
        operation: 'summarize-text',
        contentLength: text.length
      })
      throw new Error(processedError.message)
    }
  }

  /**
   * Summarize content from a URL using AI with intelligent chunking
   */
  static async summarizeUrl(
    url: string,
    saveToDatabase = true,
    onProgress?: (progress: ProcessingProgress) => void,
    options?: SummaryOptions
  ): Promise<SummaryResult> {
    try {
      console.log("Fetching URL content:", url)

      // First, fetch the content from the URL
      const fetchResponse = await api.post<FetchUrlResponse>("/api/fetch-url", { url })
      const content = fetchResponse?.content || ""

      if (!content) {
        throw new Error("Could not extract content from URL")
      }

      console.log("Extracted content length:", content.length)

      // Then summarize the extracted content with progress tracking
      const result = await this.summarizeText(content, false, onProgress, options) // Don't auto-save as text

      // Save to database if user is authenticated and saveToDatabase is true
      if (saveToDatabase) {
        try {
          let title = "URL Summary"
          try {
            const urlObj = new URL(url)
            title = urlObj.hostname.replace(/^www\./, '') + urlObj.pathname.split('/').pop()
          } catch (e) {
            title = "URL Summary"
          }

          const savedSummary = await this.saveSummary(
            title,
            content,
            result.summary,
            result.keyPoints,
            'url',
            url,
            result.readingTime
          )

          result.id = savedSummary.id
        } catch (dbError) {
          console.warn("Failed to save URL summary to database:", dbError)
          // Don't throw error here, just continue without saving
        }
      }

      return result
    } catch (error) {
      console.error("Error summarizing URL:", error)
      const processedError = ErrorHandler.processError(error, {
        operation: 'summarize-url',
        url
      })
      throw new Error(processedError.message)
    }
  }

  /**
   * Summarize content from an uploaded file using AI with intelligent chunking
   */
  static async summarizeFile(
    file: File,
    saveToDatabase = true,
    onProgress?: (progress: ProcessingProgress) => void,
    options?: SummaryOptions
  ): Promise<SummaryResult> {
    try {
      console.log("Processing file:", file.name, file.type, file.size)

      // Create form data to upload the file
      const formData = new FormData()
      formData.append("file", file)

      // Upload and extract text from the file using direct fetch for FormData
      const response = await fetch("/api/extract-file", {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.userMessage) {
          let errorMessage = errorData.userMessage
          if (errorData.actions && errorData.actions.length > 0) {
            errorMessage += "\n\nSuggested actions:\n" + errorData.actions.map((action: string) => `• ${action}`).join("\n")
          }
          if (errorData.fallbackOptions && errorData.fallbackOptions.length > 0) {
            errorMessage += "\n\nAlternative options:\n" + errorData.fallbackOptions.map((option: string) => `• ${option}`).join("\n")
          }
          throw new Error(errorMessage)
        }
        throw new Error(`File processing failed (${response.status})`)
      }

      const uploadResponse = { data: await response.json() as ExtractFileResponse }
      const extractedText = uploadResponse.data?.text || ""

      if (!extractedText) {
        throw new Error("Could not extract text from file")
      }

      console.log("Extracted text length:", extractedText.length)

      // Then summarize the extracted text with progress tracking
      const result = await this.summarizeText(extractedText, false, onProgress, options) // Don't auto-save as text

      // Save to database if user is authenticated and saveToDatabase is true
      if (saveToDatabase) {
        try {
          const savedSummary = await this.saveSummary(
            file.name,
            extractedText,
            result.summary,
            result.keyPoints,
            'file',
            undefined,
            result.readingTime
          )

          result.id = savedSummary.id
        } catch (dbError) {
          console.warn("Failed to save file summary to database:", dbError)
          // Don't throw error here, just continue without saving
        }
      }

      return result
    } catch (error) {
      console.error("Error summarizing file:", error)

      const processedError = ErrorHandler.processError(error, {
        operation: 'summarize-file',
        fileType: file.type
      })
      throw new Error(processedError.message)
    }
  }

  /**
   * Save summary to database
   */
  static async saveSummary(
    title: string,
    originalContent: string,
    summary: string,
    keyPoints: string[],
    sourceType: 'text' | 'file' | 'url',
    sourceUrl?: string,
    readingTime?: number
  ): Promise<Summary> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const summaryData: SummaryInsert = {
      title,
      original_content: originalContent,
      summary_content: summary,
      key_points: keyPoints,
      source_type: sourceType,
      source_url: sourceUrl,
      reading_time: readingTime,
      user_id: user.id,
    }

    const { data, error } = await supabase
      .from('summaries')
      .insert(summaryData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get user's summaries
   */
  static async getSummaries(): Promise<Summary[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get a specific summary
   */
  static async getSummary(id: string): Promise<Summary | null> {
    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  }

  /**
   * Delete a summary
   */
  static async deleteSummary(id: string): Promise<void> {
    const { error } = await supabase
      .from('summaries')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Parse the AI response to extract summary and key points
   */
  private static parseSummaryResponse(responseData: any, originalLength: number): SummaryResult {
    // Extract content from response - handle both 'response' and 'content' fields for backward compatibility
    let content = ""
    if (responseData && typeof responseData === "object") {
      // Try 'response' field first (new format), then 'content' field (legacy format)
      if ("response" in responseData && responseData.response) {
        content = String(responseData.response)
      } else if ("content" in responseData && responseData.content) {
        content = String(responseData.content)
      } else {
        // If neither field exists, try to use the whole response as content
        content = String(responseData)
      }
    } else {
      content = String(responseData)
    }

    // Add error handling for empty content
    if (!content || content.trim().length === 0) {
      throw new Error("AI response is empty or invalid")
    }

    console.log("AI Response content:", content.substring(0, 200) + "...");

    // More flexible parsing to handle different response formats
    let summary = "";
    let keyPointsArray: string[] = [];

    // Try to extract summary using various patterns
    const summaryPatterns = [
      /SUMMARY:([\s\S]*?)(?:KEY_POINTS:|KEY POINTS:|KEY INSIGHTS:|$)/i,
      /Executive Summary[\s\S]*?([\s\S]*?)(?:Key Insights|Key Points|$)/i,
      /^([\s\S]*?)(?:Key Insights|Key Points|\d+\.)/i
    ];

    for (const pattern of summaryPatterns) {
      const match = content.match(pattern);
      if (match && match[1] && match[1].trim().length > 20) {
        summary = match[1].trim();
        break;
      }
    }

    // If no summary was found, use the first part of the content
    if (!summary) {
      summary = content.split('\n').slice(0, 5).join('\n').trim();
      if (summary.length > 1000) {
        summary = summary.substring(0, 1000) + "...";
      }
    }

    // Try to extract key points using various patterns
    const keyPointsPatterns = [
      /KEY_POINTS:|KEY POINTS:|KEY INSIGHTS:([\s\S]*)/i,
      /Key Insights[\s\S]*?([\s\S]*)/i,
      /Key Points[\s\S]*?([\s\S]*)/i,
      /\d+\.([\s\S]*)/i
    ];

    for (const pattern of keyPointsPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const keyPointsText = match[1].trim();

        // Try to extract numbered or bulleted points
        const pointsArray = keyPointsText
          .split(/\n+|\d+\.\s+|•\s+|\*\s+|\-\s+/)
          .map(point => point.trim())
          .filter(point => point.length > 10);

        if (pointsArray.length > 0) {
          keyPointsArray = pointsArray.slice(0, 5);
          break;
        }
      }
    }

    // If no key points were found, try to generate some from the summary
    if (keyPointsArray.length === 0) {
      // Try to extract sentences that might be key points
      const sentences = summary
        .split(/\.\s+|\n+/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 200);

      if (sentences.length >= 3) {
        keyPointsArray = sentences.slice(0, 5);
      } else {
        keyPointsArray = ["Key points could not be extracted."];
      }
    }

    // Ensure we have exactly 5 key points or fewer if that's all we could extract
    while (keyPointsArray.length < 5 && keyPointsArray.length > 0 && keyPointsArray[0] !== "Key points could not be extracted.") {
      // Duplicate some existing points if we need to fill in
      keyPointsArray.push(keyPointsArray[keyPointsArray.length % keyPointsArray.length]);
    }

    // Limit to 5 key points
    keyPointsArray = keyPointsArray.slice(0, 5);

    // Calculate approximate reading time (1 minute per 1000 characters)
    const readingTime = Math.ceil(originalLength / 1000);

    return {
      summary: summary || "Summary could not be generated.",
      keyPoints: keyPointsArray,
      readingTime,
    }
  }
}
