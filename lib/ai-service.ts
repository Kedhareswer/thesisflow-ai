import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize Gemini client with proper API key
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not set in environment variables. Please check your .env file.');
}

// Configure safety settings to allow longer responses
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

interface ResearchContext {
  topic: string;
  description: string;
  existingWork?: string;
  researchGap?: string;
  targetAudience?: string;
}

interface ResearchSuggestion {
  title: string;
  description: string;
  methodology: string;
  potentialImpact: string;
  keyChallenges: string[];
  nextSteps: string[];
}

export class AIService {
  private static async callGeminiAPI(prompt: string) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
            safetySettings,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
    }
  }

  static async getResearchSuggestions(context: ResearchContext): Promise<ResearchSuggestion[]> {
    try {
      const prompt = `As a research assistant, analyze the following research context and provide targeted suggestions:

Research Topic: ${context.topic}
Description: ${context.description}
${context.existingWork ? `Existing Work: ${context.existingWork}` : ''}
${context.researchGap ? `Research Gap: ${context.researchGap}` : ''}
${context.targetAudience ? `Target Audience: ${context.targetAudience}` : ''}

Please provide 3 detailed research suggestions that:
1. Build upon the provided context
2. Address any identified research gaps
3. Consider the target audience
4. Are feasible and impactful

For each suggestion, provide:
- A clear title
- Detailed description
- Proposed methodology
- Potential impact
- Key challenges to address
- Next steps to take

IMPORTANT: Respond with ONLY a valid JSON array containing exactly 3 objects. Do not include any markdown formatting, backticks, or additional text. The response must be a valid JSON array starting with [ and ending with ]. Each object must have these exact fields:
{
  "title": string,
  "description": string,
  "methodology": string,
  "potentialImpact": string,
  "keyChallenges": string[],
  "nextSteps": string[]
}`;

      const text = await this.callGeminiAPI(prompt);

      try {
        // Clean up the response text by removing any markdown formatting and extra whitespace
        const cleanedText = text
          .replace(/```json\n?|\n?```/g, '') // Remove markdown code blocks
          .replace(/^[\s\S]*?\[/, '[') // Remove everything before the first [
          .replace(/\][\s\S]*$/, ']') // Remove everything after the last ]
          .trim()
          .replace(/\n/g, ' ') // Replace newlines with spaces
          .replace(/\s+/g, ' '); // Replace multiple spaces with single space
        
        console.log('Cleaned response:', cleanedText); // Debug log
        
        const parsed = JSON.parse(cleanedText);
        if (!Array.isArray(parsed) || parsed.length !== 3) {
          throw new Error('Response must contain exactly 3 research suggestions');
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        console.error('Original response:', text);
        throw new Error('Failed to parse research suggestions. Please try again.');
      }
    } catch (error) {
      console.error('Error getting research suggestions:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to get research suggestions: ${error.message}`);
      }
      throw error;
    }
  }

  static async analyzeResearchIdea(idea: ResearchSuggestion): Promise<{
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    feasibilityScore: number;
    impactScore: number;
  }> {
    try {
      const prompt = `Analyze the following research idea and provide a detailed assessment:

Title: ${idea.title}
Description: ${idea.description}
Methodology: ${idea.methodology}
Potential Impact: ${idea.potentialImpact}
Key Challenges: ${idea.keyChallenges.join(', ')}

Please provide:
1. List of strengths
2. List of weaknesses
3. Specific recommendations for improvement
4. Feasibility score (1-10)
5. Impact score (1-10)

Format the response as a JSON object with these fields:
{
  "strengths": string[],
  "weaknesses": string[],
  "recommendations": string[],
  "feasibilityScore": number,
  "impactScore": number
}`;

      const text = await this.callGeminiAPI(prompt);

      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        throw new Error('Failed to analyze research idea. Please try again.');
      }
    } catch (error) {
      console.error('Error analyzing research idea:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to analyze research idea: ${error.message}`);
      }
      throw error;
    }
  }
} 