"use client";
import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Badge } from "@/components/ui/badge";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Undo,
  Redo,
  Save,
  Share2,
  Download,
  Upload,
  Settings,
  FileText,
  MessageSquare,
  Plus,
  Check,
  X,
  MoreVertical,
  Eye,
  Copy,
  Clipboard,
  Sparkles,
  Zap,
  Command as CommandIcon,
  History,
  GitBranch,
  BookMarked,
  PanelLeftClose,
  PanelRightClose,
  PanelLeft,
  PanelRight,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ShareModal } from "./ShareModal";
import { useSocket } from "@/components/socket-provider";
import { enhancedAIService } from "@/lib/enhanced-ai-service";

// Types
interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: Date;
  resolved: boolean;
  position: number;
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
  citationKey?: string;
}

interface CollaboratorPresence {
  id: string;
  name: string;
  email: string;
  avatar: string;
  color: string;
  status: "online" | "away" | "offline";
  isTyping?: boolean;
}

export default function EnhancedScientificEditor() {
  const { toast } = useToast();
  const { socket, activeUsers } = useSocket();

  // UI State
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [documentTitle, setDocumentTitle] = useState("Untitled Document");
  const [wordCount, setWordCount] = useState(0);

  // Feature State
  const [comments, setComments] = useState<Comment[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    {
      id: "1",
      userId: "2",
      userName: "Jane Cooper",
      type: "replace",
      original: "good results",
      suggested: "significant findings",
      reason: "More academic tone",
      status: "pending",
      timestamp: new Date(),
    },
  ]);
  const [versions, setVersions] = useState<Version[]>([
    {
      id: "1",
      content: "",
      timestamp: new Date(Date.now() - 3600000),
      userId: "1",
      userName: "You",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=you",
      changes: "Initial draft created",
    },
    {
      id: "2",
      content: "",
      timestamp: new Date(Date.now() - 1800000),
      userId: "2",
      userName: "Jane Cooper",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
      changes: "Added introduction section",
    },
  ]);
  const [references, setReferences] = useState<Reference[]>([
    {
      id: "1",
      type: "article",
      authors: ["Smith, J.", "Doe, A."],
      title: "Machine Learning in Healthcare",
      year: 2023,
      journal: "Journal of AI Research",
      doi: "10.1234/example",
      citationKey: "smith2023ml",
    },
  ]);
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([
    {
      id: "1",
      name: "You",
      email: "you@example.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=you",
      color: "#3b82f6",
      status: "online",
    },
    {
      id: "2",
      name: "Jane Cooper",
      email: "jane@example.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
      color: "#10b981",
      status: "online",
      isTyping: true,
    },
  ]);
  const [activeTab, setActiveTab] = useState<"comments" | "suggestions" | "history">("suggestions");
  const [loading, setLoading] = useState(false);

  // Collaboration setup
  const ydoc = React.useMemo(() => new Y.Doc(), []);
  const provider = React.useMemo(
    () => new WebsocketProvider("wss://demos.yjs.dev", "scientific-editor", ydoc),
    [ydoc]
  );
  const [awareness] = React.useState(() => provider.awareness);

  const user = {
    name: collaborators[0].name,
    color: collaborators[0].color,
    avatar: collaborators[0].avatar,
  };

  React.useEffect(() => {
    awareness.setLocalStateField("user", user);
  }, [awareness, user]);

  // Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user,
      }),
    ],
    content: "<p>Start writing your LaTeX document here...</p>",
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setWordCount(text.split(/\s+/).filter((word) => word.length > 0).length);
    },
  });

  // Command palette shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Handle share invite
  const handleShareInvite = (email: string, permission: "viewer" | "editor") => {
    if (!socket) {
      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${email} as ${permission}.`,
      });
      return;
    }
    socket.emit("invite_collaborator", { email, permission });
    toast({
      title: "Invitation Sent",
      description: `An invitation has been sent to ${email} as ${permission}.`,
    });
  };

  // AI Improvement
  const handleAIImprove = async () => {
    if (!editor) return;
    setLoading(true);
    try {
      const text = editor.getText();
      const result = await enhancedAIService.generateText({
        prompt: `Improve this scientific text for academic writing:\n\n${text}`,
        maxTokens: 2000,
        temperature: 0.7,
      });

      if (result.success && result.content) {
        toast({
          title: "Text Improved",
          description: "AI suggestions have been generated",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI suggestions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Accept/Reject Suggestions
  const handleAcceptSuggestion = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "accepted" as const } : s))
    );
    toast({ title: "Suggestion accepted" });
  };

  const handleRejectSuggestion = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "rejected" as const } : s))
    );
    toast({ title: "Suggestion rejected" });
  };

  // Insert Citation
  const handleInsertCitation = (ref: Reference) => {
    if (editor && ref.citationKey) {
      editor.chain().focus().insertContent(`[${ref.citationKey}]`).run();
      toast({ title: "Citation inserted" });
    }
  };

  // Floating Toolbar Component
  const FloatingToolbar = () => {
    if (!editor) return null;

    return (
      <div
        className={cn(
          "fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 transition-all duration-200",
          showToolbar
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive("bold") ? "bg-gray-100 dark:bg-gray-800" : ""}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive("italic") ? "bg-gray-100 dark:bg-gray-800" : ""}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive("strike") ? "bg-gray-100 dark:bg-gray-800" : ""}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive("bulletList") ? "bg-gray-100 dark:bg-gray-800" : ""}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive("orderedList") ? "bg-gray-100 dark:bg-gray-800" : ""}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()}>
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Command Palette
  const CommandPalette = () => {
    return (
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                toast({ title: "Saving document..." });
                setCommandOpen(false);
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              <span>Save Document</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setShareOpen(true);
                setCommandOpen(false);
              }}
            >
              <Share2 className="mr-2 h-4 w-4" />
              <span>Share Document</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              <span>Export as PDF</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Formatting">
            <CommandItem
              onSelect={() => {
                editor?.chain().focus().toggleBold().run();
                setCommandOpen(false);
              }}
            >
              <Bold className="mr-2 h-4 w-4" />
              <span>Toggle Bold</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                editor?.chain().focus().toggleItalic().run();
                setCommandOpen(false);
              }}
            >
              <Italic className="mr-2 h-4 w-4" />
              <span>Toggle Italic</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Insert">
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
              }}
            >
              <BookMarked className="mr-2 h-4 w-4" />
              <span>Insert Citation</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="View">
            <CommandItem
              onSelect={() => {
                setLeftPanelOpen(!leftPanelOpen);
                setCommandOpen(false);
              }}
            >
              <PanelLeft className="mr-2 h-4 w-4" />
              <span>Toggle References Panel</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setRightPanelOpen(!rightPanelOpen);
                setCommandOpen(false);
              }}
            >
              <PanelRight className="mr-2 h-4 w-4" />
              <span>Toggle Activity Panel</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    );
  };

  // Header Component
  const EditorHeader = () => {
    return (
      <header className="border-b bg-white dark:bg-gray-900 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLeftPanelOpen(!leftPanelOpen)}>
              {leftPanelOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <Input
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="font-semibold text-lg border-0 focus-visible:ring-0 px-0 max-w-md"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Collaborators */}
          <div className="flex -space-x-2">
            {collaborators.map((collaborator) => (
              <Popover key={collaborator.id}>
                <PopoverTrigger>
                  <div className="relative">
                    <Avatar className="h-8 w-8 border-2 border-white hover:z-10">
                      <AvatarImage src={collaborator.avatar} />
                      <AvatarFallback>{collaborator.name[0]}</AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white",
                        collaborator.status === "online" && "bg-green-500",
                        collaborator.status === "away" && "bg-yellow-500",
                        collaborator.status === "offline" && "bg-gray-400"
                      )}
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={collaborator.avatar} />
                        <AvatarFallback>{collaborator.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{collaborator.name}</p>
                        <p className="text-sm text-muted-foreground">{collaborator.email}</p>
                      </div>
                    </div>
                    <Badge variant={collaborator.status === "online" ? "default" : "secondary"}>
                      {collaborator.status}
                    </Badge>
                    {collaborator.isTyping && (
                      <p className="text-sm text-muted-foreground">Currently typing...</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            ))}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Actions */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCommandOpen(true)}
            className="text-muted-foreground"
          >
            <CommandIcon className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Command</span>
            <kbd className="ml-2 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:inline-flex">
              ⌘K
            </kbd>
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4" />
          </Button>

          <DropdownMenu
            trigger={
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            }
            align="end"
          >
            <DropdownMenuItem>
              <Save className="mr-2 h-4 w-4" />
              Save
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Upload className="mr-2 h-4 w-4" />
              Import Document
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
          >
            {rightPanelOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>
    );
  };

  // Left Sidebar - References
  const LeftSidebar = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [referenceFormOpen, setReferenceFormOpen] = useState(false);

    return (
      <aside
        className={cn(
          "border-r bg-gray-50 dark:bg-gray-900/50 transition-all duration-300 overflow-hidden",
          leftPanelOpen ? "w-80" : "w-0"
        )}
      >
        <div className="p-4 space-y-4 w-80">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-blue-600" />
              References
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReferenceFormOpen(!referenceFormOpen)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Collapsible open={referenceFormOpen} onOpenChange={setReferenceFormOpen}>
            <CollapsibleContent className="space-y-2 pb-4">
              <Input placeholder="Title" className="h-9" />
              <Input placeholder="Authors (comma-separated)" className="h-9" />
              <div className="flex gap-2">
                <Input placeholder="Year" className="h-9 flex-1" />
                <Input placeholder="DOI" className="h-9 flex-1" />
              </div>
              <Button size="sm" className="w-full">
                Add Reference
              </Button>
            </CollapsibleContent>
          </Collapsible>

          <Input
            placeholder="Search references..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />

          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-2">
              {references.map((ref) => (
                <div
                  key={ref.id}
                  className="p-3 bg-white dark:bg-gray-900 rounded-lg border hover:border-blue-500 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm mb-1 line-clamp-2">{ref.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ref.authors.join(", ")} ({ref.year})
                      </p>
                      {ref.journal && (
                        <p className="text-xs text-muted-foreground italic mt-1">{ref.journal}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleInsertCitation(ref)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>
    );
  };

  // Right Sidebar - Comments, Suggestions, History
  const RightSidebar = () => {
    return (
      <aside
        className={cn(
          "border-l bg-gray-50 dark:bg-gray-900/50 transition-all duration-300 overflow-hidden",
          rightPanelOpen ? "w-80" : "w-0"
        )}
      >
        <div className="p-4 space-y-4 w-80">
          {/* Tabs */}
          <div className="flex gap-1 bg-white dark:bg-gray-900 rounded-lg p-1">
            <Button
              variant={activeTab === "comments" ? "default" : "ghost"}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setActiveTab("comments")}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Comments
            </Button>
            <Button
              variant={activeTab === "suggestions" ? "default" : "ghost"}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setActiveTab("suggestions")}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Suggestions
            </Button>
            <Button
              variant={activeTab === "history" ? "default" : "ghost"}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setActiveTab("history")}
            >
              <History className="h-3 w-3 mr-1" />
              History
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            {activeTab === "comments" && (
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No comments yet</p>
                    <p className="text-xs mt-1">Right-click in the editor to add a comment</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 bg-white dark:bg-gray-900 rounded-lg border"
                    >
                      <div className="flex items-start gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={comment.userAvatar} />
                          <AvatarFallback>{comment.userName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium">{comment.userName}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(comment.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">{comment.content}</p>
                          {comment.resolved && (
                            <Badge variant="secondary" className="mt-2">
                              <Check className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "suggestions" && (
              <div className="space-y-3">
                {suggestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No suggestions yet</p>
                  </div>
                ) : (
                  suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="p-3 bg-white dark:bg-gray-900 rounded-lg border"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src="" />
                          <AvatarFallback>{suggestion.userName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{suggestion.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(suggestion.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            suggestion.status === "accepted"
                              ? "default"
                              : suggestion.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {suggestion.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-sm">
                          <span className="line-through text-red-600 dark:text-red-400">
                            {suggestion.original}
                          </span>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-sm">
                          <span className="text-green-600 dark:text-green-400">
                            {suggestion.suggested}
                          </span>
                        </div>
                        <div className="flex items-start gap-1">
                          <Lightbulb className="h-3 w-3 mt-0.5 text-amber-500" />
                          <p className="text-xs text-muted-foreground italic flex-1">
                            {suggestion.reason}
                          </p>
                        </div>
                        {suggestion.status === "pending" && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1"
                              onClick={() => handleAcceptSuggestion(suggestion.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleRejectSuggestion(suggestion.id)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                  {versions.map((version) => (
                    <div key={version.id} className="relative flex gap-3 pb-4">
                      <div className="relative z-10">
                        <Avatar className="h-8 w-8 border-2 border-white dark:border-gray-900">
                          <AvatarImage src={version.userAvatar} />
                          <AvatarFallback>{version.userName[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{version.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(version.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{version.changes}</p>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button variant="ghost" size="sm">
                            <GitBranch className="h-3 w-3 mr-1" />
                            Restore
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </aside>
    );
  };

  // Main Editor Area with Context Menu
  const EditorArea = () => {
    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className="flex-1 flex flex-col bg-white dark:bg-gray-900"
            onMouseEnter={() => setShowToolbar(true)}
            onMouseLeave={() => setShowToolbar(false)}
          >
            <div className="flex-1 overflow-auto">
              <div className="max-w-4xl mx-auto p-8">
                <div className="prose prose-lg dark:prose-invert max-w-none min-h-[calc(100vh-300px)]">
                  <EditorContent editor={editor} className="focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Footer Stats */}
            <div className="border-t px-4 py-2 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>{wordCount} words</span>
                <Separator orientation="vertical" className="h-4" />
                <span>{editor?.getText().length || 0} characters</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Saved
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAIImprove}
                  disabled={loading}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {loading ? "Generating..." : "AI Assist"}
                </Button>
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onSelect={() => {
              editor?.chain().focus().toggleBold().run();
            }}
          >
            <Bold className="mr-2 h-4 w-4" />
            Bold
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => {
              editor?.chain().focus().toggleItalic().run();
            }}
          >
            <Italic className="mr-2 h-4 w-4" />
            Italic
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem>
            <MessageSquare className="mr-2 h-4 w-4" />
            Add Comment
          </ContextMenuItem>
          <ContextMenuItem>
            <Sparkles className="mr-2 h-4 w-4" />
            Suggest Edit
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem>
            <BookMarked className="mr-2 h-4 w-4" />
            Insert Citation
          </ContextMenuItem>
          <ContextMenuItem>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </ContextMenuItem>
          <ContextMenuItem>
            <Clipboard className="mr-2 h-4 w-4" />
            Paste
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
      <EditorHeader />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <EditorArea />
        <RightSidebar />
      </div>
      <FloatingToolbar />
      <CommandPalette />
      <ShareModal open={shareOpen} onOpenChange={setShareOpen} onShare={handleShareInvite} />
    </div>
  );
}
