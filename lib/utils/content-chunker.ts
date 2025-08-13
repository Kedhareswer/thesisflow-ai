/**
 * Enhanced Content Chunking System
 * Implements intelligent content splitting that preserves document structure and context
 */

export interface ChunkingOptions {
    maxChunkSize: number
    overlapSize: number
    preserveStructure: boolean
    respectSentences: boolean
    respectParagraphs: boolean
}

export interface ContentChunk {
    id: string
    content: string
    startIndex: number
    endIndex: number
    chunkNumber: number
    totalChunks: number
    metadata: {
        wordCount: number
        characterCount: number
        hasStructuralElements: boolean
        preservedContext: string[]
    }
}

export interface ChunkingResult {
    chunks: ContentChunk[]
    totalChunks: number
    originalLength: number
    totalProcessedLength: number
    chunkingStrategy: string
    metadata: {
        averageChunkSize: number
        overlapPercentage: number
        structuralElementsPreserved: number
    }
}

export interface ChunkingProgress {
    stage: 'analyzing' | 'chunking' | 'optimizing' | 'complete'
    progress: number
    currentChunk?: number
    totalChunks?: number
    message: string
}

interface StructuralElement {
    type: string
    position: number
    content: string
}

interface DocumentAnalysis {
    hasHeaders: boolean
    hasParagraphs: boolean
    hasSections: boolean
    hasLists: boolean
    hasTables: boolean
    hasCodeBlocks: boolean
    structuralElements: StructuralElement[]
    averageParagraphLength: number
    averageSentenceLength: number
}

export class ContentChunker {
    private static readonly DEFAULT_OPTIONS: ChunkingOptions = {
        maxChunkSize: 3000, // Conservative token limit
        overlapSize: 200,   // Overlap for context preservation
        preserveStructure: true,
        respectSentences: true,
        respectParagraphs: true
    }

    /**
     * Intelligently chunk content while preserving structure and context
     */
    static async chunkContent(
        content: string,
        options: Partial<ChunkingOptions> = {},
        onProgress?: (progress: ChunkingProgress) => void
    ): Promise<ChunkingResult> {
        const opts = { ...this.DEFAULT_OPTIONS, ...options }

        onProgress?.({
            stage: 'analyzing',
            progress: 10,
            message: 'Analyzing document structure...'
        })

        // Analyze document structure
        const analysis = this.analyzeDocumentStructure(content)

        onProgress?.({
            stage: 'chunking',
            progress: 30,
            message: 'Creating intelligent chunks...'
        })

        // Choose chunking strategy based on content analysis
        const strategy = this.selectChunkingStrategy(content, analysis, opts)

        let chunks: ContentChunk[]

        switch (strategy) {
            case 'structural':
                chunks = this.chunkByStructure(content, analysis, opts, onProgress)
                break
            case 'semantic':
                chunks = this.chunkBySemantic(content, opts, onProgress)
                break
            case 'hybrid':
                chunks = this.chunkHybrid(content, analysis, opts, onProgress)
                break
            default:
                chunks = this.chunkBySize(content, opts, onProgress)
        }

        onProgress?.({
            stage: 'optimizing',
            progress: 80,
            message: 'Optimizing chunk boundaries...'
        })

        // Optimize chunk boundaries
        const optimizedChunks = this.optimizeChunkBoundaries(chunks, content, opts)

        onProgress?.({
            stage: 'complete',
            progress: 100,
            message: `Created ${optimizedChunks.length} optimized chunks`
        })

        return {
            chunks: optimizedChunks,
            totalChunks: optimizedChunks.length,
            originalLength: content.length,
            totalProcessedLength: optimizedChunks.reduce((sum, chunk) => sum + chunk.content.length, 0),
            chunkingStrategy: strategy,
            metadata: {
                averageChunkSize: optimizedChunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / optimizedChunks.length,
                overlapPercentage: (opts.overlapSize / opts.maxChunkSize) * 100,
                structuralElementsPreserved: analysis.structuralElements.length
            }
        }
    }

