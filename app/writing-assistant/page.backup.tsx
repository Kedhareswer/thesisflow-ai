"use client";
import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Copy, Loader2, Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Quote, Code, Link as LinkIcon, Image as ImageIcon, Table as TableIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo, Redo, Save, Share2, Download, Upload, Settings, Search, FileText, MessageSquare, Users, Clock, BookOpen, ChevronDown, ChevronRight, Plus, Check, X, MoreVertical, Eye, Edit3, Trash2, Clipboard, FileEdit, Sparkles, Zap, Command as CommandIcon, History, GitBranch, BookMarked, FileCode, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight } from "lucide-react";
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PenTool, CheckCircle, Lightbulb, BarChart, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"
import { enhancedAIService } from "@/lib/enhanced-ai-service"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"

// Types for enhanced features
interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: Date;
  resolved: boolean;
  position: number;
  replies?: Comment[];
}

interface Suggestion {
  id: string;
  userId: string;
  userName: string;
  type: "insert" | "delete" | "replace";
  original: string;
  suggested: string;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  timestamp: Date;
}

interface Version {
  id: string;
  content: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userAvatar: string;
  changes: string;
}

interface Reference {
  id: string;
  type: "article" | "book" | "website" | "other";
  authors: string[];
  title: string;
  year: number;
  journal?: string;
  doi?: string;
  url?: string;
}

interface CollaboratorPresence {
  id: string;
  name: string;
  email: string;
  avatar: string;
  color: string;
  status: "online" | "away" | "offline";
  cursorPosition?: number;
  isTyping?: boolean;
}

import { ShareModal } from "./ShareModal";
import { useSocket } from "@/components/socket-provider";
import { useToast } from "@/hooks/use-toast";

// RecentItem type definition
interface RecentItem {
  id: string;
  type: "topic" | "literature" | "idea";
  label: string;
  content: string;
  dateSaved?: string;
}

// Helper functions for localStorage
function getBookmarksFromStorage(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("recentlySaved");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveBookmarksToStorage(items: RecentItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("recentlySaved", JSON.stringify(items));
  } catch (error) {
    console.error("Failed to save bookmarks:", error);
  }
}

// MenuBar component
function MenuBar({ editor }: { editor: any }) {
  if (!editor) return null;

  return (
    <div className="flex gap-1 flex-wrap">
      <Button
        variant={editor.isActive('bold') ? 'default' : 'outline'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('italic') ? 'default' : 'outline'}
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('strike') ? 'default' : 'outline'}
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <Button
        variant={editor.isActive('bulletList') ? 'default' : 'outline'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('orderedList') ? 'default' : 'outline'}
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
}

// CollaboratorsList component
function CollaboratorsList() {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Real-time collaborators will appear here
      </p>
    </div>
  );
}

interface WritingResult {
  improvedText: string
  suggestions: Array<{
    type: string
    original: string
    improved: string
    reason: string
  }>
  metrics: {
    readability: number
    sentiment: string
    wordCount: number
  }
}

interface WritingAnalysis {
  originalText: string
  improvedText: string
  task: string
  suggestions: WritingResult['suggestions']
  metrics: WritingResult['metrics']
  timestamp: Date
}

