export interface PromptBuilderOptions {
  templateStyle: string;
  researchContext: string;
  writingTask: string;
  ragEnabled: boolean;
  uploadedSourceCount: number;
}

export function getTaskPrompt(writingTask: string): string {
  switch (writingTask) {
    case 'continue':
      return 'Continue writing the document from where it left off. Maintain the same style, tone, and academic rigor.';
    case 'introduction':
      return 'Write a compelling introduction for this research document. Include background context, research question, and significance.';
    case 'abstract':
      return 'Write a concise abstract (150-250 words) that summarizes the research problem, methodology, key findings, and conclusions.';
    case 'literature_review':
      return `Write a rigorous Literature Review that critically synthesizes the most relevant, recent (last 3–5 years preferred) and foundational studies. Structure with clear themes, identify gaps, and relate prior findings directly to the current research problem.\n\nInclude a compact Markdown table titled \"Comparison of Recent Studies\" with columns: Author/Year, Focus, Method/Dataset, Key Findings, Limitations/Relevance. Populate 4–8 rows using only information derivable from the provided context; if uncertain, write \"unknown\" rather than inventing facts.`;
    case 'analyze':
      return 'Analyze the current document content for structure, clarity, academic tone, and coherence. Provide specific suggestions for improvement.';
    default:
      return 'Continue writing the document in a professional academic style.';
  }
}

export function buildWritingPrompt(opts: PromptBuilderOptions): string {
  const { templateStyle, researchContext, writingTask, ragEnabled, uploadedSourceCount } = opts;

  let systemPrompt = `You are a professional academic writer assisting with a research document in ${templateStyle}. ` +
    'Write in a clear, academic style appropriate for publication. Focus on producing coherent, well-structured text that would be suitable for a scholarly publication. ' +
    'Always maintain academic integrity and provide well-reasoned arguments.';

  if (ragEnabled) {
    systemPrompt += ' Use ONLY the provided Retrieved Context and Session Context for factual statements. If the context is insufficient, explicitly state "insufficient context" rather than inventing facts.';
  }

  const taskPrompt = getTaskPrompt(writingTask);

  let contextNote = uploadedSourceCount > 0 ? `The user has provided ${uploadedSourceCount} additional source file(s) that may include relevant quotes or data.` : '';

return `${systemPrompt}\n\n${contextNote}\n\n${researchContext}\n\nTask: ${taskPrompt}`.trim();
}
