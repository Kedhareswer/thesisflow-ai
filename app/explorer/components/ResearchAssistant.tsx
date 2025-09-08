"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ArrowRight, Bot, ChevronDown, ChevronUp, Send, Copy, Trash2, Check, Brain, RefreshCw, User, Loader2, Zap, RotateCcw, X } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from "framer-motion"
import { type AIProvider, AI_PROVIDERS, AIProviderService, type StreamingCallbacks, type StreamingController, type ChatMessage } from "@/lib/ai-providers"
import { AIProviderDetector } from "@/lib/ai-provider-detector"
import { useToast } from "@/hooks/use-toast"
import { useResearchSession } from "@/components/research-session-provider"
import { Response } from "@/src/components/ai-elements/response"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Conversation, ConversationContent, ConversationScrollButton } from "@/src/components/ai-elements/conversation"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/src/components/ai-elements/reasoning"
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/src/components/ai-elements/sources"
import { Branch, BranchMessages, BranchSelector, BranchPrevious, BranchNext, BranchPage } from "@/src/components/ai-elements/branch"
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from "@/src/components/ai-elements/task"
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/src/components/ai-elements/tool"
import { 
  InlineCitation, 
  InlineCitationText, 
  InlineCitationCard, 
  InlineCitationCardTrigger, 
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationSource,
  InlineCitationQuote
} from "@/src/components/ai-elements/inline-citation"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  provider?: AIProvider
  model?: string
}

interface Personality {
  key: string
  name: string
  description: string
  systemPrompt: string
  icon: any
  color: [number, number, number]
}

interface ResearchAssistantProps {
  personalities?: Personality[]
  selectedPersonality?: Personality
  onPersonalityChange?: (personality: Personality) => void
}

// Extract URLs from plain text assistant messages to power the Sources UI
// Includes common URL terminators in the exclusion set and properly escapes closing bracket
const URL_REGEX = /https?:\/\/[^\s)\]\}"'<>]+/g
function extractUrlsFromText(text: string): string[] {
  if (!text) return []
  const matches = text.match(URL_REGEX) ?? []
  const cleaned = matches.map((u) => u.replace(/[.,;:)\]]+$/, ""))
  // Deduplicate while preserving order
  const seen = new Set<string>()
  const result: string[] = []
  for (const u of cleaned) {
    if (!seen.has(u)) {
      seen.add(u)
      result.push(u)
    }
  }
  return result
}

// Extract academic citations from text (e.g., [1], (Smith et al., 2023), etc.)
function extractCitationsFromText(text: string): Array<{ text: string, sources: string[] }> {
  if (!text) return []
  
  const citations: Array<{ text: string, sources: string[] }> = []
  
  // Pattern for numbered citations like [1], [2-4], etc.
  const numberedCitations = text.match(/\[(\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)\]/g) || []
  numberedCitations.forEach(citation => {
    citations.push({
      text: citation,
      sources: [`Citation ${citation}`]
    })
  })
  
  // Pattern for author-year citations like (Smith et al., 2023)
  const authorYearCitations = text.match(/\([A-Z][a-z]+(?:\s+et\s+al\.)?(?:,\s+\d{4})?(?:;\s*[A-Z][a-z]+(?:\s+et\s+al\.)?(?:,\s+\d{4})?)*\)/g) || []
  authorYearCitations.forEach(citation => {
    citations.push({
      text: citation,
      sources: [`Academic source: ${citation}`]
    })
  })
  
  return citations
}

// Extract task-like content from text
function extractTasksFromText(text: string): Array<{ title: string, items: string[] }> {
  if (!text) return []
  
  const tasks: Array<{ title: string, items: string[] }> = []
  
  // Look for numbered lists or bullet points that might be tasks
  const taskPatterns = [
    /(?:^|\n)(?:\d+\.\s+|[-*]\s+)(.+)/gm,
    /(?:^|\n)(?:TODO|Task|Action):\s*(.+)/gim,
    /(?:^|\n)(?:Steps?|Instructions?):\s*\n((?:(?:\d+\.\s+|[-*]\s+).+\n?)+)/gim
  ]
  
  taskPatterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches && matches.length > 2) {
      tasks.push({
        title: "Extracted Tasks",
        items: matches.slice(0, 5) // Limit to 5 items
      })
    }
  })
  
  return tasks
}

