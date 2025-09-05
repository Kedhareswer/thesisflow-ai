'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/lib/supabase';
import { Response } from '@/src/components/ai-elements/response';

interface MessageItemProps {
  message: Message;
  showSender: boolean;
}

export function MessageItem({ message, showSender }: MessageItemProps) {
  const [currentUser, setCurrentUser] = React.useState<any>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  const isOwnMessage = currentUser?.id === message.sender_id;
  const rawSenderName = message.sender?.full_name || message.sender?.username || 'Unknown User';
  // Normalize assistant naming (e.g., "Nova AI" -> "Nova")
  const senderName = React.useMemo(() => {
    let name = rawSenderName;
    name = name.replace(/\bNova\s+AI\b/gi, 'Nova');
    name = name.replace(/\bNova\s+AI\s+Assistant\b/gi, 'Nova Assistant');
    return name;
  }, [rawSenderName]);

  const senderAvatar = message.sender?.avatar_url;

  const getMessageTime = () => {
    return formatDistanceToNow(new Date(message.created_at), { addSuffix: true });
  };

  const getDeliveryStatusIcon = () => {
    if (message.is_local) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }

    switch (message.delivery_status) {
      case 'sent':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'delivered':
        return (
          <div className="flex">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <svg className="w-4 h-4 text-gray-400 -ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'read':
        return (
          <div className="flex">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <svg className="w-4 h-4 text-blue-500 -ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  if (message.is_deleted) {
    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-xs lg:max-w-md">
          <div className="bg-gray-100 rounded-lg px-4 py-2">
            <p className="text-sm text-gray-500 italic">This message was deleted</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isOwnMessage && showSender && (
          <Avatar className="h-8 w-8 mt-1">
            <AvatarImage src={senderAvatar} />
            <AvatarFallback>
              {senderName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Message Content */}
        <div className={`${!isOwnMessage && showSender ? 'ml-2' : ''} ${isOwnMessage ? 'mr-2' : ''}`}>
          {/* Sender Name */}
          {!isOwnMessage && showSender && (
            <p className="text-xs text-gray-600 mb-1 px-3">
              {senderName}
            </p>
          )}

          {/* Reply Context */}
          {message.reply_to_message && (
            <div className="mb-2">
              <div className="bg-gray-100 border-l-4 border-gray-300 rounded px-3 py-2 text-sm">
                <p className="text-gray-600 font-medium">
                  {message.reply_to_message.sender?.full_name || 'Unknown User'}
                </p>
                <p className="text-gray-800 truncate">
                  {message.reply_to_message.content}
                </p>
              </div>
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={`rounded-lg px-4 py-2 ${
              isOwnMessage
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            } ${message.is_local ? 'opacity-70' : ''}`}
          >
            {/* Message Content */}
            {message.message_type === 'text' && (
              <Response
                parseIncompleteMarkdown={true}
                className="text-sm [&_p]:mb-2 [&_table]:text-xs [&_pre]:text-[12px] [&_code]:text-[12px]"
              >
                {message.content}
              </Response>
            )}

            {message.message_type === 'image' && (
              <div>
                {message.file_url && (
                  <img
                    src={message.file_url}
                    alt="Shared image"
                    className="max-w-full h-auto rounded"
                  />
                )}
                {message.content && (
                  <p className="text-sm mt-2 whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                )}
              </div>
            )}

            {message.message_type === 'file' && (
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium">
                    {message.file_name || 'File'}
                  </p>
                  {message.file_size && (
                    <p className="text-xs opacity-75">
                      {(message.file_size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
              </div>
            )}

            {message.message_type === 'system' && (
              <p className="text-sm italic text-center">
                {message.content}
              </p>
            )}

            {/* Edited Indicator */}
            {message.edited_at && (
              <p className="text-xs opacity-75 mt-1">
                (edited)
              </p>
            )}
          </div>

          {/* Message Footer */}
          <div className={`flex items-center mt-1 space-x-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-gray-500">
              {getMessageTime()}
            </span>
            {isOwnMessage && (
              <div className="flex items-center">
                {getDeliveryStatusIcon()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}