"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Copy,
  Cut,
  Clipboard,
  Scissors,
  Search,
  Languages,
  FileText,
  Sparkles,
  MoreHorizontal,
} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu"

interface EditorContextMenuProps {
  children: React.ReactNode
  onCopy?: () => void
  onCut?: () => void
  onPaste?: () => void
  onAiAssist?: (action: string) => void
  onTranslate?: (language: string) => void
  onSearch?: (text: string) => void
}

export function EditorContextMenu({
  children,
  onCopy,
  onCut,
  onPaste,
  onAiAssist,
  onTranslate,
  onSearch,
}: EditorContextMenuProps) {
  const [selectedText, setSelectedText] = useState("")

  const handleContextMenu = useCallback(() => {
    const selection = window.getSelection()
    if (selection) {
      setSelectedText(selection.toString())
    }
  }, [])

  useEffect(() => {
    document.addEventListener("contextmenu", handleContextMenu)
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
    }
  }, [handleContextMenu])

  const hasSelection = selectedText.trim().length > 0

  return (
    <ContextMenu>
      <ContextMenuTrigger className="w-full h-full">{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg">
        {/* AI Actions */}
        {hasSelection && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span>AI Writing Tools</span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-56">
                <ContextMenuItem
                  onClick={() => onAiAssist?.("improve")}
                  className="hover:bg-purple-50 dark:hover:bg-purple-900/20"
                >
                  <FileText className="h-4 w-4 mr-2 text-purple-500" />
                  Improve Writing
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onAiAssist?.("summarize")}
                  className="hover:bg-purple-50 dark:hover:bg-purple-900/20"
                >
                  <FileText className="h-4 w-4 mr-2 text-purple-500" />
                  Summarize
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onAiAssist?.("expand")}
                  className="hover:bg-purple-50 dark:hover:bg-purple-900/20"
                >
                  <FileText className="h-4 w-4 mr-2 text-purple-500" />
                  Expand
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onAiAssist?.("simplify")}
                  className="hover:bg-purple-50 dark:hover:bg-purple-900/20"
                >
                  <FileText className="h-4 w-4 mr-2 text-purple-500" />
                  Simplify
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onAiAssist?.("formal")}
                  className="hover:bg-purple-50 dark:hover:bg-purple-900/20"
                >
                  <FileText className="h-4 w-4 mr-2 text-purple-500" />
                  Make More Formal
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onAiAssist?.("casual")}
                  className="hover:bg-purple-50 dark:hover:bg-purple-900/20"
                >
                  <FileText className="h-4 w-4 mr-2 text-purple-500" />
                  Make More Casual
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSeparator />
          </>
        )}

        {/* Standard Edit Actions */}
        <ContextMenuItem
          onClick={onCopy}
          disabled={!hasSelection}
          className="flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          <span>Copy</span>
          <span className="ml-auto text-xs text-gray-500">Ctrl+C</span>
        </ContextMenuItem>

        <ContextMenuItem
          onClick={onCut}
          disabled={!hasSelection}
          className="flex items-center gap-2"
        >
          <Scissors className="h-4 w-4" />
          <span>Cut</span>
          <span className="ml-auto text-xs text-gray-500">Ctrl+X</span>
        </ContextMenuItem>

        <ContextMenuItem
          onClick={onPaste}
          className="flex items-center gap-2"
        >
          <Clipboard className="h-4 w-4" />
          <span>Paste</span>
          <span className="ml-auto text-xs text-gray-500">Ctrl+V</span>
        </ContextMenuItem>

        {hasSelection && (
          <>
            <ContextMenuSeparator />

            {/* Search */}
            <ContextMenuItem
              onClick={() => onSearch?.(selectedText)}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              <span>Search for "{selectedText.substring(0, 20)}{selectedText.length > 20 ? "..." : ""}"</span>
            </ContextMenuItem>

            {/* Translate */}
            <ContextMenuSub>
              <ContextMenuSubTrigger className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                <span>Translate</span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                <ContextMenuItem onClick={() => onTranslate?.("es")}>
                  Spanish
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onTranslate?.("fr")}>
                  French
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onTranslate?.("de")}>
                  German
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onTranslate?.("zh")}>
                  Chinese
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onTranslate?.("ja")}>
                  Japanese
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onTranslate?.("ar")}>
                  Arabic
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
