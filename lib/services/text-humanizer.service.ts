/**
 * Text Humanization Service
 * Transforms AI-generated text to sound more natural and human-like
 */

export interface HumanizationResult {
  original_text: string
  humanized_text: string
  changes_made: string[]
  readability_score: number
  naturalness_score: number
  timestamp: string
}

export class TextHumanizerService {
  // Contractions mapping
  private readonly CONTRACTIONS: { [key: string]: string } = {
    'I am': "I'm",
    'you are': "you're",
    'he is': "he's",
    'she is': "she's",
    'it is': "it's",
    'we are': "we're",
    'they are': "they're",
    'I have': "I've",
    'you have': "you've",
    'we have': "we've",
    'they have': "they've",
    'I will': "I'll",
    'you will': "you'll",
    'he will': "he'll",
    'she will': "she'll",
    'we will': "we'll",
    'they will': "they'll",
    'would not': "wouldn't",
    'could not': "couldn't",
    'should not': "shouldn't",
    'cannot': "can't",
    'will not': "won't",
    'do not': "don't",
    'does not': "doesn't",
    'did not': "didn't",
    'is not': "isn't",
    'are not': "aren't",
    'was not': "wasn't",
    'were not': "weren't",
    'have not': "haven't",
    'has not': "hasn't",
    'had not': "hadn't"
  }

  // Transition phrases for natural flow
  private readonly TRANSITIONS = {
    addition: ['Also,', 'Plus,', 'Besides,', 'What\'s more,', 'On top of that,', 'Not to mention,'],
    contrast: ['But', 'However,', 'On the other hand,', 'That said,', 'Still,', 'Though,', 'Yet,'],
    sequence: ['First,', 'Next,', 'Then,', 'After that,', 'Finally,', 'To start,', 'Moving on,'],
    example: ['For instance,', 'For example,', 'Like,', 'Such as', 'Say,', 'Take', 'Consider'],
    emphasis: ['Actually,', 'In fact,', 'Indeed,', 'Really,', 'Honestly,', 'Basically,', 'Essentially,'],
    conclusion: ['So,', 'Therefore,', 'Thus,', 'In short,', 'All in all,', 'Ultimately,', 'In the end,']
  }

  // Filler words for natural speech patterns
  private readonly FILLERS = ['well', 'you know', 'I mean', 'actually', 'basically', 'honestly', 'really']

  // Formal to informal word replacements
  private readonly INFORMAL_REPLACEMENTS: { [key: string]: string[] } = {
    'utilize': ['use'],
    'commence': ['start', 'begin'],
    'terminate': ['end', 'stop'],
    'demonstrate': ['show'],
    'purchase': ['buy'],
    'assist': ['help'],
    'inquire': ['ask'],
    'respond': ['answer', 'reply'],
    'obtain': ['get'],
    'provide': ['give'],
    'require': ['need'],
    'attempt': ['try'],
    'approximately': ['about', 'around'],
    'subsequently': ['then', 'later', 'after'],
    'regarding': ['about'],
    'concerning': ['about'],
    'numerous': ['many', 'lots of', 'a lot of'],
    'substantial': ['big', 'large'],
    'evident': ['clear', 'obvious'],
    'establish': ['set up', 'create'],
    'implement': ['put in place', 'use', 'do'],
    'facilitate': ['help', 'make easier'],
    'endeavor': ['try'],
    'comprehend': ['understand'],
    'perspicacious': ['smart', 'clever']
  }

  // Overly formal phrases to replace
  private readonly FORMAL_PHRASES: { [key: string]: string } = {
    'It is important to note that': 'Note that',
    'It should be noted that': 'Keep in mind',
    'In conclusion': 'To sum up',
    'Furthermore': 'Also',
    'Moreover': 'Plus',
    'Nevertheless': 'But still',
    'Consequently': 'So',
    'It is worth mentioning': 'Worth noting',
    'As previously mentioned': 'As I said',
    'In light of': 'Given',
    'With regard to': 'About',
    'In order to': 'To',
    'Due to the fact that': 'Because',
    'In the event that': 'If',
    'At this point in time': 'Now',
    'Prior to': 'Before'
  }

