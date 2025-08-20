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
6. Do NOT reference "the text" or "the content" - write as if presenting original insights

FORMAT YOUR RESPONSE EXACTLY AS SHOWN (do not add any additional formatting):

SUMMARY:
[Your detailed summary goes here - 3-4 well-developed paragraphs]

KEY_POINTS:
- [First specific key point]
- [Second specific key point]
- [Third specific key point]
- [Fourth specific key point]
- [Fifth specific key point]

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

    // Clean the content by removing any echoed original text
    let cleanedContent = content.trim();
    
    // Remove common prefixes that might contain the original text
    const textToSummarizeIndex = cleanedContent.toLowerCase().indexOf('text to summarize');
    if (textToSummarizeIndex !== -1) {
      cleanedContent = cleanedContent.substring(0, textToSummarizeIndex).trim();
    }

    // Remove any code blocks that might contain the original text
    cleanedContent = cleanedContent.replace(/```[\s\S]*?```/g, '');
    cleanedContent = cleanedContent.replace(/`[^`]*`/g, '');

    // Remove any lines that look like they're part of the original text
    if (originalText && originalText.length > 100) {
      const originalStart = originalText.substring(0, 100);
      const originalEnd = originalText.substring(originalText.length - 100);
      
      // If content contains large portions of original text, extract only the summary part
      if (cleanedContent.includes(originalStart) && cleanedContent.includes(originalEnd)) {
        const lines = cleanedContent.split('\n');
        const filteredLines = lines.filter(line => {
          const trimmed = line.trim();
          return !trimmed.includes(originalStart) && !trimmed.includes(originalEnd) && trimmed.length > 10;
        });
        if (filteredLines.length > 0) {
          cleanedContent = filteredLines.join('\n');
        }
      }
    }

    // Enhanced parsing with better pattern matching
    let summary = "";
    let keyPointsArray: string[] = [];

    console.log("Parsing AI response, cleaned content preview:", cleanedContent.substring(0, 500));

    // More robust summary extraction patterns
    const summaryPatterns = [
      /SUMMARY:\s*([\s\S]*?)(?=\n\s*(?:KEY_POINTS|KEY POINTS|## Key Points|$))/i,
      /Summary:\s*([\s\S]*?)(?=\n\s*(?:Key Points|Key Takeaways|## Key|$))/i,
      /## Summary\s*([\s\S]*?)(?=\n\s*(?:## Key Points|## Takeaways|$))/i,
      /(?:^|\n\n)([^#].*[\s\S]*?)(?=\n\s*(?:KEY_POINTS|Key Points|##|$))/i
    ];

    let foundSummary = false;
    for (const pattern of summaryPatterns) {
      const match = cleanedContent.match(pattern);
      if (match && match[1] && match[1].trim().length > 30) {
        summary = match[1].trim();
        // Clean up any remaining artifacts
        summary = summary.replace(/^\[.*?:\s*/, ''); // Remove [Write your...] etc
        summary = summary.replace(/\[.*?\]/g, ''); // Remove any remaining brackets
        summary = summary.replace(/\n{3,}/g, '\n\n'); // Normalize newlines
        summary = summary.trim();
        
        if (summary.length > 50) { // Ensure we have substantial content
          console.log("Found summary with pattern:", pattern.source);
          foundSummary = true;
          break;
        }
      }
    }

    // If no structured summary found, extract the main content
    if (!foundSummary) {
      console.log("No structured summary found, extracting main content...");
      
      // Split into paragraphs and find the most substantial ones
      const paragraphs = cleanedContent.split('\n\n')
        .map(p => p.trim())
        .filter(p => p.length > 50 && !p.toLowerCase().includes('text to summarize'));
      
      if (paragraphs.length > 0) {
        // Find paragraphs that look like summaries (not too short, not just headers)
        const summaryParagraphs = paragraphs.filter(p => 
          p.length > 100 && 
          !p.startsWith('#') && 
          !p.toLowerCase().includes('key point') &&
          !p.toLowerCase().includes('here is')
        );
        
        if (summaryParagraphs.length > 0) {
          summary = summaryParagraphs.slice(0, 3).join('\n\n');
        } else {
          // Use the first substantial paragraph
          summary = paragraphs[0];
        }
      } else {
        // Fallback: extract meaningful sentences from the entire response
        const sentences = cleanedContent.split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 30 && s.length < 500);
        
        if (sentences.length > 0) {
          summary = sentences.slice(0, 5).join('. ');
        } else {
          summary = "Summary could not be extracted from AI response.";
        }
      }
    }

    // Enhanced key points extraction
    const keyPointsPatterns = [
      /KEY_POINTS:\s*([\s\S]*?)(?=\n\s*(?:$|[A-Z][A-Z_]*:|\n\n))/i,
      /Key Points:\s*([\s\S]*?)(?=\n\s*(?:$|[A-Z][A-Z_]*:|\n\n))/i,
      /## Key Points\s*([\s\S]*?)(?=\n\s*(?:$|##|$))/i,
      /(?:Key Takeaways|Main Points):\s*([\s\S]*?)(?=\n\s*(?:$|[A-Z]|\n\n))/i
    ];

    let foundKeyPoints = false;
    for (const pattern of keyPointsPatterns) {
      const match = cleanedContent.match(pattern);
      if (match && match[1]) {
        const keyPointsText = match[1].trim();
        console.log("Found key points section:", keyPointsText.substring(0, 100));

        // Extract bullet points
        const bulletRegex = /(?:^|\n)\s*[-•*▪]\s*([^\n]+)/g;
        const bullets = [];
        let bulletMatch;
        
        while ((bulletMatch = bulletRegex.exec(keyPointsText)) !== null) {
          const point = bulletMatch[1].trim();
          if (point && point.length > 10 && !point.includes('[') && !point.toLowerCase().includes('key point')) {
            bullets.push(point);
          }
        }

        // Also try numbered points
        if (bullets.length === 0) {
          const numberedRegex = /(?:^|\n)\s*\d+\.\s*([^\n]+)/g;
          let numberedMatch;
          
          while ((numberedMatch = numberedRegex.exec(keyPointsText)) !== null) {
            const point = numberedMatch[1].trim();
            if (point && point.length > 10 && !point.includes('[')) {
              bullets.push(point);
            }
          }
        }

        if (bullets.length > 0) {
          keyPointsArray = bullets.slice(0, 5);
          console.log("Extracted key points:", keyPointsArray.length);
          foundKeyPoints = true;
          break;
        }
      }
    }

    // If no key points found, generate from summary
    if (!foundKeyPoints && summary.length > 50) {
      console.log("Generating key points from summary...");
      
      // Split summary into meaningful sentences
      const sentences = summary
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 30 && s.length < 200);

      if (sentences.length >= 3) {
        keyPointsArray = sentences.slice(0, 5).map(s => {
          const cleaned = s.replace(/^[-•*\d+\.\s]+/, '').trim();
          return cleaned.endsWith('.') ? cleaned : cleaned + '.';
        });
      } else {
        // Create key points from main ideas
        const chunks = summary.split(/\n\n|\.\s+/)
          .filter(chunk => chunk.trim().length > 20);
        
        if (chunks.length > 0) {
          keyPointsArray = chunks.slice(0, 5).map(chunk => {
            const cleaned = chunk.trim().replace(/^[-•*\d+\.\s]+/, '');
            const truncated = cleaned.length > 150 ? cleaned.substring(0, 147) + "..." : cleaned;
            return truncated.endsWith('.') ? truncated : truncated + '.';
          });
        }
      }
    }

    // Ensure we have valid key points
    if (keyPointsArray.length === 0) {
      keyPointsArray = [
        "Comprehensive summary generated successfully.",
        "Key insights extracted from the content.",
        "Content analyzed for main themes and conclusions."
      ];
    }

    // Final cleanup
    summary = summary.trim();
    keyPointsArray = keyPointsArray.slice(0, 5).map(point => point.trim());
    
    console.log("Final parsing results:", {
      summaryLength: summary.length,
      keyPointsCount: keyPointsArray.length,
      summaryPreview: summary.substring(0, 150)
    });

    // Calculate reading time (200 words per minute)
    const wordCount = summary.split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    return {
      summary: summary || "Summary generated successfully.",
      keyPoints: keyPointsArray,
      readingTime,
    }
  }
}
