"use client"

import dynamic from "next/dynamic"
import MarkdownPreview from "@uiw/react-markdown-preview"
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSafeDOM } from "../hooks/use-safe-dom"
import {
  Eye,
  Edit3,
  Maximize2,
  Minimize2,
  Type,
  AlignLeft,
  Bold,
  Italic,
  List,
  Link,
  ImageIcon,
  Code,
} from "lucide-react"

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false })

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function MarkdownEditor({ value, onChange, className }: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<"split" | "edit" | "preview">("split")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const editorRef = useRef<any>(null)

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const insertMarkdown = useCallback((syntax: string, placeholder = "") => {
    // Use setTimeout to ensure DOM is ready and avoid conflicts with React reconciliation
    setTimeout(() => {
      try {
        const textarea = document.querySelector(".w-md-editor-text-textarea") as HTMLTextAreaElement
        if (!textarea) {
          console.warn("Textarea not found for markdown insertion")
          return
        }

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = value.substring(start, end)
        const replacement = selectedText || placeholder

        let newText = ""
        if (syntax === "bold") {
          newText = `**${replacement}**`
        } else if (syntax === "italic") {
          newText = `*${replacement}*`
        } else if (syntax === "link") {
          newText = `[${replacement || "link text"}](url)`
        } else if (syntax === "image") {
          newText = `![${replacement || "alt text"}](image-url)`
        } else if (syntax === "code") {
          newText = `\`${replacement}\``
        } else if (syntax === "list") {
          newText = `- ${replacement || "list item"}`
        }

        const newValue = value.substring(0, start) + newText + value.substring(end)
        onChange(newValue)
      } catch (error) {
        console.warn("Error inserting markdown:", error)
      }
    }, 0)
  }, [value, onChange])

  return (
    <div
      className={`${className} bg-white rounded-lg border border-gray-200 overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      }`}
      data-color-mode="light"
    >
      {/* Enhanced Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* View Mode Selector */}
            <div className="flex items-center bg-white border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode("edit")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "edit" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Edit3 className="h-4 w-4 mr-1.5 inline" />
                Edit
              </button>
              <button
                onClick={() => setViewMode("split")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "split"
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <AlignLeft className="h-4 w-4 mr-1.5 inline" />
                Split
              </button>
              <button
                onClick={() => setViewMode("preview")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "preview"
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Eye className="h-4 w-4 mr-1.5 inline" />
                Preview
              </button>
            </div>

            {/* Quick Format Buttons */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
          size="sm"
                onClick={() => insertMarkdown("bold", "bold text")}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
          size="sm"
                onClick={() => insertMarkdown("italic", "italic text")}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
          size="sm"
                onClick={() => insertMarkdown("link")}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Link"
              >
                <Link className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
          size="sm"
                onClick={() => insertMarkdown("image")}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Image"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
        <Button
          variant="ghost"
          size="sm"
                onClick={() => insertMarkdown("list")}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="List"
              >
                <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
                onClick={() => insertMarkdown("code", "code")}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Inline Code"
              >
                <Code className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Word Count Badge */}
            <Badge variant="outline" className="bg-white text-gray-600 border-gray-300">
              <Type className="h-3 w-3 mr-1" />
              {
                value
                  .trim()
                  .split(/\s+/)
                  .filter((word) => word.length > 0).length
              }{" "}
              words
            </Badge>

            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0 hover:bg-gray-200"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className={`${isFullscreen ? "h-[calc(100vh-73px)]" : "h-[600px]"}`}>
        {viewMode === "split" && (
          <div className="grid grid-cols-2 h-full">
            {/* Editor Panel */}
            <div className="border-r border-gray-200 bg-white">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 flex items-center">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Editor
                </h3>
              </div>
              <div className="h-[calc(100%-41px)]">
                <MDEditor
                  value={value}
                  onChange={(v) => onChange(v || "")}
                  height="100%"
                  preview="edit"
                  hideToolbar={true}
                  data-color-mode="light"
                  style={{ backgroundColor: "transparent" }}
                />
              </div>
            </div>

            {/* Preview Panel */}
            <div className="bg-white">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </h3>
              </div>
              <div className="h-[calc(100%-41px)] overflow-auto p-6">
                <div
                  className="prose prose-sm max-w-none
                  prose-headings:text-gray-900 prose-headings:font-semibold prose-headings:tracking-tight
                  prose-p:text-gray-700 prose-p:leading-relaxed
                  prose-strong:text-gray-900 prose-strong:font-semibold
                  prose-em:text-gray-700 prose-em:italic
                  prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
                  prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4
                  prose-blockquote:text-gray-600 prose-blockquote:border-l-gray-900 prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:italic
                  prose-li:text-gray-700 prose-li:leading-relaxed
                  prose-ul:list-disc prose-ol:list-decimal
                  prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-3
                  prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-6
                  prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-5
                  prose-h4:text-lg prose-h4:mb-2 prose-h4:mt-4
                  prose-table:border-collapse prose-table:border prose-table:border-gray-300 prose-table:rounded-lg prose-table:overflow-hidden
                  prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-3 prose-th:text-left prose-th:font-semibold prose-th:text-gray-900
                  prose-td:border prose-td:border-gray-300 prose-td:p-3 prose-td:text-gray-700
                  prose-a:text-blue-600 prose-a:hover:text-blue-800 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
                  prose-img:rounded-lg prose-img:shadow-sm
                "
                >
                  <MarkdownPreview
                    source={
                      value ||
                      "*Start writing your research document here...*\n\nUse **bold**, *italic*, and other Markdown formatting to structure your content."
                    }
                    style={{ backgroundColor: "transparent" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === "edit" && (
          <div className="h-full">
            <MDEditor
              value={value}
              onChange={(v) => onChange(v || "")}
              height="100%"
              preview="edit"
              hideToolbar={true}
              data-color-mode="light"
              style={{ backgroundColor: "transparent" }}
            />
          </div>
        )}

        {viewMode === "preview" && (
          <div className="h-full overflow-auto p-8 bg-white">
            <div className="max-w-4xl mx-auto">
              <div
                className="prose prose-lg max-w-none
                prose-headings:text-gray-900 prose-headings:font-semibold prose-headings:tracking-tight
                prose-p:text-gray-700 prose-p:leading-relaxed prose-p:text-base
                prose-strong:text-gray-900 prose-strong:font-semibold
                prose-em:text-gray-700 prose-em:italic
                prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:font-mono
                prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-6
                prose-blockquote:text-gray-600 prose-blockquote:border-l-gray-900 prose-blockquote:border-l-4 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-lg
                prose-li:text-gray-700 prose-li:leading-relaxed
                prose-ul:list-disc prose-ol:list-decimal
                prose-h1:text-4xl prose-h1:mb-8 prose-h1:mt-12 prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-4
                prose-h2:text-3xl prose-h2:mb-6 prose-h2:mt-10
                prose-h3:text-2xl prose-h3:mb-4 prose-h3:mt-8
                prose-h4:text-xl prose-h4:mb-3 prose-h4:mt-6
                prose-table:border-collapse prose-table:border prose-table:border-gray-300 prose-table:rounded-lg prose-table:overflow-hidden prose-table:shadow-sm
                prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-4 prose-th:text-left prose-th:font-semibold prose-th:text-gray-900
                prose-td:border prose-td:border-gray-300 prose-td:p-4 prose-td:text-gray-700
                prose-a:text-blue-600 prose-a:hover:text-blue-800 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
                prose-img:rounded-lg prose-img:shadow-lg prose-img:border prose-img:border-gray-200
              "
              >
                <MarkdownPreview
                  source={
                    value ||
                    "*Start writing your research document here...*\n\nUse **bold**, *italic*, and other Markdown formatting to structure your content.\n\n## Getting Started\n\n1. Choose your template from the dropdown\n2. Configure your AI assistant\n3. Start writing with live preview\n4. Use grammar check for improvements"
                  }
                  style={{ backgroundColor: "transparent" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Mode: {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}</span>
            <span>•</span>
            <span>Lines: {value.split("\n").length}</span>
            <span>•</span>
            <span>Characters: {value.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Markdown</span>
            <div className="w-2 h-2 bg-green-500 rounded-full" title="Ready" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default MarkdownEditor
