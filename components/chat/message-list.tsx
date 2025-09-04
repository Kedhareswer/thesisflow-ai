'use client';

import React from 'react';
import { useChatContext } from '@/lib/contexts/chat-context';
import { MessageItem } from './message-item';
import type { Message } from '@/lib/supabase';

interface MessageListProps {
  messages: Message[];
  conversationId: string;
}

export function MessageList({ messages, conversationId }: MessageListProps) {
  const { markAsRead } = useChatContext();

  // Mark last message as read when component mounts or messages change
  React.useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      markAsRead(conversationId, lastMessage.id);
    }
  }, [messages, conversationId, markAsRead]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <p>No messages yet</p>
          <p className="text-sm mt-1">Send a message to start the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {messages.map((message, index) => {
        const previousMessage = index > 0 ? messages[index - 1] : null;
        const showSender = !previousMessage || 
          previousMessage.sender_id !== message.sender_id ||
          (new Date(message.created_at).getTime() - new Date(previousMessage.created_at).getTime()) > 300000; // 5 minutes

        return (
          <MessageItem
            key={message.id}
            message={message}
            showSender={showSender}
          />
        );
      })}
    </div>
  );
}