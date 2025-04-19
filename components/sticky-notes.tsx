"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plus, X, Edit2, Save } from "lucide-react"

interface Note {
  id: string
  title: string
  content: string
  color: string
}

export default function StickyNotes() {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "1",
      title: "Project Idea",
      content: "Create an AI-powered study assistant that helps with research and summarization",
      color: "bg-yellow-100",
    },
    {
      id: "2",
      title: "Research Topic",
      content: "Explore natural language processing techniques for text summarization",
      color: "bg-green-100",
    },
  ])

  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    color: "bg-yellow-100",
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState<Note | null>(null)

  const colorOptions = [
    { value: "bg-yellow-100", label: "Yellow" },
    { value: "bg-blue-100", label: "Blue" },
    { value: "bg-green-100", label: "Green" },
    { value: "bg-pink-100", label: "Pink" },
    { value: "bg-purple-100", label: "Purple" },
  ]

  const addNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return

    const note: Note = {
      id: Date.now().toString(),
      ...newNote,
    }

    setNotes([...notes, note])
    setNewNote({
      title: "",
      content: "",
      color: "bg-yellow-100",
    })
  }

  const deleteNote = (id: string) => {
    setNotes(notes.filter((note) => note.id !== id))
  }

  const startEditing = (note: Note) => {
    setEditingId(note.id)
    setEditNote({ ...note })
  }

  const saveEdit = () => {
    if (!editNote) return

    setNotes(notes.map((note) => (note.id === editingId ? editNote : note)))

    setEditingId(null)
    setEditNote(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Note</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                placeholder="Note title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                placeholder="Your ideas, thoughts, or reminders..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <div
                    key={color.value}
                    className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                      newNote.color === color.value ? "border-black" : "border-transparent"
                    } ${color.value}`}
                    onClick={() => setNewNote({ ...newNote, color: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={addNote} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Note
          </Button>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map((note) => (
          <Card key={note.id} className={`${note.color} border`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                {editingId === note.id ? (
                  <Input
                    value={editNote?.title || ""}
                    onChange={(e) => setEditNote({ ...editNote!, title: e.target.value })}
                    className="bg-white/50"
                  />
                ) : (
                  <CardTitle className="text-lg">{note.title}</CardTitle>
                )}
                <div className="flex gap-1">
                  {editingId === note.id ? (
                    <Button size="icon" variant="ghost" onClick={saveEdit}>
                      <Save className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => startEditing(note)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => deleteNote(note.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingId === note.id ? (
                <Textarea
                  value={editNote?.content || ""}
                  onChange={(e) => setEditNote({ ...editNote!, content: e.target.value })}
                  className="min-h-[100px] bg-white/50"
                />
              ) : (
                <p className="whitespace-pre-wrap">{note.content}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
