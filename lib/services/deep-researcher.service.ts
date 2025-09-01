import { GenerateTextOptions } from '../enhanced-ai-service'
import { LiteratureSearchService } from './literature-search.service'

export interface ResearchQuestion {
  id: string
  question: string
  type: 'primary' | 'secondary' | 'follow_up' | 'critical'
  priority: number
  source: 'initial' | 'generated' | 'gap_analysis'
  status: 'pending' | 'investigating' | 'answered' | 'needs_more_data'
  evidence?: Evidence[]
  conflicts?: Conflict[]
}

export interface Evidence {
  id: string
  source: string
  content: string
  credibility: number
  relevance: number
  bias_assessment: string
  date: string
  citation: string
}

export interface Conflict {
  id: string
  position_a: Evidence
  position_b: Evidence
  severity: 'minor' | 'significant' | 'major'
  resolution_status: 'unresolved' | 'investigating' | 'resolved'
  analysis?: string
}

export interface ResearchGap {
  id: string
  description: string
  importance: 'low' | 'medium' | 'high' | 'critical'
  suggested_research: string[]
  difficulty: number
}

export interface CriticalThought {
  id: string
  type: 'assumption' | 'bias' | 'limitation' | 'alternative' | 'implication'
  content: string
  importance: number
  addressed: boolean
}

export interface ResearchIteration {
  id: string
  iteration_number: number
  focus: string
  questions_generated: ResearchQuestion[]
  evidence_collected: Evidence[]
  conflicts_identified: Conflict[]
  gaps_found: ResearchGap[]
  critical_thoughts: CriticalThought[]
  self_critique: string
  improvements_needed: string[]
  confidence_level: number
  timestamp: string
}

export interface DeepResearchResult {
  topic: string
  research_iterations: ResearchIteration[]
  final_synthesis: {
    executive_summary: string
    key_findings: string[]
    evidence_quality: string
    conflicting_viewpoints: Conflict[]
    research_gaps: ResearchGap[]
    confidence_assessment: string
    recommendations: string[]
    future_research: string[]
  }
  structured_report: {
    html: string
    markdown: string
    citations: string[]
    visualizations?: any[]
  }
  meta_analysis: {
    total_sources: number
    iteration_count: number
    questions_answered: number
    conflicts_resolved: number
    research_quality_score: number
    completeness_score: number
  }
}

export class DeepResearcherService {
  private aiService: any
  private literatureSearch: LiteratureSearchService
  private currentResearch: DeepResearchResult | null = null
  private aiServiceInitialized: Promise<void>

  constructor() {
    this.literatureSearch = new LiteratureSearchService()
    // Initialize AI service asynchronously
    this.aiServiceInitialized = this.initializeAIService()
  }

  private async initializeAIService() {
    const { enhancedAIService } = await import('../enhanced-ai-service')
    this.aiService = enhancedAIService
  }

  private async ensureAIServiceReady() {
    await this.aiServiceInitialized
    if (!this.aiService) {
      throw new Error('AI service failed to initialize')
    }
  }

  async conductDeepResearch(
    topic: string,
    initialContext: string = '',
    maxIterations: number = 4,
    userId?: string,
    onProgress?: (progress: any) => void
  ): Promise<DeepResearchResult> {
    
    // Ensure AI service is ready before starting
    await this.ensureAIServiceReady()
    
    this.currentResearch = {
      topic,
      research_iterations: [],
      final_synthesis: {
        executive_summary: '',
        key_findings: [],
        evidence_quality: '',
        conflicting_viewpoints: [],
        research_gaps: [],
        confidence_assessment: '',
        recommendations: [],
        future_research: []
      },
      structured_report: {
        html: '',
        markdown: '',
        citations: []
      },
      meta_analysis: {
        total_sources: 0,
        iteration_count: 0,
        questions_answered: 0,
        conflicts_resolved: 0,
        research_quality_score: 0,
        completeness_score: 0
      }
    }

    onProgress?.({ 
      type: 'init', 
      message: 'Initializing deep research methodology...',
      phase: 'initialization',
      iteration: 0
    })

    // Generate initial research questions
    const initialQuestions = await this.generateInitialQuestions(topic, initialContext, userId)
    
    // Conduct iterative research
    for (let i = 0; i < maxIterations; i++) {
      onProgress?.({ 
        type: 'iteration_start', 
        message: `Starting research iteration ${i + 1} of ${maxIterations}...`,
        phase: 'research_iteration',
        iteration: i + 1,
        totalIterations: maxIterations
      })

      const iteration = await this.conductResearchIteration(
        i + 1, 
        i === 0 ? initialQuestions : await this.generateFollowUpQuestions(userId),
        userId,
        onProgress
      )

      this.currentResearch.research_iterations.push(iteration)

      // Self-assessment and decision to continue
      const shouldContinue = await this.assessIterationCompleteness(iteration, i + 1, maxIterations, userId)
      
      if (!shouldContinue) {
        onProgress?.({ 
          type: 'early_completion', 
          message: 'Research objectives achieved, completing synthesis...',
          iteration: i + 1 
        })
        break
      }
    }

    // Final synthesis
    onProgress?.({ 
      type: 'synthesis', 
      message: 'Synthesizing all research findings...' 
    })
    
    await this.generateFinalSynthesis(userId)
    await this.generateStructuredReport(userId)
    this.calculateMetaAnalysis()

    return this.currentResearch
  }

