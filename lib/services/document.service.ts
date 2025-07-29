import { supabase } from '@/lib/supabase'

export interface Document {
  id: string
  title: string
  content: string
  document_type: 'note' | 'paper' | 'summary' | 'idea'
  file_url?: string
  mime_type?: string
  file_size?: number
  owner_id: string
  team_id?: string
  project_id?: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface CreateDocumentData {
  title: string
  content?: string
  document_type?: 'note' | 'paper' | 'summary' | 'idea'
  project_id?: string
  team_id?: string
  is_public?: boolean
}

export interface UpdateDocumentData {
  title?: string
  content?: string
  document_type?: 'note' | 'paper' | 'summary' | 'idea'
  project_id?: string
  team_id?: string
  is_public?: boolean
}

export interface DocumentFilters {
  document_type?: string
  project_id?: string
  team_id?: string
  limit?: number
  offset?: number
}

class DocumentService {
  private static instance: DocumentService

  private constructor() {}

  static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService()
    }
    return DocumentService.instance
  }

  async getDocuments(filters: DocumentFilters = {}): Promise<Document[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const params = new URLSearchParams()
      if (filters.document_type) params.append('document_type', filters.document_type)
      if (filters.project_id) params.append('project_id', filters.project_id)
      if (filters.team_id) params.append('team_id', filters.team_id)
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())

      const response = await fetch(`/api/documents?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }

      const { documents } = await response.json()
      return documents || []
    } catch (error) {
      console.error('Error fetching documents:', error)
      throw error
    }
  }

  async getDocument(id: string): Promise<Document> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const response = await fetch(`/api/documents/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Document not found')
        }
        throw new Error('Failed to fetch document')
      }

      const { document } = await response.json()
      return document
    } catch (error) {
      console.error('Error fetching document:', error)
      throw error
    }
  }

  async createDocument(data: CreateDocumentData): Promise<Document> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create document')
      }

      const { document } = await response.json()
      return document
    } catch (error) {
      console.error('Error creating document:', error)
      throw error
    }
  }

  async updateDocument(id: string, data: UpdateDocumentData): Promise<Document> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const response = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Document not found')
        }
        throw new Error('Failed to update document')
      }

      const { document } = await response.json()
      return document
    } catch (error) {
      console.error('Error updating document:', error)
      throw error
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  }

  async saveDocumentFromWriter(title: string, content: string, documentType: string = 'paper'): Promise<Document> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Check if document already exists (by title)
      const existingDocs = await this.getDocuments({ document_type: documentType })
      const existingDoc = existingDocs.find(doc => doc.title === title)

      if (existingDoc) {
        // Update existing document
        return await this.updateDocument(existingDoc.id, {
          content,
          updated_at: new Date().toISOString()
        })
      } else {
        // Create new document
        return await this.createDocument({
          title,
          content,
          document_type: documentType as any,
          is_public: false
        })
      }
    } catch (error) {
      console.error('Error saving document from writer:', error)
      throw error
    }
  }

  async autoSaveDocument(title: string, content: string, documentType: string = 'paper'): Promise<void> {
    try {
      await this.saveDocumentFromWriter(title, content, documentType)
    } catch (error) {
      console.error('Auto-save failed:', error)
      // Don't throw error for auto-save to avoid disrupting user experience
    }
  }

  async exportDocument(id: string, format: 'markdown' | 'pdf' | 'docx'): Promise<Blob> {
    try {
      const document = await this.getDocument(id)
      
      // For now, return markdown content as blob
      // In a real implementation, you'd convert to the requested format
      const content = `# ${document.title}\n\n${document.content}`
      return new Blob([content], { type: 'text/markdown' })
    } catch (error) {
      console.error('Error exporting document:', error)
      throw error
    }
  }

  async duplicateDocument(id: string): Promise<Document> {
    try {
      const original = await this.getDocument(id)
      const newTitle = `${original.title} (Copy)`
      
      return await this.createDocument({
        title: newTitle,
        content: original.content,
        document_type: original.document_type,
        project_id: original.project_id,
        team_id: original.team_id,
        is_public: original.is_public
      })
    } catch (error) {
      console.error('Error duplicating document:', error)
      throw error
    }
  }
}

export default DocumentService 