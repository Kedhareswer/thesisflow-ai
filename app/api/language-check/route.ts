import { type NextRequest, NextResponse } from "next/server"

/**
 * API route for checking text using LanguageTool
 * This proxies requests to the LanguageTool public API
 * 
 * POST /api/language-check
 * Body: { text: string, language?: string, chunkSize?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, language = "en-US", chunkSize = 2 } = body

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Check text size limit (LanguageTool has ~50KB limit)
    const textSizeInBytes = new TextEncoder().encode(text).length
    const maxSizeInBytes = 25000 // More conservative limit for sequential processing

    if (textSizeInBytes > maxSizeInBytes) {
      // Split text into manageable chunks
      const chunks = splitTextIntoChunks(text, chunkSize)
      const allMatches = []

      console.log(
        `Text too large (${Math.round(textSizeInBytes / 1024)}KB), processing ${chunks.length} chunks sequentially...`,
      )

      // Log chunk sizes for debugging
      chunks.forEach((chunk, idx) => {
        const size = new TextEncoder().encode(chunk).length
        console.log(`Chunk ${idx + 1}: ${Math.round(size / 1024)}KB (${chunk.length} chars)`)
      })

      // Process chunks sequentially with delays
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const chunkSizeInBytes = new TextEncoder().encode(chunk).length

        console.log(`Processing chunk ${i + 1}/${chunks.length} (${Math.round(chunkSizeInBytes / 1024)}KB)...`)

        if (chunkSizeInBytes > maxSizeInBytes) {
          console.log(
            `Chunk ${i + 1} is still too large (${Math.round(chunkSizeInBytes / 1024)}KB), splitting further...`,
          )

          // Split this chunk into smaller pieces
          const subChunks = splitTextIntoChunks(chunk, 1)

          if (subChunks.some((subChunk) => new TextEncoder().encode(subChunk).length > maxSizeInBytes)) {
            return NextResponse.json(
              {
                error: "Text chunk too large",
                message: `Even individual sentences are too large (${Math.round(chunkSizeInBytes / 1024)}KB). Please check smaller portions of your text.`,
                chunkSize: chunkSizeInBytes,
                maxSize: maxSizeInBytes,
              },
              { status: 413 },
            )
          }

          // Process sub-chunks sequentially
          for (let j = 0; j < subChunks.length; j++) {
            try {
              console.log(`Processing sub-chunk ${j + 1}/${subChunks.length} of chunk ${i + 1}...`)

              const subChunkMatches = await checkChunkWithLanguageTool(subChunks[j], language)

              // Calculate offset for this sub-chunk
              const baseOffset = chunks.slice(0, i).reduce((acc, c) => acc + c.length + 2, 0) // +2 for \n\n
              const subChunkOffset = subChunks.slice(0, j).reduce((acc, c) => acc + c.length, 0)

              // Adjust match positions for the sub-chunk offset
              const adjustedMatches = subChunkMatches.map((match: any) => ({
                ...match,
                offset: match.offset + baseOffset + subChunkOffset,
                context: {
                  ...match.context,
                  text: subChunks[j].substring(
                    Math.max(0, match.offset - 20),
                    Math.min(subChunks[j].length, match.offset + match.length + 20),
                  ),
                },
              }))

              allMatches.push(...adjustedMatches)

              // Add delay between sub-chunks to avoid rate limiting
              if (j < subChunks.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 200))
              }
            } catch (error) {
              console.error(`Error checking sub-chunk ${j + 1} of chunk ${i + 1}:`, error)
              // Continue with other sub-chunks even if one fails
            }
          }
        } else {
          try {
            const chunkMatches = await checkChunkWithLanguageTool(chunk, language)

            // Calculate offset for this chunk
            const offset = chunks.slice(0, i).reduce((acc, c) => acc + c.length + 2, 0) // +2 for \n\n

            // Adjust match positions for the chunk offset
            const adjustedMatches = chunkMatches.map((match: any) => ({
              ...match,
              offset: match.offset + offset,
              context: {
                ...match.context,
                text: chunk.substring(
                  Math.max(0, match.offset - 20),
                  Math.min(chunk.length, match.offset + match.length + 20),
                ),
              },
            }))

            allMatches.push(...adjustedMatches)
          } catch (error) {
            console.error(`Error checking chunk ${i + 1}:`, error)
            // Continue with other chunks even if one fails
          }
        }

        // Add delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          console.log(`Waiting 500ms before next chunk...`)
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      console.log(`Completed processing ${chunks.length} chunks. Found ${allMatches.length} total matches.`)

      return NextResponse.json({
        matches: allMatches,
        chunked: true,
        totalChunks: chunks.length,
        originalSize: textSizeInBytes,
      })
    }

    // Single chunk processing
    const matches = await checkChunkWithLanguageTool(text, language)
    return NextResponse.json({
      matches,
      chunked: false,
      totalChunks: 1,
    })
  } catch (error) {
    console.error("Error calling LanguageTool API:", error)
    return NextResponse.json({ error: "Failed to check text" }, { status: 500 })
  }
}

/**
 * Split text into manageable chunks based on paragraphs
 */
