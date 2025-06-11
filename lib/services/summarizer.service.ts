import { api } from "@/lib/utils/api"

// Define response types for API calls
interface GenerateResponse {
  content: string;
}

interface FetchUrlResponse {
  content: string;
}

interface ExtractFileResponse {
  text: string;
}

export interface SummaryResult {
  summary: string
  keyPoints: string[]
  readingTime?: number
}

export class SummarizerService {
  /**
   * Summarize text content using AI
   * @param text The text content to summarize
   * @returns Summary result with summary text and key points
   */
  static async summarizeText(text: string): Promise<SummaryResult> {
    try {
      const response = await api.post<GenerateResponse>("/api/ai/generate", {
        prompt: `You are an expert research paper summarizer. Summarize the following text in a clear, concise manner. 
        Focus on the main findings, methodology, and implications. 
        
        After the summary, provide a list of 5 key points from the text.
        
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
      })

      // Extract content from response
      let content = ""
      if (response.data && typeof response.data === "object" && "content" in response.data) {
        content = String(response.data.content)
      } else {
        content = String(response.data)
      }

      // Parse the response to extract summary and key points
      const summaryMatch = content.match(/SUMMARY:([\s\S]*?)KEY_POINTS:/i)
      const keyPointsMatch = content.match(/KEY_POINTS:([\s\S]*)/i)

      const summary = summaryMatch ? summaryMatch[1].trim() : content
      
      // Extract key points as array
      const keyPointsText = keyPointsMatch ? keyPointsMatch[1].trim() : ""
      const keyPoints = keyPointsText
        .split("\n")
        .map(point => point.replace(/^-\s*/, "").trim())
        .filter(point => point.length > 0)

      // Calculate approximate reading time (1 minute per 1000 characters)
      const readingTime = Math.ceil(text.length / 1000)

      return {
        summary,
        keyPoints: keyPoints.length > 0 ? keyPoints : [],
        readingTime
      }
    } catch (error) {
      console.error("Error summarizing text:", error)
      throw error
    }
  }

  /**
   * Summarize content from a URL using AI
   * @param url The URL to fetch and summarize
   * @returns Summary result with summary text and key points
   */
  static async summarizeUrl(url: string): Promise<SummaryResult> {
    try {
      // First, we need to fetch the content from the URL
      const fetchResponse = await api.post<FetchUrlResponse>("/api/fetch-url", { url })
      const content = fetchResponse.data?.content || ""
      
      if (!content) {
        throw new Error("Could not extract content from URL")
      }
      
      // Then summarize the extracted content
      return this.summarizeText(content)
    } catch (error) {
      console.error("Error summarizing URL:", error)
      throw error
    }
  }

  /**
   * Summarize content from an uploaded file using AI
   * @param file The file to summarize
   * @returns Summary result with summary text and key points
   */
  static async summarizeFile(file: File): Promise<SummaryResult> {
    try {
      // Create form data to upload the file
      const formData = new FormData()
      formData.append("file", file)
      
      // Upload and extract text from the file
      const uploadResponse = await api.post<ExtractFileResponse>("/api/extract-file", formData)
      const extractedText = uploadResponse.data?.text || ""
      
      if (!extractedText) {
        throw new Error("Could not extract text from file")
      }
      
      // Then summarize the extracted text
      return this.summarizeText(extractedText)
    } catch (error) {
      console.error("Error summarizing file:", error)
      throw error
    }
  }
}
