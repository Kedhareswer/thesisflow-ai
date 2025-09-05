'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useChatContext } from '@/lib/contexts/chat-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useClickAway } from '@uidotdev/usehooks';
import type { User } from '@/lib/supabase';

export function UserSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { searchUsers, createDirectConversation, setActiveConversation } = useChatContext();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const dropdownRef = useClickAway<HTMLDivElement>(() => {
    setIsOpen(false);
    setQuery('');
    setSearchResults([]);
  });

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current!);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleUserSelect = async (user: User) => {
    try {
      const conversation = await createDirectConversation(user.id);
      setActiveConversation(conversation.id);
      setIsOpen(false);
      setQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleNewGroupChat = () => {
    // TODO: Implement group chat creation modal
    console.log('New group chat clicked');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Chat
        </Button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <Input
              type="text"
              placeholder="Search users..."
              value={query}
              onChange={handleInputChange}
              className="w-full"
              autoFocus
            />
          </div>

          {/* Quick Actions */}
          <div className="p-2 border-b border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewGroupChat}
              className="w-full justify-start"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              New Group Chat
            </Button>
          </div>

          {/* Search Results */}
          <div className="max-h-64 overflow-y-auto">
            {isSearching && (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Searching...
              </div>
            )}

            {!isSearching && query && searchResults.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No users found for "{query}"
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="py-2">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="w-full flex items-center p-3 hover:bg-gray-50 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>
                        {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="ml-3 text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {user.full_name || user.username}
                      </p>
                      <p className="text-xs text-gray-500">
                        @{user.username}
                      </p>
                    </div>

                    {user.is_online && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!query && (
              <div className="p-4 text-center text-gray-500 text-sm">
                Start typing to search for users
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}