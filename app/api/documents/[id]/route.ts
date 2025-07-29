import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, createSupabaseAdmin } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request, "documents")
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const { data: document, error } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", params.id)
      .eq("owner_id", user.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Document not found" }, { status: 404 })
      }
      console.error("Error fetching document:", error)
      return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error("Error in GET /api/documents/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request, "documents")
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, document_type, project_id, team_id, is_public } = body

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
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

    const { data: document, error } = await supabaseAdmin
      .from("documents")
      .update(updateData)
      .eq("id", params.id)
      .eq("owner_id", user.id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Document not found" }, { status: 404 })
      }
      console.error("Error updating document:", error)
      return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error("Error in PUT /api/documents/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request, "documents")
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const { error } = await supabaseAdmin
      .from("documents")
      .delete()
      .eq("id", params.id)
      .eq("owner_id", user.id)

    if (error) {
      console.error("Error deleting document:", error)
      return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
    }

    return NextResponse.json({ message: "Document deleted successfully" })
  } catch (error) {
    console.error("Error in DELETE /api/documents/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 