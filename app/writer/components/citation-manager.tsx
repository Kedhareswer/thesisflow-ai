"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useResearchSession } from '@/components/research-session-provider'
import { FileText, Plus, Trash2, Download } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

// Citation format types
const CITATION_FORMATS = [
  { id: 'apa', name: 'APA' },
  { id: 'mla', name: 'MLA' },
  { id: 'chicago', name: 'Chicago' },
  { id: 'ieee', name: 'IEEE' },
  { id: 'harvard', name: 'Harvard' },
]

// Template formats for different publishers
const PUBLISHER_TEMPLATES = [
  { id: 'ieee', name: 'IEEE' },
  { id: 'acm', name: 'ACM' },
  { id: 'springer', name: 'Springer' },
  { id: 'elsevier', name: 'Elsevier' },
  { id: 'general', name: 'General Academic' },
]

interface Citation {
  id: string
  type: 'article' | 'book' | 'chapter' | 'website' | 'other'
  title: string
  authors: string[]
  year?: string
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  publisher?: string
  url?: string
  doi?: string
}

interface CitationManagerProps {
  selectedTemplate: string
  onTemplateChange?: (template: string) => void
}

export function CitationManager({ selectedTemplate, onTemplateChange }: CitationManagerProps) {
  const [citationFormat, setCitationFormat] = useState('ieee')
  const [manualCitations, setManualCitations] = useState<Citation[]>([])
  const [formattedReferences, setFormattedReferences] = useState<string>('')
  
  // Get research session data
  const { session, getSelectedPapers } = useResearchSession()
  const selectedPapers = getSelectedPapers()
  
  // Convert selected papers from research session to Citation format
  const papersToCitations = (): Citation[] => {
    return selectedPapers.map(paper => {
      // Safe access to nested properties with type checking
      const getAuthorName = (author: any): string => {
        if (typeof author === 'string') return author;
        if (author && typeof author === 'object' && 'name' in author) return author.name || '';
        return '';
      };
      
      const getJournalProperty = (paper: any, prop: string): string | undefined => {
        if (!paper.journal) return undefined;
        if (typeof paper.journal === 'string') return prop === 'title' ? paper.journal : undefined;
        if (typeof paper.journal === 'object' && prop in paper.journal) {
          const value = paper.journal[prop];
          return value !== null && value !== undefined ? String(value) : undefined;
        }
        return undefined;
      };
      
      return {
        id: paper.id || `paper-${Math.random().toString(36).substring(2)}`,
        type: 'article' as const,
        title: paper.title || '',
        authors: Array.isArray(paper.authors) 
          ? paper.authors.map(getAuthorName)
          : [],
        year: paper.year ? String(paper.year) : undefined,
        journal: getJournalProperty(paper, 'title'),
        volume: getJournalProperty(paper, 'volume'),
        issue: getJournalProperty(paper, 'issue'),
        pages: getJournalProperty(paper, 'pages'),
        doi: typeof paper.doi === 'string' ? paper.doi : undefined,
        url: typeof paper.url === 'string' ? paper.url : undefined
      };
    })
  }
  
  // Format citations based on selected format
  const formatCitations = () => {
    // In a real implementation, we would use a citation formatting library like Citation.js
    // For now, we're mocking the formatted references
    
    const allCitations = [...papersToCitations(), ...manualCitations]
    
    // Simplified citation formatting based on IEEE style
    let formatted = ''
    
    if (citationFormat === 'ieee') {
      formatted = allCitations.map((citation, index) => {
        const authors = citation.authors.join(', ')
        return `[${index + 1}] ${authors}, "${citation.title}," ${citation.journal ? `in ${citation.journal}, ` : ''}${citation.volume ? `vol. ${citation.volume}, ` : ''}${citation.issue ? `no. ${citation.issue}, ` : ''}${citation.pages ? `pp. ${citation.pages}, ` : ''}${citation.year || ''}.${citation.doi ? ` doi: ${citation.doi}.` : ''}`
      }).join('\n\n')
    } else if (citationFormat === 'apa') {
      formatted = allCitations.map((citation) => {
        const lastAuthorIndex = citation.authors.length - 1
        const authors = lastAuthorIndex > 0 
          ? citation.authors.slice(0, lastAuthorIndex).join(', ') + ', & ' + citation.authors[lastAuthorIndex]
          : citation.authors.join('')
        
        return `${authors}. (${citation.year || 'n.d.'}). ${citation.title}. ${citation.journal || ''}${citation.volume ? `, ${citation.volume}` : ''}${citation.issue ? `(${citation.issue})` : ''}${citation.pages ? `, ${citation.pages}` : ''}.${citation.doi ? ` https://doi.org/${citation.doi}` : ''}`
      }).join('\n\n')
    } else {
      // Default or other formats could be implemented similarly
      formatted = allCitations.map(citation => 
        `${citation.authors.join(', ')}. ${citation.title}. ${citation.year || 'n.d.'}.`
      ).join('\n\n')
    }
    
    setFormattedReferences(formatted)
  }
  
  // Handle template selection
  const handleTemplateChange = (value: string) => {
    if (onTemplateChange) {
      onTemplateChange(value)
    }
  }
  
  // Add an empty citation to the manual list
  const addManualCitation = () => {
    const newCitation: Citation = {
      id: `citation-${Date.now()}`,
      type: 'article',
      title: '',
      authors: [''],
    }
    
    setManualCitations([...manualCitations, newCitation])
  }
  
  // Remove a manual citation
  const removeManualCitation = (id: string) => {
    setManualCitations(manualCitations.filter(c => c.id !== id))
  }
  
  // Generate references button handler
  const handleGenerateReferences = () => {
    formatCitations()
  }
  
  // Export references as a text file
  const exportReferences = () => {
    const element = document.createElement("a")
    const file = new Blob([formattedReferences], {type: 'text/plain'})
    element.href = URL.createObjectURL(file)
    element.download = `references-${citationFormat}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="citation-format">Citation Format</Label>
          <Select value={citationFormat} onValueChange={setCitationFormat}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              {CITATION_FORMATS.map(format => (
                <SelectItem key={format.id} value={format.id}>
                  {format.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="publisher-template">Publisher Template</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {PUBLISHER_TEMPLATES.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Separator />
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Research Papers ({selectedPapers.length})</h3>
        {selectedPapers.length > 0 ? (
          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {selectedPapers.map(paper => (
              <div key={paper.id} className="text-sm p-2 border rounded bg-gray-50">
                <div className="font-medium">{paper.title}</div>
                <div className="text-xs text-gray-500">
                  {paper.authors ? 
                    paper.authors.map((a: any) => {
                      if (typeof a === 'string') return a;
                      if (a && typeof a === 'object' && 'name' in a) return a.name || '';
                      return '';
                    }).filter(Boolean).join(', ') 
                    : ''} ({paper.year || ''})
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No papers selected from research session</p>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Manual Citations ({manualCitations.length})</h3>
          <Button variant="outline" size="sm" onClick={addManualCitation}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
        
        {manualCitations.length > 0 ? (
          <div className="space-y-3 max-h-[200px] overflow-y-auto p-1">
            {manualCitations.map((citation, index) => (
              <div key={citation.id} className="p-2 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Citation #{index + 1}</h4>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeManualCitation(citation.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <Label htmlFor={`title-${citation.id}`} className="text-xs">Title</Label>
                    <Input 
                      id={`title-${citation.id}`}
                      value={citation.title}
                      onChange={(e) => {
                        const updated = manualCitations.map(c => 
                          c.id === citation.id ? { ...c, title: e.target.value } : c
                        )
                        setManualCitations(updated)
                      }}
                      className="h-7 text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`authors-${citation.id}`} className="text-xs">Authors (comma separated)</Label>
                    <Input 
                      id={`authors-${citation.id}`}
                      value={citation.authors.join(', ')}
                      onChange={(e) => {
                        const updated = manualCitations.map(c => 
                          c.id === citation.id ? { ...c, authors: e.target.value.split(',').map(a => a.trim()) } : c
                        )
                        setManualCitations(updated)
                      }}
                      className="h-7 text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor={`year-${citation.id}`} className="text-xs">Year</Label>
                      <Input 
                        id={`year-${citation.id}`}
                        value={citation.year || ''}
                        onChange={(e) => {
                          const updated = manualCitations.map(c => 
                            c.id === citation.id ? { ...c, year: e.target.value } : c
                          )
                          setManualCitations(updated)
                        }}
                        className="h-7 text-sm"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`journal-${citation.id}`} className="text-xs">Journal/Publication</Label>
                      <Input 
                        id={`journal-${citation.id}`}
                        value={citation.journal || ''}
                        onChange={(e) => {
                          const updated = manualCitations.map(c => 
                            c.id === citation.id ? { ...c, journal: e.target.value } : c
                          )
                          setManualCitations(updated)
                        }}
                        className="h-7 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No manual citations added</p>
        )}
      </div>
      
      <div className="flex gap-2 pt-2">
        <Button onClick={handleGenerateReferences} className="flex-1">
          <FileText className="h-4 w-4 mr-2" />
          Generate References
        </Button>
        
        {formattedReferences && (
          <Button variant="outline" onClick={exportReferences}>
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {formattedReferences && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Formatted References</h3>
          <div className="border rounded-md p-3 bg-gray-50 whitespace-pre-wrap text-sm font-mono overflow-auto max-h-[300px]">
            {formattedReferences}
          </div>
        </div>
      )}
    </div>
  )
}

export default CitationManager
