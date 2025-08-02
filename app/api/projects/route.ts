import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    console.log("=== Projects GET Debug ===")
    
    const user = await getAuthUser(request, "projects")
    if (!user) {
      console.log("Projects GET: No authenticated user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Projects GET: Authenticated user:", user.id)

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Projects GET: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const { data: projects, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Projects GET: Error fetching projects:", error)
      return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
    }

    console.log("Projects GET: Successfully fetched", projects?.length || 0, "projects")

    return NextResponse.json({ projects: projects || [] })
  } catch (error) {
    console.error("Projects GET: Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== Projects POST Debug ===")
    
    const user = await requireAuth(request, "projects")
    console.log("Projects POST: Authenticated user:", user.id)

    const body = await request.json()
    console.log("Projects POST: Request body:", { 
      title: body.title, 
      status: body.status,
      progress: body.progress
    })

    const { title, description, start_date, end_date, status = 'planning', progress = 0 } = body

    if (!title) {
      console.log("Projects POST: Missing title")
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const projectData = {
      title,
      description: description || "",
      start_date: start_date || null,
      end_date: end_date || null,
      status,
      progress,
      owner_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log("Projects POST: Project data to insert:", projectData)

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      console.error("Projects POST: Supabase admin client not configured")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .insert(projectData)
      .select()
      .single()

    if (error) {
      console.error("Projects POST: Error creating project:", error)
      return NextResponse.json({ 
        error: "Failed to create project",
        details: error.message 
      }, { status: 500 })
    }

    console.log("Projects POST: Project created successfully:", project.id)

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Projects POST: Error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  }
} 