  /**
   * Main humanization function
   */
  async humanizeText(text: string): Promise<HumanizationResult> {
    const changes: string[] = []
    let humanized = text

    // Apply transformations in sequence
    humanized = this.addContractions(humanized, changes)
    humanized = this.varysentenceStructure(humanized, changes)
    humanized = this.replaceFormalnWords(humanized, changes)
    humanized = this.replaceFormalPhrases(humanized, changes)
    humanized = this.addPersonalTouch(humanized, changes)
    humanized = this.improveTransitions(humanized, changes)
    humanized = this.addNaturalBreaks(humanized, changes)
    humanized = this.varyPunctuation(humanized, changes)
    humanized = this.reduceRepetition(humanized, changes)
    humanized = this.simplifyComplexSentences(humanized, changes)

    // Calculate scores
    const readability = this.calculateReadability(humanized)
    const naturalness = this.calculateNaturalness(humanized, changes.length)

    return {
      original_text: text,
      humanized_text: humanized,
      changes_made: changes,
      readability_score: readability,
      naturalness_score: naturalness,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Add contractions to make text more conversational
   */
  private addContractions(text: string, changes: string[]): string {
    let result = text
    let changeCount = 0

    for (const [formal, contraction] of Object.entries(this.CONTRACTIONS)) {
      const regex = new RegExp(`\\b${formal}\\b`, 'gi')
      const matches = result.match(regex)
      if (matches && matches.length > 0) {
        // Contract some but not all instances for variety
        const replaceCount = Math.ceil(matches.length * 0.7)
        let replaced = 0
        result = result.replace(regex, (match) => {
          if (replaced < replaceCount) {
            replaced++
            changeCount++
            return match[0] === match[0].toUpperCase() 
              ? contraction.charAt(0).toUpperCase() + contraction.slice(1)
              : contraction
          }
          return match
        })
      }
    }

    if (changeCount > 0) {
      changes.push(`Added ${changeCount} contractions for conversational tone`)
    }
    return result
  }

  /**
   * Vary sentence structure and length
   */
  private varysentenceStructure(text: string, changes: string[]): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || []
    const result: string[] = []
    let modified = false

    for (let i = 0; i < sentences.length; i++) {
      let sentence = sentences[i].trim()
      
      // Combine short consecutive sentences occasionally
      if (i < sentences.length - 1) {
        const currentLength = sentence.split(' ').length
        const nextLength = sentences[i + 1]?.trim().split(' ').length || 0
        
        if (currentLength < 8 && nextLength < 8 && Math.random() > 0.6) {
          const connector = this.getRandomItem([', and', ', but', ' -', '; also,'])
          result.push(sentence.replace(/[.!?]$/, connector + ' ' + sentences[i + 1].trim()))
          i++ // Skip next sentence
          modified = true
          continue
        }
      }

      // Break up very long sentences
      const words = sentence.split(' ')
      if (words.length > 25) {
        const midPoint = Math.floor(words.length / 2)
        const breakWords = [', and', ', but', ', so', '. Also,', '. Plus,']
        const breakPoint = words.findIndex((w, idx) => idx > midPoint - 3 && idx < midPoint + 3 && w.includes(','))
        
        if (breakPoint > 0) {
          const firstPart = words.slice(0, breakPoint).join(' ')
          const secondPart = words.slice(breakPoint + 1).join(' ')
          result.push(firstPart + '. ' + secondPart)
          modified = true
          continue
        }
      }

      result.push(sentence)
    }

    if (modified) {
      changes.push('Varied sentence structure for better flow')
    }
    return result.join(' ')
  }

  /**
   * Replace formal words with informal alternatives
   */
  private replaceFormalnWords(text: string, changes: string[]): string {
    let result = text
    let replaceCount = 0

    for (const [formal, informal] of Object.entries(this.INFORMAL_REPLACEMENTS)) {
      const regex = new RegExp(`\\b${formal}\\b`, 'gi')
      if (regex.test(result)) {
        const replacement = this.getRandomItem(informal)
        result = result.replace(regex, (match) => {
          replaceCount++
          // Preserve capitalization
          return match[0] === match[0].toUpperCase()
            ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
            : replacement
        })
      }
    }

    if (replaceCount > 0) {
      changes.push(`Replaced ${replaceCount} formal words with casual alternatives`)
    }
    return result
  }

  /**
   * Replace formal phrases
   */
  private replaceFormalPhrases(text: string, changes: string[]): string {
    let result = text
    let replaceCount = 0

    for (const [formal, casual] of Object.entries(this.FORMAL_PHRASES)) {
      const regex = new RegExp(formal, 'gi')
      if (regex.test(result)) {
        result = result.replace(regex, casual)
        replaceCount++
      }
    }

    if (replaceCount > 0) {
      changes.push(`Simplified ${replaceCount} formal phrases`)
    }
    return result
  }

  /**
   * Add personal touches and conversational elements
   */
  private addPersonalTouch(text: string, changes: string[]): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || []
    const result: string[] = []
    let addedPersonalTouch = false

    for (let i = 0; i < sentences.length; i++) {
      let sentence = sentences[i].trim()
      
      // Add occasional filler words at the beginning of sentences
      if (i > 0 && Math.random() > 0.8) {
        const filler = this.getRandomItem(this.FILLERS)
        sentence = filler.charAt(0).toUpperCase() + filler.slice(1) + ', ' + 
                  sentence.charAt(0).toLowerCase() + sentence.slice(1)
        addedPersonalTouch = true
      }

      // Add rhetorical questions occasionally
      if (Math.random() > 0.95 && i < sentences.length - 1) {
        const questions = [
          'Makes sense, right?',
          'You see what I mean?',
          'Pretty interesting, huh?',
          'Got it?'
        ]
        sentence = sentence.replace(/\.$/, '. ' + this.getRandomItem(questions))
        addedPersonalTouch = true
      }

      result.push(sentence)
    }

    if (addedPersonalTouch) {
      changes.push('Added conversational elements')
    }
    return result.join(' ')
  }

