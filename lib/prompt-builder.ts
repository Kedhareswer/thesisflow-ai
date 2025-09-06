export interface PromptBuilderOptions {
  templateStyle: string
  researchContext: string
  writingTask: string
  ragEnabled: boolean
  uploadedSourceCount: number
  systemPromptAddon?: string
}

export function getTaskPrompt(writingTask: string): string {
  switch (writingTask) {
    case 'continue':
      return 'Continue writing the LaTeX document from where it left off. Maintain the same style, tone, and academic rigor. Use proper LaTeX formatting including \\section{}, \\subsection{}, \\textbf{}, \\textit{}, \\cite{}, and mathematical notation with $ $ for inline and $$ $$ for display equations.';
    case 'introduction':
      return 'Write a compelling introduction section in LaTeX format. Use \\section{Introduction} and include background context, research question, and significance. Use proper LaTeX commands for emphasis (\\textbf{}, \\textit{}), citations (\\cite{}), and any mathematical notation.';
    case 'abstract':
      return 'Write a concise abstract (150-250 words) in LaTeX format that summarizes the research problem, methodology, key findings, and conclusions. Begin with \\begin{abstract} and end with \\end{abstract}. Use proper LaTeX formatting for any technical terms or mathematical expressions.';
    case 'literature_review':
      return `Write a rigorous Literature Review in LaTeX format. Use \\section{Literature Review} and appropriate \\subsection{} commands.\n\nStructure your review with:\n1. An overview paragraph summarizing the research landscape\n2. Thematic analysis with \\subsection{} for each theme\n3. Identification of gaps using \\subsection{Research Gaps and Future Directions}\n\nCRITICAL: Include a \"Comparison of Recent Studies\" table using LaTeX tabular environment:\n\\begin{table}[h]\n\\centering\n\\caption{Comparison of Recent Studies}\n\\begin{tabular}{|l|l|l|l|l|}\n\\hline\nAuthor/Year & Focus & Method & Key Findings & Limitations \\\\\n\\hline\n... (fill with papers from Research Context) ...\n\\hline\n\\end{tabular}\n\\end{table}\n\nUse \\cite{} for all references. Format equations with $ $ or $$ $$. Use \\textbf{} for emphasis.`;
    case 'analyze':
      return 'Analyze the current LaTeX document content for structure, clarity, academic tone, and coherence. Check for proper LaTeX syntax, sectioning, citations, and mathematical notation. Provide specific suggestions for improvement in LaTeX format.';
    default:
      return 'Continue writing the document in LaTeX format with proper academic style. Use appropriate LaTeX commands for sections, emphasis, citations, and mathematical expressions.';
  }
}

export function buildWritingPrompt(opts: PromptBuilderOptions): string {
  const { templateStyle, researchContext, writingTask, ragEnabled, uploadedSourceCount, systemPromptAddon } = opts;

  let systemPrompt = `You are a professional academic LaTeX writer assisting with a research document in ${templateStyle}. ` +
    'Generate output in proper LaTeX format with appropriate commands for structure (\\section{}, \\subsection{}), formatting (\\textbf{}, \\textit{}, \\underline{}), ' +
    'citations (\\cite{}, \\ref{}, \\label{}), mathematical expressions ($ $ for inline, $$ $$ for display), lists (\\begin{itemize}, \\begin{enumerate}), ' +
    'and tables (\\begin{tabular}). Write in a clear, academic style appropriate for publication. ' +
    'Always maintain academic integrity and provide well-reasoned arguments. Do NOT include \\documentclass or \\begin{document} unless specifically requested.';

  if (systemPromptAddon) {
    systemPrompt += ' ' + systemPromptAddon
  }

  if (writingTask === 'literature_review') {
    systemPrompt += ' IMPORTANT: You must use the specific papers listed in the "Selected Papers" section of the Research Context below. Extract author names, years, titles, and abstract information directly from the provided context. Do NOT use placeholder values like "unknown" - use the actual data provided.';
  }

  if (ragEnabled) {
    systemPrompt += ' Use ONLY the provided Retrieved Context and Session Context for factual statements. If the context is insufficient, explicitly state "insufficient context" rather than inventing facts.';
  }

  if (uploadedSourceCount > 0) {
    systemPrompt += ' The user has uploaded source files. Treat the "Retrieved Context from Uploaded Sources" as PRIMARY EVIDENCE. Ground all factual statements in these sources when relevant and include LaTeX citations using the form \\cite{srcN} that correspond to the numbered retrieved sources. Do NOT fabricate citations or refer to external sources not provided unless explicitly asked.';
  }

  const taskPrompt = getTaskPrompt(writingTask);

  let contextNote = uploadedSourceCount > 0 ? `The user has provided ${uploadedSourceCount} additional source file(s) that may include relevant quotes or data.` : '';

return `${systemPrompt}\n\n${contextNote}\n\n${researchContext}\n\nTask: ${taskPrompt}`.trim();
}
