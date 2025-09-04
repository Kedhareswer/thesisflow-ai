'use client';

import React, { useEffect } from 'react';
import { useChatContext } from '@/lib/contexts/chat-context';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function ConversationList() {
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    loadConversations,
    isLoading,
    error
  } = useChatContext();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  if (isLoading && conversations.length === 0) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <p>Error loading conversations</p>
        <button 
          onClick={loadConversations}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No conversations yet</p>
        <p className="text-sm mt-1">Start a new conversation to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === activeConversationId}
          onClick={() => setActiveConversation(conversation.id)}
        />
      ))}
    </div>
  );
}

interface ConversationItemProps {
  conversation: any; // Using any for now, should be properly typed
  isActive: boolean;
  onClick: () => void;
}

function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const getConversationName = () => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }
    
    // For direct messages, show the other participant's name
    const otherParticipant = conversation.participants?.find(
      (p: any) => p.user_id !== conversation.current_user_id
    );
    return otherParticipant?.user?.full_name || otherParticipant?.user?.username || 'Unknown User';
  };

  const getConversationAvatar = () => {
    if (conversation.type === 'group') {
      return conversation.avatar_url;
    }
    
    const otherParticipant = conversation.participants?.find(
      (p: any) => p.user_id !== conversation.current_user_id
    );
    return otherParticipant?.user?.avatar_url;
  };

  const getLastMessagePreview = () => {
    if (!conversation.last_message) return 'No messages yet';
    
    const message = conversation.last_message;
    if (message.message_type === 'text') {
      return message.content.length > 50 
        ? `${message.content.substring(0, 50)}...`
        : message.content;
    }
    
    return `${message.message_type === 'image' ? '📷' : '📎'} ${message.message_type}`;
  };

  const getLastMessageTime = () => {
    if (!conversation.last_message) return '';
    
    return formatDistanceToNow(new Date(conversation.last_message.created_at), {
      addSuffix: false
    });
  };

  const isOnline = () => {
    if (conversation.type === 'group') return false;
    
    const otherParticipant = conversation.participants?.find(
      (p: any) => p.user_id !== conversation.current_user_id
    );
    return otherParticipant?.user?.is_online || false;
  };

  return (
    <div
      className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer border-l-4 transition-colors ${
        isActive 
          ? 'bg-blue-50 border-l-blue-500' 
          : 'border-l-transparent'
      }`}
      onClick={onClick}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={getConversationAvatar()} />
          <AvatarFallback>
            {getConversationName().charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {conversation.type === 'direct' && isOnline() && (
          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full" />
        )}
      </div>

      <div className="ml-3 flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 truncate">
            {getConversationName()}
          </p>
          <div className="flex items-center space-x-2">
            {conversation.unread_count > 0 && (
              <Badge variant="default" className="bg-blue-600">
                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
              </Badge>
            )}
            <span className="text-xs text-gray-500">
              {getLastMessageTime()}
            </span>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 truncate mt-1">
          {getLastMessagePreview()}
        </p>
      </div>
    </div>
  );
}