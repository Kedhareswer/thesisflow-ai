import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    console.log("=== Documents GET Debug ===")
    
    const user = await getAuthUser(request, "documents")
    if (!user) {
      console.log("Documents GET: No authenticated user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Documents GET: Authenticated user:", user.id)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const documentType = searchParams.get("document_type")
    const projectId = searchParams.get("project_id")
    const teamId = searchParams.get("team_id")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Documents GET: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    console.log("Documents GET: Building query with filters:", { documentType, projectId, teamId })

    // Build query
    let query = supabaseAdmin
      .from("documents")
      .select("*")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })

    // Apply filters
    if (documentType) {
      query = query.eq("document_type", documentType)
    }
    if (projectId) {
      query = query.eq("project_id", projectId)
    }
    if (teamId) {
      query = query.eq("team_id", teamId)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: documents, error } = await query

    if (error) {
      console.error("Documents GET: Error fetching documents:", error)
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
    }

    console.log("Documents GET: Successfully fetched", documents?.length || 0, "documents")

    return NextResponse.json({ documents: documents || [] })
  } catch (error) {
    console.error("Documents GET: Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== Documents POST Debug ===")
    
    const user = await requireAuth(request, "documents")
    console.log("Documents POST: Authenticated user:", user.id)

    const body = await request.json()
    console.log("Documents POST: Request body:", { 
      title: body.title, 
      document_type: body.document_type,
      content_length: body.content?.length || 0
    })

    const { title, content, document_type = "paper", project_id, team_id, is_public = false } = body

    if (!title) {
      console.log("Documents POST: Missing title")
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const documentData = {
      title,
      content: content || "",
      document_type,
      owner_id: user.id,
      project_id: project_id || null,
      team_id: team_id || null,
      is_public,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log("Documents POST: Document data to insert:", documentData)

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Documents POST: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const { data: document, error } = await supabaseAdmin
      .from("documents")
      .insert(documentData)
      .select()
      .single()

    if (error) {
      console.error("Documents POST: Error creating document:", error)
      return NextResponse.json({ 
        error: "Failed to create document",
        details: error.message 
      }, { status: 500 })
    }

    console.log("Documents POST: Document created successfully:", document.id)

    return NextResponse.json({ document })
  } catch (error) {
    console.error("Documents POST: Error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  }
}
