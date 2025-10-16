"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import {
  Save,
  Download,
  Upload,
  Share2,
  Copy,
  FileText,
  Search,
  Eye,
  Edit,
  Users,
  Lightbulb,
  BookOpen,
  History,
  Settings,
  Palette,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Code,
  Image,
  Link,
  Table,
  CheckSquare,
} from "lucide-react"

interface Command {
  id: string
  name: string
  shortcut?: string
  icon: any
  action: () => void
  category: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commands: Command[]
}

export function CommandPalette({ open, onOpenChange, commands }: CommandPaletteProps) {
  const [search, setSearch] = useState("")

  // Group commands by category
  const groupedCommands = commands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = []
    }
    acc[cmd.category].push(cmd)
    return acc
  }, {} as Record<string, Command[]>)

  // Filter commands based on search
  const filteredCategories = Object.entries(groupedCommands).reduce((acc, [category, cmds]) => {
    const filtered = cmds.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(search.toLowerCase()) ||
        cmd.shortcut?.toLowerCase().includes(search.toLowerCase())
    )
    if (filtered.length > 0) {
      acc[category] = filtered
    }
    return acc
  }, {} as Record<string, Command[]>)

  const handleCommandSelect = useCallback(
    (command: Command) => {
      command.action()
      onOpenChange(false)
      setSearch("")
    },
    [onOpenChange]
  )

  // Keyboard shortcut handler
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl">
        <Command className="rounded-lg border-none shadow-md">
          <CommandInput
            placeholder="Type a command or search..."
            value={search}
            onValueChange={setSearch}
            className="border-none"
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>No results found.</CommandEmpty>
            {Object.entries(filteredCategories).map(([category, cmds]) => (
              <CommandGroup key={category} heading={category}>
                {cmds.map((command) => {
                  const Icon = command.icon
                  return (
                    <CommandItem
                      key={command.id}
                      onSelect={() => handleCommandSelect(command)}
                      className="flex items-center justify-between py-3 px-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-gray-500" />
                        <span>{command.name}</span>
                      </div>
                      {command.shortcut && (
                        <kbd className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {command.shortcut}
                        </kbd>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
        <div className="border-t p-3 text-xs text-gray-500 bg-gray-50">
          <p className="text-center">
            Press <kbd className="bg-gray-200 px-1.5 py-0.5 rounded">Ctrl+K</kbd> or{" "}
            <kbd className="bg-gray-200 px-1.5 py-0.5 rounded">⌘K</kbd> to toggle command palette
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function useCommandPalette(handlers: {
  onSave?: () => void
  onExport?: () => void
  onImport?: () => void
  onShare?: () => void
  onNewDocument?: () => void
  onTogglePreview?: () => void
  onToggleAiAssistant?: () => void
  onToggleCitationManager?: () => void
  onInsertHeading?: () => void
  onInsertList?: () => void
  onInsertCode?: () => void
  onInsertImage?: () => void
  onInsertLink?: () => void
  onInsertTable?: () => void
  onFormatBold?: () => void
  onFormatItalic?: () => void
  onAlignLeft?: () => void
  onAlignCenter?: () => void
  onAlignRight?: () => void
}) {
  const commands: Command[] = [
    // File commands
    {
      id: "save",
      name: "Save Document",
      shortcut: "Ctrl+S",
      icon: Save,
      action: handlers.onSave || (() => {}),
      category: "File",
    },
    {
      id: "new",
      name: "New Document",
      shortcut: "Ctrl+N",
      icon: FileText,
      action: handlers.onNewDocument || (() => {}),
      category: "File",
    },
    {
      id: "export",
      name: "Export Document",
      shortcut: "Ctrl+E",
      icon: Download,
      action: handlers.onExport || (() => {}),
      category: "File",
    },
    {
      id: "import",
      name: "Import Document",
      shortcut: "Ctrl+O",
      icon: Upload,
      action: handlers.onImport || (() => {}),
      category: "File",
    },
    {
      id: "share",
      name: "Share Document",
      shortcut: "Ctrl+Shift+S",
      icon: Share2,
      action: handlers.onShare || (() => {}),
      category: "File",
    },
    // View commands
    {
      id: "toggle-preview",
      name: "Toggle Preview",
      shortcut: "Ctrl+P",
      icon: Eye,
      action: handlers.onTogglePreview || (() => {}),
      category: "View",
    },
    // Tools commands
    {
      id: "ai-assistant",
      name: "AI Writing Assistant",
      shortcut: "Ctrl+A",
      icon: Lightbulb,
      action: handlers.onToggleAiAssistant || (() => {}),
      category: "Tools",
    },
    {
      id: "citations",
      name: "Citation Manager",
      shortcut: "Ctrl+B",
      icon: BookOpen,
      action: handlers.onToggleCitationManager || (() => {}),
      category: "Tools",
    },
    // Insert commands
    {
      id: "insert-heading",
      name: "Insert Heading",
      shortcut: "Ctrl+H",
      icon: Type,
      action: handlers.onInsertHeading || (() => {}),
      category: "Insert",
    },
    {
      id: "insert-list",
      name: "Insert List",
      shortcut: "Ctrl+L",
      icon: List,
      action: handlers.onInsertList || (() => {}),
      category: "Insert",
    },
    {
      id: "insert-code",
      name: "Insert Code Block",
      shortcut: "Ctrl+`",
      icon: Code,
      action: handlers.onInsertCode || (() => {}),
      category: "Insert",
    },
    {
      id: "insert-image",
      name: "Insert Image",
      shortcut: "Ctrl+Shift+I",
      icon: Image,
      action: handlers.onInsertImage || (() => {}),
      category: "Insert",
    },
    {
      id: "insert-link",
      name: "Insert Link",
      shortcut: "Ctrl+K",
      icon: Link,
      action: handlers.onInsertLink || (() => {}),
      category: "Insert",
    },
    {
      id: "insert-table",
      name: "Insert Table",
      shortcut: "Ctrl+Shift+T",
      icon: Table,
      action: handlers.onInsertTable || (() => {}),
      category: "Insert",
    },
    // Format commands
    {
      id: "format-bold",
      name: "Bold",
      shortcut: "Ctrl+B",
      icon: Type,
      action: handlers.onFormatBold || (() => {}),
      category: "Format",
    },
    {
      id: "format-italic",
      name: "Italic",
      shortcut: "Ctrl+I",
      icon: Type,
      action: handlers.onFormatItalic || (() => {}),
      category: "Format",
    },
    {
      id: "align-left",
      name: "Align Left",
      icon: AlignLeft,
      action: handlers.onAlignLeft || (() => {}),
      category: "Format",
    },
    {
      id: "align-center",
      name: "Align Center",
      icon: AlignCenter,
      action: handlers.onAlignCenter || (() => {}),
      category: "Format",
    },
    {
      id: "align-right",
      name: "Align Right",
      icon: AlignRight,
      action: handlers.onAlignRight || (() => {}),
      category: "Format",
    },
  ]

  return commands
}
