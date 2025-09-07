import { HfInference } from '@huggingface/inference';
import type { AIProvider } from '@/lib/ai-providers';
import { paraphrase as paraphraseLLM } from '@/lib/services/paraphrase.service';

export type ParaphraseMode = 'academic' | 'casual' | 'formal' | 'creative' | 'technical' | 'simple' | 'fluent';

export interface ParaphraseOptions {
  mode: ParaphraseMode;
  preserveLength?: boolean;
  variations?: number; // number of alternatives requested
  // New advanced options
  variationLevel?: 'low' | 'medium' | 'high'; // rewrite intensity
  provider?: AIProvider;
  model?: string;
  userId?: string;
}

export interface ParaphraseResult {
  original: string;
  paraphrased: string;
  mode: ParaphraseMode;
  similarity: number;
  wordCount: {
    original: number;
    paraphrased: number;
  };
  alternatives?: string[];
}

export class ParaphraserService {
  private hf: HfInference | null = null;
  private modelMap = {
    academic: 'tuner007/pegasus_paraphrase',
    casual: 'humarin/chatgpt_paraphraser_on_T5_base',
    formal: 'Vamsi/T5_Paraphrase_Paws',
    creative: 'ramsrigouthamg/t5-large-paraphraser-diverse-high-quality',
    technical: 'tuner007/pegasus_paraphrase',
    simple: 'humarin/chatgpt_paraphraser_on_T5_base',
    fluent: 'tuner007/pegasus_paraphrase'
  };

  private modePrompts = {
    academic: 'Paraphrase this text in an academic, scholarly style: ',
    casual: 'Rewrite this text in a casual, conversational tone: ',
    formal: 'Paraphrase this text in a formal, professional manner: ',
    creative: 'Creatively rewrite this text with varied vocabulary: ',
    technical: 'Paraphrase this text maintaining technical accuracy: ',
    simple: 'Simplify and rewrite this text in plain language: ',
    fluent: 'Paraphrase this text to be smooth, coherent, and easy to read: '
  };

  constructor() {
    const apiKey = process.env.HUGGINGFACE_API_TOKEN;
    if (apiKey) {
      this.hf = new HfInference(apiKey);
    }
  }

