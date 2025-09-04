'use client';

import React from 'react';
import { useChatContext } from '@/lib/contexts/chat-context';

interface TypingIndicatorProps {
  conversationId: string;
}

export function TypingIndicator({ conversationId }: TypingIndicatorProps) {
  const { typingUsers, users } = useChatContext();
  
  const typingUserIds = typingUsers[conversationId] || [];
  
  if (typingUserIds.length === 0) {
    return null;
  }

  const getTypingText = () => {
    const typingUserNames = typingUserIds
      .map(userId => users[userId]?.full_name || users[userId]?.username || 'Someone')
      .filter(Boolean);

    if (typingUserNames.length === 0) return '';
    
    if (typingUserNames.length === 1) {
      return `${typingUserNames[0]} is typing...`;
    } else if (typingUserNames.length === 2) {
      return `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`;
    } else {
      return `${typingUserNames[0]} and ${typingUserNames.length - 1} others are typing...`;
    }
  };

  return (
    <div className="px-4 py-2">
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span>{getTypingText()}</span>
      </div>
    </div>
  );
}