  private async generateInitialQuestions(
    topic: string, 
    context: string, 
    userId?: string
  ): Promise<ResearchQuestion[]> {
    const prompt = `As a critical research analyst, decompose this research topic into structured questions:

TOPIC: "${topic}"
CONTEXT: ${context || 'No additional context provided'}

Generate 8-12 research questions following this framework:

1. FOUNDATIONAL QUESTIONS (2-3 questions)
- What are the core concepts and definitions?
- What is the current state of knowledge?

2. ANALYTICAL QUESTIONS (3-4 questions)  
- What are the key relationships and patterns?
- What factors influence the topic?
- What are the main approaches/methodologies?

3. CRITICAL QUESTIONS (2-3 questions)
- What are the limitations and biases in current research?
- What conflicting viewpoints exist?
- What assumptions need examination?

4. EXPLORATORY QUESTIONS (2-3 questions)
- What gaps exist in current knowledge?
- What emerging trends or developments are relevant?
- What are the broader implications?

Format each question as:
**Q[#]: [Question]**
Type: [foundational|analytical|critical|exploratory]
Priority: [1-5]
Rationale: [Why this question is important]

Be precise, specific, and intellectually rigorous.`

    await this.ensureAIServiceReady()
    const result = await this.aiService.generateText({
      prompt,
      userId,
      maxTokens: 1500,
      temperature: 0.8
    })

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate initial questions')
    }

