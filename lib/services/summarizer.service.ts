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
          prompt: `You are an expert content summarizer. Create a comprehensive summary of the following text.

INSTRUCTIONS:
1. Write a detailed 3-4 paragraph summary covering the main topics, findings, and key information
2. Extract exactly 5 key points that capture the most important aspects
3. Use clear, professional language
4. Do NOT include the original text in your response
5. Focus on substance and insights

FORMAT YOUR RESPONSE EXACTLY AS SHOWN:

SUMMARY:
[Write your detailed summary here - 3-4 well-developed paragraphs that thoroughly cover the content]

KEY_POINTS:
- [First key point - be specific and informative]
- [Second key point - be specific and informative] 
- [Third key point - be specific and informative]
- [Fourth key point - be specific and informative]
- [Fifth key point - be specific and informative]

TEXT TO SUMMARIZE:
${text}`,
          provider: options?.provider,
          model: options?.model
        })

        const parsedResult = this.parseSummaryResponse(response, text.length, text)

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
          // Check if user is authenticated before attempting to save
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
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
            console.log("Summary saved to database with ID:", result.id)
          } else {
            console.log("User not authenticated, skipping database save")
          }
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
      // Enable OCR automatically for PDFs and images
      try {
        const type = file.type || ''
        if (type === 'application/pdf' || type.startsWith('image/')) {
          formData.append('enableOCR', 'true')
        }
      } catch (_) {
        // no-op
      }

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
          // Check if user is authenticated before attempting to save
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const title = file.name || "Uploaded file"

            const savedSummary = await this.saveSummary(
              title,
              extractedText,
              result.summary,
              result.keyPoints,
              'file',
              undefined,
              result.readingTime
            )

            result.id = savedSummary.id
            console.log("File summary saved to database with ID:", result.id)
          } else {
            console.log("User not authenticated, skipping database save for file summary")
          }
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
  private static parseSummaryResponse(responseData: any, originalLength: number, originalText?: string): SummaryResult {
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

    // If the model echoed the original text, strip it out before parsing
    try {
      if (originalText && originalText.length > 200) {
        const head = originalText.slice(0, 200)
        const tail = originalText.slice(-200)
        const echoedHead = content.indexOf(head)
        const echoedTail = content.lastIndexOf(tail)

        // Case 1: Full or large portion echoed verbatim
        if (echoedHead !== -1 && echoedTail !== -1 && echoedTail > echoedHead) {
          // Remove the segment that likely corresponds to the input text
          const before = content.slice(0, echoedHead)
          const after = content.slice(echoedTail + tail.length)
          content = (before + "\n" + after).trim()
        }

        // Case 2: Echoed within code fences or after an instruction line
        // Remove anything following a marker like "Here is the text to summarize:" or a fenced block that seems to contain the input
        const echoMarkers = [
          /Here is the text to summarize:\s*[\s\S]*$/i,
          /```[\s\S]*?```/g,
        ]
        for (const marker of echoMarkers) {
          // If content includes a long overlap with the original, strip those sections
          if (originalText.length > 500 && content.includes(originalText.slice(0, 100))) {
            content = content.replace(marker, "").trim()
          }
        }
      }
    } catch (_) {
      // Non-fatal: continue with best-effort parsing
    }

    // Improved parsing to handle the new format
    let summary = "";
    let keyPointsArray: string[] = [];

    console.log("Parsing AI response, content preview:", content.substring(0, 500));

    // Try to extract summary using improved patterns
    const summaryPatterns = [
      /SUMMARY:\s*([\s\S]*?)(?:\n\s*KEY_POINTS:|$)/i,
      /Summary:\s*([\s\S]*?)(?:\n\s*Key Points:|$)/i,
      /## Summary\s*([\s\S]*?)(?:\n\s*## Key Points|$)/i,
      /^([\s\S]*?)(?:\n\s*KEY_POINTS:|Key Points:|$)/i
    ];

    for (const pattern of summaryPatterns) {
      const match = content.match(pattern);
      if (match && match[1] && match[1].trim().length > 50) {
        summary = match[1].trim();
        // Clean up any formatting artifacts
        summary = summary.replace(/^\[.*?\]/, '').trim();
        summary = summary.replace(/\[Write.*?\]/gi, '').trim();
        console.log("Found summary with pattern:", pattern.source);
        break;
      }
    }

    // If no summary was found, try to extract the main content
    if (!summary) {
      // Look for substantial paragraphs
      const paragraphs = content.split('\n\n').filter(p => p.trim().length > 100);
      if (paragraphs.length > 0) {
        summary = paragraphs.slice(0, 3).join('\n\n').trim();
      } else {
        // Fallback to first substantial content
        const lines = content.split('\n').filter(line => line.trim().length > 20);
        summary = lines.slice(0, 8).join('\n').trim();
      }
      
      if (summary.length > 2000) {
        summary = summary.substring(0, 2000) + "...";
      }
      console.log("Using fallback summary extraction");
    }

    // Improved key points extraction
    const keyPointsPatterns = [
      /KEY_POINTS:\s*([\s\S]*?)(?:\n\n|\n\s*[A-Z]+:|$)/i,
      /Key Points:\s*([\s\S]*?)(?:\n\n|\n\s*[A-Z]+:|$)/i,
      /## Key Points\s*([\s\S]*?)(?:\n\n|\n\s*##|$)/i,
      /(?:Key Insights|Main Points|Important Points):\s*([\s\S]*?)(?:\n\n|$)/i
    ];

    for (const pattern of keyPointsPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const keyPointsText = match[1].trim();
        console.log("Found key points section:", keyPointsText.substring(0, 200));

        // Extract bullet points with improved regex
        const bulletRegex = /(?:^|\n)\s*[-•*]\s*([^\n]+)/g;
        const bullets = [];
        let bulletMatch;
        
        while ((bulletMatch = bulletRegex.exec(keyPointsText)) !== null) {
          const point = bulletMatch[1].trim();
          // Clean up placeholder text
          if (point && point.length > 15 && !point.includes('[') && !point.includes('key point')) {
            bullets.push(point);
          }
        }

        if (bullets.length > 0) {
          keyPointsArray = bullets.slice(0, 5);
          console.log("Extracted key points:", keyPointsArray.length);
          break;
        }

        // Fallback: try numbered points
        const numberedRegex = /(?:^|\n)\s*\d+\.\s*([^\n]+)/g;
        const numbered = [];
        let numberedMatch;
        
        while ((numberedMatch = numberedRegex.exec(keyPointsText)) !== null) {
          const point = numberedMatch[1].trim();
          if (point && point.length > 15 && !point.includes('[')) {
            numbered.push(point);
          }
        }

        if (numbered.length > 0) {
          keyPointsArray = numbered.slice(0, 5);
          console.log("Extracted numbered points:", keyPointsArray.length);
          break;
        }
      }
    }

    // If no key points were found, try to generate some from the summary
    if (keyPointsArray.length === 0) {
      console.log("No key points found, generating from summary");
      
      // Try to extract meaningful sentences from the summary
      const sentences = summary
        .split(/[.!?]\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 30 && s.length < 300 && !s.includes('TEXT TO SUMMARIZE'));

      if (sentences.length >= 3) {
        keyPointsArray = sentences.slice(0, 5).map(s => s.endsWith('.') ? s : s + '.');
        console.log("Generated key points from sentences:", keyPointsArray.length);
      } else {
        // Last resort: split summary into logical chunks
        const chunks = summary.split(/\n\n|\. /).filter(chunk => chunk.trim().length > 40);
        if (chunks.length > 0) {
          keyPointsArray = chunks.slice(0, 5).map(chunk => {
            const cleaned = chunk.trim().replace(/^\d+\.\s*/, '');
            return cleaned.endsWith('.') ? cleaned : cleaned + '.';
          });
          console.log("Generated key points from chunks:", keyPointsArray.length);
        } else {
          keyPointsArray = ["Unable to extract specific key points from the content."];
        }
      }
    }

    // Ensure we have at least some key points, but don't duplicate unnecessarily
    if (keyPointsArray.length === 0) {
      keyPointsArray = ["Content analysis completed but specific key points could not be extracted."];
    }

    // Limit to 5 key points maximum
    keyPointsArray = keyPointsArray.slice(0, 5);
    
    console.log("Final parsing results:", {
      summaryLength: summary.length,
      keyPointsCount: keyPointsArray.length,
      summaryPreview: summary.substring(0, 100)
    });

    // Calculate approximate reading time (1 minute per 1000 characters)
    const readingTime = Math.ceil(originalLength / 1000);

    return {
      summary: summary || "Summary could not be generated.",
      keyPoints: keyPointsArray,
      readingTime,
    }
  }
}
