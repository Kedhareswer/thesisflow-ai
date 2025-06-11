import { NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"
import os from "os"
import { exec } from "child_process"
import { promisify } from "util"

const execPromise = promisify(exec)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    // Get file extension
    const fileExt = path.extname(file.name).toLowerCase()
    
    // Check if file type is supported
    const supportedTypes = [".pdf", ".docx", ".doc", ".txt", ".md"]
    if (!supportedTypes.includes(fileExt)) {
      return NextResponse.json({ 
        error: "Unsupported file type. Please upload PDF, Word, or text files." 
      }, { status: 400 })
    }
    
    // Create a temporary file path
    const tempDir = os.tmpdir()
    const tempFilePath = path.join(tempDir, file.name)
    
    // Convert file to buffer and save to temp location
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(tempFilePath, buffer)
    
    let extractedText = ""
    
    // Extract text based on file type
    if (fileExt === ".txt" || fileExt === ".md") {
      // For text files, just read the content
      extractedText = buffer.toString("utf-8")
    } else if (fileExt === ".pdf") {
      try {
        // For PDF files, we'll use a simple approach that works in most environments
        // Note: In a production app, you might want to use a more robust PDF extraction library
        const { stdout } = await execPromise(`cat "${tempFilePath}"`)
        extractedText = stdout
        
        // If the extraction is empty or failed, provide a message
        if (!extractedText.trim()) {
          extractedText = "PDF text extraction failed. The PDF might be scanned or have security restrictions."
        }
      } catch (error) {
        console.error("PDF extraction error:", error)
        extractedText = "Failed to extract text from PDF. The file might be corrupted or protected."
      }
    } else if (fileExt === ".docx" || fileExt === ".doc") {
      // For Word documents, we'll use a simple approach
      // Note: In a production app, you might want to use a dedicated Word extraction library
      try {
        // This is a simplified approach - in production you'd want to use a proper Word parser
        const { stdout } = await execPromise(`cat "${tempFilePath}"`)
        extractedText = stdout
        
        if (!extractedText.trim()) {
          extractedText = "Word document text extraction failed. The file might be corrupted or have security restrictions."
        }
      } catch (error) {
        console.error("Word extraction error:", error)
        extractedText = "Failed to extract text from Word document. The file might be corrupted or protected."
      }
    }
    
    return NextResponse.json({ 
      text: extractedText,
      filename: file.name
    })
  } catch (error) {
    console.error("Error processing file:", error)
    return NextResponse.json(
      { error: "Failed to process file" }, 
      { status: 500 }
    )
  }
}
