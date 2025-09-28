/**
 * Extract Data v2 - Chat Dock (Bottom)
 * Phase 0: Suggestion chips, composer, streaming messages (reuses existing chat logic)
 * Phase 3: Will add Advanced drawer with provider/model selection
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, ChevronUp, ChevronDown } from 'lucide-react';
import { ChatMessage } from '@/lib/types/extract-stream';
import ReactMarkdown from 'react-markdown';

interface ChatDockProps {
  messages: ChatMessage[];
  currentResponse: string;
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
  onAbort: () => void;
}

export function ChatDock({
  messages,
  currentResponse,
  isStreaming,
  onSendMessage,
  onAbort,
}: ChatDockProps) {
  const [currentMessage, setCurrentMessage] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Suggestion chips (reuse from existing page)
  const suggestions = [
    'Methods used',
    'Limitations', 
    'Explain Abstract',
    'Practical Implications',
    'Paper Summary',
    'Literature survey',
    'Future works'
  ];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  const handleSend = () => {
    if (!currentMessage.trim() || isStreaming) return;
    onSendMessage(currentMessage.trim());
    setCurrentMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage(suggestion);
  };

  return (
    <div className={`border-t border-gray-200 bg-white transition-all duration-200 ${
      isExpanded ? 'h-96' : 'h-auto'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Document Chat</h3>
          <span className="text-xs text-gray-500">
            {messages.filter(m => m.role === 'user').length} messages
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Advanced settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Advanced Settings Drawer */}
      {showAdvanced && (
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <div className="text-sm text-gray-600">
            <div className="mb-2 font-medium">Advanced Settings</div>
            <div className="text-xs text-gray-500">
              Provider/Model selection and cost preview will be available in Phase 3.
            </div>
            {/* TODO Phase 3: Add provider/model selector, temperature, cost preview */}
          </div>
        </div>
      )}

      {/* Messages Area (when expanded) */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: '240px' }}>
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    message.role === 'user' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm prose-gray max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            
            {/* Current streaming response */}
            {currentResponse && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">
                  <div className="prose prose-sm prose-gray max-w-none">
                    <ReactMarkdown>{currentResponse}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
            
            {/* Typing indicator */}
            {isStreaming && !currentResponse && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">
                  Assistant is typing...
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-2 p-3">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => handleSuggestionClick(suggestion)}
            disabled={isStreaming}
            className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div className="p-3">
        {/* Guided prompt hint */}
        <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
          <span className="truncate">Generate summary of this paper, Results of the paper, Conclusions...</span>
          <span className="text-gray-400">+{suggestions.length - 3} more</span>
        </div>

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask any question about the document..."
            disabled={isStreaming}
            className="min-h-[40px] flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50"
            rows={1}
          />
          {isStreaming ? (
            <button
              onClick={onAbort}
              className="inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!currentMessage.trim()}
              className="inline-flex h-9 items-center justify-center rounded-md bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
