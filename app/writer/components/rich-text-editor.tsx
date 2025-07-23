"use client"

import dynamic from "next/dynamic"
import MarkdownPreview from "@uiw/react-markdown-preview"
// import rehypeKatex from "rehype-katex" // Removed
// import "katex/dist/katex.min.css" // Removed

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false })

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function MarkdownEditor({ value, onChange, className }: MarkdownEditorProps) {
  return (
    <div className={`${className} bg-white rounded-lg border border-gray-200 overflow-hidden`} data-color-mode="light">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
        {/* Editor Panel */}
        <div className="border-r border-gray-200">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Editor</h3>
          </div>
          <div className="h-[600px]">
            <MDEditor
              value={value}
              onChange={(v) => onChange(v || "")}
              height={600}
              preview="edit"
              hideToolbar={false}
              data-color-mode="light"
              style={{
                backgroundColor: "transparent",
              }}
            />
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-white">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Preview</h3>
          </div>
          <div className="h-[600px] overflow-auto p-6">
            <div
              className="prose prose-sm max-w-none
              prose-headings:text-gray-900 prose-headings:font-semibold
              prose-p:text-gray-700 prose-p:leading-relaxed
              prose-strong:text-gray-900 prose-strong:font-semibold
              prose-em:text-gray-700
              prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-gray-900 prose-pre:text-gray-100
              prose-blockquote:text-gray-600 prose-blockquote:border-l-gray-900 prose-blockquote:border-l-4 prose-blockquote:pl-4
              prose-li:text-gray-700
              prose-ul:list-disc prose-ol:list-decimal
              prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6 prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-2
              prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5
              prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4
              prose-table:border-collapse prose-table:border prose-table:border-gray-300
              prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-2 prose-th:text-left prose-th:font-semibold
              prose-td:border prose-td:border-gray-300 prose-td:p-2
              prose-a:text-blue-600 prose-a:hover:text-blue-800 prose-a:no-underline hover:prose-a:underline
            "
            >
              <MarkdownPreview
                source={value || "*Write your research document here...*"}
                style={{ backgroundColor: "transparent" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MarkdownEditor
