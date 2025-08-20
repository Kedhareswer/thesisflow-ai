/**
 * Real Plagiarism Detection Service
 * Implements multiple algorithms for accurate plagiarism detection
 */

interface PlagiarismResult {
  is_plagiarized: boolean
  overall_similarity: number
  matches: MatchDetail[]
  suspicious_sections: SuspiciousSection[]
  fingerprint: string
  analysis_details: AnalysisDetails
  sources_checked: string[]
  timestamp: string
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
  private readonly SHINGLE_SIZE = 5 // k-shingles for fingerprinting
  private readonly SIMILARITY_THRESHOLD = 0.3 // 30% similarity triggers warning
  private readonly HIGH_SIMILARITY_THRESHOLD = 0.6 // 60% is high plagiarism
  
  // Common academic phrases that shouldn't trigger plagiarism
  private readonly COMMON_PHRASES = new Set([
    'according to', 'in conclusion', 'for example', 'on the other hand',
    'in addition', 'as a result', 'research shows', 'studies indicate',
    'it is important to note', 'this suggests that', 'in other words',
    'furthermore', 'moreover', 'however', 'therefore', 'consequently'
  ])

  // Known sources for demonstration (in production, this would query a database)
  private readonly KNOWN_SOURCES = [
    {
      id: 'wiki_climate',
      text: 'Climate change refers to long-term shifts in temperatures and weather patterns. These shifts may be natural, but since the 1800s, human activities have been the main driver of climate change, primarily due to the burning of fossil fuels.',
      source: 'Wikipedia - Climate Change'
    },
    {
      id: 'academic_ai',
      text: 'Artificial intelligence is the simulation of human intelligence processes by machines, especially computer systems. These processes include learning, reasoning, and self-correction.',
      source: 'Academic Journal - AI Overview'
    },
    {
      id: 'research_quantum',
      text: 'Quantum computing represents a fundamental shift in computation, leveraging quantum mechanical phenomena such as superposition and entanglement to process information in ways classical computers cannot.',
      source: 'Research Paper - Quantum Computing'
    }
  ]

  /**
   * Main plagiarism detection method
   */
  async detectPlagiarism(text: string): Promise<PlagiarismResult> {
    if (!text || text.length < 50) {
      throw new Error('Text too short for accurate plagiarism detection')
    }

    const timestamp = new Date().toISOString()
    const words = text.split(/\s+/).filter(w => w.length > 0)
    
    // Generate text fingerprint
    const fingerprint = this.generateFingerprint(text)
    
    // Perform multiple detection algorithms
    const shingleAnalysis = this.shingleBasedDetection(text)
    const phraseMatches = this.detectPhrasePlagiarism(text)
    const structuralAnalysis = this.analyzeTextStructure(text)
    const citationAnalysis = this.detectCitationPatterns(text)
    const sourceMatches = this.checkAgainstKnownSources(text)
    
    // Combine all matches
    const allMatches: MatchDetail[] = [
      ...shingleAnalysis.matches,
      ...phraseMatches,
      ...sourceMatches
    ]
    
    // Find suspicious sections
    const suspiciousSections = this.identifySuspiciousSections(text, allMatches)
    
    // Calculate overall similarity score
    const overallSimilarity = this.calculateOverallSimilarity(
      shingleAnalysis.similarity,
      phraseMatches.length > 0 ? 0.3 : 0,
      sourceMatches.length > 0 ? sourceMatches[0].similarity : 0,
      structuralAnalysis.suspicionScore
    )
    
    // Determine if plagiarized
    const isPlagiarized = overallSimilarity >= this.SIMILARITY_THRESHOLD ||
                          allMatches.some(m => m.type === 'exact' && m.similarity > 0.8)
    
    return {
      is_plagiarized: isPlagiarized,
      overall_similarity: Math.round(overallSimilarity * 100),
      matches: allMatches.slice(0, 10), // Top 10 matches
      suspicious_sections: suspiciousSections,
      fingerprint,
      analysis_details: {
        total_words: words.length,
        unique_phrases: structuralAnalysis.uniquePhrases,
        common_phrases_detected: structuralAnalysis.commonPhrases,
        citation_patterns_found: citationAnalysis.citationCount,
        fingerprint_matches: shingleAnalysis.matches.length,
        algorithms_used: [
          'Shingle-based fingerprinting',
          'Phrase matching',
          'Structural analysis',
          'Citation detection',
          'Source comparison'
        ]
      },
      sources_checked: this.KNOWN_SOURCES.map(s => s.source),
      timestamp
    }
  }

  /**
   * Generate fingerprint using winnowing algorithm
   */
  private generateFingerprint(text: string): string {
    const normalized = text.toLowerCase().replace(/[^\w\s]/g, '')
    const words = normalized.split(/\s+/)
    const hashes: number[] = []
    
    // Generate k-shingles
    for (let i = 0; i <= words.length - this.SHINGLE_SIZE; i++) {
      const shingle = words.slice(i, i + this.SHINGLE_SIZE).join(' ')
      hashes.push(this.hashString(shingle))
    }
    
    // Winnowing: select minimum hash in each window
    const windowSize = 4
    const fingerprints: number[] = []
    for (let i = 0; i <= hashes.length - windowSize; i++) {
      const window = hashes.slice(i, i + windowSize)
      fingerprints.push(Math.min(...window))
    }
    
    // Create unique fingerprint string
    return fingerprints.slice(0, 10).map(h => h.toString(16)).join('-')
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
  private detectPhrasePlagiarism(text: string): MatchDetail[] {
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
  private detectCitationPatterns(text: string): { citationCount: number; patterns: string[] } {
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
    
    return { citationCount, patterns: foundPatterns }
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
  private calculateOverallSimilarity(...scores: number[]): number {
    const validScores = scores.filter(s => s > 0)
    if (validScores.length === 0) return 0
    
    // Weighted average with higher weight for higher scores
    const weighted = validScores.map(s => s * s).reduce((a, b) => a + b, 0)
    return Math.sqrt(weighted / validScores.length)
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
    for (const common of this.COMMON_PHRASES) {
      if (phrase.includes(common)) return true
    }
    return false
  }

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
