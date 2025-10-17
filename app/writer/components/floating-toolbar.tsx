"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoreHorizontal,
  Highlighter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FloatingToolbarProps {
  onFormat: (format: string) => void
  className?: string
}

export function FloatingToolbar({ onFormat, className }: FloatingToolbarProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || selection.toString().trim() === "") {
        setIsVisible(false)
        return
      }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      if (rect.width === 0 && rect.height === 0) {
        setIsVisible(false)
        return
      }

      // Position the toolbar above the selection
      const toolbarHeight = 48 // Approximate toolbar height
      const top = rect.top + window.scrollY - toolbarHeight - 8
      const left = rect.left + window.scrollX + rect.width / 2

      setPosition({ top, left })
      setIsVisible(true)
    }

    // Add event listeners
    document.addEventListener("selectionchange", handleSelectionChange)
    document.addEventListener("mouseup", handleSelectionChange)

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange)
      document.removeEventListener("mouseup", handleSelectionChange)
    }
  }, [])

  const handleFormatClick = (format: string) => {
    onFormat(format)
    // Keep selection after formatting
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed) {
      // Toolbar will remain visible
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={toolbarRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={`fixed z-50 ${className || ""}`}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: "translateX(-50%)",
          }}
        >
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-900 text-white rounded-lg shadow-xl border border-gray-800">
              {/* Text Styling */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-gray-800 hover:text-white"
                    onClick={() => handleFormatClick("bold")}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">
                  <p>Bold</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-gray-800 hover:text-white"
                    onClick={() => handleFormatClick("italic")}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">
                  <p>Italic</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-gray-800 hover:text-white"
                    onClick={() => handleFormatClick("underline")}
                  >
                    <Underline className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">
                  <p>Underline</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-gray-800 hover:text-white"
                    onClick={() => handleFormatClick("highlight")}
                  >
                    <Highlighter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">
                  <p>Highlight</p>
                </TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6 bg-gray-700 mx-1" />

              {/* Heading Styles */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-white hover:bg-gray-800 hover:text-white"
                      >
                        <Heading2 className="h-4 w-4 mr-1" />
                        <span className="text-xs">H</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">
                    <p>Headings</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="center" className="bg-gray-900 text-white border-gray-800">
                  <DropdownMenuItem
                    onClick={() => handleFormatClick("heading1")}
                    className="hover:bg-gray-800"
                  >
                    <Heading1 className="h-4 w-4 mr-2" />
                    Heading 1
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleFormatClick("heading2")}
                    className="hover:bg-gray-800"
                  >
                    <Heading2 className="h-4 w-4 mr-2" />
                    Heading 2
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleFormatClick("heading3")}
                    className="hover:bg-gray-800"
                  >
                    <Heading3 className="h-4 w-4 mr-2" />
                    Heading 3
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Separator orientation="vertical" className="h-6 bg-gray-700 mx-1" />

              {/* Lists */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-gray-800 hover:text-white"
                    onClick={() => handleFormatClick("bulletList")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">
                  <p>Bullet List</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-gray-800 hover:text-white"
                    onClick={() => handleFormatClick("numberedList")}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">
                  <p>Numbered List</p>
                </TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6 bg-gray-700 mx-1" />

              {/* Insert */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-gray-800 hover:text-white"
                    onClick={() => handleFormatClick("link")}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">
                  <p>Insert Link</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-gray-800 hover:text-white"
                    onClick={() => handleFormatClick("code")}
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">
                  <p>Code Block</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-gray-800 hover:text-white"
                    onClick={() => handleFormatClick("quote")}
                  >
                    <Quote className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">
                  <p>Quote</p>
                </TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6 bg-gray-700 mx-1" />

              {/* Alignment */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-white hover:bg-gray-800 hover:text-white"
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">
                    <p>Alignment</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="center" className="bg-gray-900 text-white border-gray-800">
                  <DropdownMenuItem
                    onClick={() => handleFormatClick("alignLeft")}
                    className="hover:bg-gray-800"
                  >
                    <AlignLeft className="h-4 w-4 mr-2" />
                    Align Left
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleFormatClick("alignCenter")}
                    className="hover:bg-gray-800"
                  >
                    <AlignCenter className="h-4 w-4 mr-2" />
                    Align Center
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleFormatClick("alignRight")}
                    className="hover:bg-gray-800"
                  >
                    <AlignRight className="h-4 w-4 mr-2" />
                    Align Right
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipProvider>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