export default function WritingAssistantPage() {
  const [shareOpen, setShareOpen] = React.useState(false);
  const { socket, activeUsers } = useSocket();
  const { toast } = useToast();

  // Inline improveWriting function using enhancedAIService
  const improveWriting = async (text: string, task: string): Promise<WritingResult> => {
    const taskDescriptions = {
      grammar: "Fix grammar, spelling, and punctuation errors",
      clarity: "Improve clarity, readability, and flow",
      academic: "Enhance for academic writing style",
      creative: "Boost creativity and expressiveness",
      professional: "Polish for professional communication"
    };

    const prompt = `You are a professional writing assistant. ${taskDescriptions[task as keyof typeof taskDescriptions] || "Improve the following text"}.

Original text:
${text}

Provide your response in the following JSON format:
{
  "improvedText": "[improved version of the text]",
  "suggestions": [
    {
      "type": "grammar|clarity|style",
      "original": "[original phrase]",
      "improved": "[improved phrase]",
      "reason": "[brief explanation]"
    }
  ],
  "metrics": {
    "readability": 75,
    "sentiment": "neutral|positive|negative",
    "wordCount": ${text.split(/\s+/).length}
  }
}`;

    const result = await enhancedAIService.generateText({
      prompt,
      maxTokens: 2000,
      temperature: 0.7
    });

    if (!result.success || !result.content) {
      throw new Error(result.error || "Failed to improve text");
    }

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(result.content);
      return parsed;
    } catch {
      // Fallback if not valid JSON
      return {
        improvedText: result.content,
        suggestions: [],
        metrics: {
          readability: 70,
          sentiment: "neutral",
          wordCount: text.split(/\s+/).length
        }
      };
    }
  };

  // Handle invite from ShareModal
  const handleShareInvite = (email: string, permission: "viewer" | "editor") => {
    if (!socket) return;
    socket.emit("invite_collaborator", { email, permission });
    toast({
      title: "Invitation Sent",
      description: `An invitation has been sent to ${email} as ${permission}.`,
    });
  }
  const [aiSuggestion, setAiSuggestion] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [recentItems, setRecentItems] = React.useState<RecentItem[]>(getBookmarksFromStorage());
  const [filter, setFilter] = React.useState<"all" | "topic" | "literature" | "idea">("all");

  // --- Real-time Collaboration Setup ---
  const ydoc = React.useMemo(() => new Y.Doc(), []);
  const provider = React.useMemo(() => new WebsocketProvider("wss://demos.yjs.dev", "writing-assistant", ydoc), [ydoc]);
  const [awareness] = React.useState(() => provider.awareness);

  // Dummy: Replace with real user info from auth/session
  const user = {
    name: "You",
    color: "#0055ff",
    avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=you"
  };
  React.useEffect(() => {
    awareness.setLocalStateField("user", user);
  }, [awareness]);

  // Setup Tiptap editor with collaboration/cursor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user
      })
    ],
    content: "",
  });

  // Paste from RecentlyBar
  const handlePasteFromRecent = (content: string) => {
    if (editor) {
      editor.commands.insertContent(content);
    }
  };

  // Paste and immediately run AI
  const handlePasteAndAISuggest = (content: string) => {
    if (editor) {
      editor.commands.insertContent(content);
      setTimeout(() => handleAISuggest(), 100);
    }
  };

  // Remove single item
  const handleRemoveItem = (id: string) => {
    setRecentItems(items => items.filter(i => i.id !== id));
  };

  // Clear all
  const handleClearAll = () => {
    setRecentItems([]);
  };

  // Filtered items for UI
  const filteredItems: RecentItem[] = filter === "all" ? recentItems : recentItems.filter((i: RecentItem) => i.type === filter);

  // AI Integration using Tiptap content
  const handleAISuggest = async () => {
    if (!editor) return;
    setLoading(true);
    setAiSuggestion("");
    try {
      const html = editor.getHTML();
      const response = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: html })
      });
      const data = await response.json();
      setAiSuggestion(data.humanized || "");
    } catch (err) {
      setAiSuggestion("AI suggestion failed.");
    } finally {
      setLoading(false);
    }
  };

  const [originalText, setOriginalText] = useState("")
  const [result, setResult] = useState<WritingResult | null>(null)
  const [history, setHistory] = useState<WritingAnalysis[]>([])
  const [error, setError] = useState<string | null>(null)
  const [task, setTask] = useState<'grammar' | 'clarity' | 'academic' | 'creative' | 'professional'>('grammar')
  const [copied, setCopied] = useState(false)
  const [authUser, setAuthUser] = useState<any>(null)

  useEffect(() => {
    checkUser()
    loadHistory()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setAuthUser(user)
  }

  const loadHistory = () => {
    const savedHistory = localStorage.getItem('writing-assistant-history')
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }))
        setHistory(parsed)
      } catch (error) {
        console.error('Error loading history:', error)
      }
    }
  }

  const saveToHistory = (analysis: WritingAnalysis) => {
    const newHistory = [analysis, ...history].slice(0, 10) // Keep last 10 analyses
    setHistory(newHistory)
    localStorage.setItem('writing-assistant-history', JSON.stringify(newHistory))
  }

  const improveText = async () => {
    if (!originalText.trim()) {
      setError("Please enter some text to improve")
      return
    }

    if (originalText.length < 10) {
      setError("Text is too short. Please provide at least 10 characters.")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const writingResult = await improveWriting(originalText, task)

      setResult(writingResult)

      // Save to history
      const analysis: WritingAnalysis = {
        originalText,
        improvedText: writingResult.improvedText,
        task,
        suggestions: writingResult.suggestions,
        metrics: writingResult.metrics,
        timestamp: new Date()
      }
      saveToHistory(analysis)

      toast({
        title: "Text improved!",
        description: `Applied ${writingResult.suggestions.length} improvements for ${task} writing`,
      })
    } catch (error) {
      console.error('Writing improvement error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to improve text'
      setError(errorMessage)
      
      if (errorMessage.includes('No AI providers available')) {
        toast({
          title: "AI Configuration Required",
          description: "Please configure your AI API keys in Settings to use the Writing Assistant.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Improvement failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Copied to clipboard",
        description: "Improved text has been copied to your clipboard",
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const loadFromHistory = (analysis: WritingAnalysis) => {
    setOriginalText(analysis.originalText)
    setResult({
      improvedText: analysis.improvedText,
      suggestions: analysis.suggestions,
      metrics: analysis.metrics
    })
    setTask(analysis.task as any)
  }

  const getTaskDescription = (task: string) => {
    const descriptions = {
      grammar: "Fix grammar, spelling, and punctuation errors",
      clarity: "Improve clarity, readability, and flow",
      academic: "Enhance for academic writing style",
      creative: "Boost creativity and expressiveness",
      professional: "Polish for professional communication"
    }
    return descriptions[task as keyof typeof descriptions] || ""
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-800'
      case 'negative': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getReadabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'grammar': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'clarity': return <Lightbulb className="h-4 w-4 text-blue-600" />
      case 'style': return <PenTool className="h-4 w-4 text-purple-600" />
      default: return <RefreshCw className="h-4 w-4 text-gray-600" />
    }
  }

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  return (
    <div className="flex flex-row max-w-screen-xl mx-auto py-8 px-2 gap-6">
      {/* Main Writing Area */}
      <div className="flex-1 space-y-6">
        <h1 className="text-3xl font-bold mb-2">Writing Assistant (AI-Powered)</h1>
        <p className="text-muted-foreground mb-6">A full-featured writing editor with AI suggestions. Format, edit, and enhance your documents just like in MS Word!</p>
        <div className="bg-white rounded shadow p-4">
          <div className="flex justify-between items-center mb-2">
            <MenuBar editor={editor} />
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              Share
            </Button>
          </div>
          <div className="border rounded min-h-[300px] mb-4 p-2 bg-muted focus-within:ring-2">
            <EditorContent editor={editor} />
          </div>
          <div className="flex gap-2 mb-4">
            <Button onClick={handleAISuggest} disabled={loading || !editor?.getText().trim()}>
              {loading ? "Generating..." : "Write with AI"}
            </Button>
          </div>
          {aiSuggestion && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">AI Suggestion</span>
                <Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(aiSuggestion)} title="Copy Suggestion">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Textarea value={aiSuggestion} readOnly className="bg-muted" rows={6} />
            </div>
          )}
          {/* Collaborators List below editor */}
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Collaborators</h3>
            <CollaboratorsList />
          </div>
        </div>
        <ShareModal open={shareOpen} onOpenChange={setShareOpen} onShare={handleShareInvite} />
      </div>
      {/* Recently Sidebar */}
      <aside className="w-80 bg-muted p-4 rounded shadow flex flex-col gap-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold">Recently</h2>
          <Button size="sm" variant="ghost" onClick={handleClearAll} disabled={recentItems.length === 0}>Clear All</Button>
        </div>
        <div className="flex gap-2 mb-3">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
          <Button size="sm" variant={filter === "topic" ? "default" : "outline"} onClick={() => setFilter("topic")}>Topics</Button>
          <Button size="sm" variant={filter === "literature" ? "default" : "outline"} onClick={() => setFilter("literature")}>Literature</Button>
          <Button size="sm" variant={filter === "idea" ? "default" : "outline"} onClick={() => setFilter("idea")}>Ideas</Button>
        </div>
        {filteredItems.length === 0 ? (
          <div className="text-muted-foreground text-sm">No items saved yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white rounded p-2 flex items-center justify-between gap-2 shadow-sm border">
                <div className="flex flex-col min-w-0">
                  <span className="truncate max-w-[130px] font-medium" title={item.content}>{item.label}</span>
                  {item.dateSaved && <span className="text-xs text-muted-foreground">{new Date(item.dateSaved).toLocaleString()}</span>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(item.content)} title="Copy">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handlePasteFromRecent(item.content)} title="Paste">Paste</Button>
                  <Button size="sm" variant="default" onClick={() => handlePasteAndAISuggest(item.content)} title="Write with AI">Write with AI</Button>
                  <Button size="icon" variant="ghost" onClick={() => handleRemoveItem(item.id)} title="Remove">
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* CollaboratorsList in sidebar */}
        <div className="mt-8">
          <h3 className="font-semibold mb-2">Manage Collaborators</h3>
          <CollaboratorsList />
        </div>
        {/* Pending Invites Section */}
        <div className="mt-8">
          <h3 className="font-semibold mb-2">Pending Invites</h3>
          {/* Example: Replace with real data from backend */}
          <ul className="space-y-2">
            {[{id: 'p1', email: 'pending1@email.com', role: 'editor', invitedAt: '2025-04-27T08:30:00+05:30'},
              {id: 'p2', email: 'pending2@email.com', role: 'viewer', invitedAt: '2025-04-27T08:31:00+05:30'}].map(invite => (
                <li key={invite.id} className="flex items-center justify-between bg-white rounded p-2 border">
                  <div>
                    <span className="font-medium">{invite.email}</span>
                    <span className="ml-2 text-xs text-muted-foreground">({invite.role})</span>
                    <span className="ml-2 text-xs text-muted-foreground">{new Date(invite.invitedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => {/* resend logic */}}>Resend</Button>
                    <Button size="sm" variant="destructive" onClick={() => {/* revoke logic */}}>Revoke</Button>
                  </div>
                </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
