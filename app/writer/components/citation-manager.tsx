"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useResearchSession } from "@/components/research-session-provider"
import { FileText, Plus, Trash2, Download, BookOpen, ChevronDown, ChevronUp } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Citation format types
const CITATION_FORMATS = [
  { id: "apa", name: "APA", description: "American Psychological Association" },
  { id: "mla", name: "MLA", description: "Modern Language Association" },
  { id: "chicago", name: "Chicago", description: "Chicago Manual of Style" },
  { id: "ieee", name: "IEEE", description: "Institute of Electrical and Electronics Engineers" },
  { id: "harvard", name: "Harvard", description: "Harvard referencing system" },
]

// Template formats for different publishers
const PUBLISHER_TEMPLATES = [
  { id: "ieee", name: "IEEE", description: "Institute of Electrical and Electronics Engineers" },
  { id: "acm", name: "ACM", description: "Association for Computing Machinery" },
  { id: "springer", name: "Springer", description: "Springer Nature publications" },
  { id: "elsevier", name: "Elsevier", description: "Elsevier journal publications" },
  { id: "general", name: "General", description: "General academic format" },
]

interface Citation {
  id: string
  type: "article" | "book" | "chapter" | "website" | "other"
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
  compact?: boolean
}

export function CitationManager({ selectedTemplate, onTemplateChange, compact = false }: CitationManagerProps) {
  const [citationFormat, setCitationFormat] = useState("ieee")
  const [manualCitations, setManualCitations] = useState<Citation[]>([])
  const [formattedReferences, setFormattedReferences] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(!compact)
  const [isPapersOpen, setIsPapersOpen] = useState(!compact)
  const [isManualOpen, setIsManualOpen] = useState(false)

  // Get research session data
  const { session, getSelectedPapers } = useResearchSession()
  const selectedPapers = getSelectedPapers()

  // Convert selected papers from research session to Citation format
  const papersToCitations = (): Citation[] => {
    return selectedPapers.map((paper) => {
      // Safe access to nested properties with type checking
      const getAuthorName = (author: any): string => {
        if (typeof author === "string") return author
        if (author && typeof author === "object" && "name" in author) return author.name || ""
        return ""
      }

      const getJournalProperty = (paper: any, prop: string): string | undefined => {
        if (!paper.journal) return undefined
        if (typeof paper.journal === "string") return prop === "title" ? paper.journal : undefined
        if (typeof paper.journal === "object" && prop in paper.journal) {
          const value = paper.journal[prop]
          return value !== null && value !== undefined ? String(value) : undefined
        }
        return undefined
      }

      return {
        id: paper.id || `paper-${Math.random().toString(36).substring(2)}`,
        type: "article" as const,
        title: paper.title || "",
        authors: Array.isArray(paper.authors) ? paper.authors.map(getAuthorName) : [],
        year: paper.year ? String(paper.year) : undefined,
        journal: getJournalProperty(paper, "title"),
        volume: getJournalProperty(paper, "volume"),
        issue: getJournalProperty(paper, "issue"),
        pages: getJournalProperty(paper, "pages"),
        doi: typeof paper.doi === "string" ? paper.doi : undefined,
        url: typeof paper.url === "string" ? paper.url : undefined,
      }
    })
  }

  // Format citations based on selected format
  const formatCitations = () => {
    setIsGenerating(true)

    setTimeout(() => {
      const allCitations = [...papersToCitations(), ...manualCitations]
      let formatted = ""

      if (citationFormat === "ieee") {
        formatted = allCitations
          .map((citation, index) => {
            const authors = citation.authors.join(", ")
            return `[${index + 1}] ${authors}, "${citation.title}," ${citation.journal ? `in ${citation.journal}, ` : ""}${citation.volume ? `vol. ${citation.volume}, ` : ""}${citation.issue ? `no. ${citation.issue}, ` : ""}${citation.pages ? `pp. ${citation.pages}, ` : ""}${citation.year || ""}.${citation.doi ? ` doi: ${citation.doi}.` : ""}`
          })
          .join("\n\n")
      } else if (citationFormat === "apa") {
        formatted = allCitations
          .map((citation) => {
            const lastAuthorIndex = citation.authors.length - 1
            const authors =
              lastAuthorIndex > 0
                ? citation.authors.slice(0, lastAuthorIndex).join(", ") + ", & " + citation.authors[lastAuthorIndex]
                : citation.authors.join("")

            return `${authors}. (${citation.year || "n.d."}). ${citation.title}. ${citation.journal || ""}${citation.volume ? `, ${citation.volume}` : ""}${citation.issue ? `(${citation.issue})` : ""}${citation.pages ? `, ${citation.pages}` : ""}.${citation.doi ? ` https://doi.org/${citation.doi}` : ""}`
          })
          .join("\n\n")
      } else {
        formatted = allCitations
          .map((citation) => `${citation.authors.join(", ")}. ${citation.title}. ${citation.year || "n.d."}.`)
          .join("\n\n")
      }

      setFormattedReferences(formatted)
      setIsGenerating(false)
    }, 1000)
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
      type: "article",
      title: "",
      authors: [""],
    }
    setManualCitations([...manualCitations, newCitation])
    setIsManualOpen(true)
  }

  // Remove a manual citation
  const removeManualCitation = (id: string) => {
    setManualCitations(manualCitations.filter((c) => c.id !== id))
  }

  // Export references as a text file
  const exportReferences = () => {
    const element = document.createElement("a")
    const file = new Blob([formattedReferences], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `references-${citationFormat}.txt`
    element.style.display = 'none' // Hide the element
    
    // Add to DOM
    document.body.appendChild(element)
    
    // Trigger download
    element.click()
    
    // Clean up with proper error handling
    try {
      if (element.parentNode) {
        document.body.removeChild(element)
      }
    } catch (removeError) {
      console.warn('Could not remove download element:', removeError)
    }
  }

  const totalCitations = papersToCitations().length + manualCitations.length

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Configuration Section - Collapsible in compact mode */}
        <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-8 text-xs">
              <span>Citation Settings</span>
              {isConfigOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1 block">Format</Label>
              <Select value={citationFormat} onValueChange={setCitationFormat}>
                <SelectTrigger className="h-8 text-xs border-gray-300 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {CITATION_FORMATS.map((format) => (
                    <SelectItem key={format.id} value={format.id} className="text-xs">
                      {format.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1 block">Template</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger className="h-8 text-xs border-gray-300 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {PUBLISHER_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id} className="text-xs">
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Research Papers Section - Compact */}
        <div>
          <Collapsible open={isPapersOpen} onOpenChange={setIsPapersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-8 text-xs">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-3 w-3 text-gray-600" />
                  <span>Research Papers</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-1">
                    {selectedPapers.length}
                  </Badge>
                </div>
                {isPapersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              {selectedPapers.length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedPapers.slice(0, 3).map((paper, index) => (
                    <div key={paper.id} className="p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                      <div className="font-medium text-gray-900 line-clamp-1 mb-1">{paper.title}</div>
                      <div className="text-gray-500 line-clamp-1">
                        {paper.authors
                          ? paper.authors
                              .map((a: any) => {
                                if (typeof a === "string") return a
                                if (a && typeof a === "object" && "name" in a) return a.name || ""
                                return ""
                              })
                              .filter(Boolean)
                              .slice(0, 2)
                              .join(", ")
                          : ""}{" "}
                        {paper.authors && paper.authors.length > 2 && "et al."} ({paper.year || "n.d."})
                      </div>
                    </div>
                  ))}
                  {selectedPapers.length > 3 && (
                    <div className="text-center text-xs text-gray-500 py-1">
                      +{selectedPapers.length - 3} more papers
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded border border-gray-200">
                  <BookOpen className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">No papers selected</p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Manual Citations Section - Compact */}
        <div>
          <Collapsible open={isManualOpen} onOpenChange={setIsManualOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-8 text-xs">
                <div className="flex items-center space-x-2">
                  <span>Manual Citations</span>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-1">
                    {manualCitations.length}
                  </Badge>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      addManualCitation()
                    }}
                    className="h-6 w-6 p-0 hover:bg-gray-100"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  {isManualOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              {manualCitations.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {manualCitations.map((citation, index) => (
                    <div key={citation.id} className="p-2 bg-gray-50 border border-gray-200 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-900">Citation #{index + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeManualCitation(citation.id)}
                          className="h-5 w-5 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Input
                          value={citation.title}
                          onChange={(e) => {
                            const updated = manualCitations.map((c) =>
                              c.id === citation.id ? { ...c, title: e.target.value } : c,
                            )
                            setManualCitations(updated)
                          }}
                          className="h-7 text-xs border-gray-300 bg-white"
                          placeholder="Title..."
                        />
                        <Input
                          value={citation.authors.join(", ")}
                          onChange={(e) => {
                            const updated = manualCitations.map((c) =>
                              c.id === citation.id
                                ? { ...c, authors: e.target.value.split(",").map((a) => a.trim()) }
                                : c,
                            )
                            setManualCitations(updated)
                          }}
                          className="h-7 text-xs border-gray-300 bg-white"
                          placeholder="Authors..."
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={citation.year || ""}
                            onChange={(e) => {
                              const updated = manualCitations.map((c) =>
                                c.id === citation.id ? { ...c, year: e.target.value } : c,
                              )
                              setManualCitations(updated)
                            }}
                            className="h-7 text-xs border-gray-300 bg-white"
                            placeholder="Year"
                          />
                          <Input
                            value={citation.journal || ""}
                            onChange={(e) => {
                              const updated = manualCitations.map((c) =>
                                c.id === citation.id ? { ...c, journal: e.target.value } : c,
                              )
                              setManualCitations(updated)
                            }}
                            className="h-7 text-xs border-gray-300 bg-white"
                            placeholder="Journal"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded border border-gray-200">
                  <FileText className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">No manual citations</p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Action Buttons - Compact */}
        <div className="flex gap-1 pt-2">
          <Button
            onClick={formatCitations}
            disabled={totalCitations === 0 || isGenerating}
            className="flex-1 h-8 text-xs bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <FileText className="h-3 w-3 mr-1" />
            {isGenerating ? "Generating..." : "Generate"}
          </Button>

          {formattedReferences && (
            <Button
              variant="outline"
              onClick={exportReferences}
              className="h-8 px-2 border-gray-300 bg-white hover:bg-gray-50"
            >
              <Download className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Summary - Compact */}
        {totalCitations > 0 && (
          <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>{totalCitations}</strong> citations • <strong>{citationFormat.toUpperCase()}</strong>
            </p>
          </div>
        )}

        {/* Formatted References Output - Compact */}
        {formattedReferences && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-gray-700">References</Label>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                {citationFormat.toUpperCase()}
              </Badge>
            </div>
            <div className="bg-white border border-gray-200 rounded p-3 max-h-40 overflow-y-auto">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                {formattedReferences}
              </pre>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Ready to copy</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(formattedReferences)
                }}
                className="h-6 px-2 text-xs hover:bg-gray-100"
              >
                Copy
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full version (non-compact) - keeping original implementation
  return (
    <div className="space-y-5">
      {/* Configuration Section */}
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
            Citation Format
          </Label>
          <Select value={citationFormat} onValueChange={setCitationFormat}>
            <SelectTrigger className="h-10 text-sm border-gray-300 bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-lg">
              {CITATION_FORMATS.map((format) => (
                <SelectItem key={format.id} value={format.id} className="text-sm hover:bg-gray-50 p-3">
                  <div>
                    <div className="font-medium">{format.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{format.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
            Publisher Template
          </Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
            <SelectTrigger className="h-10 text-sm border-gray-300 bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-lg">
              {PUBLISHER_TEMPLATES.map((template) => (
                <SelectItem key={template.id} value={template.id} className="text-sm hover:bg-gray-50 p-3">
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{template.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="bg-gray-200" />

      {/* Research Papers Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-gray-600" />
            <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Research Papers</Label>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {selectedPapers.length} papers
          </Badge>
        </div>

        {selectedPapers.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {selectedPapers.map((paper, index) => (
              <div
                key={paper.id}
                className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{paper.title}</div>
                    <div className="text-xs text-gray-500">
                      {paper.authors
                        ? paper.authors
                            .map((a: any) => {
                              if (typeof a === "string") return a
                              if (a && typeof a === "object" && "name" in a) return a.name || ""
                              return ""
                            })
                            .filter(Boolean)
                            .slice(0, 3)
                            .join(", ")
                        : ""}{" "}
                      {paper.authors && paper.authors.length > 3 && "et al."} ({paper.year || "n.d."})
                    </div>
                  </div>
                  <div className="ml-2 text-xs text-gray-400 font-mono">[{index + 1}]</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
            <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No papers selected from research session</p>
            <p className="text-xs text-gray-400 mt-1">Add papers from the Explorer to include them here</p>
          </div>
        )}
      </div>

      {/* Manual Citations Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Manual Citations</Label>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {manualCitations.length} citations
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={addManualCitation}
              className="h-8 px-3 text-xs border-gray-300 bg-white hover:bg-gray-50 transition-colors duration-200"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {manualCitations.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {manualCitations.map((citation, index) => (
              <div key={citation.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900">Citation #{index + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeManualCitation(citation.id)}
                    className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Title</Label>
                    <Input
                      value={citation.title}
                      onChange={(e) => {
                        const updated = manualCitations.map((c) =>
                          c.id === citation.id ? { ...c, title: e.target.value } : c,
                        )
                        setManualCitations(updated)
                      }}
                      className="h-8 text-sm border-gray-300 bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="Enter citation title..."
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Authors</Label>
                    <Input
                      value={citation.authors.join(", ")}
                      onChange={(e) => {
                        const updated = manualCitations.map((c) =>
                          c.id === citation.id ? { ...c, authors: e.target.value.split(",").map((a) => a.trim()) } : c,
                        )
                        setManualCitations(updated)
                      }}
                      className="h-8 text-sm border-gray-300 bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="Author 1, Author 2, Author 3..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Year</Label>
                      <Input
                        value={citation.year || ""}
                        onChange={(e) => {
                          const updated = manualCitations.map((c) =>
                            c.id === citation.id ? { ...c, year: e.target.value } : c,
                          )
                          setManualCitations(updated)
                        }}
                        className="h-8 text-sm border-gray-300 bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                        placeholder="2024"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Journal</Label>
                      <Input
                        value={citation.journal || ""}
                        onChange={(e) => {
                          const updated = manualCitations.map((c) =>
                            c.id === citation.id ? { ...c, journal: e.target.value } : c,
                          )
                          setManualCitations(updated)
                        }}
                        className="h-8 text-sm border-gray-300 bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                        placeholder="Journal name"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
            <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No manual citations added</p>
            <p className="text-xs text-gray-400 mt-1">Click "Add" to create manual citations</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={formatCitations}
          disabled={totalCitations === 0 || isGenerating}
          className="flex-1 h-9 text-sm bg-black text-white hover:bg-gray-800 shadow-sm transition-all duration-200 disabled:opacity-50"
        >
          <FileText className="h-4 w-4 mr-2" />
          {isGenerating ? "Generating..." : "Generate References"}
        </Button>

        {formattedReferences && (
          <Button
            variant="outline"
            onClick={exportReferences}
            className="h-9 px-3 border-gray-300 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Summary */}
      {totalCitations > 0 && (
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>{totalCitations}</strong> citations ready • <strong>{citationFormat.toUpperCase()}</strong> format
          </p>
        </div>
      )}

      {/* Formatted References Output */}
      {formattedReferences && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Formatted References</Label>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {citationFormat.toUpperCase()} Style
            </Badge>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {formattedReferences}
            </pre>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
            <span>Ready to copy and paste into your document</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(formattedReferences)
                // You could add a toast notification here
              }}
              className="h-6 px-2 text-xs hover:bg-gray-100"
            >
              Copy to Clipboard
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CitationManager
