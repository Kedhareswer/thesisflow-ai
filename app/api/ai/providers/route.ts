import { NextResponse } from "next/server"
import { AIProviderDetector } from "@/lib/ai-provider-detector"

export async function GET() {
  try {
    const availableProviders = AIProviderDetector.getFallbackProviders()
    const bestProvider = AIProviderDetector.getBestProvider()
    const providerStatus = AIProviderDetector.getProviderStatus()

    // Debug logging
    console.log("Available AI Providers:", availableProviders)
    console.log("Best Provider:", bestProvider)
    console.log("Provider Status:", providerStatus)

    return NextResponse.json({
      success: true,
      availableProviders,
      bestProvider,
      providerStatus,
      totalAvailable: availableProviders.length,
    })
  } catch (error) {
    console.error("Error checking AI provider availability:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check provider availability",
        availableProviders: [],
        bestProvider: null,
      },
      { status: 500 }
    )
  }
} 