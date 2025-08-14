import mammoth from 'mammoth';

interface FileProcessingResult {
  text: string;
  title: string;
  error?: string;
}

export async function processFile(file: File): Promise<FileProcessingResult> {
  try {
    const fileType = file.type;
    const fileName = file.name.replace(/\.[^/.]+$/, '');

    // Only handle Word documents
    if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword'
    ) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { text: result.value, title: fileName };
    }

    throw new Error('Unsupported file type');
  } catch (error) {
    console.error('Error processing file:', error);
    return {
      text: '',
      title: '',
      error:
        'Failed to process file. Please ensure it is a valid Word document (.docx). For best results, provide a document with clear structure and context. Summaries will follow a standardized format: Title, Authors, Abstract, Key Findings, Methods, and Conclusions.'
    };
  }
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const validTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error:
        'Only Word documents (.docx) are accepted. Please upload a .docx file. For best summaries, ensure your document includes a title, author(s), abstract, and clear section headings.'
    };
  }

  // 50MB size limit
  if (file.size > 50 * 1024 * 1024) {
    return {
      valid: false,
      error: 'File size must be less than 50MB.'
    };
  }

  return { valid: true };
}
