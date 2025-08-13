/**
 * Chunked Processing System with Progress Tracking
 * Handles processing of large content in chunks with real-time progress updates
 */

import { ContentChunker, type ContentChunk, type ChunkingProgress } from './content-chunker'
import { enhancedAIService } from '@/lib/enhanced-ai-service'

export interface ProcessingProgress {
    stage: 'chunking' | 'processing' | 'synthesizing' | 'complete'
    progress: number
    currentChunk?: number
    totalChunks?: number
    message: string
    estimatedTimeRemaining?: number
    processingSpeed?: number
}

export interface ChunkProcessingResult {
    chunkId: string
    chunkNumber: number
    summary: string
    keyPoints: string[]
    processingTime: number
    tokenUsage?: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
    }
}

export interface SynthesizedResult {
    summary: string
    keyPoints: string[]
    readingTime: number
    processingMethod: 'direct' | 'chunked'
    confidence: number
    warnings: string[]
    suggestions: string[]
    metadata: {
        originalLength: number
        totalChunks: number
        averageChunkSize: number
        totalProcessingTime: number
        chunkingStrategy: string
    }
}

export class ChunkedProcessor {
    private static readonly CHUNK_PROCESSING_TIMEOUT = 30000 // 30 seconds per chunk
    private static readonly MAX_CONCURRENT_CHUNKS = 2 // Process 2 chunks concurrently

    /**
     * Process large content using intelligent chunking with progress tracking
     */
    static async processLargeContent(
        content: string,
        processingType: 'summarize' | 'analyze' | 'extract',
        onProgress?: (progress: ProcessingProgress) => void,
        options: {
            maxChunkSize?: number
            preserveStructure?: boolean
            provider?: string
            model?: string
        } = {}
    ): Promise<SynthesizedResult> {
        const startTime = Date.now()

        // Step 1: Chunk the content
        onProgress?.({
            stage: 'chunking',
            progress: 5,
            message: 'Analyzing content structure...'
        })

        const chunkingResult = await ContentChunker.chunkContent(
            content,
            {
                maxChunkSize: options.maxChunkSize || 3000,
                preserveStructure: options.preserveStructure ?? true,
                overlapSize: 200,
                respectSentences: true,
                respectParagraphs: true
            },
            (chunkingProgress: ChunkingProgress) => {
                onProgress?.({
                    stage: 'chunking',
                    progress: 5 + (chunkingProgress.progress * 0.15), // 5-20% for chunking
                    message: chunkingProgress.message
                })
            }
        )

        const { chunks } = chunkingResult

        // If content is small enough, process directly
        if (chunks.length === 1) {
            onProgress?.({
                stage: 'processing',
                progress: 50,
                message: 'Processing content directly...'
            })

            const result = await this.processSingleChunk(chunks[0], processingType, options)

            onProgress?.({
                stage: 'complete',
                progress: 100,
                message: 'Processing complete'
            })

            return {
                summary: result.summary,
                keyPoints: result.keyPoints,
                readingTime: Math.ceil(content.length / 1000),
                processingMethod: 'direct',
                confidence: 0.95,
                warnings: [],
                suggestions: [],
                metadata: {
                    originalLength: content.length,
                    totalChunks: 1,
                    averageChunkSize: content.length,
                    totalProcessingTime: Date.now() - startTime,
                    chunkingStrategy: 'none'
                }
            }
        }

        // Step 2: Process chunks
        onProgress?.({
            stage: 'processing',
            progress: 20,
            totalChunks: chunks.length,
            message: `Processing ${chunks.length} chunks...`
        })

        const chunkResults = await this.processChunksConcurrently(
            chunks,
            processingType,
            options,
            (chunkIndex: number, processingTime: number) => {
                const progress = 20 + ((chunkIndex + 1) / chunks.length) * 60 // 20-80% for processing
                const avgProcessingTime = processingTime / (chunkIndex + 1)
                const remainingChunks = chunks.length - (chunkIndex + 1)
                const estimatedTimeRemaining = remainingChunks * avgProcessingTime

                onProgress?.({
                    stage: 'processing',
                    progress,
                    currentChunk: chunkIndex + 1,
                    totalChunks: chunks.length,
                    message: `Processed chunk ${chunkIndex + 1} of ${chunks.length}`,
                    estimatedTimeRemaining,
                    processingSpeed: 1000 / avgProcessingTime // chunks per second
                })
            }
        )

        // Step 3: Synthesize results
        onProgress?.({
            stage: 'synthesizing',
            progress: 85,
            message: 'Synthesizing results from all chunks...'
        })

        const synthesizedResult = await this.synthesizeChunkResults(
            chunkResults,
            content,
            chunkingResult
        )

        onProgress?.({
            stage: 'complete',
            progress: 100,
            message: `Successfully processed ${chunks.length} chunks`
        })

        return {
            ...synthesizedResult,
            metadata: {
                ...synthesizedResult.metadata,
                totalProcessingTime: Date.now() - startTime
            }
        }
    }

