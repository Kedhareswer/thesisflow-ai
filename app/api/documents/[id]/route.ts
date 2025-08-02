import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== Documents [id] GET Debug ===")
    
    const { id } = await params
    console.log("Documents [id] GET: Document ID:", id)
    
    const user = await getAuthUser(request, "documents")
    if (!user) {
      console.log("Documents [id] GET: No authenticated user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Documents [id] GET: Authenticated user:", user.id)

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Documents [id] GET: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const { data: document, error } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        console.log("Documents [id] GET: Document not found")
        return NextResponse.json({ error: "Document not found" }, { status: 404 })
      }
      console.error("Documents [id] GET: Error fetching document:", error)
      return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
    }

    console.log("Documents [id] GET: Document fetched successfully")

    return NextResponse.json({ document })
  } catch (error) {
    console.error("Documents [id] GET: Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== Documents [id] PUT Debug ===")
    
    const { id } = await params
    console.log("Documents [id] PUT: Document ID:", id)
    
    const user = await requireAuth(request, "documents")
    console.log("Documents [id] PUT: Authenticated user:", user.id)

    const body = await request.json()
    console.log("Documents [id] PUT: Request body:", { 
      title: body.title, 
      document_type: body.document_type,
      content_length: body.content?.length || 0
    })

    const { title, content, document_type, project_id, team_id, is_public } = body

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Documents [id] PUT: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (document_type !== undefined) updateData.document_type = document_type
    if (project_id !== undefined) updateData.project_id = project_id
    if (team_id !== undefined) updateData.team_id = team_id
    if (is_public !== undefined) updateData.is_public = is_public

    console.log("Documents [id] PUT: Update data:", updateData)

    const { data: document, error } = await supabaseAdmin
      .from("documents")
      .update(updateData)
      .eq("id", id)
      .eq("owner_id", user.id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        console.log("Documents [id] PUT: Document not found")
        return NextResponse.json({ error: "Document not found" }, { status: 404 })
      }
      console.error("Documents [id] PUT: Error updating document:", error)
      return NextResponse.json({ 
        error: "Failed to update document",
        details: error.message 
      }, { status: 500 })
    }

    console.log("Documents [id] PUT: Document updated successfully")

    return NextResponse.json({ document })
  } catch (error) {
    console.error("Documents [id] PUT: Error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== Documents [id] DELETE Debug ===")
    
    const { id } = await params
    console.log("Documents [id] DELETE: Document ID:", id)
    
    const user = await requireAuth(request, "documents")
    console.log("Documents [id] DELETE: Authenticated user:", user.id)

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Documents [id] DELETE: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const { error } = await supabaseAdmin
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id)

    if (error) {
      console.error("Documents [id] DELETE: Error deleting document:", error)
      return NextResponse.json({ 
        error: "Failed to delete document",
        details: error.message 
      }, { status: 500 })
    }

    console.log("Documents [id] DELETE: Document deleted successfully")

    return NextResponse.json({ message: "Document deleted successfully" })
  } catch (error) {
    console.error("Documents [id] DELETE: Error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  }
}
