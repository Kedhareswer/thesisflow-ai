"use client"

import { useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Button } from "@/components/ui/button"
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, Redo, Undo, Code } from "lucide-react"
import { cn } from "@/lib/utils"
import { Toggle } from "@/components/ui/toggle"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    autofocus: false,
  })

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  if (!editor) {
    return null
  }

  return (
    <div className={cn("border border-gray-200 rounded-lg overflow-hidden bg-white", className)}>
      {/* Minimalist Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-1">
          <Toggle
            size="sm"
            pressed={editor.isActive("bold")}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            aria-label="Bold"
            className="h-8 w-8 data-[state=on]:bg-black data-[state=on]:text-white hover:bg-gray-200"
          >
            <Bold className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("italic")}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Italic"
            className="h-8 w-8 data-[state=on]:bg-black data-[state=on]:text-white hover:bg-gray-200"
          >
            <Italic className="h-3.5 w-3.5" />
          </Toggle>
        </div>

        <div className="w-px h-5 bg-gray-300 mx-2" />

        <div className="flex items-center gap-1">
          <Toggle
            size="sm"
            pressed={editor.isActive("heading", { level: 1 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            aria-label="Heading 1"
            className="h-8 w-8 data-[state=on]:bg-black data-[state=on]:text-white hover:bg-gray-200"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("heading", { level: 2 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            aria-label="Heading 2"
            className="h-8 w-8 data-[state=on]:bg-black data-[state=on]:text-white hover:bg-gray-200"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </Toggle>
        </div>

        <div className="w-px h-5 bg-gray-300 mx-2" />

        <div className="flex items-center gap-1">
          <Toggle
            size="sm"
            pressed={editor.isActive("bulletList")}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Bullet List"
            className="h-8 w-8 data-[state=on]:bg-black data-[state=on]:text-white hover:bg-gray-200"
          >
            <List className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("orderedList")}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            aria-label="Numbered List"
            className="h-8 w-8 data-[state=on]:bg-black data-[state=on]:text-white hover:bg-gray-200"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Toggle>
        </div>

        <div className="w-px h-5 bg-gray-300 mx-2" />

        <div className="flex items-center gap-1">
          <Toggle
            size="sm"
            pressed={editor.isActive("blockquote")}
            onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
            aria-label="Quote"
            className="h-8 w-8 data-[state=on]:bg-black data-[state=on]:text-white hover:bg-gray-200"
          >
            <Quote className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("code")}
            onPressedChange={() => editor.chain().focus().toggleCode().run()}
            aria-label="Code"
            className="h-8 w-8 data-[state=on]:bg-black data-[state=on]:text-white hover:bg-gray-200"
          >
            <Code className="h-3.5 w-3.5" />
          </Toggle>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-8 w-8 p-0 hover:bg-gray-200 disabled:opacity-50"
          >
            <Undo className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-8 w-8 p-0 hover:bg-gray-200 disabled:opacity-50"
          >
            <Redo className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="min-h-[500px]">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none p-6 focus:outline-none
            prose-headings:text-black prose-headings:font-semibold
            prose-p:text-gray-800 prose-p:leading-relaxed
            prose-strong:text-black prose-strong:font-semibold
            prose-em:text-gray-800
            prose-code:text-black prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded
            prose-blockquote:text-gray-700 prose-blockquote:border-l-black prose-blockquote:border-l-4 prose-blockquote:pl-4
            prose-li:text-gray-800
            prose-ul:list-disc prose-ol:list-decimal
            prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6
            prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5
            prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4"
        />
      </div>
    </div>
  )
}

export default RichTextEditor