    /**
     * Process chunks concurrently with rate limiting
     */
    private static async processChunksConcurrently(
        chunks: ContentChunk[],
        processingType: 'summarize' | 'analyze' | 'extract',
        options: any,
        onChunkComplete: (chunkIndex: number, totalProcessingTime: number) => void
    ): Promise<ChunkProcessingResult[]> {
        const results: ChunkProcessingResult[] = []
        const startTime = Date.now()

        // Process chunks in batches to avoid overwhelming the API
        for (let i = 0; i < chunks.length; i += this.MAX_CONCURRENT_CHUNKS) {
            const batch = chunks.slice(i, i + this.MAX_CONCURRENT_CHUNKS)

            const batchPromises = batch.map(async (chunk, batchIndex) => {
                const chunkStartTime = Date.now()

                try {
                    const result = await Promise.race([
                        this.processSingleChunk(chunk, processingType, options),
                        new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error('Chunk processing timeout')), this.CHUNK_PROCESSING_TIMEOUT)
                        )
                    ])

                    const processingTime = Date.now() - chunkStartTime

                    return {
                        chunkId: chunk.id,
                        chunkNumber: chunk.chunkNumber,
                        summary: result.summary,
                        keyPoints: result.keyPoints,
                        processingTime,
                        tokenUsage: result.tokenUsage
                    }
                } catch (error) {
                    console.warn(`Failed to process chunk ${chunk.chunkNumber}:`, error)

                    // Return a fallback result for failed chunks
                    return {
                        chunkId: chunk.id,
                        chunkNumber: chunk.chunkNumber,
                        summary: `[Chunk ${chunk.chunkNumber} processing failed: ${error instanceof Error ? error.message : 'Unknown error'}]`,
                        keyPoints: [`Processing failed for chunk ${chunk.chunkNumber}`],
                        processingTime: Date.now() - chunkStartTime
                    }
                }
            })

            const batchResults = await Promise.all(batchPromises)
            results.push(...batchResults)

            // Update progress after each batch
            const totalProcessingTime = Date.now() - startTime
            onChunkComplete(i + batch.length - 1, totalProcessingTime)

            // Add delay between batches to avoid rate limiting
            if (i + this.MAX_CONCURRENT_CHUNKS < chunks.length) {
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }

        return results.sort((a, b) => a.chunkNumber - b.chunkNumber)
    }

    /**
     * Process a single chunk
     */
    private static async processSingleChunk(
        chunk: ContentChunk,
        processingType: 'summarize' | 'analyze' | 'extract',
        options: any
    ): Promise<{
        summary: string
        keyPoints: string[]
        tokenUsage?: any
    }> {
        let prompt: string

        switch (processingType) {
            case 'summarize':
                prompt = this.createSummarizationPrompt(chunk)
                break
            case 'analyze':
                prompt = this.createAnalysisPrompt(chunk)
                break
            case 'extract':
                prompt = this.createExtractionPrompt(chunk)
                break
            default:
                throw new Error(`Unknown processing type: ${processingType}`)
        }

        const result = await enhancedAIService.generateText({
            prompt,
            maxTokens: 800,
            temperature: 0.7,
            provider: options.provider,
            model: options.model
        })

        if (!result.success) {
            throw new Error(result.error || 'AI processing failed')
        }

        return this.parseChunkResult(result.content || '', chunk)
    }

    /**
     * Create summarization prompt for a chunk
     */
    private static createSummarizationPrompt(chunk: ContentChunk): string {
        const contextInfo = chunk.metadata.preservedContext.length > 0
            ? `\n\nContext from previous section: ${chunk.metadata.preservedContext.join(' ')}`
            : ''

        return `Summarize this section (part ${chunk.chunkNumber} of ${chunk.totalChunks}) of a larger document. Focus on the main points and key information.${contextInfo}

Content to summarize:
${chunk.content}

Provide:
1. A concise summary (2-3 sentences)
2. Key points (3-5 bullet points)

Format:
SUMMARY: [Your summary here]

KEY_POINTS:
- [Point 1]
- [Point 2]
- [Point 3]`
    }

    /**
     * Create analysis prompt for a chunk
     */
    private static createAnalysisPrompt(chunk: ContentChunk): string {
        return `Analyze this section (part ${chunk.chunkNumber} of ${chunk.totalChunks}) for key insights and important information.

Content:
${chunk.content}

Provide:
1. Main themes and concepts
2. Important details and findings
3. Relationships and connections

Format:
ANALYSIS: [Your analysis here]

KEY_INSIGHTS:
- [Insight 1]
- [Insight 2]
- [Insight 3]`
    }

    /**
     * Create extraction prompt for a chunk
     */
    private static createExtractionPrompt(chunk: ContentChunk): string {
        return `Extract the most important information from this section (part ${chunk.chunkNumber} of ${chunk.totalChunks}).

Content:
${chunk.content}

Extract:
1. Key facts and data
2. Important names, dates, and numbers
3. Critical concepts and definitions

Format:
EXTRACTED_INFO: [Key information here]

IMPORTANT_DETAILS:
- [Detail 1]
- [Detail 2]
- [Detail 3]`
    }

    /**
     * Parse the result from chunk processing
     */
    private static parseChunkResult(content: string, chunk: ContentChunk): {
        summary: string
        keyPoints: string[]
    } {
        let summary = ''
        let keyPoints: string[] = []

        // Extract summary
        const summaryMatch = content.match(/(?:SUMMARY|ANALYSIS|EXTRACTED_INFO):\s*([\s\S]*?)(?:\n\n|KEY_|$)/)
        if (summaryMatch) {
            summary = summaryMatch[1].trim()
        }

        // Extract key points
        const keyPointsMatch = content.match(/(?:KEY_POINTS|KEY_INSIGHTS|IMPORTANT_DETAILS):\s*([\s\S]*?)$/)
        if (keyPointsMatch) {
            const pointsText = keyPointsMatch[1].trim()
            keyPoints = pointsText
                .split(/\n/)
                .map(line => line.replace(/^[-*+]\s*/, '').trim())
                .filter(point => point.length > 0)
                .slice(0, 5) // Limit to 5 points per chunk
        }

        // Fallback if parsing fails
        if (!summary && !keyPoints.length) {
            const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
            summary = sentences.slice(0, 2).join('. ') + '.'
            keyPoints = sentences.slice(2, 5).map(s => s.trim())
        }

        return { summary, keyPoints }
    }

    /**
     * Synthesize results from all chunks into a coherent final result
     */
    private static async synthesizeChunkResults(
        chunkResults: ChunkProcessingResult[],
        originalContent: string,
        chunkingResult: any
    ): Promise<SynthesizedResult> {
        // Combine all summaries and key points
        const allSummaries = chunkResults.map(r => r.summary).filter(s => s && !s.includes('processing failed'))
        const allKeyPoints = chunkResults.flatMap(r => r.keyPoints).filter(p => p && !p.includes('processing failed'))

        // Create final synthesis prompt
        const synthesisPrompt = `Synthesize the following summaries from ${chunkResults.length} sections of a document into one coherent summary:

${allSummaries.map((summary, index) => `Section ${index + 1}: ${summary}`).join('\n\n')}

All key points identified:
${allKeyPoints.map(point => `- ${point}`).join('\n')}

Create:
1. A comprehensive summary that combines all sections coherently
2. The 5 most important key points from across all sections

Format:
FINAL_SUMMARY: [Comprehensive summary here]

TOP_KEY_POINTS:
- [Most important point 1]
- [Most important point 2]
- [Most important point 3]
- [Most important point 4]
- [Most important point 5]`

        try {
            const synthesisResult = await enhancedAIService.generateText({
                prompt: synthesisPrompt,
                maxTokens: 1000,
                temperature: 0.5 // Lower temperature for more consistent synthesis
            })

            if (synthesisResult.success && synthesisResult.content) {
                const parsed = this.parseChunkResult(synthesisResult.content, chunkResults[0] as any)

                return {
                    summary: parsed.summary || allSummaries.join(' '),
                    keyPoints: parsed.keyPoints.length > 0 ? parsed.keyPoints : allKeyPoints.slice(0, 5),
                    readingTime: Math.ceil(originalContent.length / 1000),
                    processingMethod: 'chunked',
                    confidence: this.calculateConfidence(chunkResults),
                    warnings: this.generateWarnings(chunkResults),
                    suggestions: this.generateSuggestions(chunkResults, originalContent),
                    metadata: {
                        originalLength: originalContent.length,
                        totalChunks: chunkResults.length,
                        averageChunkSize: chunkingResult.metadata.averageChunkSize,
                        totalProcessingTime: 0, // Will be set by caller
                        chunkingStrategy: chunkingResult.chunkingStrategy
                    }
                }
            }
        } catch (error) {
            console.warn('Synthesis failed, using direct combination:', error)
        }

        // Fallback: direct combination
        return {
            summary: allSummaries.join(' '),
            keyPoints: allKeyPoints.slice(0, 5),
            readingTime: Math.ceil(originalContent.length / 1000),
            processingMethod: 'chunked',
            confidence: this.calculateConfidence(chunkResults),
            warnings: this.generateWarnings(chunkResults),
            suggestions: this.generateSuggestions(chunkResults, originalContent),
            metadata: {
                originalLength: originalContent.length,
                totalChunks: chunkResults.length,
                averageChunkSize: chunkingResult.metadata.averageChunkSize,
                totalProcessingTime: 0,
                chunkingStrategy: chunkingResult.chunkingStrategy
            }
        }
    }

    /**
     * Calculate confidence score based on chunk processing results
     */
    private static calculateConfidence(chunkResults: ChunkProcessingResult[]): number {
        const successfulChunks = chunkResults.filter(r => !r.summary.includes('processing failed')).length
        const totalChunks = chunkResults.length

        const successRate = successfulChunks / totalChunks
        const avgProcessingTime = chunkResults.reduce((sum, r) => sum + r.processingTime, 0) / totalChunks

        // Lower confidence for very fast processing (might indicate errors)
        const timeConfidence = avgProcessingTime > 1000 ? 1.0 : 0.8

        return Math.round((successRate * timeConfidence) * 100) / 100
    }

    /**
     * Generate warnings based on processing results
     */
    private static generateWarnings(chunkResults: ChunkProcessingResult[]): string[] {
        const warnings: string[] = []

        const failedChunks = chunkResults.filter(r => r.summary.includes('processing failed')).length
        if (failedChunks > 0) {
            warnings.push(`${failedChunks} chunk(s) failed to process completely`)
        }

        const avgProcessingTime = chunkResults.reduce((sum, r) => sum + r.processingTime, 0) / chunkResults.length
        if (avgProcessingTime < 500) {
            warnings.push('Processing was unusually fast - results may be incomplete')
        }

        if (chunkResults.length > 10) {
            warnings.push('Large document processed in many chunks - some context may be lost')
        }

        return warnings
    }

    /**
     * Generate suggestions for improving results
     */
    private static generateSuggestions(chunkResults: ChunkProcessingResult[], originalContent: string): string[] {
        const suggestions: string[] = []

        if (chunkResults.length > 5) {
            suggestions.push('Consider using a more powerful AI model for better context handling')
        }

        if (originalContent.length > 20000) {
            suggestions.push('For very large documents, consider pre-processing to extract key sections')
        }

        const failedChunks = chunkResults.filter(r => r.summary.includes('processing failed')).length
        if (failedChunks > 0) {
            suggestions.push('Try again with a different AI provider if some chunks failed')
        }

        return suggestions
    }
}