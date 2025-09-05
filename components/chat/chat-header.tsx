'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Conversation } from '@/lib/supabase';

interface ChatHeaderProps {
  conversation: Conversation;
}

export function ChatHeader({ conversation }: ChatHeaderProps) {
  const getConversationName = () => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }
    
    // For direct messages, show the other participant's name
    const otherParticipant = conversation.participants?.find(
      (p: any) => p.user_id !== conversation.created_by // This is simplified
    );
    return otherParticipant?.user?.full_name || otherParticipant?.user?.username || 'Unknown User';
  };

  const getConversationAvatar = () => {
    if (conversation.type === 'group') {
      return conversation.avatar_url;
    }
    
    const otherParticipant = conversation.participants?.find(
      (p: any) => p.user_id !== conversation.created_by
    );
    return otherParticipant?.user?.avatar_url;
  };

  const getOnlineStatus = () => {
    if (conversation.type === 'group') {
      const onlineCount = conversation.participants?.filter(
        (p: any) => p.user?.is_online
      ).length || 0;
      return `${onlineCount} online`;
    }
    
    const otherParticipant = conversation.participants?.find(
      (p: any) => p.user_id !== conversation.created_by
    );
    
    if (otherParticipant?.user?.is_online) {
      return 'Online';
    } else if (otherParticipant?.user?.last_seen) {
      return `Last seen ${new Date(otherParticipant.user.last_seen).toLocaleString()}`;
    }
    
    return 'Offline';
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={getConversationAvatar()} />
            <AvatarFallback>
              {getConversationName().charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {getConversationName()}
            </h2>
            <p className="text-sm text-gray-500">
              {getOnlineStatus()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Video Call Button */}
          <Button variant="ghost" size="sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </Button>

          {/* Voice Call Button */}
          <Button variant="ghost" size="sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </Button>

          {/* More Options */}
          <Button variant="ghost" size="sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}