function splitTextIntoChunks(text: string, maxParagraphs = 2): string[] {
  const maxChunkSize = 20000 // Very conservative limit for sequential processing
  const chunks: string[] = []

  // First, try to split by paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0)

  if (paragraphs.length > 0) {
    let currentChunk = ""

    for (const paragraph of paragraphs) {
      const testChunk = currentChunk + (currentChunk ? "\n\n" : "") + paragraph
      const testSize = new TextEncoder().encode(testChunk).length

      if (testSize > maxChunkSize && currentChunk) {
        // Current chunk is full, save it and start new one
        chunks.push(currentChunk)
        currentChunk = paragraph
      } else {
        // Add paragraph to current chunk
        currentChunk = testChunk
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim()) {
      chunks.push(currentChunk)
    }
  }

  // If no paragraphs found or chunks are still too large, split by sentences
  if (chunks.length === 0 || chunks.some((chunk) => new TextEncoder().encode(chunk).length > maxChunkSize)) {
    chunks.length = 0 // Clear existing chunks
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    let currentChunk = ""

    for (const sentence of sentences) {
      const testChunk = currentChunk + (currentChunk ? ". " : "") + sentence
      const testSize = new TextEncoder().encode(testChunk).length

      if (testSize > maxChunkSize && currentChunk) {
        // Current chunk is full, save it and start new one
        chunks.push(currentChunk + ".")
        currentChunk = sentence
      } else {
        // Add sentence to current chunk
        currentChunk = testChunk
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim()) {
      chunks.push(currentChunk + (currentChunk.endsWith(".") ? "" : "."))
    }
  }

  // If chunks are still too large, split by words
  if (chunks.some((chunk) => new TextEncoder().encode(chunk).length > maxChunkSize)) {
    chunks.length = 0 // Clear existing chunks
    const words = text.split(/\s+/).filter((w) => w.trim().length > 0)
    let currentChunk = ""

    for (const word of words) {
      const testChunk = currentChunk + (currentChunk ? " " : "") + word
      const testSize = new TextEncoder().encode(testChunk).length

      if (testSize > maxChunkSize && currentChunk) {
        // Current chunk is full, save it and start new one
        chunks.push(currentChunk)
        currentChunk = word
      } else {
        // Add word to current chunk
        currentChunk = testChunk
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim()) {
      chunks.push(currentChunk)
    }
  }

  return chunks.filter((chunk) => chunk.trim().length > 0)
}

/**
 * Check a single chunk with LanguageTool API
 */
async function checkChunkWithLanguageTool(text: string, language: string) {
  const textSize = new TextEncoder().encode(text).length

  // Pre-check size to avoid unnecessary API calls
  if (textSize > 25000) {
    throw new Error(`Chunk too large (${Math.round(textSize / 1024)}KB) for LanguageTool API`)
  }

    const response = await fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      },
      body: new URLSearchParams({
        text: text,
        language: language,
        enabledOnly: "false",
      }).toString(),
    })

    if (!response.ok) {
    if (response.status === 413) {
      throw new Error(`Chunk too large (${Math.round(textSize / 1024)}KB) for LanguageTool API`)
    }
      throw new Error(`LanguageTool API error: ${response.status}`)
    }

    const data = await response.json()
  return data.matches || []
}
