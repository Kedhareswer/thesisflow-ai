import { api } from "@/lib/utils/api"

// Define response types for API calls
interface GenerateResponse {
  content: string
}

interface FetchUrlResponse {
  content: string
}

interface ExtractFileResponse {
  text: string
}

export interface SummaryResult {
  summary: string
  keyPoints: string[]
  readingTime?: number
}

export class SummarizerService {
  /**
   * Summarize text content using AI
   */
  static async summarizeText(text: string): Promise<SummaryResult> {
    try {
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
        
        ${text.substring(0, 8000)}`, // Limit input to prevent token overflow
      })

      return this.parseSummaryResponse(response.data, text.length)
    } catch (error) {
      console.error("Error summarizing text:", error)
      throw new Error("Failed to summarize text. Please try again.")
    }
  }

  /**
   * Summarize content from a URL using AI
   */
  static async summarizeUrl(url: string): Promise<SummaryResult> {
    try {
      console.log("Fetching URL content:", url)

      // First, fetch the content from the URL
      const fetchResponse = await api.post<FetchUrlResponse>("/api/fetch-url", { url })
      const content = fetchResponse.data?.content || ""

      if (!content) {
        throw new Error("Could not extract content from URL")
      }

      console.log("Extracted content length:", content.length)

      // Then summarize the extracted content
      return this.summarizeText(content)
    } catch (error) {
      console.error("Error summarizing URL:", error)
      throw new Error("Failed to process URL. Please check the link and try again.")
    }
  }

  /**
   * Summarize content from an uploaded file using AI
   */
  static async summarizeFile(file: File): Promise<SummaryResult> {
    try {
      console.log("Processing file:", file.name, file.type, file.size)

      // Create form data to upload the file
      const formData = new FormData()
      formData.append("file", file)

      // Upload and extract text from the file
      const uploadResponse = await api.post<ExtractFileResponse>("/api/extract-file", formData)
      const extractedText = uploadResponse.data?.text || ""

      if (!extractedText) {
        throw new Error("Could not extract text from file")
      }

      console.log("Extracted text length:", extractedText.length)

      // Then summarize the extracted text
      return this.summarizeText(extractedText)
    } catch (error) {
      console.error("Error summarizing file:", error)
      throw new Error("Failed to process file. Please try a different file format.")
    }
  }

  /**
   * Parse the AI response to extract summary and key points
   */
  private static parseSummaryResponse(responseData: any, originalLength: number): SummaryResult {
    // Extract content from response
    let content = ""
    if (responseData && typeof responseData === "object" && "content" in responseData) {
      content = String(responseData.content)
    } else {
      content = String(responseData)
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
