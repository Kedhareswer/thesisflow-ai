'use client';

import React from 'react';
import { ChatProvider } from '@/lib/contexts/chat-context';
import { ConversationList } from './conversation-list';
import { ChatWindow } from './chat-window';
import { UserSearch } from './user-search';

interface ChatLayoutProps {
  className?: string;
}

export function ChatLayout({ className = '' }: ChatLayoutProps) {
  return (
    <ChatProvider>
      <div className={`flex h-screen bg-gray-50 ${className}`}>
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
            <UserSearch />
          </div>
          
          {/* Conversation List */}
          <div className="flex-1 overflow-hidden">
            <ConversationList />
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatWindow />
        </div>
      </div>
    </ChatProvider>
  );
}