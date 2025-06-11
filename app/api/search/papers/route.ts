import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"

const execAsync = promisify(exec)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")
    const type = searchParams.get("type") || "keyword"

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    // Get the path to the Python script relative to the project root
    const pythonScriptPath = path.join(process.cwd(), "python", "search_papers.py")
    
    // Execute the Python script directly with the query parameter
    const { stdout, stderr } = await execAsync(`python "${pythonScriptPath}" "${query}"`)
    
    if (stderr) {
      console.error("Python script error:", stderr)
      throw new Error(`pygetpapers error: ${stderr}`)
    }
    
    // Parse the JSON output from the Python script
    const results = JSON.parse(stdout)
    
    // Check if there was an error in the Python script
    if (results.error) {
      throw new Error(results.error)
    }
    
    return NextResponse.json(results)
  } catch (error) {
    console.error("Error in search papers API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search papers" },
      { status: 500 },
    )
  }
}
