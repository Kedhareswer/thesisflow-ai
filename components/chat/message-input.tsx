'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useChatContext } from '@/lib/contexts/chat-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface MessageInputProps {
  conversationId: string;
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { sendMessage, startTyping, stopTyping, isSocketConnected } = useChatContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTyping = useCallback(() => {
    if (!isTyping && message.trim()) {
      setIsTyping(true);
      startTyping(conversationId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(conversationId);
    }, 1000);
  }, [isTyping, message, conversationId, startTyping, stopTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    handleTyping();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    try {
      // Clear input immediately for better UX
      setMessage('');
      
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        stopTyping(conversationId);
      }

      // Send message
      await sendMessage(conversationId, trimmedMessage);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      setMessage(trimmedMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  const handleTextareaResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  React.useEffect(() => {
    handleTextareaResize();
  }, [message]);

  // Cleanup typing timeout on unmount
  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="sticky bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white p-4">
      {/* Connection Status */}
      {!isSocketConnected && (
        <div className="mb-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          Messages will be sent when connection is restored
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        {/* Message Input */}
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[40px] max-h-[120px] resize-none border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500"
            rows={1}
          />
        </div>

        {/* Send Button */}
        <Button
          type="submit"
          disabled={!message.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </Button>
      </form>

      {/* File Upload and Other Actions */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center space-x-2">
          {/* File Upload Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
            onClick={() => {
              // TODO: Implement file upload
              console.log('File upload clicked');
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </Button>

          {/* Image Upload Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
            onClick={() => {
              // TODO: Implement image upload
              console.log('Image upload clicked');
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </Button>
        </div>

        {/* Character Count */}
        <div className="text-xs text-gray-400">
          {message.length > 0 && `${message.length}/2000`}
        </div>
      </div>
    </div>
  );
}