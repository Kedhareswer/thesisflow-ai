/**
 * Real Plagiarism Detection Service
 * Implements multiple algorithms for accurate plagiarism detection
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { OpenAI } from 'openai'
import { supabase } from '@/integrations/supabase/client'

export interface PlagiarismResult {
  is_plagiarized: boolean
  overall_similarity: number
  matches: MatchDetail[]
  suspicious_sections: SuspiciousSection[]
  fingerprint: string
  analysis_details: AnalysisDetails
  sources_checked: string[]
  external_sources: ExternalSource[]
  semantic_analysis?: SemanticAnalysis
  timestamp: string
  check_id?: string
  confidence_score: number
}

export interface ExternalSource {
  url: string
  title: string
  snippet: string
  similarity: number
  domain: string
  date?: string
  type: 'web' | 'academic' | 'news' | 'social'
}

export interface SemanticAnalysis {
  embedding_similarity: number
  semantic_matches: SemanticMatch[]
  paraphrase_probability: number
}

export interface SemanticMatch {
  original_text: string
  matched_text: string
  similarity_score: number
  source_url?: string
}

interface MatchDetail {
  text: string
  similarity: number
  type: 'exact' | 'near_duplicate' | 'paraphrase' | 'citation'
  source?: string
  position: { start: number; end: number }
}

interface SuspiciousSection {
  text: string
  reason: string
  severity: 'high' | 'medium' | 'low'
  suggestions: string[]
}

interface AnalysisDetails {
  total_words: number
  unique_phrases: number
  common_phrases_detected: number
  citation_patterns_found: number
  fingerprint_matches: number
  algorithms_used: string[]
}

export class PlagiarismDetectorService {
  private readonly SHINGLE_SIZE = 5
  private readonly SIMILARITY_THRESHOLD = 0.3
  private readonly HIGH_SIMILARITY_THRESHOLD = 0.6
  private readonly MIN_MATCH_LENGTH = 30
  private readonly CACHE_DURATION_HOURS = 24
  private readonly MAX_CONCURRENT_SEARCHES = 5
  private readonly SEARCH_CHUNK_SIZE = 150 // words per search query
  
  private openai: OpenAI | null = null
  private searchCache = new Map<string, any>()
  
  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    }
  }

  /**
   * Main plagiarism detection method
   */
  async detectPlagiarism(text: string, options: { 
    checkExternal?: boolean
    useSemanticAnalysis?: boolean
    userId?: string
    documentId?: string
  } = {}): Promise<PlagiarismResult> {
    const startTime = Date.now()
    const checkId = await this.generateCheckId(text)
    
    // Check cache first
    const cachedResult = await this.getCachedResult(checkId)
    if (cachedResult && !options.checkExternal) {
      return cachedResult
    }
    
    const fingerprint = await this.generateFingerprint(text)

    // Run multiple detection algorithms in parallel
    const [shingleAnalysis, phraseMatches, structuralAnalysis, citationAnalysis, sourceMatches] = await Promise.all([
      this.shingleBasedDetection(text),
      this.detectPhrasePlagiarism(text),
      this.analyzeTextStructure(text),
      this.detectCitationPatterns(text),
      this.checkAgainstKnownSources(text)
    ])
    
    // Check external sources if enabled
    let externalSources: ExternalSource[] = []
    let semanticAnalysis: SemanticAnalysis | undefined
    
    if (options.checkExternal !== false) {
      externalSources = await this.checkExternalSources(text)
    }
    
    if (options.useSemanticAnalysis && this.openai) {
      semanticAnalysis = await this.performSemanticAnalysis(text, externalSources)
    }
    
    // Combine all matches
    const allMatches: MatchDetail[] = [
      ...shingleAnalysis.matches,
      ...phraseMatches.matches,
      ...sourceMatches
    ]
    
    // Find suspicious sections
    const suspiciousSections = this.identifySuspiciousSections(text, allMatches)
    
    // Calculate overall similarity including external sources
    const externalSimilarity = externalSources.length > 0 
      ? Math.max(...externalSources.map(s => s.similarity)) 
      : 0
    
    const overallSimilarity = this.calculateOverallSimilarity({
      shingle: shingleAnalysis.similarity,
      phrase: phraseMatches.similarity,
      structural: structuralAnalysis.suspicionScore,
      citation: citationAnalysis.citationScore,
      source: sourceMatches.length > 0 ? Math.max(...sourceMatches.map(m => m.similarity)) : 0,
      external: externalSimilarity,
      semantic: semanticAnalysis?.embedding_similarity || 0
    })
    
    // Calculate confidence score based on multiple factors
    const confidenceScore = this.calculateConfidenceScore({
      numberOfAlgorithmsTriggered: [
        shingleAnalysis.similarity > 0.2,
        phraseMatches.similarity > 0.2,
        sourceMatches.length > 0
      ].filter(Boolean).length,
      externalSourcesFound: externalSources.length,
      semanticAnalysisPerformed: !!semanticAnalysis,
      textLength: text.split(/\s+/).length
    })

    // Determine if plagiarized
    const isPlagiarized = overallSimilarity >= this.SIMILARITY_THRESHOLD ||
                          allMatches.some(m => m.type === 'exact' && m.similarity > 0.8)
    const result: PlagiarismResult = {
      is_plagiarized: isPlagiarized,
      overall_similarity: Math.round(overallSimilarity * 100),
      matches: allMatches,
      suspicious_sections: suspiciousSections,
      fingerprint,
      analysis_details: {
        total_words: text.split(/\s+/).length,
        unique_phrases: new Set(text.split(/[.!?]/)).size,
        common_phrases_detected: structuralAnalysis.commonPhrases,
        citation_patterns_found: citationAnalysis.citationCount,
        fingerprint_matches: shingleAnalysis.matches.length,
        algorithms_used: [
          'shingle_based',
          'phrase_matching',
          'structural_analysis',
          'citation_detection',
          'source_comparison',
          ...(externalSources.length > 0 ? ['external_search'] : []),
          ...(semanticAnalysis ? ['semantic_analysis'] : [])
        ]
      },
      sources_checked: [
        ...this.KNOWN_SOURCES.map(s => s.source),
        ...externalSources.map(s => s.domain)
      ],
      external_sources: externalSources,
      semantic_analysis: semanticAnalysis,
      timestamp: new Date().toISOString(),
      check_id: checkId,
      confidence_score: confidenceScore
    }
    
    // Cache the result
    await this.cacheResult(checkId, result, options.userId)

    return result
  }

  /**
   * Generate document fingerprint using Web Crypto API
   */
  private async generateFingerprint(text: string): Promise<string> {
    const words = text.toLowerCase().split(/\s+/)
    const uniqueWords = [...new Set(words)].sort()
    const encoder = new TextEncoder()
    const data = encoder.encode(uniqueWords.join(''))
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12)
  }

  /**
   * Shingle-based plagiarism detection
   */
  private shingleBasedDetection(text: string): { similarity: number; matches: MatchDetail[] } {
    const textShingles = this.generateShingles(text)
    const matches: MatchDetail[] = []
    let maxSimilarity = 0
    
    // Compare with known sources
    for (const source of this.KNOWN_SOURCES) {
      const sourceShingles = this.generateShingles(source.text)
      const similarity = this.jaccardSimilarity(textShingles, sourceShingles)
      
      if (similarity > 0.2) {
        // Find matching sections
        const matchingSections = this.findMatchingSections(text, source.text, textShingles, sourceShingles)
        matches.push(...matchingSections.map(section => ({
          ...section,
          source: source.source,
          similarity
        })))
        maxSimilarity = Math.max(maxSimilarity, similarity)
      }
    }
    
    return { similarity: maxSimilarity, matches }
  }

  /**
   * Generate k-shingles from text
   */
  private generateShingles(text: string): Set<string> {
    const normalized = text.toLowerCase().replace(/[^\w\s]/g, '')
    const words = normalized.split(/\s+/)
    const shingles = new Set<string>()
    
    for (let i = 0; i <= words.length - this.SHINGLE_SIZE; i++) {
      const shingle = words.slice(i, i + this.SHINGLE_SIZE).join(' ')
      shingles.add(shingle)
    }
    
    return shingles
  }

  /**
   * Calculate Jaccard similarity between two sets
   */
  private jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    return union.size > 0 ? intersection.size / union.size : 0
  }

  /**
   * Find matching text sections
   */
  private findMatchingSections(
    text1: string,
    text2: string,
    shingles1: Set<string>,
    shingles2: Set<string>
  ): MatchDetail[] {
    const matches: MatchDetail[] = []
    const words1 = text1.split(/\s+/)
    
    // Find common shingles
    const commonShingles = [...shingles1].filter(s => shingles2.has(s))
    
    for (const shingle of commonShingles.slice(0, 5)) { // Top 5 matches
      const shingleWords = shingle.split(' ')
      const position = this.findTextPosition(words1, shingleWords)
      
      if (position !== -1) {
        const matchText = words1.slice(position, position + shingleWords.length + 5).join(' ')
        matches.push({
          text: matchText.substring(0, 100) + (matchText.length > 100 ? '...' : ''),
          similarity: 0.8,
          type: 'near_duplicate',
          position: {
            start: position,
            end: position + shingleWords.length
          }
        })
      }
    }
    
    return matches
  }

  /**
   * Detect phrase-level plagiarism
   */
  private detectPhrasePlagiarism(text: string): { similarity: number; matches: MatchDetail[] } {
    const matches: MatchDetail[] = []
    const sentences = text.match(/[^.!?]+[.!?]+/g) || []
    let maxSimilarity = 0
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim()
      if (trimmed.length < this.MIN_MATCH_LENGTH) continue
      
      // Check against known sources
      for (const source of this.KNOWN_SOURCES) {
        if (source.text.includes(trimmed)) {
          matches.push({
            text: trimmed,
            similarity: 1.0,
            type: 'exact',
            source: source.source,
            position: { start: text.indexOf(trimmed), end: text.indexOf(trimmed) + trimmed.length }
          })
          maxSimilarity = 1.0
        }
      }
      
      // Check for near duplicates
      const words = trimmed.split(/\s+/)
      if (words.length > 7) {
        const firstWords = words.slice(0, 7).join(' ').toLowerCase()
        if (!this.isCommonPhrase(firstWords)) {
          for (const source of this.KNOWN_SOURCES) {
            if (source.text.toLowerCase().includes(firstWords)) {
              matches.push({
                text: trimmed,
                similarity: 0.7,
                type: 'near_duplicate',
                source: source.source,
                position: { start: text.indexOf(trimmed), end: text.indexOf(trimmed) + trimmed.length }
              })
              maxSimilarity = Math.max(maxSimilarity, 0.7)
            }
          }
        }
      }
    }
    
    return { similarity: maxSimilarity, matches }
  }
  
  private detectPhrasePlagiarismOriginal(text: string): MatchDetail[] {
    const matches: MatchDetail[] = []
    const sentences = text.match(/[^.!?]+[.!?]+/g) || []
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim()
      
      // Check for exact matches in known sources
      for (const source of this.KNOWN_SOURCES) {
        if (source.text.includes(sentence) && sentence.length > 30) {
          matches.push({
            text: sentence.substring(0, 100),
            similarity: 1.0,
            type: 'exact',
            source: source.source,
            position: {
              start: text.indexOf(sentence),
              end: text.indexOf(sentence) + sentence.length
            }
          })
        }
      }
      
      // Check for near-duplicate phrases
      const words = sentence.toLowerCase().split(/\s+/)
      if (words.length >= 7) {
        const phrase = words.slice(0, 7).join(' ')
        for (const source of this.KNOWN_SOURCES) {
          if (source.text.toLowerCase().includes(phrase) && 
              !this.isCommonPhrase(phrase)) {
            matches.push({
              text: sentence.substring(0, 100),
              similarity: 0.7,
              type: 'near_duplicate',
              source: source.source,
              position: {
                start: text.indexOf(sentence),
                end: text.indexOf(sentence) + sentence.length
              }
            })
            break
          }
        }
      }
    }
    
    return matches
  }

  /**
   * Analyze text structure for plagiarism patterns
   */
  private analyzeTextStructure(text: string): {
    suspicionScore: number
    uniquePhrases: number
    commonPhrases: number
  } {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || []
    const paragraphs = text.split(/\n\n+/)
    
    // Calculate structural metrics
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length
    const sentenceLengthVariance = this.calculateVariance(sentences.map(s => s.split(/\s+/).length))
    
    // Check for uniform structure (suspicious)
    const uniformStructure = sentenceLengthVariance < 5
    const repetitiveStarts = this.checkRepetitiveStarts(sentences)
    
    // Count unique n-grams
    const ngrams = new Set<string>()
    const words = text.toLowerCase().split(/\s+/)
    for (let i = 0; i < words.length - 2; i++) {
      ngrams.add(words.slice(i, i + 3).join(' '))
    }
    
    // Count common phrases
    let commonPhrases = 0
    for (const phrase of this.COMMON_PHRASES) {
      if (text.toLowerCase().includes(phrase)) {
        commonPhrases++
      }
    }
    
    // Calculate suspicion score
    let suspicionScore = 0
    if (uniformStructure) suspicionScore += 0.1
    if (repetitiveStarts > 0.3) suspicionScore += 0.1
    if (ngrams.size < words.length * 0.5) suspicionScore += 0.1
    
    return {
      suspicionScore,
      uniquePhrases: ngrams.size,
      commonPhrases
    }
  }

  /**
   * Detect citation patterns
   */
  private detectCitationPatterns(text: string): { citationCount: number; citationScore: number; patterns: string[] } {
    const citationPatterns = [
      /\([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)*,?\s+\d{4}\)/g, // (Author, 2024)
      /\[[0-9]+\]/g, // [1]
      /\([0-9]+\)/g, // (1)
      /[A-Z][a-z]+\s+et\s+al\.\s+\(\d{4}\)/g, // Smith et al. (2024)
      /[A-Z][a-z]+\s+\(\d{4}\)/g // Author (2024)
    ]
    
    let citationCount = 0
    const foundPatterns: string[] = []
    
    for (const pattern of citationPatterns) {
      const matches = text.match(pattern)
      if (matches) {
        citationCount += matches.length
        foundPatterns.push(...matches.slice(0, 3))
      }
    }
    
    return {
      citationCount,
      citationScore: Math.min(citationCount / 20, 1.0), // Normalize to 0-1
      patterns: foundPatterns
    }
  }

  /**
   * Check against known sources
   */
  private checkAgainstKnownSources(text: string): MatchDetail[] {
    const matches: MatchDetail[] = []
    const textLower = text.toLowerCase()
    const textWords = textLower.split(/\s+/)
    
    for (const source of this.KNOWN_SOURCES) {
      const sourceLower = source.text.toLowerCase()
      const sourceWords = sourceLower.split(/\s+/)
      
      // Check for substantial overlaps (10+ consecutive words)
      for (let i = 0; i < textWords.length - 10; i++) {
        const segment = textWords.slice(i, i + 10).join(' ')
        if (sourceLower.includes(segment)) {
          // Find the full matching sentence
          const sentenceStart = text.lastIndexOf('.', text.toLowerCase().indexOf(segment))
          const sentenceEnd = text.indexOf('.', text.toLowerCase().indexOf(segment))
          const fullSentence = text.substring(
            sentenceStart > 0 ? sentenceStart + 1 : 0,
            sentenceEnd > 0 ? sentenceEnd + 1 : text.length
          ).trim()
          
          matches.push({
            text: fullSentence.substring(0, 150) + (fullSentence.length > 150 ? '...' : ''),
            similarity: 0.9,
            type: 'exact',
            source: source.source,
            position: {
              start: sentenceStart > 0 ? sentenceStart + 1 : 0,
              end: sentenceEnd > 0 ? sentenceEnd + 1 : text.length
            }
          })
        }
      }
      
      // Check for paraphrasing using n-gram similarity
      const similarity = this.calculateNGramSimilarity(textWords, sourceWords, 3)
      if (similarity > 0.4) {
        matches.push({
          text: 'Multiple sections show high similarity',
          similarity: similarity,
          type: 'paraphrase',
          source: source.source,
          position: { start: 0, end: 100 }
        })
      }
    }
    
    return matches
  }

  /**
   * Identify suspicious sections
   */
  private identifySuspiciousSections(text: string, matches: MatchDetail[]): SuspiciousSection[] {
    const sections: SuspiciousSection[] = []
    
    // Group matches by position
    const highSeverityMatches = matches.filter(m => m.similarity > 0.7)
    
    for (const match of highSeverityMatches.slice(0, 3)) {
      sections.push({
        text: match.text,
        reason: this.getReasonForMatch(match),
        severity: match.similarity > 0.8 ? 'high' : 'medium',
        suggestions: this.getSuggestionsForMatch(match)
      })
    }
    
    // Check for sections without citations
    const sentences = text.match(/[^.!?]+[.!?]+/g) || []
    const factsWithoutCitations = sentences.filter(s => 
      this.looksLikeFactualClaim(s) && !this.hasCitation(s)
    )
    
    if (factsWithoutCitations.length > 0) {
      sections.push({
        text: factsWithoutCitations[0].substring(0, 100),
        reason: 'Factual claim without citation',
        severity: 'low',
        suggestions: [
          'Add a citation to support this claim',
          'Rephrase as your own analysis',
          'Include the source reference'
        ]
      })
    }
    
    return sections
  }

  /**
   * Helper: Calculate overall similarity
   */
  private calculateOverallSimilarity(scores: {
    shingle: number
    phrase: number
    structural: number
    citation: number
    source: number
    external: number
    semantic: number
  }): number {
    // Dynamic weighted average based on available data
    const weights: Record<string, number> = {
      shingle: 0.20,
      phrase: 0.25,
      structural: 0.05,
      citation: 0.05,
      source: 0.20,
      external: 0.15,
      semantic: 0.10
    }
    
    // Adjust weights if external sources found
    if (scores.external > 0.5) {
      weights.external = 0.30
      weights.source = 0.15
      weights.shingle = 0.15
    }
    
    // Normalize weights
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
    Object.keys(weights).forEach(key => {
      weights[key] /= totalWeight
    })

    const weightedSum = Object.keys(scores).reduce((sum, key) => {
      return sum + (scores[key as keyof typeof scores] * (weights[key] || 0))
    }, 0)

    return Math.min(weightedSum, 1.0)
  }

  /**
   * Helper: Calculate confidence score
   */
  /**
   * Check external sources using web search APIs
   */
  private async checkExternalSources(text: string): Promise<ExternalSource[]> {
    const sources: ExternalSource[] = []
    const chunks = this.extractSearchableChunks(text)
    
    // Process chunks in batches
    const batchSize = this.MAX_CONCURRENT_SEARCHES
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(chunk => this.searchWebForChunk(chunk))
      )
      
      for (const results of batchResults) {
        sources.push(...results)
      }
    }
    
    // Deduplicate and sort by similarity
    const uniqueSources = this.deduplicateSources(sources)
    return uniqueSources.sort((a, b) => b.similarity - a.similarity).slice(0, 10)
  }
  
  /**
   * Extract searchable chunks from text
   */
  private extractSearchableChunks(text: string): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || []
    const chunks: string[] = []
    
    // Get longest sentences first (more likely to be unique)
    const sortedSentences = sentences
      .filter(s => s.trim().split(/\s+/).length > 10)
      .sort((a, b) => b.length - a.length)
      .slice(0, 5)
    
    for (const sentence of sortedSentences) {
      const words = sentence.trim().split(/\s+/)
      if (words.length > this.SEARCH_CHUNK_SIZE) {
        // Break into smaller chunks
        for (let i = 0; i < words.length; i += this.SEARCH_CHUNK_SIZE) {
          chunks.push(words.slice(i, i + this.SEARCH_CHUNK_SIZE).join(' '))
        }
      } else {
        chunks.push(sentence.trim())
      }
    }
    
    return chunks.slice(0, 10) // Limit to 10 chunks
  }
  
  /**
   * Search web for a specific chunk
   */
  private async searchWebForChunk(chunk: string): Promise<ExternalSource[]> {
    const sources: ExternalSource[] = []
    
    try {
      // Use multiple search providers
      const searchPromises = []
      
      // Google Custom Search API
      if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CSE_ID) {
        searchPromises.push(this.searchGoogle(chunk))
      }
      
      // Bing Search API
      if (process.env.BING_API_KEY) {
        searchPromises.push(this.bingSearch(chunk))
      }
      
      // Free fallback: DuckDuckGo (no API key required)
      searchPromises.push(this.duckDuckGoSearch(chunk))
      
      const results = await Promise.allSettled(searchPromises)
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          sources.push(...result.value)
        }
      }
    } catch (error) {
      console.error('Error searching web for chunk:', error)
    }
    
    return sources
  }
  
  /**
   * Google Custom Search
   */
  private async searchGoogle(query: string): Promise<ExternalSource[]> {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY
    const cx = process.env.GOOGLE_SEARCH_CSE_ID
    if (!apiKey || !cx) {
      console.warn('Google Search API credentials not configured. Please check GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CSE_ID in .env.local')
      return []
    }
    
    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: cx,
          q: `"${query}"`, // Exact match search
          num: 3
        },
        timeout: 5000
      })
      
      return response.data.items?.map((item: any) => ({
        url: item.link,
        title: item.title,
        snippet: item.snippet,
        similarity: this.calculateTextSimilarity(query, item.snippet || ''),
        domain: new URL(item.link).hostname,
        type: 'web' as const
      })) || []
    } catch (error) {
      console.error('Google search error:', error)
      return []
    }
  }
  
  /**
   * Bing Search
   */
  private async bingSearch(query: string): Promise<ExternalSource[]> {
    if (!process.env.BING_API_KEY) {
      return []
    }
    
    try {
      const response = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
        params: {
          q: `"${query}"`,
          count: 3
        },
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY
        },
        timeout: 5000
      })
      
      return response.data.webPages?.value?.map((item: any) => ({
        url: item.url,
        title: item.name,
        snippet: item.snippet,
        similarity: this.calculateTextSimilarity(query, item.snippet || ''),
        domain: new URL(item.url).hostname,
        date: item.dateLastCrawled,
        type: 'web' as const
      })) || []
    } catch (error) {
      console.error('Bing search error:', error)
      return []
    }
  }
  
  /**
   * DuckDuckGo Search (free, no API key)
   */
  private async duckDuckGoSearch(query: string): Promise<ExternalSource[]> {
    try {
      // Using DuckDuckGo HTML search (no official API)
      const response = await axios.get('https://html.duckduckgo.com/html/', {
        params: {
          q: `"${query.slice(0, 100)}"`, // Limit query length
          s: '0',
          dc: '1',
          v: 'l',
          o: 'json'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 5000
      })
      
      const $ = cheerio.load(response.data)
      const results: ExternalSource[] = []
      
      $('.result').slice(0, 3).each((i, elem) => {
        const $elem = $(elem)
        const url = $elem.find('.result__url').attr('href')
        const title = $elem.find('.result__title').text().trim()
        const snippet = $elem.find('.result__snippet').text().trim()
        
        if (url) {
          results.push({
            url,
            title: title || 'No title',
            snippet: snippet || '',
            similarity: this.calculateTextSimilarity(query, snippet),
            domain: url.includes('://') ? new URL(url).hostname : url.split('/')[0],
            type: 'web'
          })
        }
      })
      
      return results
    } catch (error) {
      console.error('DuckDuckGo search error:', error)
      return []
    }
  }
  
  /**
   * Perform semantic analysis using OpenAI embeddings
   */
  private async performSemanticAnalysis(
    text: string,
    externalSources: ExternalSource[]
  ): Promise<SemanticAnalysis | undefined> {
    if (!this.openai) {
      return undefined
    }
    
    try {
      // Get embedding for the input text
      const textEmbedding = await this.getEmbedding(text)
      
      // Get embeddings for external sources
      const sourceEmbeddings = await Promise.all(
        externalSources.slice(0, 5).map(async source => ({
          source,
          embedding: await this.getEmbedding(source.snippet)
        }))
      )
      
      // Calculate semantic similarities
      const semanticMatches: SemanticMatch[] = []
      let maxSimilarity = 0
      
      for (const { source, embedding } of sourceEmbeddings) {
        if (embedding) {
          const similarity = this.cosineSimilarity(textEmbedding!, embedding)
          maxSimilarity = Math.max(maxSimilarity, similarity)
          
          if (similarity > 0.7) {
            semanticMatches.push({
              original_text: text.slice(0, 200),
              matched_text: source.snippet,
              similarity_score: similarity,
              source_url: source.url
            })
          }
        }
      }
      
      // Calculate paraphrase probability
      const paraphraseProbability = this.calculateParaphraseProbability(
        text,
        externalSources.map(s => s.snippet)
      )
      
      return {
        embedding_similarity: maxSimilarity,
        semantic_matches: semanticMatches,
        paraphrase_probability: paraphraseProbability
      }
    } catch (error) {
      console.error('Semantic analysis error:', error)
      return undefined
    }
  }
  
  /**
   * Get text embedding using OpenAI
   */
  private async getEmbedding(text: string): Promise<number[] | null> {
    if (!this.openai) return null
    
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.slice(0, 8000) // Limit input size
      })
      
      return response.data[0].embedding
    } catch (error) {
      console.error('Error getting embedding:', error)
      return null
    }
  }
  
  /**
   * Calculate cosine similarity between embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (magnitudeA * magnitudeB)
  }
  
  /**
   * Calculate paraphrase probability
   */
  private calculateParaphraseProbability(text: string, sources: string[]): number {
    if (sources.length === 0) return 0
    
    const textWords = new Set(text.toLowerCase().split(/\s+/))
    let maxOverlap = 0
    
    for (const source of sources) {
      const sourceWords = new Set(source.toLowerCase().split(/\s+/))
      const intersection = new Set([...textWords].filter(x => sourceWords.has(x)))
      const overlap = intersection.size / Math.min(textWords.size, sourceWords.size)
      maxOverlap = Math.max(maxOverlap, overlap)
    }
    
    // High word overlap but not exact match suggests paraphrasing
    if (maxOverlap > 0.6 && maxOverlap < 0.9) {
      return maxOverlap
    }
    
    return maxOverlap * 0.5
  }
  
  /**
   * Deduplicate sources
   */
  private deduplicateSources(sources: ExternalSource[]): ExternalSource[] {
    const seen = new Set<string>()
    const unique: ExternalSource[] = []
    
    for (const source of sources) {
      const key = source.domain + source.title
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(source)
      }
    }
    
    return unique
  }
  
  /**
   * Generate unique check ID using Web Crypto API
   */
  private async generateCheckId(text: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(text + Date.now().toString())
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8)
  }
  
  /**
   * Get cached result
   */
  private async getCachedResult(checkId: string): Promise<PlagiarismResult | null> {
    try {
      // Check in-memory cache first
      if (this.searchCache.has(checkId)) {
        return this.searchCache.get(checkId)
      }
      
      // Check database cache
      const { data, error } = await supabase
        .from('plagiarism_checks')
        .select('*')
        .eq('check_id', checkId)
        .single()
      
      if (error || !data) return null
      
      // Check if cache is still valid
      const cacheAge = Date.now() - new Date(data.created_at).getTime()
      const maxAge = this.CACHE_DURATION_HOURS * 60 * 60 * 1000
      
      if (cacheAge > maxAge) {
        return null
      }
      
      return data.result as PlagiarismResult
    } catch (error) {
      console.error('Cache retrieval error:', error)
      return null
    }
  }
  
  /**
   * Cache result
   */
  private async cacheResult(
    checkId: string,
    result: PlagiarismResult,
    userId?: string
  ): Promise<void> {
    try {
      const textHash = await this.generateTextHash(result.analysis_details.original_text || '')
      this.searchCache.set(checkId, result)
      
      // Cache in database
      await supabase
        .from('plagiarism_checks')
        .insert({
          check_id: checkId,
          user_id: userId,
          result,
          text_hash: textHash,
          similarity_score: result.overall_similarity,
          is_plagiarized: result.is_plagiarized,
          sources_count: result.external_sources?.length || 0,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Cache storage error:', error)
    }
  }
  
  /**
   * Generate hash for text caching using Web Crypto API
   */
  private async generateTextHash(text: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16)
  }

  /**
   * Calculate text similarity
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const shingles1 = this.generateShingles(text1)
    const shingles2 = this.generateShingles(text2)
    return this.jaccardSimilarity(shingles1, shingles2)
  }
  
  private calculateConfidenceScore({
    numberOfAlgorithmsTriggered,
    externalSourcesFound,
    semanticAnalysisPerformed,
    textLength
  }: {
    numberOfAlgorithmsTriggered: number
    externalSourcesFound: number
    semanticAnalysisPerformed: boolean
    textLength: number
  }): number {
    let confidenceScore = 0.5 // Neutral starting point
    
    // Increase confidence with more algorithms triggered
    confidenceScore += (numberOfAlgorithmsTriggered / 5) * 0.2
    
    // Increase confidence with external sources found
    confidenceScore += (externalSourcesFound / 5) * 0.1
    
    // Increase confidence with semantic analysis performed
    if (semanticAnalysisPerformed) {
      confidenceScore += 0.1
    }
    
    // Decrease confidence for very short texts
    if (textLength < 100) {
      confidenceScore -= 0.1
    }
    
    // Ensure confidence score is within bounds
    return Math.max(0.2, Math.min(confidenceScore, 0.9))
  }

  /**
   * Helper: Hash string to number
   */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Helper: Find text position
   */
  private findTextPosition(words: string[], target: string[]): number {
    for (let i = 0; i <= words.length - target.length; i++) {
      let match = true
      for (let j = 0; j < target.length; j++) {
        if (words[i + j].toLowerCase() !== target[j].toLowerCase()) {
          match = false
          break
        }
      }
      if (match) return i
    }
    return -1
  }

  /**
   * Helper: Check if phrase is common
   */
  private isCommonPhrase(phrase: string): boolean {
    return this.COMMON_PHRASES.some((common: string) => 
      phrase.toLowerCase().includes(common.toLowerCase())
    )
  }
  
  // Known sources for comparison (can be extended with database)
  private readonly KNOWN_SOURCES = [
    {
      source: 'Wikipedia - Machine Learning',
      text: 'Machine learning is a subset of artificial intelligence that focuses on the development of algorithms and statistical models that enable computer systems to improve their performance on a specific task through experience. Rather than being explicitly programmed, these systems learn patterns from data.'
    },
    {
      source: 'Academic Paper - Deep Learning',
      text: 'Deep learning represents a significant advancement in artificial neural networks, utilizing multiple layers to progressively extract higher-level features from raw input. This hierarchical learning process has revolutionized computer vision, natural language processing, and speech recognition.'
    },
    {
      source: 'Technical Documentation',
      text: 'API rate limiting is a technique used to control the amount of incoming and outgoing traffic to or from a network. Rate limiting helps prevent abuse, ensures fair usage, and maintains service stability by restricting the number of API calls an entity can make within a defined time period.'
    }
  ]
  
  // Common academic phrases to exclude
  private readonly COMMON_PHRASES = [
    'according to',
    'as shown in',
    'based on',
    'for example',
    'in conclusion',
    'in other words',
    'it can be seen that',
    'research shows',
    'studies have shown',
    'the purpose of this',
    'this paper presents',
    'this study aims to',
    'furthermore',
    'however',
    'therefore',
    'nevertheless',
    'consequently',
    'as a result'
  ]

  /**
   * Helper: Calculate variance
   */
  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2))
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length
  }

  /**
   * Helper: Check repetitive sentence starts
   */
  private checkRepetitiveStarts(sentences: string[]): number {
    const starts = sentences.map(s => s.trim().split(/\s+/)[0]?.toLowerCase())
    const startCounts = new Map<string, number>()
    
    for (const start of starts) {
      if (start) {
        startCounts.set(start, (startCounts.get(start) || 0) + 1)
      }
    }
    
    const maxRepetition = Math.max(...startCounts.values())
    return maxRepetition / sentences.length
  }

  /**
   * Helper: Calculate n-gram similarity
   */
  private calculateNGramSimilarity(words1: string[], words2: string[], n: number): number {
    const ngrams1 = new Set<string>()
    const ngrams2 = new Set<string>()
    
    for (let i = 0; i <= words1.length - n; i++) {
      ngrams1.add(words1.slice(i, i + n).join(' '))
    }
    
    for (let i = 0; i <= words2.length - n; i++) {
      ngrams2.add(words2.slice(i, i + n).join(' '))
    }
    
    return this.jaccardSimilarity(ngrams1, ngrams2)
  }

  /**
   * Helper: Check if sentence looks like factual claim
   */
  private looksLikeFactualClaim(sentence: string): boolean {
    const factIndicators = [
      'studies show', 'research indicates', 'according to',
      'data suggests', 'evidence shows', 'statistics reveal',
      'percent', '%', 'million', 'billion'
    ]
    
    const lower = sentence.toLowerCase()
    return factIndicators.some(indicator => lower.includes(indicator))
  }

  /**
   * Helper: Check if sentence has citation
   */
  private hasCitation(sentence: string): boolean {
    const citationPatterns = [
      /\([A-Z][a-z]+.*\d{4}\)/,
      /\[\d+\]/,
      /\(\d+\)/
    ]
    
    return citationPatterns.some(pattern => pattern.test(sentence))
  }

  /**
   * Helper: Get reason for match
   */
  private getReasonForMatch(match: MatchDetail): string {
    switch (match.type) {
      case 'exact':
        return `Exact match found with ${match.source || 'another source'}`
      case 'near_duplicate':
        return `Very similar text structure to ${match.source || 'existing content'}`
      case 'paraphrase':
        return `Potential paraphrasing from ${match.source || 'another source'}`
      case 'citation':
        return 'Missing or incorrect citation'
      default:
        return 'Suspicious similarity detected'
    }
  }

  /**
   * Helper: Get suggestions for match
   */
  private getSuggestionsForMatch(match: MatchDetail): string[] {
    switch (match.type) {
      case 'exact':
        return [
          'Use quotation marks for direct quotes',
          'Add proper citation immediately after',
          'Consider paraphrasing in your own words',
          'Ensure you have permission to use this content'
        ]
      case 'near_duplicate':
        return [
          'Rephrase using your own words and style',
          'Add citation to acknowledge the source',
          'Expand with your own analysis',
          'Combine multiple sources for originality'
        ]
      case 'paraphrase':
        return [
          'Even paraphrased content needs citation',
          'Try to add your own insights',
          'Use multiple sources to support your point'
        ]
      default:
        return [
          'Review this section for originality',
          'Add appropriate citations',
          'Consider rewriting in your own voice'
        ]
    }
  }
}

// Export singleton instance
export const plagiarismDetector = new PlagiarismDetectorService()
