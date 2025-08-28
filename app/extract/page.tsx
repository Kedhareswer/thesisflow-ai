"use client"

import React, { useState, useRef } from "react"
import Sidebar from "../ai-agents/components/Sidebar"
import { FileText, Upload, Download, Copy, Check, ChevronDown, Table, FileJson, FileSpreadsheet, FileCode, Sparkles, BarChart3, Hash, Calendar, Mail, Link, AlertCircle, Loader2 } from "lucide-react"

type ExtractionType = 'text' | 'tables' | 'metadata' | 'summary' | 'all';
type OutputFormat = 'json' | 'csv' | 'text' | 'markdown';

interface ExtractedData {
  text?: string;
  tables?: Array<{
    id: string;
    headers: string[];
    rows: string[][];
  }>;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    wordCount?: number;
  };
  summary?: string;
  keyPoints?: string[];
  entities?: Array<{
    type: string;
    value: string;
    count: number;
  }>;
  statistics?: {
    totalWords: number;
    totalSentences: number;
    totalParagraphs: number;
    avgWordsPerSentence: number;
    readingTime: number;
  };
}

export default function ExtractDataPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [inputText, setInputText] = useState('')
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [extractionType, setExtractionType] = useState<ExtractionType>('all')
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('json')
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [showFormatDropdown, setShowFormatDropdown] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const extractionTypes = [
    { value: 'all', label: 'Extract Everything', icon: Sparkles, description: 'Text, tables, metadata, summary, and entities' },
    { value: 'text', label: 'Text Content', icon: FileText, description: 'Extract plain text content' },
    { value: 'tables', label: 'Tables Only', icon: Table, description: 'Extract tabular data' },
    { value: 'metadata', label: 'Metadata', icon: Hash, description: 'Document properties and statistics' },
    { value: 'summary', label: 'Summary & Key Points', icon: BarChart3, description: 'AI-generated summary and highlights' },
  ] as const;

  const outputFormats = [
    { value: 'json', label: 'JSON', icon: FileJson, description: 'Structured JSON format' },
    { value: 'markdown', label: 'Markdown', icon: FileCode, description: 'Formatted markdown document' },
    { value: 'csv', label: 'CSV', icon: FileSpreadsheet, description: 'Comma-separated values (tables only)' },
    { value: 'text', label: 'Plain Text', icon: FileText, description: 'Simple text format' },
  ] as const;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/plain' && !file.type.includes('text')) {
      setError('Please upload a text file (.txt, .md, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setInputText(text);
      setError('');
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleExtract = async () => {
    if (!inputText.trim()) {
      setError('Please enter or upload text to extract data');
      return;
    }

    setIsExtracting(true);
    setError('');
    setExtractedData(null);

    try {
      const response = await fetch('/api/extract-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          options: {
            type: extractionType,
            format: outputFormat,
            extractTables: true
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Extraction failed');
      }

      const result = await response.json();
      setExtractedData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract data');
    } finally {
      setIsExtracting(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadExtractedData = () => {
    if (!extractedData) return;

    let content = '';
    let filename = 'extracted-data';
    let mimeType = 'text/plain';

    switch (outputFormat) {
      case 'json':
        content = JSON.stringify(extractedData, null, 2);
        filename += '.json';
        mimeType = 'application/json';
        break;
      case 'csv':
        if (extractedData.tables && extractedData.tables.length > 0) {
          content = extractedData.tables.map(table => {
            const csv = [table.headers.join(',')];
            table.rows.forEach(row => {
              csv.push(row.map(cell => `"${cell}"`).join(','));
            });
            return csv.join('\n');
          }).join('\n\n');
        }
        filename += '.csv';
        mimeType = 'text/csv';
        break;
      case 'markdown':
        content = formatAsMarkdown(extractedData);
        filename += '.md';
        mimeType = 'text/markdown';
        break;
      default:
        content = extractedData.text || '';
        filename += '.txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatAsMarkdown = (data: ExtractedData): string => {
    let md = '';

    if (data.metadata?.title) {
      md += `# ${data.metadata.title}\n\n`;
    }

    if (data.summary) {
      md += `## Summary\n\n${data.summary}\n\n`;
    }

    if (data.keyPoints && data.keyPoints.length > 0) {
      md += `## Key Points\n\n`;
      data.keyPoints.forEach(point => {
        md += `- ${point}\n`;
      });
      md += '\n';
    }

    if (data.statistics) {
      md += `## Statistics\n\n`;
      md += `- **Words**: ${data.statistics.totalWords}\n`;
      md += `- **Sentences**: ${data.statistics.totalSentences}\n`;
      md += `- **Reading Time**: ${data.statistics.readingTime} min\n\n`;
    }

    return md;
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'url': return Link;
      case 'date': return Calendar;
      default: return Hash;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              Extract Data
            </h1>
            <p className="mt-2 text-gray-600">
              Extract structured information, tables, and insights from your text
            </p>
          </div>

          {/* Controls */}
          <div className="mb-6 flex flex-wrap gap-4 justify-center">
            {/* Extraction Type Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
              >
                {extractionTypes.find(t => t.value === extractionType)?.icon && 
                  React.createElement(extractionTypes.find(t => t.value === extractionType)!.icon, { className: "w-4 h-4 text-green-600" })}
                <span>{extractionTypes.find(t => t.value === extractionType)?.label}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {showTypeDropdown && (
                <div className="absolute z-10 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200">
                  {extractionTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setExtractionType(type.value as ExtractionType);
                        setShowTypeDropdown(false);
                      }}
                      className="flex items-start gap-3 w-full px-4 py-3 hover:bg-green-50 transition-colors text-left"
                    >
                      <type.icon className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-gray-900">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Output Format Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFormatDropdown(!showFormatDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
              >
                {outputFormats.find(f => f.value === outputFormat)?.icon && 
                  React.createElement(outputFormats.find(f => f.value === outputFormat)!.icon, { className: "w-4 h-4 text-green-600" })}
                <span>{outputFormats.find(f => f.value === outputFormat)?.label}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {showFormatDropdown && (
                <div className="absolute z-10 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200">
                  {outputFormats.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => {
                        setOutputFormat(format.value as OutputFormat);
                        setShowFormatDropdown(false);
                      }}
                      className="flex items-start gap-3 w-full px-4 py-3 hover:bg-green-50 transition-colors text-left"
                    >
                      <format.icon className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-gray-900">{format.label}</div>
                        <div className="text-xs text-gray-500">{format.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Input Text</h2>
                </div>

                <div className="space-y-4">
                  {/* File Upload */}
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".txt,.md,.rtf,text/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors w-full justify-center"
                    >
                      <Upload className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Upload text file</span>
                    </button>
                  </div>

                  {/* Text Area */}
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste your text here or upload a file..."
                    className="w-full h-64 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />

                  {/* Extract Button */}
                  <button
                    onClick={handleExtract}
                    disabled={!inputText.trim() || isExtracting}
                    className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Extracting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Extract Data</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Output Section */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Extracted Data</h2>
                  </div>
                  {extractedData && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(extractedData, null, 2), 'all')}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors"
                      >
                        {copied === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copied === 'all' ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={downloadExtractedData}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-red-800">Error</div>
                      <div className="text-sm text-red-600">{error}</div>
                    </div>
                  </div>
                )}

                {!extractedData && !isExtracting && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Extract</h3>
                    <p className="text-gray-500">Enter text and click "Extract Data" to analyze your content</p>
                  </div>
                )}

                {extractedData && (
                  <div className="space-y-6">
                    {/* Statistics */}
                    {extractedData.statistics && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-green-700">{extractedData.statistics.totalWords.toLocaleString()}</div>
                          <div className="text-sm text-green-600">Words</div>
                        </div>
                        <div className="bg-teal-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-teal-700">{extractedData.statistics.readingTime}</div>
                          <div className="text-sm text-teal-600">Min Read</div>
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {extractedData.summary && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                        <p className="text-gray-700 text-sm">{extractedData.summary}</p>
                      </div>
                    )}

                    {/* Key Points */}
                    {extractedData.keyPoints && extractedData.keyPoints.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Key Points</h4>
                        <ul className="space-y-1">
                          {extractedData.keyPoints.map((point, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tables */}
                    {extractedData.tables && extractedData.tables.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Tables ({extractedData.tables.length})</h4>
                        {extractedData.tables.map((table, index) => (
                          <div key={table.id} className="mb-4">
                            <div className="text-sm text-gray-600 mb-1">Table {index + 1}</div>
                            <div className="overflow-x-auto border rounded-lg">
                              <table className="w-full text-sm">
                                <thead className="bg-green-50">
                                  <tr>
                                    {table.headers.map((header, i) => (
                                      <th key={i} className="px-3 py-2 text-left font-medium text-green-800">
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {table.rows.slice(0, 3).map((row, i) => (
                                    <tr key={i} className="border-t">
                                      {row.map((cell, j) => (
                                        <td key={j} className="px-3 py-2 text-gray-700">
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {table.rows.length > 3 && (
                                <div className="px-3 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                                  +{table.rows.length - 3} more rows
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Entities */}
                    {extractedData.entities && extractedData.entities.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Entities</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {extractedData.entities.slice(0, 8).map((entity, index) => {
                            const IconComponent = getEntityIcon(entity.type);
                            return (
                              <div key={index} className="flex items-center gap-2 text-sm bg-gray-50 rounded-md px-3 py-2">
                                <IconComponent className="w-4 h-4 text-green-600" />
                                <span className="flex-1 truncate">{entity.value}</span>
                                <span className="text-xs text-gray-500">×{entity.count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
