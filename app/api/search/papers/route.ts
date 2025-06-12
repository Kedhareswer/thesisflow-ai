import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"

const execAsync = promisify(exec)
const TIMEOUT_MS = 30000 // 30 second timeout

type SearchResult = {
  results?: any[]
  error?: string
  details?: string
  suggestion?: string
  source?: string
}

async function executePythonScript(scriptPath: string, args: string[]): Promise<{stdout: string, stderr: string}> {
  return new Promise((resolve, reject) => {
    const command = `python "${scriptPath}" ${args.map(arg => `"${arg}"`).join(' ')}`
    
    const childProcess = exec(command, { timeout: TIMEOUT_MS }, (error, stdout, stderr) => {
      if (error) {
        // If the error is a timeout, provide a more specific message
        if (error.killed && error.signal === 'SIGTERM') {
          reject(new Error(`Script execution timed out after ${TIMEOUT_MS/1000} seconds`))
          return
        }
        reject(error)
        return
      }
      resolve({ stdout, stderr })
    })
    
    // Handle process exit before completion
    childProcess.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}`))
      }
    })
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")
    const type = searchParams.get("type") || "keyword"

    if (!query) {
      return NextResponse.json(
        { 
          error: "Query parameter is required",
          suggestion: "Please provide a search query"
        }, 
        { status: 400 }
      )
    }

    // Get the path to the Python script relative to the project root
    const pythonScriptPath = path.join(process.cwd(), "python", "search_papers.py")
    
    try {
      // Execute the Python script with the query parameter and handle timeouts
      const { stdout, stderr } = await Promise.race([
        executePythonScript(pythonScriptPath, [query]),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Script execution timed out')), TIMEOUT_MS)
        )
      ])
      
      // Log any stderr output for debugging (but don't fail the request for warnings)
      if (stderr) {
        console.warn("Python script warnings:", stderr)
      }
      
      // Parse the JSON output from the Python script
      let results: SearchResult
      try {
        results = JSON.parse(stdout)
      } catch (parseError) {
        console.error("Failed to parse Python script output:", stdout)
        throw new Error("Failed to process search results. The response format was invalid.")
      }
      
      // Handle errors from the Python script
      if (results.error) {
        return NextResponse.json(
          { 
            error: results.error,
            details: results.details,
            suggestion: results.suggestion || "Please try again later or with different search terms"
          },
          { status: 400 }
        )
      }
      
      // Return successful results in the format expected by the frontend
      const responseData = {
        success: true,
        count: results.results?.length || 0,
        source: results.source || "unknown",
        data: results.results || []  // Frontend expects results in data.data
      }
      
      console.log("Returning search results:", JSON.stringify(responseData, null, 2))
      return NextResponse.json(responseData)
      
    } catch (error) {
      console.error("Error executing Python script:", error)
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          return NextResponse.json(
            { 
              error: "Search request timed out",
              suggestion: "The search is taking longer than expected. Please try again with a more specific query."
            },
            { status: 504 } // Gateway Timeout
          )
        }
        
        if (error.message.includes('ENOENT')) {
          return NextResponse.json(
            { 
              error: "Search service is not available",
              details: "The search script could not be found",
              suggestion: "Please contact support if the problem persists"
            },
            { status: 503 } // Service Unavailable
          )
        }
      }
      
      // Generic error response
      return NextResponse.json(
        { 
          error: "Failed to execute search",
          details: error instanceof Error ? error.message : String(error),
          suggestion: "Please try again later or contact support if the problem persists"
        },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error("Unexpected error in search papers API:", error)
    return NextResponse.json(
      { 
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
        suggestion: "Please try again later"
      },
      { status: 500 }
    )
  }
}