  /**
   * Improve transitions between ideas
   */
  private improveTransitions(text: string, changes: string[]): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || []
    const result: string[] = []
    let addedTransitions = false

    for (let i = 0; i < sentences.length; i++) {
      let sentence = sentences[i].trim()
      
      // Add transitions between sentences
      if (i > 0 && i < sentences.length - 1 && Math.random() > 0.7) {
        // Determine appropriate transition type based on context
        const prevSentence = sentences[i - 1].toLowerCase()
        const currSentence = sentence.toLowerCase()
        
        let transitionType = 'addition'
        if (currSentence.includes('but') || currSentence.includes('however')) {
          transitionType = 'contrast'
        } else if (currSentence.includes('example') || currSentence.includes('instance')) {
          transitionType = 'example'
        } else if (i === sentences.length - 2) {
          transitionType = 'conclusion'
        }
        
        const transition = this.getRandomItem(this.TRANSITIONS[transitionType as keyof typeof this.TRANSITIONS])
        if (!sentence.startsWith(transition)) {
          sentence = transition + ' ' + sentence.charAt(0).toLowerCase() + sentence.slice(1)
          addedTransitions = true
        }
      }

      result.push(sentence)
    }

    if (addedTransitions) {
      changes.push('Improved transitions between ideas')
    }
    return result.join(' ')
  }

  /**
   * Add natural breaks and paragraph structure
   */
  private addNaturalBreaks(text: string, changes: string[]): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || []
    const result: string[] = []
    let addedBreaks = false
    let sentenceCount = 0

    for (const sentence of sentences) {
      result.push(sentence.trim())
      sentenceCount++
      
      // Add paragraph breaks every 3-5 sentences
      if (sentenceCount >= 3 && Math.random() > 0.6) {
        result.push('\n\n')
        sentenceCount = 0
        addedBreaks = true
      }
    }

    if (addedBreaks) {
      changes.push('Added natural paragraph breaks')
    }
    return result.join(' ').trim()
  }

  /**
   * Vary punctuation for natural feel
   */
  private varyPunctuation(text: string, changes: string[]): string {
    let result = text
    let modified = false

    // Replace some periods with exclamation marks for emphasis
    const emphasisWords = ['amazing', 'incredible', 'fantastic', 'great', 'wonderful', 'excellent']
    emphasisWords.forEach(word => {
      const regex = new RegExp(`(${word}[^.!?]*)\\.`, 'gi')
      if (regex.test(result) && Math.random() > 0.5) {
        result = result.replace(regex, '$1!')
        modified = true
      }
    })

    // Add occasional ellipsis for thought continuation
    if (Math.random() > 0.8) {
      const sentences = result.match(/[^.!?]+[.!?]+/g) || []
      if (sentences.length > 2) {
        const idx = Math.floor(Math.random() * (sentences.length - 1))
        sentences[idx] = sentences[idx].replace(/\.$/, '...')
        result = sentences.join(' ')
        modified = true
      }
    }

    // Use dashes for interruptions or clarifications
    const parentheticalRegex = /\s*\([^)]+\)\s*/g
    const matches = result.match(parentheticalRegex)
    if (matches && matches.length > 0 && Math.random() > 0.6) {
      result = result.replace(parentheticalRegex, (match) => {
        const content = match.replace(/[()]/g, '').trim()
        return ` — ${content} — `
      })
      modified = true
    }

    if (modified) {
      changes.push('Varied punctuation for natural rhythm')
    }
    return result
  }

  /**
   * Reduce repetition of words and phrases
   */
  private reduceRepetition(text: string, changes: string[]): string {
    const words = text.split(/\s+/)
    const wordCounts = new Map<string, number>()
    
    // Count word frequencies
    words.forEach(word => {
      const cleaned = word.toLowerCase().replace(/[^a-z]/g, '')
      if (cleaned.length > 4) { // Only track longer words
        wordCounts.set(cleaned, (wordCounts.get(cleaned) || 0) + 1)
      }
    })

    // Find overused words
    const overused = Array.from(wordCounts.entries())
      .filter(([_, count]) => count > 3)
      .map(([word, _]) => word)

    if (overused.length === 0) return text

    let result = text
    const synonyms: { [key: string]: string[] } = {
      'important': ['crucial', 'key', 'essential', 'vital', 'significant'],
      'understand': ['grasp', 'comprehend', 'get', 'realize', 'see'],
      'provide': ['offer', 'give', 'supply', 'deliver', 'present'],
      'create': ['make', 'build', 'develop', 'produce', 'generate'],
      'improve': ['enhance', 'better', 'upgrade', 'boost', 'refine'],
      'change': ['alter', 'modify', 'adjust', 'transform', 'shift'],
      'process': ['procedure', 'method', 'approach', 'system', 'way']
    }

    let replaceCount = 0
    overused.forEach(word => {
      if (synonyms[word]) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi')
        let replacementIdx = 0
        result = result.replace(regex, (match) => {
          if (Math.random() > 0.5) { // Replace about half
            const replacement = synonyms[word][replacementIdx % synonyms[word].length]
            replacementIdx++
            replaceCount++
            return match[0] === match[0].toUpperCase()
              ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
              : replacement
          }
          return match
        })
      }
    })

    if (replaceCount > 0) {
      changes.push(`Reduced repetition by varying ${replaceCount} word instances`)
    }
    return result
  }

  /**
   * Simplify overly complex sentences
   */
  private simplifyComplexSentences(text: string, changes: string[]): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || []
    const result: string[] = []
    let simplified = false

    for (let sentence of sentences) {
      const commaCount = (sentence.match(/,/g) || []).length
      
      // If sentence has too many commas, try to simplify
      if (commaCount > 3) {
        // Remove unnecessary clauses
        sentence = sentence.replace(/, which is[^,]+,/gi, ',')
        sentence = sentence.replace(/, that is[^,]+,/gi, ',')
        sentence = sentence.replace(/\s+,/g, ',')
        sentence = sentence.replace(/,\s+/g, ', ')
        simplified = true
      }

      // Remove redundant phrases
      sentence = sentence.replace(/in actual fact/gi, 'actually')
      sentence = sentence.replace(/at the present time/gi, 'now')
      sentence = sentence.replace(/in the near future/gi, 'soon')
      
      result.push(sentence.trim())
    }

    if (simplified) {
      changes.push('Simplified complex sentence structures')
    }
    return result.join(' ')
  }

  /**
   * Calculate readability score (Flesch Reading Ease approximation)
   */
  private calculateReadability(text: string): number {
    const sentences = text.match(/[.!?]+/g)?.length || 1
    const words = text.split(/\s+/).length
    const syllables = text.split(/\s+/).reduce((count, word) => {
      return count + this.countSyllables(word)
    }, 0)

    const avgWordsPerSentence = words / sentences
    const avgSyllablesPerWord = syllables / words

    // Flesch Reading Ease formula (simplified)
    let score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord
    score = Math.max(0, Math.min(100, score))
    
    return Math.round(score)
  }

  /**
   * Count syllables in a word (approximation)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '')
    let count = 0
    let previousWasVowel = false
    
    for (const char of word) {
      const isVowel = 'aeiou'.includes(char)
      if (isVowel && !previousWasVowel) {
        count++
      }
      previousWasVowel = isVowel
    }
    
    // Adjust for silent e
    if (word.endsWith('e')) count--
    
    // Ensure at least 1 syllable
    return Math.max(1, count)
  }

  /**
   * Calculate naturalness score based on changes
   */
  private calculateNaturalness(text: string, changeCount: number): number {
    // Base score from change count
    let score = Math.min(changeCount * 10, 50)
    
    // Check for contractions
    const contractionCount = (text.match(/\b\w+'\w+\b/g) || []).length
    score += Math.min(contractionCount * 2, 20)
    
    // Check for sentence variety
    const sentences = text.match(/[^.!?]+[.!?]+/g) || []
    const lengths = sentences.map(s => s.split(' ').length)
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length
    
    if (variance > 20) score += 15 // Good variety
    
    // Check for natural transitions
    const transitionWords = ['but', 'and', 'so', 'also', 'however', 'though']
    const transitionCount = transitionWords.reduce((count, word) => {
      return count + (text.match(new RegExp(`\\b${word}\\b`, 'gi'))?.length || 0)
    }, 0)
    score += Math.min(transitionCount * 2, 15)
    
    return Math.min(100, Math.round(score))
  }

  /**
   * Get random item from array
   */
  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
  }
}

// Export singleton instance
export const textHumanizerService = new TextHumanizerService()
