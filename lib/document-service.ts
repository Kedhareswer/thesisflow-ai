export interface Document {
  id: string
  title: string
  content: string
  type: "pdf" | "docx" | "txt" | "md"
  size: number
  uploadedAt: Date
  uploadedBy: string
  shared: boolean
  collaborators: string[]
}

export interface DocumentSummary {
  id: string
  documentId: string
  summary: string
  keyPoints: string[]
  generatedAt: Date
}

export class DocumentService {
  private static documents: Document[] = []
  private static summaries: DocumentSummary[] = []

  static async uploadDocument(file: File, userId: string): Promise<Document> {
    const document: Document = {
      id: Math.random().toString(36).substr(2, 9),
      title: file.name,
      content: await this.extractTextFromFile(file),
      type: this.getFileType(file.name),
      size: file.size,
      uploadedAt: new Date(),
      uploadedBy: userId,
      shared: false,
      collaborators: [],
    }

    this.documents.push(document)
    return document
  }

  static async extractTextFromFile(file: File): Promise<string> {
    // In a real app, use proper file parsing libraries
    if (file.type === "text/plain") {
      return await file.text()
    }

    // Mock extraction for other file types
    return `Extracted text content from ${file.name}. This would contain the actual document content in a real implementation.`
  }

  static getFileType(filename: string): Document["type"] {
    const extension = filename.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "pdf":
        return "pdf"
      case "docx":
      case "doc":
        return "docx"
      case "md":
        return "md"
      default:
        return "txt"
    }
  }

  static getDocuments(userId: string): Document[] {
    return this.documents.filter((doc) => doc.uploadedBy === userId || doc.collaborators.includes(userId))
  }

  static getDocument(id: string): Document | undefined {
    return this.documents.find((doc) => doc.id === id)
  }

  static async shareDocument(documentId: string, collaboratorIds: string[]): Promise<void> {
    const document = this.documents.find((doc) => doc.id === documentId)
    if (document) {
      document.shared = true
      document.collaborators = [...new Set([...document.collaborators, ...collaboratorIds])]
    }
  }

  static async generateSummary(documentId: string): Promise<DocumentSummary> {
    const document = this.getDocument(documentId)
    if (!document) {
      throw new Error("Document not found")
    }

    // In a real app, use AI service to generate summary
    const summary: DocumentSummary = {
      id: Math.random().toString(36).substr(2, 9),
      documentId,
      summary: `This is an AI-generated summary of "${document.title}". The document discusses key concepts and provides valuable insights into the subject matter.`,
      keyPoints: [
        "Key finding or concept from the document",
        "Important methodology or approach mentioned",
        "Significant conclusion or recommendation",
        "Notable data or statistics presented",
      ],
      generatedAt: new Date(),
    }

    this.summaries.push(summary)
    return summary
  }

  static getSummary(documentId: string): DocumentSummary | undefined {
    return this.summaries.find((summary) => summary.documentId === documentId)
  }
}
