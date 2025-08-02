import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== Tasks [id] GET Debug ===")
    
    const { id } = await params
    console.log("Tasks [id] GET: Task ID:", id)
    
    const user = await getAuthUser(request, "tasks")
    if (!user) {
      console.log("Tasks [id] GET: No authenticated user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Tasks [id] GET: Authenticated user:", user.id)

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Tasks [id] GET: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Get task and verify project ownership
    const { data: task, error } = await supabaseAdmin
      .from("tasks")
      .select(`
        *,
        projects!inner(owner_id)
      `)
      .eq("id", id)
      .eq("projects.owner_id", user.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        console.log("Tasks [id] GET: Task not found")
        return NextResponse.json({ error: "Task not found" }, { status: 404 })
      }
      console.error("Tasks [id] GET: Error fetching task:", error)
      return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 })
    }

    console.log("Tasks [id] GET: Task fetched successfully")

    return NextResponse.json({ task })
  } catch (error) {
    console.error("Tasks [id] GET: Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== Tasks [id] PUT Debug ===")
    
    const { id } = await params
    console.log("Tasks [id] PUT: Task ID:", id)
    
    const user = await requireAuth(request, "tasks")
    console.log("Tasks [id] PUT: Authenticated user:", user.id)

    const body = await request.json()
    console.log("Tasks [id] PUT: Request body:", { 
      title: body.title, 
      status: body.status,
      priority: body.priority
    })

    const { title, description, due_date, priority, status, assignee_id, estimated_hours } = body

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Tasks [id] PUT: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // First verify the task belongs to a project owned by the user
    const { data: existingTask, error: checkError } = await supabaseAdmin
      .from("tasks")
      .select(`
        *,
        projects!inner(owner_id)
      `)
      .eq("id", id)
      .eq("projects.owner_id", user.id)
      .single()

    if (checkError || !existingTask) {
      console.log("Tasks [id] PUT: Task not found or access denied")
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (due_date !== undefined) updateData.due_date = due_date
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) updateData.status = status
    if (assignee_id !== undefined) updateData.assignee_id = assignee_id
    if (estimated_hours !== undefined) updateData.estimated_hours = estimated_hours

    console.log("Tasks [id] PUT: Update data:", updateData)

    const { data: task, error } = await supabaseAdmin
      .from("tasks")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Tasks [id] PUT: Error updating task:", error)
      return NextResponse.json({ 
        error: "Failed to update task",
        details: error.message 
      }, { status: 500 })
    }

    console.log("Tasks [id] PUT: Task updated successfully")

    return NextResponse.json({ task })
  } catch (error) {
    console.error("Tasks [id] PUT: Error:", error)
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
    console.log("=== Tasks [id] DELETE Debug ===")
    
    const { id } = await params
    console.log("Tasks [id] DELETE: Task ID:", id)
    
    const user = await requireAuth(request, "tasks")
    console.log("Tasks [id] DELETE: Authenticated user:", user.id)

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Tasks [id] DELETE: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // First verify the task belongs to a project owned by the user
    const { data: existingTask, error: checkError } = await supabaseAdmin
      .from("tasks")
      .select(`
        project_id,
        projects!inner(owner_id)
      `)
      .eq("id", id)
      .eq("projects.owner_id", user.id)
      .single()

    if (checkError || !existingTask) {
      console.log("Tasks [id] DELETE: Task not found or access denied")
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from("tasks")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Tasks [id] DELETE: Error deleting task:", error)
      return NextResponse.json({ 
        error: "Failed to delete task",
        details: error.message 
      }, { status: 500 })
    }

    console.log("Tasks [id] DELETE: Task deleted successfully")

    return NextResponse.json({ message: "Task deleted successfully" })
  } catch (error) {
    console.error("Tasks [id] DELETE: Error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  }
} 