// Extract tool usage mentions from text
function extractToolsFromText(text: string): Array<{ name: `tool-${string}`, status: 'input-available' | 'output-available', input?: any, output?: string }> {
  if (!text) return []
  
  const tools: Array<{ name: `tool-${string}`, status: 'input-available' | 'output-available', input?: any, output?: string }> = []
  
  // Look for tool usage patterns
  const toolPatterns = [
    /(?:using|used|calling|executed)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:tool|API|service)/gi,
    /\b([A-Z][a-zA-Z]+API|[A-Z][a-zA-Z]+Service)\b/g,
    /(?:searched|queried|analyzed)\s+(?:with|using)\s+([A-Z][a-zA-Z]+)/gi
  ]
  
  toolPatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)]
    matches.forEach(match => {
      if (match[1] && tools.length < 3) { // Limit to 3 tools
        // Format the tool name to match expected pattern
        const toolName = `tool-${match[1].toLowerCase().replace(/\s+/g, '-')}` as `tool-${string}`
        tools.push({
          name: toolName,
          status: 'output-available',
          output: `Successfully executed ${match[1]}`
        })
      }
    })
  })
  
  return tools
}

// Extract actionable items from text
function extractActionsFromText(text: string): string[] {
  if (!text) return []
  
  const actions: string[] = []
  
  // Look for action words and phrases
  const actionPatterns = [
    /(?:you (?:can|should|might|could)|try|consider|recommend)\s+([^.!?]+)/gi,
    /(?:^|\n)(?:Action|Next step|Recommendation):\s*(.+)/gim
  ]
  
  actionPatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)]
    matches.forEach(match => {
      if (match[1] && actions.length < 3) { // Limit to 3 actions
        actions.push(match[1].trim())
      }
    })
  })
  
  return actions
}

