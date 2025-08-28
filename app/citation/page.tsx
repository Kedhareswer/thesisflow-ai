"use client"

import React, { useState, useCallback } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { Copy, Check, BookOpen, Globe, FileText, Search, Download, Plus, X, ChevronDown, GraduationCap, Newspaper, Users, Briefcase, FileCode, Library } from "lucide-react"

interface Citation {
  type: 'article' | 'book' | 'website' | 'conference' | 'thesis' | 'report';
  title: string;
  authors: string[];
  year?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  conference?: string;
  edition?: string;
  accessDate?: string;
}

interface FormattedCitation {
  apa: string;
  mla: string;
  chicago: string;
  harvard: string;
  ieee: string;
  vancouver: string;
  bibtex: string;
}

const citationStyles = [
  { id: 'apa', label: 'APA 7th', icon: GraduationCap, description: 'American Psychological Association' },
  { id: 'mla', label: 'MLA 9th', icon: BookOpen, description: 'Modern Language Association' },
  { id: 'chicago', label: 'Chicago', icon: Newspaper, description: 'Chicago Manual of Style' },
  { id: 'harvard', label: 'Harvard', icon: Library, description: 'Harvard Referencing' },
  { id: 'ieee', label: 'IEEE', icon: FileCode, description: 'Institute of Electrical Engineers' },
  { id: 'vancouver', label: 'Vancouver', icon: Briefcase, description: 'Biomedical Publications' },
];

const sourceTypes = [
  { id: 'article', label: 'Journal Article', icon: FileText },
  { id: 'book', label: 'Book', icon: BookOpen },
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'conference', label: 'Conference', icon: Users },
  { id: 'thesis', label: 'Thesis', icon: GraduationCap },
  { id: 'report', label: 'Report', icon: Briefcase },
];

