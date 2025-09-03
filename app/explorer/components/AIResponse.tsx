"use client"

import { Bot, Copy, Check } from "lucide-react"
import { useState } from "react"
import MarkdownRenderer from "@/components/common/MarkdownRenderer"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AIResponseProps {
  content: string
  provider?: string
  model?: string
}

export function AIResponse({ content, provider, model }: AIResponseProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="ai-response bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6 text-gray-500" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            AI Response
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className={cn(
            "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
            copied && "text-green-500"
          )}
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
      <MarkdownRenderer content={content} />
      {(provider || model) && (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {provider && `Provider: ${provider}`}
          {provider && model && " | "}
          {model && `Model: ${model}`}
        </div>
      )}
    </div>
  )
}