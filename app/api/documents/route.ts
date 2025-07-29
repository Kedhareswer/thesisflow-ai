import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request, "documents")
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const documentType = searchParams.get("document_type")
    const projectId = searchParams.get("project_id")
    const teamId = searchParams.get("team_id")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

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
      console.error("Error fetching documents:", error)
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
    }

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("Error in GET /api/documents:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request, "documents")
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, document_type = "paper", project_id, team_id, is_public = false } = body

    if (!title) {
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

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const { data: document, error } = await supabaseAdmin
      .from("documents")
      .insert(documentData)
      .select()
      .single()

    if (error) {
      console.error("Error creating document:", error)
      return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error("Error in POST /api/documents:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