export default function CitationPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('apa')
  const [selectedType, setSelectedType] = useState('article')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [currentCitation, setCurrentCitation] = useState<Citation | null>(null)
  const [formattedCitations, setFormattedCitations] = useState<FormattedCitation | null>(null)
  const [bibliography, setBibliography] = useState<Array<{ citation: Citation, formatted: FormattedCitation }>>([])
  const [showStyleDropdown, setShowStyleDropdown] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  
  // Manual entry fields
  const [manualData, setManualData] = useState<Citation>({
    type: 'article',
    title: '',
    authors: [''],
    year: '',
    journal: '',
    volume: '',
    issue: '',
    pages: '',
    doi: '',
    url: '',
    publisher: ''
  })

  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) {
      setError('Please enter a DOI or URL')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/citation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: searchInput,
          type: 'auto'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch citation')
      }

      const data = await response.json()
      setCurrentCitation(data.citation)
      setFormattedCitations(data.formatted)
    } catch (err) {
      console.error('Citation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate citation')
    } finally {
      setIsLoading(false)
    }
  }, [searchInput])

  const handleManualSubmit = useCallback(async () => {
    if (!manualData.title || manualData.authors.filter(a => a).length === 0) {
      setError('Please enter at least a title and one author')
      return
    }

    const cleanedData = {
      ...manualData,
      authors: manualData.authors.filter(a => a.trim())
    }

    // Format the manual citation
    const { citationService } = await import('@/lib/services/citation.service')
    const formatted = citationService.formatCitation(cleanedData)
    
    setCurrentCitation(cleanedData)
    setFormattedCitations(formatted)
    setManualMode(false)
  }, [manualData])

  const handleCopy = useCallback((text: string, style: string) => {
    navigator.clipboard.writeText(text)
    setCopied(style)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const handleAddToBibliography = useCallback(() => {
    if (currentCitation && formattedCitations) {
      setBibliography(prev => [...prev, { citation: currentCitation, formatted: formattedCitations }])
      setCurrentCitation(null)
      setFormattedCitations(null)
      setSearchInput('')
    }
  }, [currentCitation, formattedCitations])

  const handleExportBibliography = useCallback(() => {
    const style = selectedStyle as keyof FormattedCitation
    const text = bibliography.map(item => item.formatted[style]).join('\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bibliography-${selectedStyle}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [bibliography, selectedStyle])

  const handleAddAuthor = useCallback(() => {
    setManualData(prev => ({
      ...prev,
      authors: [...prev.authors, '']
    }))
  }, [])

  const handleUpdateAuthor = useCallback((index: number, value: string) => {
    setManualData(prev => ({
      ...prev,
      authors: prev.authors.map((a, i) => i === index ? value : a)
    }))
  }, [])

  const handleRemoveAuthor = useCallback((index: number) => {
    setManualData(prev => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index)
    }))
  }, [])

  const selectedStyleInfo = citationStyles.find(s => s.id === selectedStyle)!
  
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="flex-1">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="mx-auto max-w-7xl px-6 py-12">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    Citation Generator
                  </h1>
                  <p className="mt-3 text-blue-100 max-w-2xl text-lg">
                    Generate accurate academic citations in multiple formats. Search by DOI, URL, or enter manually.
                  </p>
                </div>
                
                {/* Style Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                    className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-5 py-3 hover:bg-white/20 transition-colors"
                  >
                    <selectedStyleInfo.icon className="h-5 w-5" />
                    <span className="font-medium">{selectedStyleInfo.label}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  
                  {showStyleDropdown && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-blue-100 overflow-hidden z-50">
                      {citationStyles.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => {
                            setSelectedStyle(style.id)
                            setShowStyleDropdown(false)
                          }}
                          className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-blue-50 transition-colors ${
                            selectedStyle === style.id ? 'bg-blue-100' : ''
                          }`}
                        >
                          <style.icon className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="text-left">
                            <div className="font-medium text-gray-900">{style.label}</div>
                            <div className="text-sm text-gray-500">{style.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="mx-auto max-w-7xl px-6 py-8">
            {/* Search Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Enter DOI (e.g., 10.1038/nature12373) or URL..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isLoading || !searchInput.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                  <Search className="h-4 w-4" />
                  Search
                </button>
                <button
                  onClick={() => setManualMode(!manualMode)}
                  className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Manual Entry
                </button>
              </div>
              
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Manual Entry Form */}
            {manualMode && (
              <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Citation Entry</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={manualData.type}
                      onChange={(e) => setManualData(prev => ({ ...prev, type: e.target.value as Citation['type'] }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      {sourceTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={manualData.title}
                      onChange={(e) => setManualData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      placeholder="Enter title..."
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Authors *</label>
                  {manualData.authors.map((author, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => handleUpdateAuthor(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                        placeholder="Full name (e.g., John Smith)"
                      />
                      {manualData.authors.length > 1 && (
                        <button
                          onClick={() => handleRemoveAuthor(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleAddAuthor}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Author
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input
                      type="text"
                      value={manualData.year}
                      onChange={(e) => setManualData(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      placeholder="2024"
                    />
                  </div>
                  
                  {(manualData.type === 'article' || manualData.type === 'conference') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Journal/Conference</label>
                        <input
                          type="text"
                          value={manualData.journal}
                          onChange={(e) => setManualData(prev => ({ ...prev, journal: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Volume</label>
                        <input
                          type="text"
                          value={manualData.volume}
                          onChange={(e) => setManualData(prev => ({ ...prev, volume: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}
                  
                  {manualData.type === 'book' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Publisher</label>
                      <input
                        type="text"
                        value={manualData.publisher}
                        onChange={(e) => setManualData(prev => ({ ...prev, publisher: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DOI</label>
                    <input
                      type="text"
                      value={manualData.doi}
                      onChange={(e) => setManualData(prev => ({ ...prev, doi: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      placeholder="10.1234/example"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                    <input
                      type="text"
                      value={manualData.url}
                      onChange={(e) => setManualData(prev => ({ ...prev, url: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setManualMode(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleManualSubmit}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium"
                  >
                    Generate Citation
                  </button>
                </div>
              </div>
            )}

            {/* Citation Result */}
            {currentCitation && formattedCitations && (
              <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{currentCitation.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {currentCitation.authors.join(', ')} {currentCitation.year && `(${currentCitation.year})`}
                    </p>
                    {currentCitation.journal && (
                      <p className="text-sm text-gray-500">{currentCitation.journal}</p>
                    )}
                  </div>
                  <button
                    onClick={handleAddToBibliography}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Add to Bibliography
                  </button>
                </div>

                <div className="space-y-3">
                  {citationStyles.map((style) => {
                    const citationText = formattedCitations[style.id as keyof FormattedCitation]
                    return (
                      <div key={style.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{style.label}</span>
                          <button
                            onClick={() => handleCopy(citationText, style.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            {copied === style.id ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-500" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded">
                          {citationText}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Bibliography */}
            {bibliography.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Bibliography ({bibliography.length} {bibliography.length === 1 ? 'citation' : 'citations'})
                  </h3>
                  <button
                    onClick={handleExportBibliography}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Export {selectedStyleInfo.label}
                  </button>
                </div>
                
                <div className="space-y-3">
                  {bibliography.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-800 font-mono">
                            {item.formatted[selectedStyle as keyof FormattedCitation]}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setBibliography(prev => prev.filter((_, i) => i !== index))
                          }}
                          className="ml-3 p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