export function ResearchAssistant({ 
  personalities = [],
  selectedPersonality,
  onPersonalityChange 
}: ResearchAssistantProps) {
  const { toast } = useToast()
  const { 
    session, 
    buildResearchContext, 
    addChatMessage, 
    clearChatHistory,
    setChatHistory,
    hasContext, 
    contextSummary 
  } = useResearchSession()
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Chat state
  // Initialize messages from session chat history
  const [messages, setMessages] = useState<Message[]>(() => 
    session.chatHistory.map((msg, index) => ({
      id: `session-${index}`,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      provider: session.preferences.aiProvider as AIProvider || 'gemini',
      model: session.preferences.aiModel || 'gemini-pro'
    }))
  )
  const [isTyping, setIsTyping] = useState(false)
  // Show research context card collapsed by default; user can expand
  const [contextCollapsed, setContextCollapsed] = useState(true)
  
  // AI Provider state
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>(undefined)
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [streamingController, setStreamingController] = useState<StreamingController | null>(null)

  // Reasoning panel text content and optional progress (shown within content)
  const [reasoningLines, setReasoningLines] = useState<string[]>([])
  const [reasoningProgress, setReasoningProgress] = useState<number | undefined>(undefined)

  // Branch management for conversation alternatives
  const [messageBranches, setMessageBranches] = useState<Record<string, Message[]>>({})
  const [currentBranches, setCurrentBranches] = useState<Record<string, number>>({})

  // Map provider → local logo assets placed under /public
  const PROVIDER_LOGOS: Partial<Record<AIProvider, string>> = {
    groq: "/groq-icon.svg",
    mistral: "/mistral-ai-icon.svg",
    gemini: "/gemini-icon.svg",
    openai: "/openai-icon.svg",
    anthropic: "/anthropic-icon.png",
    aiml: "/ai-ml-icon.png"
  }

  const getProviderIcon = (provider: AIProvider) => {
    const logo = PROVIDER_LOGOS[provider]
    if (logo) {
      return (
        <img
          src={logo}
          alt={`${AI_PROVIDERS[provider].name} logo`}
          className="h-5 w-5 object-contain"
          loading="lazy"
        />
      )
    }
    
    // Fallback icons if logo not found
    switch (provider) {
      case "gemini":
        return <img src="/gemini-icon.svg" alt="Gemini" className="h-5 w-5 object-contain" />
      case "groq":
        return <Zap className="h-5 w-5 text-[#00AC47]" />
      case "openai":
        return <img src="/openai-icon.svg" alt="OpenAI" className="h-5 w-5 object-contain" />
      case "anthropic":
        return <img src="/anthropic-icon.png" alt="Anthropic" className="h-5 w-5 object-contain" />
      case "mistral":
        return <img src="/mistral-ai-icon.svg" alt="Mistral" className="h-5 w-5 object-contain" />
      case "aiml":
        return <img src="/ai-ml-icon.png" alt="AI/ML" className="h-5 w-5 object-contain" />
      default:
        return <Bot className="h-5 w-5 opacity-70" />
    }
  }

  const SelectedPersonalityIcon = selectedPersonality?.icon

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    textarea.style.height = "auto"
    const newHeight = Math.min(textarea.scrollHeight, 200)
    textarea.style.height = `${newHeight}px`
  }, [])


  const handleAbortStream = useCallback(() => {
    if (streamingController) {
      streamingController.abort()
      setStreamingController(null)
      setIsSending(false)
      setIsTyping(false)
      toast({
        title: "Stream Cancelled",
        description: "AI response generation was cancelled"
      })
      setReasoningLines([])
      setReasoningProgress(undefined)
    }
  }, [streamingController, toast])

  // Load available providers on mount
  useEffect(() => {
    const loadProviders = async () => {
      setIsLoading(true)
      try {
        const providers = await AIProviderDetector.getClientAvailableProviders()
        setAvailableProviders(providers)
        
        if (providers.length > 0 && !selectedProvider) {
          const defaultProvider = providers[0]
          setSelectedProvider(defaultProvider)
          const models = AI_PROVIDERS[defaultProvider].models
          setAvailableModels(models)
          setSelectedModel(models[0])
        }
      } catch (error) {
        console.error("Error loading AI providers:", error)
        toast({
          title: "Error",
          description: "Failed to load AI providers",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadProviders()
  }, [])

  // Update models when provider changes
  useEffect(() => {
    if (selectedProvider) {
      const models = AI_PROVIDERS[selectedProvider].models
      setAvailableModels(models)
      if (!models.includes(selectedModel)) {
        setSelectedModel(models[0])
      }
    }
  }, [selectedProvider, selectedModel])

  // Auto-scroll handled by Conversation component

  const handleSendMessage = async () => {
    if (!value.trim() || isSending || !selectedProvider || !selectedModel) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: value.trim(),
      timestamp: new Date(),
      provider: selectedProvider,
      model: selectedModel
    }

    setMessages(prev => [...prev, userMessage])
    const userMessageContent = value.trim()
    setValue("")
    adjustHeight()
    setIsSending(true)
    setIsTyping(true)
    // reset reasoning panel for new stream; it will auto-open on first progress
    setReasoningLines([])
    setReasoningProgress(undefined)

    // Create placeholder assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      provider: selectedProvider,
      model: selectedModel
    }
    
    setMessages(prev => [...prev, assistantMessage])

    try {
      // Build comprehensive system prompt with session context
      const basePrompt = selectedPersonality?.systemPrompt || 
        "You are a helpful research assistant. Provide clear, accurate, and detailed responses."
      
      // Get current research context from session
      const researchContext = buildResearchContext()
      
      const systemPrompt = researchContext 
        ? `${basePrompt}

=== CURRENT RESEARCH CONTEXT ===
${researchContext}

Use this research context to provide more relevant and targeted responses. Reference specific papers, topics, or ideas from the context when relevant.`
        : basePrompt

      // Set up streaming callbacks
      const streamingCallbacks: StreamingCallbacks = {
        onToken: (token: string) => {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: msg.content + token }
              : msg
          ))
        },
        onProgress: (progress) => {
          // Update with progress messages/percentages
          console.log('Streaming progress:', progress)
          if (typeof progress?.percentage === 'number') {
            setReasoningProgress(progress.percentage)
          }
          const msg = progress?.message
          if (typeof msg === 'string' && msg.length > 0) {
            setReasoningLines(prev => {
              if (prev.length > 0 && prev[prev.length - 1] === msg) return prev
              return [...prev, msg]
            })
          }
        },
        onError: (error: string) => {
          console.error("Streaming error:", error)
          // Suppress destructive toast if this was a user-initiated abort
          if (error !== 'Stream aborted by user') {
            toast({
              title: "Streaming Error",
              description: error,
              variant: "destructive"
            })
          }
          setIsTyping(false)
          setIsSending(false)
          setStreamingController(null)
          setReasoningLines([])
          setReasoningProgress(undefined)
        },
        onDone: (metadata) => {
          console.log('Streaming complete:', metadata)
          setIsTyping(false)
          setIsSending(false)
          setStreamingController(null)
          // Mark reasoning as complete and clear shortly after
          setReasoningLines(prev => {
            if (prev.length === 0 || prev[prev.length - 1] !== 'Response complete') {
              return [...prev, 'Response complete']
            }
            return prev
          })
          setReasoningProgress(100)
          setTimeout(() => {
            setReasoningLines([])
            setReasoningProgress(undefined)
          }, 600)
          
          // Save messages to session
          addChatMessage('user', userMessageContent, researchContext ? ['research_context'] : undefined)
          
          // Use a timeout to ensure state has updated, then save the assistant message
          setTimeout(() => {
            setMessages(currentMessages => {
              const finalMessage = currentMessages.find(msg => msg.id === assistantMessageId)
              if (finalMessage?.content) {
                addChatMessage('assistant', finalMessage.content, researchContext ? ['research_context'] : undefined)
              }
              return currentMessages
            })
          }, 100)
        }
      }

      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
      // Add the new user message to the conversation
      conversationHistory.push({
        role: 'user',
        content: userMessageContent
      })

      // Start streaming with full conversation history
      const controller = await AIProviderService.streamChat(
        conversationHistory,
        selectedProvider,
        selectedModel,
        streamingCallbacks,
        {
          systemPrompt,
          temperature: 0.7,
          maxTokens: 2000
        }
      )
      
      setStreamingController(controller)

    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to get response from AI provider",
        variant: "destructive"
      })
      setIsSending(false)
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    setValue("")
    // Clear chat from session as well
    clearChatHistory()
    toast({
      title: "Chat Cleared",
      description: "All messages have been cleared from chat and session."
    })
  }

  // Revert to the state before a given user message
  const handleRevertToMessage = (messageId: string) => {
    const idx = messages.findIndex(m => m.id === messageId && m.role === 'user')
    if (idx === -1) return
    const target = messages[idx]
    const trimmed = messages.slice(0, idx)

    setIsTyping(false)
    setIsSending(false)
    setMessages(trimmed)
    setValue(target.content)
    // Persist trimmed history to session
    const newHistory = trimmed.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString()
    }))
    setChatHistory(newHistory)
    adjustHeight()
    textareaRef.current?.focus()
    toast({
      title: "Reverted",
      description: "Chat reverted to before that prompt. You can edit and resend.",
    })
  }


  return (
    <div className="flex flex-col h-[85vh] md:h-[90vh] lg:h-[95vh] bg-white rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Research Assistant</h3>
          {selectedPersonality && (
            <span className="text-sm text-muted-foreground">
              ({selectedPersonality.name} mode)
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChat}
          disabled={messages.length === 0}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>


      {/* Messages */}
      <Conversation className="flex-1 p-4 md:p-6">
        <ConversationContent>
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="w-14 h-14 mx-auto mb-4 opacity-50" />
              <p>Start a conversation with your AI research assistant</p>
              <p className="text-sm mt-2">
                Select a provider and model, then type your message below
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, messageIndex) => {
                // Check if this message has branches
                const hasBranches = messageBranches[message.id] && messageBranches[message.id].length > 1
                const currentBranch = currentBranches[message.id] || 0
                const branches = messageBranches[message.id] || [message]
                const displayMessage = branches[currentBranch] || message

                return (
                  <div key={message.id}>
                    {hasBranches && (
                      <Branch 
                        defaultBranch={currentBranch}
                        onBranchChange={(branchIndex) => {
                          setCurrentBranches(prev => ({
                            ...prev,
                            [message.id]: branchIndex
                          }))
                        }}
                      >
                        <BranchMessages>
                          {branches.map((branchMessage, branchIndex) => (
                            <div key={`${message.id}-branch-${branchIndex}`}>
                              <MessageContent 
                                message={branchMessage} 
                                messageIndex={messageIndex} 
                                onRevert={handleRevertToMessage}
                                isSending={isSending}
                                reasoningProgress={reasoningProgress}
                                reasoningLines={reasoningLines}
                              />
                            </div>
                          ))}
                        </BranchMessages>
                        <BranchSelector from={message.role}>
                          <BranchPrevious />
                          <BranchPage />
                          <BranchNext />
                        </BranchSelector>
                      </Branch>
                    )}
                    {!hasBranches && (
                      <MessageContent 
                        message={displayMessage} 
                        messageIndex={messageIndex} 
                        onRevert={handleRevertToMessage}
                        isSending={isSending}
                        reasoningProgress={reasoningProgress}
                        reasoningLines={reasoningLines}
                      />
                    )}
                  </div>
                )
              })}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input Area */}
      <div className="border-t bg-muted/30 px-4 py-4">
        {/* Research Context Display */}
        {hasContext && (
          contextCollapsed ? (
            <div className="mb-5 px-4 py-2 w-full bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200/60 flex items-center justify-between">
              <span className="text-xs text-emerald-700">Session context hidden</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => setContextCollapsed(false)}
                aria-label="Expand context"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-4 md:p-5 min-h-[80px] w-full bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200/60"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <Brain className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    Enhanced Context Available
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 border-0">
                    Session Context
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setContextCollapsed(true)}
                    aria-label="Collapse context"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-1">
                {contextSummary}
              </p>
              <p className="text-xs text-gray-500">
                🎯 AI responses will be tailored to your research context
              </p>
            </motion.div>
          )
        )}
        
        <div className="flex items-center gap-3 mb-4">
          {/* Provider Dropdown */}
          <DropdownMenu
            trigger={
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading || availableProviders.length === 0}
                className="h-8"
              >
                {selectedProvider ? (
                  <>
                    {getProviderIcon(selectedProvider)}
                    <span className="ml-2">{AI_PROVIDERS[selectedProvider].name}</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    <span className="ml-2">Select Provider</span>
                  </>
                )}
                <ChevronDown className="w-3 h-3 ml-2" />
              </Button>
            }
          >
            {availableProviders.map((provider) => (
              <DropdownMenuItem
                key={provider}
                onClick={() => setSelectedProvider(provider)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {getProviderIcon(provider)}
                    <span>{AI_PROVIDERS[provider].name}</span>
                  </div>
                  {selectedProvider === provider && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenu>

          {/* Model Dropdown */}
          <DropdownMenu
            trigger={
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedProvider || availableModels.length === 0}
                className="h-8"
              >
                <span>{selectedModel || "Select Model"}</span>
                <ChevronDown className="w-3 h-3 ml-2" />
              </Button>
            }
          >
            {availableModels.map((model) => (
              <DropdownMenuItem
                key={model}
                onClick={() => setSelectedModel(model)}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{model}</span>
                  {selectedModel === model && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenu>

          {/* Personality Selector */}
          {personalities.length > 0 && (
            <DropdownMenu
              trigger={
                <Button variant="outline" size="sm" className="h-8">
                  {selectedPersonality ? (
                    <>
                      {SelectedPersonalityIcon && (
                         <SelectedPersonalityIcon className="w-4 h-4" />
                       )}
                      <span className="ml-2">{selectedPersonality.name}</span>
                    </>
                  ) : (
                    <span>Select Personality</span>
                  )}
                  <ChevronDown className="w-3 h-3 ml-2" />
                </Button>
              }
            >
              {personalities.map((personality) => (
                <DropdownMenuItem
                  key={personality.key}
                  onClick={() => onPersonalityChange?.(personality)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {(() => { const Icon = personality.icon; return <Icon className="w-4 h-4" /> })()}
                      <div>
                        <div className="font-medium">{personality.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {personality.description}
                        </div>
                      </div>
                    </div>
                    {selectedPersonality?.key === personality.key && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenu>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              adjustHeight()
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask your research question..."
            className="min-h-[80px] max-h-[200px] resize-none text-sm"
            disabled={isSending}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSendMessage}
              disabled={!value.trim() || isSending || !selectedProvider || !selectedModel}
              className="px-4"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </Button>
            {streamingController && (
              <Button
                onClick={handleAbortStream}
                variant="outline"
                size="sm"
                className="px-3"
                title="Cancel streaming response"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Separate component for rendering individual messages to avoid duplication
function MessageContent({ 
  message, 
  messageIndex, 
  onRevert,
  isSending,
  reasoningProgress,
  reasoningLines
}: { 
  message: Message, 
  messageIndex: number,
  onRevert: (messageId: string) => void,
  isSending: boolean,
  reasoningProgress: number | null | undefined,
  reasoningLines: string[]
}) {
  const { toast } = useToast()
 
  
  return (
    <div
      className={cn(
        "flex gap-3",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {message.role === "assistant" && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "group relative max-w-[90%] rounded-xl px-6 py-4",
          message.role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {message.role === "user" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 size-7 shrink-0 rounded-full text-primary-foreground/80 hover:text-primary-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  aria-label="Revert to this prompt"
                  disabled={isSending}
                  onClick={() => onRevert(message.id)}
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Revert to this prompt</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {message.role === "assistant" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 size-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  aria-label="Copy response"
                  onClick={() => {
                    navigator.clipboard.writeText(message.content)
                    toast({ title: "Copied", description: "Response copied to clipboard" })
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy response</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {message.role === "assistant" ? (
          <>
            {/* Sources Panel */}
            {(() => {
              const urls = extractUrlsFromText(message.content)
              if (urls.length === 0) return null
              return (
                <div className="mb-2">
                  <Sources>
                    <SourcesTrigger count={urls.length} />
                    <SourcesContent>
                      {urls.map((u, i) => (
                        <Source key={`${message.id}-src-${i}`} href={u} title={u} />
                      ))}
                    </SourcesContent>
                  </Sources>
                </div>
              )
            })()}

            {/* Reasoning Panel - Only show for assistant messages during streaming */}
            {message.role === "assistant" && isSending && (
              <div className="mb-2">
                <Reasoning className="w-full" isStreaming={isSending}>
                  <ReasoningTrigger />
                  <ReasoningContent>
                    {[
                      typeof reasoningProgress === 'number' ? `Progress: ${Math.round(reasoningProgress)}%` : undefined,
                      reasoningLines.length === 0 ? 'Initializing...' : reasoningLines.join('\n')
                    ].filter(Boolean).join('\n')}
                  </ReasoningContent>
                </Reasoning>
              </div>
            )}

            {/* Tasks Panel */}
            {(() => {
              const tasks = extractTasksFromText(message.content)
              if (tasks.length === 0) return null
              return (
                <div className="mb-2 space-y-2">
                  {tasks.map((task, i) => (
                    <Task key={`${message.id}-task-${i}`} defaultOpen={false}>
                      <TaskTrigger title={task.title} />
                      <TaskContent>
                        {task.items.map((item, j) => (
                          <TaskItem key={`${message.id}-task-${i}-item-${j}`}>
                            {item}
                          </TaskItem>
                        ))}
                      </TaskContent>
                    </Task>
                  ))}
                </div>
              )
            })()}

            {/* Tools Panel */}
            {(() => {
              const tools = extractToolsFromText(message.content)
              if (tools.length === 0) return null
              return (
                <div className="mb-2 space-y-2">
                  {tools.map((tool, i) => (
                    <Tool key={`${message.id}-tool-${i}`} defaultOpen={false}>
                      <ToolHeader type={tool.name} state={tool.status} />
                      <ToolContent>
                        {tool.input && <ToolInput input={tool.input} />}
                        {tool.output && <ToolOutput output={tool.output} errorText={undefined} />}
                      </ToolContent>
                    </Tool>
                  ))}
                </div>
              )
            })()}

            {/* Enhanced Response with Inline Citations */}
            {(() => {
              const citations = extractCitationsFromText(message.content)
              let processedContent = message.content
              
              // Replace citations with InlineCitation components
              citations.forEach((citation, i) => {
                // For now, just render the original content with citations highlighted
                // Full JSX replacement would require more complex parsing
              })
              
              return (
                <Response parseIncompleteMarkdown={true}>
                  {processedContent}
                </Response>
              )
            })()}

            {/* Actions Panel (minimal list, no copy buttons) */}
            {(() => {
              const actions = extractActionsFromText(message.content)
              if (actions.length === 0) return null
              return (
                <div className="mt-2 text-xs text-muted-foreground">
                  <ul className="list-disc pl-5 space-y-1">
                    {actions.slice(0, 5).map((a, i) => (
                      <li key={`${message.id}-act-${i}`}>{a}</li>
                    ))}
                  </ul>
                </div>
              )
            })()}
          </>
        ) : (
          <div className="text-sm whitespace-pre-wrap leading-6">{message.content}</div>
        )}
      </div>
      {message.role === "user" && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="w-5 h-5 text-primary-foreground" />
        </div>
      )}
    </div>
  )
}
