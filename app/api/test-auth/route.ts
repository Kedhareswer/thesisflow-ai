import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    console.log('Test Auth: Starting request processing')
    console.log('Test Auth: Headers:', Object.fromEntries(request.headers.entries()))
    
    const user = await requireAuth(request, "test-auth")
    
    console.log('Test Auth: User authenticated:', user.id)
    
    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      userId: user.id
    })

  } catch (error) {
    console.error("Test auth error:", error)
    
    return NextResponse.json(
      { error: "Authentication failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 401 }
    )
  }
} 