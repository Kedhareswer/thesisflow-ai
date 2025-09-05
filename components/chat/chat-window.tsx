'use client';

import React, { useEffect, useRef } from 'react';
import { useChatContext } from '@/lib/contexts/chat-context';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { ChatHeader } from './chat-header';
import { TypingIndicator } from './typing-indicator';

export function ChatWindow() {
  const {
    activeConversationId,
    conversations,
    messages,
    loadMessages,
    isSocketConnected,
    socketError
  } = useChatContext();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const conversationMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, loadMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  if (!activeConversationId || !activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
          <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Connection Status */}
      {!isSocketConnected && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse" />
            <span className="text-sm text-yellow-800">
              {socketError ? `Connection error: ${socketError}` : 'Connecting...'}
            </span>
          </div>
        </div>
      )}

      {/* Chat Header */}
      <ChatHeader conversation={activeConversation} />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-white">
        <MessageList 
          messages={conversationMessages}
          conversationId={activeConversationId}
        />
        <TypingIndicator conversationId={activeConversationId} />
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput conversationId={activeConversationId} />
    </div>
  );
}