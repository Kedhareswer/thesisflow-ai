import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    console.log("=== Tasks GET Debug ===")
    
    const user = await getAuthUser(request, "tasks")
    if (!user) {
      console.log("Tasks GET: No authenticated user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Tasks GET: Authenticated user:", user.id)

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      console.log("Tasks GET: Missing project_id parameter")
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Tasks GET: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // First verify the project belongs to the user
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .single()

    if (projectError || !project) {
      console.log("Tasks GET: Project not found or access denied")
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const { data: tasks, error } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Tasks GET: Error fetching tasks:", error)
      return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
    }

    console.log("Tasks GET: Successfully fetched", tasks?.length || 0, "tasks")

    return NextResponse.json({ tasks: tasks || [] })
  } catch (error) {
    console.error("Tasks GET: Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== Tasks POST Debug ===")
    
    const user = await requireAuth(request, "tasks")
    console.log("Tasks POST: Authenticated user:", user.id)

    const body = await request.json()
    console.log("Tasks POST: Request body:", { 
      title: body.title, 
      project_id: body.project_id,
      priority: body.priority,
      status: body.status
    })

    const { 
      title, 
      description, 
      project_id, 
      due_date, 
      priority = "medium", 
      status = "todo", 
      assignee_id = "", 
      estimated_hours 
    } = body

    if (!title) {
      console.log("Tasks POST: Missing title")
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!project_id) {
      console.log("Tasks POST: Missing project_id")
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    // Verify the project belongs to the user
    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Tasks POST: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", project_id)
      .eq("owner_id", user.id)
      .single()

    if (projectError || !project) {
      console.log("Tasks POST: Project not found or access denied")
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const taskData = {
      title,
      description: description || "",
      project_id,
      due_date: due_date || null,
      priority,
      status,
      assignee_id: assignee_id || null,
      estimated_hours: estimated_hours || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log("Tasks POST: Task data to insert:", taskData)

    const { data: task, error } = await supabaseAdmin
      .from("tasks")
      .insert(taskData)
      .select()
      .single()

    if (error) {
      console.error("Tasks POST: Error creating task:", error)
      return NextResponse.json({ 
        error: "Failed to create task",
        details: error.message 
      }, { status: 500 })
    }

    console.log("Tasks POST: Task created successfully:", task.id)

    return NextResponse.json({ task })
  } catch (error) {
    console.error("Tasks POST: Error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  }
} 