"use client";

import { ArrowRight, Bot, Check, ChevronDown, Paperclip, Loader2 } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { type AIProvider, AI_PROVIDERS, AIProviderService } from "@/lib/ai-providers";
import { AIProviderDetector } from "@/lib/ai-provider-detector";

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;

      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );

      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

const OPENAI_ICON = (
  <>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 256 260"
      aria-label="OpenAI Icon"
      className="w-4 h-4 dark:hidden block"
    >
      <title>OpenAI Icon Light</title>
      <path d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z" />
    </svg>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 256 260"
      aria-label="OpenAI Icon"
      className="w-4 h-4 hidden dark:block"
    >
      <title>OpenAI Icon Dark</title>
      <path
        fill="#fff"
        d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"
      />
    </svg>
  </>
);

export function AI_Prompt() {
  const [value, setValue] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 96,
    maxHeight: 400,
  });
  
  // AI Provider state
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>(undefined);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  // Maximum characters allowed in the input – keep UX predictable
  const MAX_LENGTH = 4000;

  // Load available providers on component mount
  useEffect(() => {
    const loadProviders = async () => {
      setIsLoading(true);
      try {
        const providers = await AIProviderDetector.getClientAvailableProviders();
        setAvailableProviders(providers);
        
        if (providers.length > 0 && !selectedProvider) {
          const defaultProvider = providers[0];
          setSelectedProvider(defaultProvider);
          const models = AI_PROVIDERS[defaultProvider].models;
          setAvailableModels(models);
          setSelectedModel(models[0]);
        }
      } catch (error) {
        console.error("Error loading AI providers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProviders();
  }, []);

  // Update available models when provider changes
  useEffect(() => {
    if (selectedProvider) {
      const models = AI_PROVIDERS[selectedProvider].models;
      setAvailableModels(models);
      if (!models.includes(selectedModel)) {
        setSelectedModel(models[0]);
      }
    }
  }, [selectedProvider, selectedModel]);

  // Get provider icon based on provider type
  const getProviderIcon = (model: string): React.ReactNode => {
    // Find which provider this model belongs to
    for (const [providerKey, config] of Object.entries(AI_PROVIDERS)) {
      if (config.models.includes(model)) {
        switch (providerKey as AIProvider) {
          case "openai":
          case "aiml":
            return OPENAI_ICON;
          case "gemini":
            return (
              <svg height="1em" className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4285F4" />
                    <stop offset="50%" stopColor="#9C27B0" />
                    <stop offset="100%" stopColor="#EA4335" />
                  </linearGradient>
                </defs>
                <path fill="url(#gemini-gradient)" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            );
          case "anthropic":
            return (
              <svg height="1em" className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#D97706" />
                <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            );
          case "groq":
            return (
              <svg height="1em" className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" fill="#f97316"/>
                <path d="m9 9 5 12 1.774-5.226L21 14 9 9z" fill="white"/>
              </svg>
            );
          case "mistral":
            return (
              <svg height="1em" className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#FF7000" />
                <path d="M8 8l8 8M16 8l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            );
          default:
            return <Bot className="w-4 h-4 opacity-50" />;
        }
      }
    }
    return <Bot className="w-4 h-4 opacity-50" />;
  };

  const MODEL_ICONS: Record<string, React.ReactNode> = {
    "o3-mini": OPENAI_ICON,
    "Gemini 2.5 Flash": (
      <svg
        height="1em"
        className="w-4 h-4"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="lobe-icons-gemini-fill"
            x1="0%"
            x2="68.73%"
            y1="100%"
            y2="30.395%"
          >
            <stop offset="0%" stopColor="#1C7DFF" />
            <stop offset="52.021%" stopColor="#1C69FF" />
            <stop offset="100%" stopColor="#F0DCD6" />
          </linearGradient>
        </defs>
        <path
          fill="url(#lobe-icons-gemini-fill)"
          fillRule="nonzero"
          d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12"
        />
      </svg>
    ),
    "Claude 3.5 Sonnet": (
      <>
        <svg
          fill="#000"
          fillRule="evenodd"
          className="w-4 h-4 dark:hidden block"
          viewBox="0 0 24 24"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Anthropic Icon Light</title>
          <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
        </svg>
        <svg
          fill="#fff"
          fillRule="evenodd"
          className="w-4 h-4 hidden dark:block"
          viewBox="0 0 24 24"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Anthropic Icon Dark</title>
          <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
        </svg>
      </>
    ),
    "GPT-4-1 Mini": OPENAI_ICON,
    "GPT-4-1": OPENAI_ICON,
  };

  const handleSendMessage = async () => {
    if (!value.trim() || isSending || !selectedProvider || !selectedModel) return;

    setIsSending(true);
    try {
      const response = await AIProviderService.generateResponse(
        value.trim(),
        selectedProvider,
        selectedModel
      );
      
      // Handle the response - you can customize this based on your needs
      console.log("AI Response:", response);
      
      // Clear the input after successful send
      setValue("");
      adjustHeight(true);
      
      // You can add more logic here like displaying the response or updating a chat history
    } catch (error) {
      console.error("Error sending message:", error);
      // You can add error handling UI here
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && value.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-2">
        <div className="relative">
          <div className="relative flex flex-col">
            <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
              <Textarea
                id="ai-input"
                value={value}
                placeholder={"Ask me anything… (Shift+Enter for newline)"} maxLength={MAX_LENGTH}
                className={cn(
                  "w-full rounded-xl rounded-b-none px-6 py-4 bg-black/5 dark:bg-white/5 border-none dark:text-white placeholder:text-black/70 dark:placeholder:text-white/70 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base",
                  "min-h-[96px]"
                )}
                ref={textareaRef}
                onKeyDown={handleKeyDown}
                onChange={(e) => {
                  setValue(e.target.value);
                  adjustHeight();
                }}
              />
            </div>

            <div className="h-16 bg-black/5 dark:bg-white/5 rounded-b-xl flex items-center">
              <div className="absolute left-4 right-4 bottom-4 flex items-center justify-between w-[calc(100%-32px)]">
                <div className="flex items-center gap-2">
                  {/* Provider Dropdown */}
                  <DropdownMenu
                    trigger={
                      <Button
                        variant="ghost"
                        className="flex items-center gap-1 h-8 pl-1 pr-2 text-xs rounded-md dark:text-white hover:bg-black/10 dark:hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500"
                        disabled={isLoading || availableProviders.length === 0}
                      >
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={selectedProvider ?? 'none'}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-1"
                          >
                            {selectedProvider ? getProviderIcon(AI_PROVIDERS[selectedProvider].models[0]) : <Bot className="w-4 h-4 opacity-50" />}
                            {selectedProvider ? AI_PROVIDERS[selectedProvider].name : "Provider"}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                          </motion.div>
                        </AnimatePresence>
                      </Button>
                    }
                  >
                    <DropdownMenuContent
                      className={cn(
                        "min-w-[10rem]",
                        "border-black/10 dark:border-white/10",
                        "bg-gradient-to-b from-white via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800"
                      )}
                    >
                      {availableProviders.map((provider) => (
                        <DropdownMenuItem
                          key={provider}
                          onSelect={() => {
                            setSelectedProvider(provider as AIProvider);
                            const models = AI_PROVIDERS[provider as AIProvider].models;
                            setAvailableModels(models);
                            setSelectedModel(models[0]);
                          }}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            {getProviderIcon(AI_PROVIDERS[provider as AIProvider].models[0])}
                            <span>{AI_PROVIDERS[provider as AIProvider].name}</span>
                          </div>
                          {selectedProvider === provider && <Check className="w-4 h-4 text-blue-500" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5" />
                  <DropdownMenu
                    trigger={
                      <Button
                        variant="ghost"
                        className="flex items-center gap-1 h-8 pl-1 pr-2 text-xs rounded-md dark:text-white hover:bg-black/10 dark:hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500"
                      >
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={selectedModel}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-1"
                          >
                            {getProviderIcon(selectedModel)}
                            {selectedModel}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                          </motion.div>
                        </AnimatePresence>
                      </Button>
                    }
                  >
                    <DropdownMenuContent
                      className={cn(
                        "min-w-[10rem]",
                        "border-black/10 dark:border-white/10",
                        "bg-gradient-to-b from-white via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800"
                      )}
                    >
                      {availableModels.map((model: string) => (
                        <DropdownMenuItem
                          key={model}
                          onSelect={() => setSelectedModel(model)}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            {getProviderIcon(model)}
                            <span>{model}</span>
                          </div>
                          {selectedModel === model && <Check className="w-4 h-4 text-blue-500" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5" />
                  <label
                    className={cn(
                      "rounded-lg p-2 bg-black/5 dark:bg-white/5 cursor-pointer",
                      "hover:bg-black/10 dark:hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500",
                      "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                    )}
                    aria-label="Attach file"
                  >
                    <input type="file" className="hidden" />
                    <Paperclip className="w-4 h-4 transition-colors" />
                  </label>
                </div>
                {/* Live character counter */}
                <span
                  className="text-xs text-black/50 dark:text-white/50 mr-2 select-none"
                  aria-live="polite"
                >
                  {value.length}/{MAX_LENGTH}
                </span>
                <button
                  type="button"
                  className={cn(
                    "rounded-lg p-2 bg-black/5 dark:bg-white/5",
                    "hover:bg-black/10 dark:hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-label="Send message"
                  disabled={!value.trim() || isSending || !selectedProvider || !selectedModel}
                  onClick={handleSendMessage}
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 dark:text-white animate-spin" />
                  ) : (
                    <ArrowRight
                      className={cn(
                        "w-4 h-4 dark:text-white transition-opacity duration-200",
                        value.trim() && selectedProvider && selectedModel ? "opacity-100" : "opacity-30"
                      )}
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
