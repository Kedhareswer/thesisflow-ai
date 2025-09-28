/**
 * Extract Data v2 - Chat streaming hook
 * Phase 3: Real SSE implementation with conversation history and document grounding
 */

import { useState, useCallback, useRef } from 'react';
import { ChatStreamState, ChatMessage } from '@/lib/types/extract-stream';

export interface UseExtractChatStreamOptions {
  sessionId?: string;
  fileId?: string;
  extractionId?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface UseExtractChatStreamReturn {
  state: ChatStreamState;
  send: (messages: ChatMessage[], options?: UseExtractChatStreamOptions) => Promise<void>;
  abort: () => void;
  reset: () => void;
}

export function useExtractChatStream(): UseExtractChatStreamReturn {
  const [state, setState] = useState<ChatStreamState>({
    isStreaming: false,
    messages: [],
    currentResponse: '',
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const send = useCallback(async (
    messages: ChatMessage[], 
    options?: UseExtractChatStreamOptions
  ) => {
    // Validate messages
    if (!messages || messages.length === 0) {
      console.error('useExtractChatStream: Messages array is required');
      return;
    }

    // Set initial state
    setState(prev => ({
      ...prev,
      isStreaming: true,
      messages: [...messages],
      currentResponse: '',
      error: undefined,
    }));

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Prepare request body
      const requestBody = {
        messages,
        sessionId: options?.sessionId,
        fileId: options?.fileId,
        extractionId: options?.extractionId,
        provider: options?.provider || 'auto',
        model: options?.model || 'auto',
        temperature: options?.temperature || 0.7,
        maxTokens: options?.maxTokens || 2000,
      };

      // Start SSE stream
      const response = await fetch('/api/extract/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Chat stream failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body for chat stream');
      }

      // Process SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentEventType = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
            continue;
          }
          
          if (line.startsWith('data: ')) {
            const eventData = line.slice(6).trim();
            if (!eventData) continue;
            
            try {
              const data = JSON.parse(eventData);
              handleChatEvent(currentEventType, data);
            } catch (e) {
              console.error('Failed to parse chat SSE data:', e, eventData);
            }
          }
        }
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Chat stream aborted');
      } else {
        console.error('Chat stream error:', error);
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: error instanceof Error ? error.message : 'Chat failed',
        }));
      }
    }

    // Helper function to handle chat SSE events
    function handleChatEvent(eventType: string, data: any) {
      switch (eventType) {
        case 'init':
          // Chat initialized
          setState(prev => ({
            ...prev,
            usage: { tokens: 0 },
          }));
          break;
          
        case 'progress':
          // Progress update (model selection, etc.)
          // Could show in UI if needed
          break;
          
        case 'token':
          // Streaming token
          setState(prev => ({
            ...prev,
            currentResponse: prev.currentResponse + (data.token || ''),
          }));
          break;
          
        case 'done':
          // Chat completed
          setState(prev => ({
            ...prev,
            isStreaming: false,
            messages: [
              ...prev.messages,
              {
                role: 'assistant',
                content: prev.currentResponse,
              }
            ],
            currentResponse: '',
            usage: data.usage || prev.usage,
          }));
          break;
          
        case 'error':
          // Chat error
          setState(prev => ({
            ...prev,
            isStreaming: false,
            currentResponse: '',
            error: data.message || 'Chat error',
          }));
          break;
          
        case 'ping':
          // Heartbeat - no action needed
          break;
          
        default:
          console.log('Unknown chat SSE event:', eventType, data);
      }
    }

  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isStreaming: false,
      currentResponse: '',
    }));
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({
      isStreaming: false,
      messages: [],
      currentResponse: '',
    });
  }, []);

  return {
    state,
    send,
    abort,
    reset,
  };
}