  async paraphrase(text: string, options: ParaphraseOptions): Promise<ParaphraseResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for paraphrasing');
    }

    // 1) Primary path: use enhanced AI provider service (supports multiple vendors + fallbacks)
    try {
      const variationLevel = options.variationLevel || 'medium';
      const preserveLength = !!options.preserveLength;

      const llmRes = await paraphraseLLM({
        text,
        tone: (options.mode as any) === 'fluent' ? 'fluent' : (options.mode as any),
        variation: variationLevel,
        preserveLength,
        provider: options.provider,
        model: options.model,
        userId: options.userId,
      } as any);

      const main = llmRes.output?.trim() || text;

      // Generate alternatives if requested
      const alternatives: string[] = [];
      const requested = Math.min(options.variations || 1, 5);
      for (let i = 1; i < requested; i++) {
        const level = i === 1 ? 'low' : i === 2 ? 'medium' : 'high';
        try {
          const alt = await paraphraseLLM({
            text,
            tone: (options.mode as any) === 'fluent' ? 'fluent' : (options.mode as any),
            variation: level as any,
            preserveLength,
            provider: options.provider,
            model: options.model,
            userId: options.userId,
          } as any);
          const altText = alt.output?.trim();
          if (altText && altText !== main && !alternatives.includes(altText)) {
            alternatives.push(altText);
          }
          await new Promise(r => setTimeout(r, 200));
        } catch (e) {
          // ignore alt generation error
        }
      }

      return {
        original: text,
        paraphrased: main,
        mode: options.mode,
        similarity: this.calculateSimilarity(text, main),
        wordCount: {
          original: text.split(/\s+/).length,
          paraphrased: main.split(/\s+/).length
        },
        alternatives
      };
    } catch (primaryError) {
      console.error('Enhanced paraphrase error, falling back:', primaryError);
    }

    // 2) Fallback: HuggingFace Inference if configured
    if (this.hf) {
      try {
        const model = this.modelMap[options.mode];
        const prompt = this.modePrompts[options.mode];
        const input = `${prompt}${text}`;

        const result = await this.hf.textGeneration({
          model,
          inputs: input,
          parameters: {
            max_new_tokens: options.preserveLength ? text.split(' ').length * 2 : 500,
            temperature: options.mode === 'creative' ? 0.9 : 0.7,
            top_p: 0.95,
            do_sample: true,
          }
        });

        const paraphrased = this.cleanGeneratedText(result.generated_text, text);
        let alternatives: string[] = [];
        if (options.variations && options.variations > 1) {
          alternatives = await this.generateAlternatives(text, options);
        }
        return {
          original: text,
          paraphrased,
          mode: options.mode,
          similarity: this.calculateSimilarity(text, paraphrased),
          wordCount: {
            original: text.split(/\s+/).length,
            paraphrased: paraphrased.split(/\s+/).length
          },
          alternatives
        };
      } catch (error) {
        console.error('HuggingFace paraphrase error:', error);
      }
    }

    // 3) Fallback: OpenAI direct
    try {
      return await this.paraphraseWithOpenAI(text, options);
    } catch (error) {
      console.error('OpenAI paraphrase error:', error);
    }

    // 4) Final fallback: rule-based
    return this.ruleBasedParaphrase(text, options);
  }

  private async generateAlternatives(text: string, options: ParaphraseOptions): Promise<string[]> {
    const alternatives: string[] = [];
    const variations = Math.min(options.variations || 3, 5); // Max 5 variations
    
    for (let i = 1; i < variations; i++) {
      try {
        const model = this.modelMap[options.mode];
        const prompt = this.modePrompts[options.mode];
        
        const result = await this.hf!.textGeneration({
          model,
          inputs: `${prompt}${text}`,
          parameters: {
            max_new_tokens: text.split(' ').length * 2,
            temperature: 0.8 + (i * 0.1), // Increase temperature for more variation
            top_p: 0.95,
            do_sample: true,
          }
        });
        
        const alternative = this.cleanGeneratedText(result.generated_text, text);
        if (alternative !== text && !alternatives.includes(alternative)) {
          alternatives.push(alternative);
        }
      } catch (error) {
        console.error(`Failed to generate alternative ${i}:`, error);
      }
    }
    
    return alternatives;
  }

  private async paraphraseWithOpenAI(text: string, options: ParaphraseOptions): Promise<ParaphraseResult> {
    // Use OpenAI as fallback
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      // Final fallback: rule-based paraphrasing
      return this.ruleBasedParaphrase(text, options);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a professional paraphrasing assistant. Paraphrase text in ${options.mode} style.`
            },
            {
              role: 'user',
              content: `Paraphrase this text: "${text}"`
            }
          ],
          temperature: options.mode === 'creative' ? 0.9 : 0.7,
          max_tokens: 500,
          n: options.variations || 1
        })
      });

      const data = await response.json();
      const paraphrased = data.choices[0].message.content.trim();
      const alternatives = data.choices.slice(1).map((c: any) => c.message.content.trim());

      return {
        original: text,
        paraphrased,
        mode: options.mode,
        similarity: this.calculateSimilarity(text, paraphrased),
        wordCount: {
          original: text.split(/\s+/).length,
          paraphrased: paraphrased.split(/\s+/).length
        },
        alternatives
      };
    } catch (error) {
      console.error('OpenAI paraphrase error:', error);
      return this.ruleBasedParaphrase(text, options);
    }
  }

  private ruleBasedParaphrase(text: string, options: ParaphraseOptions): Promise<ParaphraseResult> {
    // Basic rule-based paraphrasing as final fallback
    const synonymMap: Record<string, string[]> = {
      'important': ['significant', 'crucial', 'vital', 'essential'],
      'show': ['demonstrate', 'illustrate', 'reveal', 'display'],
      'use': ['utilize', 'employ', 'apply', 'implement'],
      'make': ['create', 'produce', 'generate', 'develop'],
      'good': ['excellent', 'beneficial', 'positive', 'favorable'],
      'bad': ['negative', 'detrimental', 'adverse', 'unfavorable'],
      'big': ['large', 'substantial', 'considerable', 'extensive'],
      'small': ['minor', 'minimal', 'limited', 'modest'],
    };

    let paraphrased = text;
    
    // Apply style-specific transformations
    switch (options.mode) {
      case 'academic':
        paraphrased = this.toAcademicStyle(paraphrased, synonymMap);
        break;
      case 'casual':
        paraphrased = this.toCasualStyle(paraphrased);
        break;
      case 'formal':
        paraphrased = this.toFormalStyle(paraphrased, synonymMap);
        break;
      case 'simple':
        paraphrased = this.toSimpleStyle(paraphrased);
        break;
      case 'creative':
        paraphrased = this.toCreativeStyle(paraphrased, synonymMap);
        break;
      case 'technical':
        paraphrased = this.toTechnicalStyle(paraphrased, synonymMap);
        break;
    }

    return Promise.resolve({
      original: text,
      paraphrased,
      mode: options.mode,
      similarity: this.calculateSimilarity(text, paraphrased),
      wordCount: {
        original: text.split(/\s+/).length,
        paraphrased: paraphrased.split(/\s+/).length
      }
    });
  }

  private toAcademicStyle(text: string, synonymMap: Record<string, string[]>): string {
    let result = text;
    // Replace casual words with academic alternatives
    result = result.replace(/\b(can't|won't|doesn't|isn't)\b/gi, (match) => {
      const map: Record<string, string> = {
        "can't": 'cannot',
        "won't": 'will not',
        "doesn't": 'does not',
        "isn't": 'is not'
      };
      return map[match.toLowerCase()] || match;
    });
    
    // Use more formal synonyms
    Object.entries(synonymMap).forEach(([word, synonyms]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(regex, synonyms[0]);
    });
    
    return result;
  }

  private toCasualStyle(text: string): string {
    let result = text;
    // Add contractions
    result = result.replace(/\b(cannot|will not|does not|is not)\b/gi, (match) => {
      const map: Record<string, string> = {
        'cannot': "can't",
        'will not': "won't",
        'does not': "doesn't",
        'is not': "isn't"
      };
      return map[match.toLowerCase()] || match;
    });
    return result;
  }

  private toFormalStyle(text: string, synonymMap: Record<string, string[]>): string {
    return this.toAcademicStyle(text, synonymMap);
  }

  private toSimpleStyle(text: string): string {
    // Simplify complex words
    const simplifications: Record<string, string> = {
      'utilize': 'use',
      'implement': 'do',
      'demonstrate': 'show',
      'significant': 'important',
      'substantial': 'big'
    };
    
    let result = text;
    Object.entries(simplifications).forEach(([complex, simple]) => {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      result = result.replace(regex, simple);
    });
    
    return result;
  }

  private toCreativeStyle(text: string, synonymMap: Record<string, string[]>): string {
    let result = text;
    // Use varied synonyms
    Object.entries(synonymMap).forEach(([word, synonyms]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const randomSynonym = synonyms[Math.floor(Math.random() * synonyms.length)];
      result = result.replace(regex, randomSynonym);
    });
    return result;
  }

  private toTechnicalStyle(text: string, synonymMap: Record<string, string[]>): string {
    return this.toFormalStyle(text, synonymMap);
  }

  private cleanGeneratedText(generated: string, original: string): string {
    // Remove the original text if it appears in the generated output
    let cleaned = generated.replace(original, '').trim();
    
    // Remove common prefixes
    const prefixes = [
      'Here is a paraphrase:',
      'Paraphrased version:',
      'Paraphrase:',
      'Rewritten:',
      'Alternative:',
    ];
    
    prefixes.forEach(prefix => {
      if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleaned = cleaned.substring(prefix.length).trim();
      }
    });
    
    // Remove quotes if present
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    
    return cleaned || original; // Return original if cleaning resulted in empty string
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Basic Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return Math.round((intersection.size / union.size) * 100);
  }
}

// Export singleton instance
export const paraphraserService = new ParaphraserService();