    return this.parseResearchQuestions(result.content || '')
  }

  private async conductResearchIteration(
    iterationNumber: number,
    questions: ResearchQuestion[],
    userId?: string,
    onProgress?: (progress: any) => void
  ): Promise<ResearchIteration> {
    
    const iteration: ResearchIteration = {
      id: `iteration_${iterationNumber}_${Date.now()}`,
      iteration_number: iterationNumber,
      focus: this.determiniterationFocus(questions),
      questions_generated: questions,
      evidence_collected: [],
      conflicts_identified: [],
      gaps_found: [],
      critical_thoughts: [],
      self_critique: '',
      improvements_needed: [],
      confidence_level: 0,
      timestamp: new Date().toISOString()
    }

    // Phase 1: Evidence Collection
    onProgress?.({ 
      type: 'evidence_collection', 
      message: `Iteration ${iterationNumber}: Collecting evidence for ${questions.length} research questions...`,
      phase: 'evidence_collection',
      iteration: iterationNumber,
      totalQuestions: questions.length,
      progress: 0
    })
    
    for (const question of questions) {
      const evidence = await this.collectEvidenceForQuestion(question, userId, onProgress)
      iteration.evidence_collected.push(...evidence)
    }

    // Phase 2: Conflict Detection
    onProgress?.({ 
      type: 'conflict_analysis', 
      message: `Iteration ${iterationNumber}: Analyzing ${iteration.evidence_collected.length} sources for conflicting viewpoints...`,
      phase: 'conflict_analysis',
      iteration: iterationNumber,
      evidenceCount: iteration.evidence_collected.length,
      progress: 25
    })
    
    iteration.conflicts_identified = await this.detectConflicts(iteration.evidence_collected, userId)

    // Phase 3: Gap Analysis  
    onProgress?.({ 
      type: 'gap_analysis', 
      message: `Iteration ${iterationNumber}: Identifying research gaps and knowledge limitations...`,
      phase: 'gap_analysis',
      iteration: iterationNumber,
      progress: 50
    })
    
    iteration.gaps_found = await this.identifyResearchGaps(
      questions, 
      iteration.evidence_collected, 
      userId
    )

    // Phase 4: Critical Thinking
    onProgress?.({ 
      type: 'critical_thinking', 
      message: `Iteration ${iterationNumber}: Applying critical analysis and identifying assumptions...`,
      phase: 'critical_thinking',
      iteration: iterationNumber,
      progress: 75
    })
    
    iteration.critical_thoughts = await this.generateCriticalThoughts(
      questions,
      iteration.evidence_collected,
      iteration.conflicts_identified,
      userId
    )

    // Phase 5: Self-Critique
    onProgress?.({ 
      type: 'self_critique', 
      message: `Iteration ${iterationNumber}: Conducting self-assessment and quality evaluation...`,
      phase: 'self_critique',
      iteration: iterationNumber,
      progress: 90
    })
    
    const selfAssessment = await this.conductSelfCritique(iteration, userId)
    iteration.self_critique = selfAssessment.critique
    iteration.improvements_needed = selfAssessment.improvements
    iteration.confidence_level = selfAssessment.confidence

    return iteration
  }

  private parseResearchQuestions(content: string): ResearchQuestion[] {
    // Implementation for parsing AI-generated questions
    const questions: ResearchQuestion[] = []
    const questionRegex = /\*\*Q(\d+):\s*([^*]+)\*\*\s*Type:\s*(\w+)\s*Priority:\s*(\d+)\s*Rationale:\s*([^\n]+)/g
    
    let match
    while ((match = questionRegex.exec(content)) !== null) {
      questions.push({
        id: `q_${match[1]}_${Date.now()}`,
        question: match[2].trim(),
        type: this.mapQuestionType(match[3]),
        priority: parseInt(match[4]),
        source: 'initial',
        status: 'pending'
      })
    }
    
    return questions
  }

  // Additional methods would continue here...
  private mapQuestionType(type: string): 'primary' | 'secondary' | 'follow_up' | 'critical' {
    const typeMap: Record<string, 'primary' | 'secondary' | 'follow_up' | 'critical'> = {
      'foundational': 'primary',
      'analytical': 'secondary', 
      'critical': 'critical',
      'exploratory': 'follow_up'
    }
    return typeMap[type.toLowerCase()] || 'secondary'
  }

  private determiniterationFocus(questions: ResearchQuestion[]): string {
    const primaryCount = questions.filter(q => q.type === 'primary').length
    const criticalCount = questions.filter(q => q.type === 'critical').length
    
    if (primaryCount > criticalCount) {
      return 'Foundational Understanding'
    } else if (criticalCount > 0) {
      return 'Critical Analysis'
    } else {
      return 'Exploratory Research'
    }
  }

  private async collectEvidenceForQuestion(
    question: ResearchQuestion,
    userId?: string,
    onProgress?: (progress: any) => void
  ): Promise<Evidence[]> {
    onProgress?.({
      type: 'evidence_collection',
      message: `Searching literature for: "${question.question.substring(0, 80)}${question.question.length > 80 ? '...' : ''}"`,
      phase: 'evidence_search',
      question: question.question,
      questionType: question.type,
      priority: question.priority
    })

    // Use literature search to find relevant papers
    const papers: any[] = []
    
    await this.literatureSearch.streamPapers(
      question.question,
      20,
      (paper) => {
        papers.push(paper)
        onProgress?.({
          type: 'evidence_found',
          message: `Found relevant paper: "${paper.title.substring(0, 60)}${paper.title.length > 60 ? '...' : ''}"`,
          phase: 'evidence_collection',
          papersFound: papers.length,
          totalTargeted: 20
        })
      },
      (source, error) => console.warn(`Search error: ${error}`)
    )

    // Convert papers to Evidence objects with AI-powered analysis
    const evidence: Evidence[] = []
    
    for (const paper of papers.slice(0, 10)) {
      const evidenceAnalysis = await this.analyzeEvidenceQuality(paper, question, userId)
      evidence.push(evidenceAnalysis)
    }

    return evidence
  }

  private async analyzeEvidenceQuality(
    paper: any, 
    question: ResearchQuestion, 
    userId?: string
  ): Promise<Evidence> {
    const prompt = `Analyze this research paper's relevance and quality for the question:

QUESTION: "${question.question}"

PAPER:
Title: ${paper.title}
Abstract: ${paper.abstract || 'No abstract available'}
Authors: ${paper.authors?.map((a: any) => a.display_name).join(', ') || 'Unknown'}
Year: ${paper.publication_year}
Citations: ${paper.citation_count}

Provide analysis in this format:
**RELEVANCE SCORE:** [1-10]
**CREDIBILITY SCORE:** [1-10] 
**BIAS ASSESSMENT:** [Description of potential biases]
**KEY EVIDENCE:** [What this paper contributes to answering the question]

Be critical and precise in your assessment.`

    await this.ensureAIServiceReady()
    const result = await this.aiService.generateText({
      prompt,
      userId,
      maxTokens: 800,
      temperature: 0.3
    })

    // Parse AI response and create Evidence object
    const content = result.content || ''
    const relevance = this.extractScore(content, 'RELEVANCE SCORE') / 10
    const credibility = this.extractScore(content, 'CREDIBILITY SCORE') / 10
    const biasAssessment = this.extractSection(content, 'BIAS ASSESSMENT')

    return {
      id: `evidence_${Date.now()}_${Math.random()}`,
      source: paper.title,
      content: this.extractSection(content, 'KEY EVIDENCE'),
      credibility,
      relevance,
      bias_assessment: biasAssessment,
      date: paper.publication_year?.toString() || 'Unknown',
      citation: this.formatCitation(paper)
    }
  }

  // Helper methods for parsing AI responses
  private extractScore(content: string, label: string): number {
    const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*(\\d+)`, 'i')
    const match = content.match(regex)
    return match ? parseInt(match[1]) : 5
  }

  private extractSection(content: string, label: string): string {
    const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^*]+?)(?=\\*\\*|$)`, 'i')
    const match = content.match(regex)
    return match ? match[1].trim() : ''
  }

  private formatCitation(paper: any): string {
    const authors = paper.authors?.slice(0, 3).map((a: any) => a.display_name).join(', ') || 'Unknown'
    const year = paper.publication_year || 'n.d.'
    const title = paper.title || 'Untitled'
    return `${authors} (${year}). ${title}.`
  }

  private async detectConflicts(evidence: Evidence[], userId?: string): Promise<Conflict[]> {
    if (evidence.length < 2) return []

    const prompt = `As a critical research analyst, identify conflicting viewpoints in this evidence:

EVIDENCE COLLECTION:
${evidence.map((e, i) => `
${i + 1}. SOURCE: ${e.source}
   CONTENT: ${e.content}
   CREDIBILITY: ${e.credibility}/1.0
   DATE: ${e.date}
`).join('')}

Identify any direct contradictions, opposing viewpoints, or incompatible conclusions. 

For each conflict found, provide:
**CONFLICT #[X]:**
Position A: [Evidence #] - [Brief summary]
Position B: [Evidence #] - [Brief summary] 
Severity: [minor|significant|major]
Nature: [Methodological difference | Contradictory findings | Scope disagreement | etc.]

Only report substantive conflicts, not minor differences in emphasis.`

    await this.ensureAIServiceReady()
    const result = await this.aiService.generateText({
      prompt,
      userId,
      maxTokens: 1200,
      temperature: 0.4
    })

    return this.parseConflicts(result.content || '', evidence)
  }

  private parseConflicts(content: string, evidence: Evidence[]): Conflict[] {
    const conflicts: Conflict[] = []
    const conflictRegex = /\*\*CONFLICT #(\d+):\*\*[\s\S]*?Position A: Evidence #(\d+)[\s\S]*?Position B: Evidence #(\d+)[\s\S]*?Severity: (\w+)/g
    
    let match
    while ((match = conflictRegex.exec(content)) !== null) {
      const evidenceA = evidence[parseInt(match[2]) - 1]
      const evidenceB = evidence[parseInt(match[3]) - 1]
      
      if (evidenceA && evidenceB) {
        conflicts.push({
          id: `conflict_${Date.now()}_${match[1]}`,
          position_a: evidenceA,
          position_b: evidenceB,
          severity: match[4].toLowerCase() as 'minor' | 'significant' | 'major',
          resolution_status: 'unresolved',
          analysis: this.extractConflictAnalysis(content, match[1])
        })
      }
    }
    
    return conflicts
  }

  private extractConflictAnalysis(content: string, conflictNumber: string): string {
    const regex = new RegExp(`\\*\\*CONFLICT #${conflictNumber}:\\*\\*([\\s\\S]*?)(?=\\*\\*CONFLICT #|$)`)
    const match = content.match(regex)
    return match ? match[1].trim() : ''
  }

  private async identifyResearchGaps(
    questions: ResearchQuestion[], 
    evidence: Evidence[], 
    userId?: string
  ): Promise<ResearchGap[]> {
    
    const unansweredQuestions = questions.filter(q => q.status !== 'answered')
    const lowEvidenceQuestions = questions.filter(q => {
      const relevantEvidence = evidence.filter(e => e.relevance > 0.6)
      return relevantEvidence.length < 3
    })

    const prompt = `Analyze research gaps in this investigation:

RESEARCH QUESTIONS STATUS:
${questions.map(q => `- ${q.question} (Status: ${q.status}, Priority: ${q.priority})`).join('\n')}

EVIDENCE COVERAGE:
Total Evidence Items: ${evidence.length}
High Relevance (>0.8): ${evidence.filter(e => e.relevance > 0.8).length}
High Credibility (>0.8): ${evidence.filter(e => e.credibility > 0.8).length}

POTENTIAL GAPS TO ANALYZE:
- Unanswered questions: ${unansweredQuestions.length}
- Under-evidenced questions: ${lowEvidenceQuestions.length}

Identify significant research gaps using this format:

**GAP #[X]: [Title]**
Description: [What's missing]
Importance: [low|medium|high|critical]
Research Needed: [Specific research approaches]
Difficulty: [1-10 scale]
Impact: [Why this gap matters]

Focus on substantial gaps that limit understanding, not minor omissions.`

    await this.ensureAIServiceReady()
    const result = await this.aiService.generateText({
      prompt,
      userId,
      maxTokens: 1500,
      temperature: 0.6
    })

    return this.parseResearchGaps(result.content || '')
  }

  private parseResearchGaps(content: string): ResearchGap[] {
    const gaps: ResearchGap[] = []
    const gapRegex = /\*\*GAP #(\d+): ([^*]+)\*\*[\s\S]*?Description: ([^\n]+)[\s\S]*?Importance: (\w+)[\s\S]*?Research Needed: ([^\n]+)[\s\S]*?Difficulty: (\d+)/g
    
    let match
    while ((match = gapRegex.exec(content)) !== null) {
      gaps.push({
        id: `gap_${Date.now()}_${match[1]}`,
        description: match[3].trim(),
        importance: match[4].toLowerCase() as 'low' | 'medium' | 'high' | 'critical',
        suggested_research: match[5].split(',').map(s => s.trim()),
        difficulty: parseInt(match[6])
      })
    }
    
    return gaps
  }

  private async generateCriticalThoughts(
    questions: ResearchQuestion[],
    evidence: Evidence[],
    conflicts: Conflict[],
    userId?: string
  ): Promise<CriticalThought[]> {

    const prompt = `Apply deep critical thinking to this research:

RESEARCH SCOPE: ${questions.length} questions investigated
EVIDENCE BASE: ${evidence.length} sources (Avg Credibility: ${(evidence.reduce((sum, e) => sum + e.credibility, 0) / evidence.length).toFixed(2)})
CONFLICTS IDENTIFIED: ${conflicts.length}

Generate critical thoughts in these categories:

**ASSUMPTIONS TO QUESTION:**
- What assumptions underlie the research questions?
- What biases might influence the evidence selection?

**METHODOLOGICAL LIMITATIONS:**
- What are the weaknesses in the research approaches?
- How might the evidence collection be improved?

**ALTERNATIVE PERSPECTIVES:**
- What viewpoints are underrepresented?
- What alternative interpretations exist?

**BROADER IMPLICATIONS:**
- What are the wider consequences of these findings?
- What unexpected connections might exist?

For each thought, provide:
**[CATEGORY] #[X]:**
Content: [The critical thought]
Importance: [1-10]
Addressed: [yes|no]

Be intellectually rigorous and challenge conventional thinking.`

    await this.ensureAIServiceReady()
    const result = await this.aiService.generateText({
      prompt,
      userId,
      maxTokens: 1800,
      temperature: 0.7
    })

    return this.parseCriticalThoughts(result.content || '')
  }

  private parseCriticalThoughts(content: string): CriticalThought[] {
    const thoughts: CriticalThought[] = []
    const thoughtRegex = /\*\*(\w+) #(\d+):\*\*[\s\S]*?Content: ([^\n]+)[\s\S]*?Importance: (\d+)[\s\S]*?Addressed: (\w+)/g
    
    let match
    while ((match = thoughtRegex.exec(content)) !== null) {
      thoughts.push({
        id: `thought_${Date.now()}_${match[2]}`,
        type: this.mapThoughtType(match[1]),
        content: match[3].trim(),
        importance: parseInt(match[4]),
        addressed: match[5].toLowerCase() === 'yes'
      })
    }
    
    return thoughts
  }

  private mapThoughtType(category: string): 'assumption' | 'bias' | 'limitation' | 'alternative' | 'implication' {
    const typeMap: Record<string, 'assumption' | 'bias' | 'limitation' | 'alternative' | 'implication'> = {
      'assumptions': 'assumption',
      'methodological': 'limitation', 
      'alternative': 'alternative',
      'implications': 'implication'
    }
    return typeMap[category.toLowerCase()] || 'limitation'
  }

  private async conductSelfCritique(
    iteration: ResearchIteration, 
    userId?: string
  ): Promise<{ critique: string; improvements: string[]; confidence: number }> {

    const prompt = `Conduct a rigorous self-assessment of this research iteration:

ITERATION SUMMARY:
- Focus: ${iteration.focus}
- Questions: ${iteration.questions_generated.length}
- Evidence Collected: ${iteration.evidence_collected.length}
- Conflicts Found: ${iteration.conflicts_identified.length}
- Gaps Identified: ${iteration.gaps_found.length}
- Critical Thoughts: ${iteration.critical_thoughts.length}

QUALITY METRICS:
- Evidence Credibility: ${iteration.evidence_collected.length > 0 ? (iteration.evidence_collected.reduce((sum, e) => sum + e.credibility, 0) / iteration.evidence_collected.length).toFixed(2) : 'N/A'}
- Question Coverage: ${iteration.questions_generated.filter(q => q.status === 'answered').length}/${iteration.questions_generated.length} answered

Provide honest self-assessment:

**RESEARCH QUALITY CRITIQUE:**
[Assess thoroughness, rigor, objectivity, and methodology]

**MAJOR WEAKNESSES:**
1. [Weakness 1]
2. [Weakness 2] 
3. [Weakness 3]

**IMPROVEMENT PRIORITIES:**
1. [Improvement 1]
2. [Improvement 2]
3. [Improvement 3]

**CONFIDENCE LEVEL:** [0.0-1.0]
[Justification for confidence score]

Be brutally honest about limitations and areas for improvement.`

    await this.ensureAIServiceReady()
    const result = await this.aiService.generateText({
      prompt,
      userId,
      maxTokens: 1500,
      temperature: 0.3
    })

    return this.parseSelfCritique(result.content || '')
  }

  private parseSelfCritique(content: string): { critique: string; improvements: string[]; confidence: number } {
    const critiqueMatch = content.match(/\*\*RESEARCH QUALITY CRITIQUE:\*\*\s*([^\*]+)/)
    const critique = critiqueMatch ? critiqueMatch[1].trim() : 'Self-critique not parsed'

    const improvements: string[] = []
    const improvementRegex = /(\d+)\.\s*\[([^\]]+)\]/g
    let match
    while ((match = improvementRegex.exec(content)) !== null) {
      improvements.push(match[2])
    }

    const confidenceMatch = content.match(/\*\*CONFIDENCE LEVEL:\*\*\s*([\d.]+)/)
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5

    return { critique, improvements, confidence }
  }

  private async generateFollowUpQuestions(userId?: string): Promise<ResearchQuestion[]> {
    if (!this.currentResearch || this.currentResearch.research_iterations.length === 0) {
      return []
    }

    const lastIteration = this.currentResearch.research_iterations[this.currentResearch.research_iterations.length - 1]
    
    const prompt = `Based on the previous research iteration, generate targeted follow-up questions:

PREVIOUS FINDINGS:
- Conflicts: ${lastIteration.conflicts_identified.map(c => `${c.position_a.source} vs ${c.position_b.source}`).join('; ')}
- Gaps: ${lastIteration.gaps_found.map(g => g.description).join('; ')}
- Critical Issues: ${lastIteration.critical_thoughts.filter(t => t.importance > 7).map(t => t.content).join('; ')}

Generate 4-6 specific follow-up questions that:
1. Address identified conflicts
2. Fill critical gaps
3. Explore high-importance critical thoughts
4. Deepen understanding of key issues

Format:
**FQ[#]: [Question]**
Type: [follow_up|critical]
Priority: [1-5]
Addresses: [conflict|gap|critical_thought]
Rationale: [Why this question is essential for next iteration]`

    await this.ensureAIServiceReady()
    const result = await this.aiService.generateText({
      prompt,
      userId,
      maxTokens: 1200,
      temperature: 0.7
    })

    return this.parseResearchQuestions(result.content || '')
  }

  private async assessIterationCompleteness(
    iteration: ResearchIteration,
    iterationNumber: number,
    maxIterations: number,
    userId?: string
  ): Promise<boolean> {

    // Stop if max iterations reached
    if (iterationNumber >= maxIterations) return false

    // Stop if confidence is very high and few critical gaps remain
    if (iteration.confidence_level > 0.85 && 
        iteration.gaps_found.filter(g => g.importance === 'critical').length === 0 &&
        iteration.conflicts_identified.filter(c => c.resolution_status === 'unresolved').length <= 1) {
      return false
    }

    // Continue if major unresolved issues exist
    const hasUnresolvedCriticalIssues = 
      iteration.gaps_found.filter(g => g.importance === 'critical' || g.importance === 'high').length > 0 ||
      iteration.conflicts_identified.filter(c => c.severity === 'major').length > 0 ||
      iteration.critical_thoughts.filter(t => t.importance > 8 && !t.addressed).length > 0

    return hasUnresolvedCriticalIssues
  }

  private async generateFinalSynthesis(userId?: string): Promise<void> {
    if (!this.currentResearch) return

    const allEvidence = this.currentResearch.research_iterations.flatMap(i => i.evidence_collected)
    const allConflicts = this.currentResearch.research_iterations.flatMap(i => i.conflicts_identified)
    const allGaps = this.currentResearch.research_iterations.flatMap(i => i.gaps_found)
    const allCriticalThoughts = this.currentResearch.research_iterations.flatMap(i => i.critical_thoughts)

    const prompt = `Synthesize the complete deep research findings:

RESEARCH SUMMARY:
Topic: ${this.currentResearch.topic}
Iterations: ${this.currentResearch.research_iterations.length}
Total Evidence: ${allEvidence.length}
Conflicts: ${allConflicts.length}
Gaps: ${allGaps.length}
Critical Insights: ${allCriticalThoughts.length}

Create comprehensive synthesis:

**EXECUTIVE SUMMARY:**
[3-4 paragraph overview of key findings and conclusions]

**KEY FINDINGS:**
1. [Finding 1 with confidence level]
2. [Finding 2 with confidence level]
3. [Finding 3 with confidence level]
4. [Finding 4 with confidence level]
5. [Finding 5 with confidence level]

**EVIDENCE QUALITY ASSESSMENT:**
[Overall assessment of evidence strength and reliability]

**CONFLICTING VIEWPOINTS:**
[Summary of major unresolved conflicts and their implications]

**CONFIDENCE ASSESSMENT:**
Overall Confidence: [0.0-1.0]
[Justification for confidence level]

**ACTIONABLE RECOMMENDATIONS:**
1. [Recommendation 1]
2. [Recommendation 2] 
3. [Recommendation 3]

**FUTURE RESEARCH PRIORITIES:**
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

Maintain intellectual honesty about limitations and uncertainties.`

    await this.ensureAIServiceReady()
    const result = await this.aiService.generateText({
      prompt,
      userId,
      maxTokens: 2500,
      temperature: 0.4
    })

    this.parseFinalSynthesis(result.content || '')
  }

  private parseFinalSynthesis(content: string): void {
    if (!this.currentResearch) return

    const executiveSummary = this.extractSection(content, 'EXECUTIVE SUMMARY')
    const keyFindings = this.extractListItems(content, 'KEY FINDINGS')
    const evidenceQuality = this.extractSection(content, 'EVIDENCE QUALITY ASSESSMENT')
    const confidenceAssessment = this.extractSection(content, 'CONFIDENCE ASSESSMENT')
    const recommendations = this.extractListItems(content, 'ACTIONABLE RECOMMENDATIONS')
    const futureResearch = this.extractListItems(content, 'FUTURE RESEARCH PRIORITIES')

    this.currentResearch.final_synthesis = {
      executive_summary: executiveSummary,
      key_findings: keyFindings,
      evidence_quality: evidenceQuality,
      conflicting_viewpoints: this.currentResearch.research_iterations.flatMap(i => i.conflicts_identified),
      research_gaps: this.currentResearch.research_iterations.flatMap(i => i.gaps_found),
      confidence_assessment: confidenceAssessment,
      recommendations,
      future_research: futureResearch
    }
  }

  private extractListItems(content: string, section: string): string[] {
    const regex = new RegExp(`\\*\\*${section}:\\*\\*([\\s\\S]*?)(?=\\*\\*|$)`)
    const match = content.match(regex)
    if (!match) return []
    
    const listRegex = /\d+\.\s*([^\n]+)/g
    const items: string[] = []
    let itemMatch
    while ((itemMatch = listRegex.exec(match[1])) !== null) {
      items.push(itemMatch[1].trim())
    }
    return items
  }

  private async generateStructuredReport(userId?: string): Promise<void> {
    if (!this.currentResearch) return

    const markdown = this.generateMarkdownReport()
    const html = this.generateHTMLReport()
    const citations = this.extractAllCitations()

    this.currentResearch.structured_report = {
      markdown,
      html,
      citations
    }
  }

  private generateMarkdownReport(): string {
    if (!this.currentResearch) return ''

    const { final_synthesis, research_iterations, topic } = this.currentResearch

    return `# Deep Research Report: ${topic}

${final_synthesis.executive_summary}

## Key Findings

${final_synthesis.key_findings.map((finding, i) => `${i + 1}. ${finding}`).join('\n')}

## Evidence Quality Assessment

${final_synthesis.evidence_quality}

## Research Methodology

This research employed an iterative deep analysis approach across ${research_iterations.length} iterations:

${research_iterations.map((iter, i) => `
### Iteration ${i + 1}: ${iter.focus}
- **Questions Investigated:** ${iter.questions_generated.length}
- **Evidence Collected:** ${iter.evidence_collected.length} sources
- **Conflicts Identified:** ${iter.conflicts_identified.length}
- **Research Gaps Found:** ${iter.gaps_found.length}
- **Confidence Level:** ${(iter.confidence_level * 100).toFixed(1)}%
`).join('')}

## Conflicting Viewpoints

${final_synthesis.conflicting_viewpoints.map(conflict => `
- **${conflict.position_a.source}** vs **${conflict.position_b.source}**
  - Severity: ${conflict.severity}
  - Status: ${conflict.resolution_status}
`).join('')}

## Research Gaps

${final_synthesis.research_gaps.map(gap => `
- **${gap.description}** (Importance: ${gap.importance})
  - Suggested Research: ${gap.suggested_research.join(', ')}
`).join('')}

## Recommendations

${final_synthesis.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

## Future Research Directions

${final_synthesis.future_research.map((research, i) => `${i + 1}. ${research}`).join('\n')}

## Confidence Assessment

${final_synthesis.confidence_assessment}

---
*Generated by Deep Researcher AI System*`
  }

  private generateHTMLReport(): string {
    // Convert markdown to HTML (simplified implementation)
    return this.generateMarkdownReport()
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
  }

  private extractAllCitations(): string[] {
    if (!this.currentResearch) return []
    
    return this.currentResearch.research_iterations
      .flatMap(iter => iter.evidence_collected)
      .map(evidence => evidence.citation)
      .filter((citation, index, self) => self.indexOf(citation) === index)
  }

  private calculateMetaAnalysis(): void {
    if (!this.currentResearch) return

    const allEvidence = this.currentResearch.research_iterations.flatMap(i => i.evidence_collected)
    const allQuestions = this.currentResearch.research_iterations.flatMap(i => i.questions_generated)
    const allConflicts = this.currentResearch.research_iterations.flatMap(i => i.conflicts_identified)

    const totalSources = allEvidence.length
    const iterationCount = this.currentResearch.research_iterations.length
    const questionsAnswered = allQuestions.filter(q => q.status === 'answered').length
    const conflictsResolved = allConflicts.filter(c => c.resolution_status === 'resolved').length

    const avgCredibility = allEvidence.length > 0 ? 
      allEvidence.reduce((sum, e) => sum + e.credibility, 0) / allEvidence.length : 0
    
    const avgConfidence = this.currentResearch.research_iterations.length > 0 ?
      this.currentResearch.research_iterations.reduce((sum, i) => sum + i.confidence_level, 0) / this.currentResearch.research_iterations.length : 0

    const researchQualityScore = (avgCredibility * 0.4 + avgConfidence * 0.4 + (questionsAnswered / Math.max(allQuestions.length, 1)) * 0.2) * 100
    const completenessScore = (questionsAnswered / Math.max(allQuestions.length, 1)) * 100

    this.currentResearch.meta_analysis = {
      total_sources: totalSources,
      iteration_count: iterationCount,
      questions_answered: questionsAnswered,
      conflicts_resolved: conflictsResolved,
      research_quality_score: Math.round(researchQualityScore),
      completeness_score: Math.round(completenessScore)
    }
  }
}
