import { NextResponse } from "next/server"
import { enhancedAIService } from "@/lib/enhanced-ai-service"
import { getAuthUser } from '@/lib/auth-utils'

export async function POST(request: Request) {
  try {
    console.log("=== AI Generate API Debug ===")
    
    // Authenticate user using shared utility
    const user = await getAuthUser(request, "generate")
    if (!user) {
      console.log("Generate API: No authenticated user found")
      return NextResponse.json(
        { 
          error: "Authentication required",
          success: false 
        },
        { status: 401 }
      )
    }

    console.log("Generate API: Authenticated user:", user.id)

    const body = await request.json()
    const { prompt, provider, model, maxTokens, temperature } = body

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required", success: false },
        { status: 400 }
      )
    }

    console.log("Generate API: Request params:", {
      provider,
      model,
      maxTokens,
      temperature,
      promptLength: prompt.length
    })

    // Use enhanced AI service to generate response
    const result = await enhancedAIService.generateText({
      prompt,
      provider,
      model,
      maxTokens,
      temperature,
      userId: user.id
    })

    console.log("Generate API: Result:", {
      success: result.success,
      hasContent: !!result.content,
      contentLength: result.content?.length || 0,
      error: result.error
    })

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || "Failed to generate response",
          success: false 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      content: result.content,
      provider: result.provider,
      model: result.model,
      usage: result.usage
    })

  } catch (error) {
    console.error("Generate API: Error:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error",
        success: false 
      },
      { status: 500 }
    )
  }
}
