'use client'

import React from 'react'

interface TableData {
  headers: string[]
  rows: string[][]
}

interface ChartData {
  type: 'bar' | 'line' | 'pie'
  title: string
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string
    borderWidth?: number
  }[]
}

interface HighlightBox {
  type: 'info' | 'warning' | 'success' | 'error'
  title: string
  content: string
}

interface RichContentProps {
  content: string
  tables?: TableData[]
  charts?: ChartData[]
  highlights?: HighlightBox[]
  metadata?: {
    totalPapers?: number
    sources?: string[]
    executiveSummary?: string
    keyFindings?: string[]
  }
}

export const RichContentRenderer: React.FC<RichContentProps> = ({
  content,
  tables = [],
  charts = [],
  highlights = [],
  metadata
}) => {
  
  const renderMarkdown = (text: string) => {
    return text
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mb-4 mt-6">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-gray-800 mb-3 mt-5">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium text-gray-700 mb-2 mt-4">$1</h3>')
      .replace(/^\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/^\*(.*?)\*/gim, '<em class="italic text-gray-700">$1</em>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-gray-700 mb-1">$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4 list-decimal text-gray-700 mb-1">$2</li>')
      .replace(/\n\n/g, '</p><p class="mb-3 text-gray-700">')
      .replace(/\n/g, '<br>')
  }

  const getHighlightStyles = (type: string) => {
    const styles = {
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800'
    }
    return styles[type as keyof typeof styles] || styles.info
  }

  const getChartOptions = (title: string) => ({
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  })

  return (
    <div className="max-w-none prose prose-lg">
      
      {/* Metadata Section */}
      {metadata && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Research Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metadata.totalPapers && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{metadata.totalPapers}</div>
                <div className="text-sm text-gray-600">Papers Analyzed</div>
              </div>
            )}
            {metadata.sources && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-green-600">{metadata.sources.length}</div>
                <div className="text-sm text-gray-600">Data Sources</div>
              </div>
            )}
          </div>
          
          {metadata.executiveSummary && (
            <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2">Executive Summary</h4>
              <p className="text-sm text-gray-700">{metadata.executiveSummary}</p>
            </div>
          )}
        </div>
      )}

      {/* Key Findings Highlights */}
      {metadata?.keyFindings && metadata.keyFindings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">🔍 Key Findings</h3>
          <ul className="space-y-2">
            {metadata.keyFindings.map((finding, index) => (
              <li key={index} className="flex items-start">
                <span className="w-6 h-6 bg-yellow-200 text-yellow-800 rounded-full text-xs flex items-center justify-center font-medium mr-3 mt-0.5 shrink-0">
                  {index + 1}
                </span>
                <span className="text-yellow-800">{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Highlight Boxes */}
      {highlights.map((highlight, index) => (
        <div key={index} className={`border rounded-lg p-4 mb-4 ${getHighlightStyles(highlight.type)}`}>
          <h4 className="font-semibold mb-2">{highlight.title}</h4>
          <p className="text-sm">{highlight.content}</p>
        </div>
      ))}

      {/* Charts - Simple CSS-based visualizations */}
      {charts.map((chart, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">{chart.title}</h4>
          
          {chart.type === 'bar' && (
            <div className="space-y-3">
              {chart.labels.map((label, labelIndex) => {
                const value = chart.datasets[0]?.data[labelIndex] || 0
                const maxValue = Math.max(...(chart.datasets[0]?.data || []))
                const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0
                
                return (
                  <div key={labelIndex} className="flex items-center space-x-3">
                    <div className="w-24 text-sm font-medium text-gray-700 truncate">{label}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                      <div 
                        className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-xs font-medium text-white">{value}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {chart.type === 'pie' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                {chart.labels.map((label, labelIndex) => {
                  const value = chart.datasets[0]?.data[labelIndex] || 0
                  const total = chart.datasets[0]?.data.reduce((sum, val) => sum + val, 0) || 1
                  const percentage = ((value / total) * 100).toFixed(1)
                  
                  return (
                    <div key={labelIndex} className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: `hsl(${labelIndex * 60}, 70%, 50%)` }}
                      ></div>
                      <span className="text-sm text-gray-700">{label}: {percentage}%</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {chart.datasets[0]?.data.reduce((sum, val) => sum + val, 0) || 0}
                  </div>
                  <div className="text-sm text-gray-500">Total</div>
                </div>
              </div>
            </div>
          )}

          {chart.type === 'line' && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600 mb-2">Trend Analysis</div>
              {chart.labels.map((label, labelIndex) => {
                const value = chart.datasets[0]?.data[labelIndex] || 0
                const prevValue = chart.datasets[0]?.data[labelIndex - 1] || 0
                const trend = labelIndex > 0 ? (value > prevValue ? '↗️' : value < prevValue ? '↘️' : '➡️') : '➡️'
                
                return (
                  <div key={labelIndex} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{trend}</span>
                      <span className="text-sm font-semibold text-gray-900">{value}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {/* Tables */}
      {tables.map((table, index) => (
        <div key={index} className="overflow-x-auto mb-6">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                {table.headers.map((header, headerIndex) => (
                  <th key={headerIndex} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Main Content */}
      <div 
        className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ 
          __html: `<p class="mb-3 text-gray-700">${renderMarkdown(content)}</p>`
        }}
      />

      {/* Sources Footer */}
      {metadata?.sources && metadata.sources.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Data Sources</h4>
          <div className="flex flex-wrap gap-2">
            {metadata.sources.map((source, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      )}
      
    </div>
  )
}

export default RichContentRenderer
