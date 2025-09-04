'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { ChatService } from '@/lib/services/chat-service';
import { chatStorage } from '@/lib/storage/chat-storage';
import { supabase } from '@/lib/supabase';
import type { Conversation, Message, User } from '@/lib/supabase';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId -> messages
  users: Record<string, User>; // userId -> user
  typingUsers: Record<string, string[]>; // conversationId -> userIds
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  lastSync: Record<string, string>; // conversationId -> timestamp
}

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ONLINE'; payload: boolean }
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'ADD_CONVERSATION'; payload: Conversation }
  | { type: 'UPDATE_CONVERSATION'; payload: { id: string; updates: Partial<Conversation> } }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
  | { type: 'SET_MESSAGES'; payload: { conversationId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<Message> } }
  | { type: 'DELETE_MESSAGE'; payload: { id: string; conversationId: string } }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'UPDATE_USER'; payload: { id: string; updates: Partial<User> } }
  | { type: 'SET_TYPING'; payload: { conversationId: string; userId: string; isTyping: boolean } }
  | { type: 'SET_LAST_SYNC'; payload: { conversationId: string; timestamp: string } };

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  users: {},
  typingUsers: {},
  isLoading: false,
  error: null,
  isOnline: false,
  lastSync: {}
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };

    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };

    case 'ADD_CONVERSATION':
      return {
        ...state,
        conversations: [action.payload, ...state.conversations]
      };

    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.id === action.payload.id
            ? { ...conv, ...action.payload.updates }
            : conv
        )
      };

    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: action.payload.messages
        }
      };

    case 'ADD_MESSAGE':
      const conversationId = action.payload.conversation_id;
      const existingMessages = state.messages[conversationId] || [];
      
      // Avoid duplicates
      const messageExists = existingMessages.some(m => m.id === action.payload.id);
      if (messageExists) return state;

      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: [...existingMessages, action.payload]
        }
      };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: Object.fromEntries(
          Object.entries(state.messages).map(([convId, msgs]) => [
            convId,
            msgs.map(msg =>
              msg.id === action.payload.id
                ? { ...msg, ...action.payload.updates }
                : msg
            )
          ])
        )
      };

    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: state.messages[action.payload.conversationId]?.filter(
            msg => msg.id !== action.payload.id
          ) || []
        }
      };

    case 'SET_USERS':
      const usersMap = action.payload.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, User>);
      return { ...state, users: { ...state.users, ...usersMap } };

    case 'UPDATE_USER':
      return {
        ...state,
        users: {
          ...state.users,
          [action.payload.id]: {
            ...state.users[action.payload.id],
            ...action.payload.updates
          }
        }
      };

    case 'SET_TYPING':
      const { conversationId: convId, userId, isTyping } = action.payload;
      const currentTyping = state.typingUsers[convId] || [];
      
      let newTyping: string[];
      if (isTyping) {
        newTyping = currentTyping.includes(userId) 
          ? currentTyping 
          : [...currentTyping, userId];
      } else {
        newTyping = currentTyping.filter(id => id !== userId);
      }

      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [convId]: newTyping
        }
      };

    case 'SET_LAST_SYNC':
      return {
        ...state,
        lastSync: {
          ...state.lastSync,
          [action.payload.conversationId]: action.payload.timestamp
        }
      };

    default:
      return state;
  }
}

interface ChatContextValue extends ChatState {
  // Conversation methods
  loadConversations: () => Promise<void>;
  createDirectConversation: (otherUserId: string) => Promise<Conversation>;
  createGroupConversation: (name: string, description?: string, participantIds?: string[]) => Promise<Conversation>;
  setActiveConversation: (conversationId: string | null) => void;
  