    /**
     * Analyze document structure to inform chunking strategy
     */
    private static analyzeDocumentStructure(content: string): DocumentAnalysis {
        const analysis: DocumentAnalysis = {
            hasHeaders: false,
            hasParagraphs: false,
            hasSections: false,
            hasLists: false,
            hasTables: false,
            hasCodeBlocks: false,
            structuralElements: [] as StructuralElement[],
            averageParagraphLength: 0,
            averageSentenceLength: 0
        }

        // Detect headers (markdown style)
        const headerMatches = content.match(/^#{1,6}\s+.+$/gm)
        if (headerMatches && headerMatches.length > 0) {
            analysis.hasHeaders = true
            headerMatches.forEach((header, index) => {
                const position = content.indexOf(header)
                analysis.structuralElements.push({
                    type: 'header',
                    position,
                    content: header
                })
            })
        }

        // Detect paragraphs
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0)
        if (paragraphs.length > 1) {
            analysis.hasParagraphs = true
            analysis.averageParagraphLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length
        }

        // Detect lists
        const listMatches = content.match(/^[\s]*[-*+]\s+.+$/gm) || content.match(/^[\s]*\d+\.\s+.+$/gm)
        if (listMatches && listMatches.length > 0) {
            analysis.hasLists = true
        }

        // Detect tables (simple markdown tables)
        const tableMatches = content.match(/\|.+\|/g)
        if (tableMatches && tableMatches.length > 2) {
            analysis.hasTables = true
        }

        // Detect code blocks
        const codeBlockMatches = content.match(/```[\s\S]*?```/g) || content.match(/`[^`]+`/g)
        if (codeBlockMatches && codeBlockMatches.length > 0) {
            analysis.hasCodeBlocks = true
        }

        // Calculate average sentence length
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
        if (sentences.length > 0) {
            analysis.averageSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
        }

        return analysis
    }

    /**
     * Select the best chunking strategy based on content analysis
     */
    private static selectChunkingStrategy(content: string, analysis: DocumentAnalysis, options: ChunkingOptions): string {
        // If content is small enough, no chunking needed
        if (content.length <= options.maxChunkSize) {
            return 'none'
        }

        // If document has clear structure, use structural chunking
        if (analysis.hasHeaders && analysis.hasParagraphs && options.preserveStructure) {
            return 'structural'
        }

        // If document has good paragraph structure, use hybrid approach
        if (analysis.hasParagraphs && analysis.averageParagraphLength > 100) {
            return 'hybrid'
        }

        // For academic/research content, try semantic chunking
        if (content.includes('abstract') || content.includes('introduction') || content.includes('conclusion')) {
            return 'semantic'
        }

        // Default to size-based chunking
        return 'size'
    }

    /**
     * Chunk content by document structure (headers, sections)
     */
    private static chunkByStructure(
        content: string,
        analysis: DocumentAnalysis,
        options: ChunkingOptions,
        onProgress?: (progress: ChunkingProgress) => void
    ): ContentChunk[] {
        const chunks: ContentChunk[] = []
        const structuralElements = analysis.structuralElements.sort((a, b) => a.position - b.position)

        let currentChunk = ''
        let chunkStart = 0
        let chunkNumber = 1

        for (let i = 0; i < structuralElements.length; i++) {
            const element = structuralElements[i]
            const nextElement = structuralElements[i + 1]

            // Extract content between structural elements
            const sectionEnd = nextElement ? nextElement.position : content.length
            const sectionContent = content.substring(element.position, sectionEnd)

            // If adding this section would exceed chunk size, finalize current chunk
            if (currentChunk.length + sectionContent.length > options.maxChunkSize && currentChunk.length > 0) {
                chunks.push(this.createChunk(currentChunk, chunkStart, chunkStart + currentChunk.length, chunkNumber, 0))

                // Start new chunk with overlap
                const overlapStart = Math.max(0, currentChunk.length - options.overlapSize)
                currentChunk = currentChunk.substring(overlapStart) + sectionContent
                chunkStart = chunkStart + overlapStart
                chunkNumber++
            } else {
                currentChunk += sectionContent
            }

            onProgress?.({
                stage: 'chunking',
                progress: 30 + (i / structuralElements.length) * 40,
                currentChunk: chunkNumber,
                message: `Processing section ${i + 1} of ${structuralElements.length}...`
            })
        }

        // Add final chunk
        if (currentChunk.length > 0) {
            chunks.push(this.createChunk(currentChunk, chunkStart, chunkStart + currentChunk.length, chunkNumber, 0))
        }

        // Update total chunks for all chunks
        return chunks.map(chunk => ({ ...chunk, totalChunks: chunks.length }))
    }

    /**
     * Chunk content by semantic boundaries (paragraphs, sentences)
     */
    private static chunkBySemantic(
        content: string,
        options: ChunkingOptions,
        onProgress?: (progress: ChunkingProgress) => void
    ): ContentChunk[] {
        const chunks: ContentChunk[] = []
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0)

        let currentChunk = ''
        let chunkStart = 0
        let chunkNumber = 1
        let processedLength = 0

        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i]

            // If adding this paragraph would exceed chunk size
            if (currentChunk.length + paragraph.length > options.maxChunkSize && currentChunk.length > 0) {
                chunks.push(this.createChunk(currentChunk, chunkStart, chunkStart + currentChunk.length, chunkNumber, 0))

                // Start new chunk with overlap
                const sentences = currentChunk.split(/[.!?]+/).filter(s => s.trim().length > 0)
                const overlapSentences = sentences.slice(-2).join('. ') + '. '

                currentChunk = overlapSentences + paragraph
                chunkStart = processedLength - overlapSentences.length
                chunkNumber++
            } else {
                currentChunk += (currentChunk ? '\n\n' : '') + paragraph
            }

            processedLength += paragraph.length + 2 // +2 for paragraph separator

            onProgress?.({
                stage: 'chunking',
                progress: 30 + (i / paragraphs.length) * 40,
                currentChunk: chunkNumber,
                message: `Processing paragraph ${i + 1} of ${paragraphs.length}...`
            })
        }

        // Add final chunk
        if (currentChunk.length > 0) {
            chunks.push(this.createChunk(currentChunk, chunkStart, chunkStart + currentChunk.length, chunkNumber, 0))
        }

        return chunks.map(chunk => ({ ...chunk, totalChunks: chunks.length }))
    }

    /**
     * Hybrid chunking combining structural and semantic approaches
     */
    private static chunkHybrid(
        content: string,
        analysis: DocumentAnalysis,
        options: ChunkingOptions,
        onProgress?: (progress: ChunkingProgress) => void
    ): ContentChunk[] {
        // First try structural chunking
        const structuralChunks = this.chunkByStructure(content, analysis, options)

        // If structural chunks are too large, further split them semantically
        const refinedChunks: ContentChunk[] = []
        let totalRefined = 0

        for (let i = 0; i < structuralChunks.length; i++) {
            const chunk = structuralChunks[i]

            if (chunk.content.length > options.maxChunkSize * 1.2) {
                // Split large chunks semantically
                const subChunks = this.chunkBySemantic(chunk.content, options)
                refinedChunks.push(...subChunks.map((subChunk, index) => ({
                    ...subChunk,
                    id: `${chunk.id}-${index}`,
                    chunkNumber: totalRefined + index + 1
                })))
                totalRefined += subChunks.length
            } else {
                refinedChunks.push({
                    ...chunk,
                    chunkNumber: totalRefined + 1
                })
                totalRefined++
            }

            onProgress?.({
                stage: 'chunking',
                progress: 30 + (i / structuralChunks.length) * 40,
                currentChunk: totalRefined,
                message: `Refining chunk ${i + 1} of ${structuralChunks.length}...`
            })
        }

        return refinedChunks.map(chunk => ({ ...chunk, totalChunks: refinedChunks.length }))
    }

    /**
     * Simple size-based chunking with sentence respect
     */
    private static chunkBySize(
        content: string,
        options: ChunkingOptions,
        onProgress?: (progress: ChunkingProgress) => void
    ): ContentChunk[] {
        const chunks: ContentChunk[] = []
        let currentPosition = 0
        let chunkNumber = 1

        while (currentPosition < content.length) {
            let chunkEnd = Math.min(currentPosition + options.maxChunkSize, content.length)

            // If respecting sentences, adjust chunk boundary
            if (options.respectSentences && chunkEnd < content.length) {
                const nearbyPeriod = content.lastIndexOf('.', chunkEnd)
                const nearbyExclamation = content.lastIndexOf('!', chunkEnd)
                const nearbyQuestion = content.lastIndexOf('?', chunkEnd)

                const lastSentenceEnd = Math.max(nearbyPeriod, nearbyExclamation, nearbyQuestion)

                if (lastSentenceEnd > currentPosition + options.maxChunkSize * 0.7) {
                    chunkEnd = lastSentenceEnd + 1
                }
            }

            const chunkContent = content.substring(currentPosition, chunkEnd)
            chunks.push(this.createChunk(chunkContent, currentPosition, chunkEnd, chunkNumber, 0))

            // Move to next chunk with overlap
            currentPosition = chunkEnd - options.overlapSize
            chunkNumber++

            onProgress?.({
                stage: 'chunking',
                progress: 30 + (currentPosition / content.length) * 40,
                currentChunk: chunkNumber - 1,
                message: `Creating chunk ${chunkNumber - 1}...`
            })
        }

        return chunks.map(chunk => ({ ...chunk, totalChunks: chunks.length }))
    }

    /**
     * Optimize chunk boundaries to improve coherence
     */
    private static optimizeChunkBoundaries(
        chunks: ContentChunk[],
        originalContent: string,
        options: ChunkingOptions
    ): ContentChunk[] {
        const optimizedChunks: ContentChunk[] = []

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i]
            let optimizedContent = chunk.content

            // Ensure chunks don't end mid-sentence
            if (i < chunks.length - 1) { // Not the last chunk
                const lastChar = optimizedContent.trim().slice(-1)
                if (lastChar && !'.!?'.includes(lastChar)) {
                    // Try to extend to next sentence boundary
                    const nextChunk = chunks[i + 1]
                    const combinedContent = optimizedContent + ' ' + nextChunk.content
                    const nextSentenceEnd = combinedContent.search(/[.!?]\s/)

                    if (nextSentenceEnd > optimizedContent.length &&
                        nextSentenceEnd < optimizedContent.length + 100) {
                        optimizedContent = combinedContent.substring(0, nextSentenceEnd + 1)
                    }
                }
            }

            // Add context preservation
            const preservedContext: string[] = []
            if (i > 0) {
                const prevChunk = optimizedChunks[i - 1]
                const lastSentence = prevChunk.content.split(/[.!?]+/).slice(-2, -1)[0]
                if (lastSentence && lastSentence.trim().length > 10) {
                    preservedContext.push(lastSentence.trim())
                }
            }

            optimizedChunks.push({
                ...chunk,
                content: optimizedContent,
                metadata: {
                    ...chunk.metadata,
                    characterCount: optimizedContent.length,
                    wordCount: optimizedContent.split(/\s+/).length,
                    preservedContext
                }
            })
        }

        return optimizedChunks
    }

    /**
     * Create a content chunk with metadata
     */
    private static createChunk(
        content: string,
        startIndex: number,
        endIndex: number,
        chunkNumber: number,
        totalChunks: number
    ): ContentChunk {
        const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
        const hasStructuralElements = /^#{1,6}\s+|^\s*[-*+]\s+|^\s*\d+\.\s+|\|.+\|/.test(content)

        return {
            id: `chunk-${chunkNumber}`,
            content: content.trim(),
            startIndex,
            endIndex,
            chunkNumber,
            totalChunks,
            metadata: {
                wordCount,
                characterCount: content.length,
                hasStructuralElements,
                preservedContext: []
            }
        }
    }

    /**
     * Estimate optimal chunk size based on content characteristics
     */
    static estimateOptimalChunkSize(content: string): number {
        const baseSize = 3000

        // Adjust based on content density
        const avgWordLength = content.replace(/\s+/g, ' ').split(' ').reduce((sum, word) => sum + word.length, 0) / content.split(' ').length
        const densityFactor = avgWordLength > 6 ? 0.8 : 1.2 // Shorter chunks for dense content

        // Adjust based on structure
        const hasStructure = /^#{1,6}\s+|^\s*[-*+]\s+|^\s*\d+\.\s+/.test(content)
        const structureFactor = hasStructure ? 1.3 : 1.0 // Larger chunks for structured content

        return Math.round(baseSize * densityFactor * structureFactor)
    }
}