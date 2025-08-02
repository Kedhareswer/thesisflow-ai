import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== Projects [id] GET Debug ===")
    
    const { id } = await params
    console.log("Projects [id] GET: Project ID:", id)
    
    const user = await getAuthUser(request, "projects")
    if (!user) {
      console.log("Projects [id] GET: No authenticated user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Projects [id] GET: Authenticated user:", user.id)

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Projects [id] GET: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        console.log("Projects [id] GET: Project not found")
        return NextResponse.json({ error: "Project not found" }, { status: 404 })
      }
      console.error("Projects [id] GET: Error fetching project:", error)
      return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 })
    }

    console.log("Projects [id] GET: Project fetched successfully")

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Projects [id] GET: Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== Projects [id] PUT Debug ===")
    
    const { id } = await params
    console.log("Projects [id] PUT: Project ID:", id)
    
    const user = await requireAuth(request, "projects")
    console.log("Projects [id] PUT: Authenticated user:", user.id)

    const body = await request.json()
    console.log("Projects [id] PUT: Request body:", { 
      title: body.title, 
      status: body.status,
      progress: body.progress
    })

    const { title, description, start_date, end_date, status, progress } = body

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Projects [id] PUT: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (start_date !== undefined) updateData.start_date = start_date
    if (end_date !== undefined) updateData.end_date = end_date
    if (status !== undefined) updateData.status = status
    if (progress !== undefined) updateData.progress = progress

    console.log("Projects [id] PUT: Update data:", updateData)

    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .update(updateData)
      .eq("id", id)
      .eq("owner_id", user.id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        console.log("Projects [id] PUT: Project not found")
        return NextResponse.json({ error: "Project not found" }, { status: 404 })
      }
      console.error("Projects [id] PUT: Error updating project:", error)
      return NextResponse.json({ 
        error: "Failed to update project",
        details: error.message 
      }, { status: 500 })
    }

    console.log("Projects [id] PUT: Project updated successfully")

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Projects [id] PUT: Error:", error)
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
    console.log("=== Projects [id] DELETE Debug ===")
    
    const { id } = await params
    console.log("Projects [id] DELETE: Project ID:", id)
    
    const user = await requireAuth(request, "projects")
    console.log("Projects [id] DELETE: Authenticated user:", user.id)

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Projects [id] DELETE: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const { error } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id)

    if (error) {
      console.error("Projects [id] DELETE: Error deleting project:", error)
      return NextResponse.json({ 
        error: "Failed to delete project",
        details: error.message 
      }, { status: 500 })
    }

    console.log("Projects [id] DELETE: Project deleted successfully")

    return NextResponse.json({ message: "Project deleted successfully" })
  } catch (error) {
    console.error("Projects [id] DELETE: Error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  }
} 