  // Message methods
  loadMessages: (conversationId: string, limit?: number, beforeMessageId?: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, messageType?: 'text' | 'image' | 'file', replyToMessageId?: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  markAsRead: (conversationId: string, messageId: string) => void;
  
  // Typing methods
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  
  // User methods
  searchUsers: (query: string) => Promise<User[]>;
  
  // Sync methods
  syncConversations: () => Promise<void>;
  syncMessages: (conversationId: string) => Promise<void>;
  
  // Socket state
  isSocketConnected: boolean;
  socketError: string | null;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

interface ChatProviderProps {
  children: React.ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Socket connection
  const {
    isConnected: isSocketConnected,
    connectionError: socketError,
    sendMessage: socketSendMessage,
    editMessage: socketEditMessage,
    deleteMessage: socketDeleteMessage,
    markAsRead: socketMarkAsRead,
    startTyping: socketStartTyping,
    stopTyping: socketStopTyping,
    joinTeam,
    sendTeamMessage,
    getTeamMessages,
    getTeamData
  } = useChatSocket({
    onMessageReceived: (message) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    },
    onMessageSent: (message, tempId) => {
      // Replace optimistic message with confirmed message
      dispatch({ type: 'UPDATE_MESSAGE', payload: { id: tempId, updates: message } });
    },
    onMessageError: (error, tempId) => {
      dispatch({ type: 'SET_ERROR', payload: error });
      if (tempId) {
        // Mark optimistic message as failed
        dispatch({ type: 'UPDATE_MESSAGE', payload: { 
          id: tempId, 
          updates: { delivery_status: 'sent' } // Keep as sent but could add failed status
        }});
      }
    },
    onUserStatusChange: (userId, status) => {
      dispatch({ type: 'UPDATE_USER', payload: { 
        id: userId, 
        updates: { 
          status, 
          is_online: status !== 'offline',
          last_seen: new Date().toISOString()
        }
      }});
    },
    onTypingChange: (userId, conversationId, isTyping) => {
      dispatch({ type: 'SET_TYPING', payload: { conversationId, userId, isTyping } });
    },
    onInitialData: (data) => {
      // Handle initial conversations
      if (data.conversations.length > 0) {
        dispatch({ type: 'SET_CONVERSATIONS', payload: data.conversations });
        
        // Cache conversations
        chatStorage.saveConversations(data.conversations).catch(console.error);
      }

      // Handle initial teams and online users
      if (data.onlineUsers.length > 0) {
        dispatch({ type: 'SET_USERS', payload: data.onlineUsers });
      }
    },
    onTeamMessage: (message) => {
      // Handle team messages if needed
      console.log('Team message received:', message);
    },
    onTeamData: (teamId, messages) => {
      // Handle team message data
      console.log('Team messages for', teamId, ':', messages);
    },
    onTeamEvent: (event, data) => {
      // Handle various team events
      console.log('Team event:', event, data);
    }
  });

  // Load initial data from cache and wait for socket
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Load conversations from cache for immediate display
        const cachedConversations = await chatStorage.getConversations();
        if (cachedConversations.length > 0) {
          dispatch({ type: 'SET_CONVERSATIONS', payload: cachedConversations });
        }

        // Socket will provide fresh data when connected
        // No need for API calls here
        
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Error loading initial data:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load initial data' });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadInitialData();
  }, []);

  // Conversation methods - now socket-based
  const loadConversations = useCallback(async () => {
    // Socket automatically sends initial data on connection
    // This method is kept for compatibility but does nothing
    // as socket handles all data loading
    console.log('Conversations loaded via socket connection');
  }, []);

  const createDirectConversation = useCallback(async (otherUserId: string): Promise<Conversation> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const conversation = await ChatService.createDirectConversation(user.id, otherUserId);
    
    // Save to cache
    await chatStorage.saveConversations([conversation]);
    
    dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
    return conversation;
  }, []);

  const createGroupConversation = useCallback(async (
    name: string, 
    description?: string, 
    participantIds: string[] = []
  ): Promise<Conversation> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const conversation = await ChatService.createGroupConversation(user.id, name, description, participantIds);
    
    // Save to cache
    await chatStorage.saveConversations([conversation]);
    
    dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
    return conversation;
  }, []);

  const setActiveConversation = useCallback((conversationId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversationId });
  }, []);

  // Message methods - now socket-based
  const loadMessages = useCallback(async (
    conversationId: string, 
    limit: number = 50, 
    beforeMessageId?: string
  ) => {
    try {
      // Load from cache first for immediate display
      const cachedMessages = await chatStorage.getMessages(conversationId, limit, beforeMessageId);
      if (cachedMessages.length > 0) {
        dispatch({ type: 'SET_MESSAGES', payload: { conversationId, messages: cachedMessages } });
      }

      // Socket automatically provides fresh messages
      // No API calls needed
    } catch (error) {
      console.error('Error loading cached messages:', error);
    }
  }, []);

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    replyToMessageId?: string
  ) => {
    try {
      if (isSocketConnected) {
        // Use socket for real-time sending
        const { optimisticMessage } = await socketSendMessage(conversationId, content, messageType, replyToMessageId);
        dispatch({ type: 'ADD_MESSAGE', payload: optimisticMessage });
      } else {
        // Fallback to API
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const message = await ChatService.sendMessage(conversationId, user.id, content, messageType, replyToMessageId);
        
        // Save to cache
        await chatStorage.addMessage(message);
        
        dispatch({ type: 'ADD_MESSAGE', payload: message });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
    }
  }, [isSocketConnected, socketSendMessage]);

  const editMessage = useCallback((messageId: string, content: string) => {
    if (isSocketConnected) {
      socketEditMessage(messageId, content);
    } else {
      // Fallback to API call
      console.warn('Socket not connected, message editing not available offline');
    }
  }, [isSocketConnected, socketEditMessage]);

  const deleteMessage = useCallback((messageId: string) => {
    if (isSocketConnected) {
      socketDeleteMessage(messageId);
    } else {
      // Fallback to API call
      console.warn('Socket not connected, message deletion not available offline');
    }
  }, [isSocketConnected, socketDeleteMessage]);

  const markAsRead = useCallback((conversationId: string, messageId: string) => {
    if (isSocketConnected) {
      socketMarkAsRead(conversationId, messageId);
    }
    
    // Also update local cache
    ChatService.markAsRead(conversationId, messageId).catch(console.error);
  }, [isSocketConnected, socketMarkAsRead]);

  // Typing methods
  const startTyping = useCallback((conversationId: string) => {
    if (isSocketConnected) {
      socketStartTyping(conversationId);
    }
  }, [isSocketConnected, socketStartTyping]);

  const stopTyping = useCallback((conversationId: string) => {
    if (isSocketConnected) {
      socketStopTyping(conversationId);
    }
  }, [isSocketConnected, socketStopTyping]);

  // User methods
  const searchUsers = useCallback(async (query: string): Promise<User[]> => {
    return await ChatService.searchUsers(query);
  }, []);

  // Sync methods
  const syncConversations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const lastSync = await chatStorage.getLastSync('conversations');
      const timestamp = lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago

      const updatedConversations = await ChatService.getConversationsUpdatedSince(user.id, timestamp);
      
      if (updatedConversations.length > 0) {
        await chatStorage.saveConversations(updatedConversations);
        
        // Merge with existing conversations
        const existingConversations = state.conversations;
        const mergedConversations = [...updatedConversations];
        
        existingConversations.forEach(existing => {
          if (!updatedConversations.find(updated => updated.id === existing.id)) {
            mergedConversations.push(existing);
          }
        });
        
        dispatch({ type: 'SET_CONVERSATIONS', payload: mergedConversations });
      }

      await chatStorage.setLastSync('conversations', new Date().toISOString());
    } catch (error) {
      console.error('Error syncing conversations:', error);
    }
  }, [state.conversations]);

  const syncMessages = useCallback(async (conversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const lastSync = await chatStorage.getLastSync('messages', conversationId);
      const timestamp = lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const updatedMessages = await ChatService.getMessagesUpdatedSince(conversationId, user.id, timestamp);
      
      if (updatedMessages.length > 0) {
        await chatStorage.saveMessages(conversationId, updatedMessages);
        
        updatedMessages.forEach(message => {
          dispatch({ type: 'ADD_MESSAGE', payload: message });
        });
      }

      await chatStorage.setLastSync('messages', new Date().toISOString(), conversationId);
    } catch (error) {
      console.error('Error syncing messages:', error);
    }
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'SET_ONLINE', payload: true });
      // Sync when coming back online
      syncConversations();
    };

    const handleOffline = () => {
      dispatch({ type: 'SET_ONLINE', payload: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial state
    dispatch({ type: 'SET_ONLINE', payload: navigator.onLine });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncConversations]);

  const contextValue: ChatContextValue = {
    ...state,
    loadConversations,
    createDirectConversation,
    createGroupConversation,
    setActiveConversation,
    loadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    startTyping,
    stopTyping,
    searchUsers,
    syncConversations,
    syncMessages,
    isSocketConnected,
    socketError
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}