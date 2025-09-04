import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '@/lib/supabase';
import { tokenManager } from '@/lib/auth/token-manager';
import type { Message, User, Conversation } from '@/lib/supabase';
import { chatStorage } from '@/lib/storage/chat-storage';


interface UseChatSocketOptions {
  onMessageReceived?: (message: Message) => void;
  onMessageSent?: (message: Message, tempId: string) => void;
  onMessageError?: (error: string, tempId?: string) => void;
  onUserStatusChange?: (userId: string, status: 'online' | 'offline' | 'away') => void;
  onTypingChange?: (userId: string, conversationId: string, isTyping: boolean) => void;
  onInitialData?: (data: { conversations: Conversation[]; teams: any[]; onlineUsers: User[] }) => void;
  onTeamMessage?: (message: Message) => void;
  onTeamData?: (teamId: string, messages: Message[]) => void;
  onTeamEvent?: (event: string, data: any) => void;
}

export function useChatSocket(options: UseChatSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map<string, NodeJS.Timeout>());

  const connect = useCallback(async () => {
    try {
      // Initialize token manager
      await tokenManager.initialize();

      // Get valid token
      const token = await tokenManager.getValidToken();
      if (!token) {
        throw new Error('No valid authentication token available');
      }

      // Disconnect existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Create new socket connection
      const socketUrl = process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_SOCKET_URL || 'wss://your-domain.com'
        : 'ws://localhost:3001';

      socketRef.current = io(socketUrl, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      const socket = socketRef.current;

      // Connection events
      socket.on('connect', () => {
        console.log('Chat socket connected');
        setIsConnected(true);
        setConnectionError(null);

        // Clear reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('Chat socket disconnected:', reason);
        setIsConnected(false);

        // Auto-reconnect after delay if not manually disconnected
        if (reason !== 'io client disconnect') {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 2000);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Chat socket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
      });

      // Message events
      socket.on('message:new', async (message: Message) => {
        console.log('New message received:', message);

        // Store message locally
        await chatStorage.addMessage(message);

        // Update conversation unread count
        await chatStorage.updateConversation(message.conversation_id, {
          last_message_id: message.id,
          last_activity: message.created_at,
          updated_at: message.created_at
        });

        options.onMessageReceived?.(message);
      });

      socket.on('message:sent', async (data) => {
        console.log('Message sent confirmation:', data);

        // Replace optimistic message with server message
        if (data.tempId) {
          await chatStorage.confirmOptimisticMessage(data.tempId, data.message);
        }

        options.onMessageSent?.(data.message, data.tempId);
      });

      socket.on('message:error', (data) => {
        console.error('Message error:', data);
        options.onMessageError?.(data.error, data.tempId);
      });

      socket.on('message:edited', async (message: Message) => {
        console.log('Message edited:', message);
        await chatStorage.updateMessage(message.id, message);
      });

      socket.on('message:deleted', async (data) => {
        console.log('Message deleted:', data);
        await chatStorage.deleteMessage(data.messageId);
      });

      socket.on('message:read', (data) => {
        console.log('Message read receipt:', data);
        // Handle read receipts (update UI, etc.)
      });

      // Presence events
      socket.on('user:online', async (data) => {
        console.log('User came online:', data.userId);
        await chatStorage.updateUserStatus(data.userId, 'online', true);
        options.onUserStatusChange?.(data.userId, 'online');
      });

      socket.on('user:offline', async (data) => {
        console.log('User went offline:', data.userId);
        await chatStorage.updateUserStatus(data.userId, 'offline', false);
        options.onUserStatusChange?.(data.userId, 'offline');
      });

      socket.on('user:status', async (data) => {
        console.log('User status changed:', data);
        await chatStorage.updateUserStatus(
          data.userId,
          data.status as 'online' | 'offline' | 'away',
          data.status !== 'offline'
        );
        options.onUserStatusChange?.(data.userId, data.status as 'online' | 'offline' | 'away');
      });

      socket.on('user:typing', (data) => {
        console.log('User typing status:', data);
        options.onTypingChange?.(data.userId, data.conversationId, data.isTyping);
      });

      // Initial data events
      socket.on('conversations:initial', async (conversations) => {
        console.log('Initial conversations received:', conversations);
        await chatStorage.saveConversations(conversations);

        if (options.onInitialData) {
          const teams: any[] = [];
          const onlineUsers: User[] = [];
          options.onInitialData({ conversations, teams, onlineUsers });
        }
      });

      socket.on('teams:initial', (teams) => {
        console.log('Initial teams received:', teams);
        // Store teams in local storage if needed
      });

      socket.on('users:online', (users) => {
        console.log('Online users received:', users);
        // Update online users list
      });

      // Team events
      socket.on('team:message_new', (message) => {
        console.log('New team message:', message);
        options.onTeamMessage?.(message);
      });

      socket.on('team:messages', (data) => {
        console.log('Team messages received:', data);
        options.onTeamData?.(data.teamId, data.messages);
      });

      socket.on('team:user_joined', (data) => {
        console.log('User joined team:', data);
        options.onTeamEvent?.('user_joined', data);
      });

      socket.on('team:user_left', (data) => {
        console.log('User left team:', data);
        options.onTeamEvent?.('user_left', data);
      });

      socket.on('team:user_typing', (data) => {
        console.log('Team typing status:', data);
        options.onTeamEvent?.('user_typing', data);
      });

      socket.on('team:presence_update', (data) => {
        console.log('Team presence update:', data);
        options.onTeamEvent?.('presence_update', data);
      });

      socket.on('team:data', (team) => {
        console.log('Team data received:', team);
        options.onTeamEvent?.('team_data', team);
      });

      socket.on('team:error', (data) => {
        console.error('Team error:', data);
        options.onTeamEvent?.('error', data);
      });

    } catch (error) {
      console.error('Failed to connect chat socket:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [options]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);

    // Clear timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    typingTimeoutsRef.current.clear();
  }, []);

  // Message operations
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    replyToMessageId?: string
  ) => {
    if (!socketRef.current || !isConnected) {
      throw new Error('Socket not connected');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Add optimistic message to local storage
    const optimisticMessage = await chatStorage.addOptimisticMessage(
      conversationId,
      tempId,
      content,
      user.id,
      messageType
    );

    // Emit to server
    socketRef.current.emit('message:send', {
      conversationId,
      content,
      messageType,
      replyToMessageId,
      tempId
    });

    return { optimisticMessage, tempId };
  }, [isConnected]);

  const editMessage = useCallback((messageId: string, content: string) => {
    if (!socketRef.current || !isConnected) {
      throw new Error('Socket not connected');
    }

    socketRef.current.emit('message:edit', { messageId, content });
  }, [isConnected]);

  const deleteMessage = useCallback((messageId: string) => {
    if (!socketRef.current || !isConnected) {
      throw new Error('Socket not connected');
    }

    socketRef.current.emit('message:delete', { messageId });
  }, [isConnected]);

  const markAsRead = useCallback((conversationId: string, messageId: string) => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('message:read', { conversationId, messageId });
  }, [isConnected]);

  // Typing indicators
  const startTyping = useCallback((conversationId: string) => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('typing:start', { conversationId });

    // Auto-stop typing after 3 seconds
    const timeoutKey = `typing_${conversationId}`;
    const existingTimeout = typingTimeoutsRef.current.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      stopTyping(conversationId);
    }, 3000);

    typingTimeoutsRef.current.set(timeoutKey, timeout);
  }, [isConnected]);

  const stopTyping = useCallback((conversationId: string) => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('typing:stop', { conversationId });

    // Clear timeout
    const timeoutKey = `typing_${conversationId}`;
    const timeout = typingTimeoutsRef.current.get(timeoutKey);
    if (timeout) {
      clearTimeout(timeout);
      typingTimeoutsRef.current.delete(timeoutKey);
    }
  }, [isConnected]);

  // Presence updates
  const updatePresence = useCallback((status: 'online' | 'away' | 'offline') => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('presence:update', { status });
  }, [isConnected]);

  // Team operations
  const joinTeam = useCallback((teamId: string) => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('team:join', { teamId });
  }, [isConnected]);

  const leaveTeam = useCallback((teamId: string) => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('team:leave', { teamId });
  }, [isConnected]);

  const sendTeamMessage = useCallback((teamId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text') => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('team:message', { teamId, content, messageType });
  }, [isConnected]);

  const getTeamMessages = useCallback((teamId: string, limit?: number, beforeMessageId?: string) => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('team:get_messages', { teamId, limit, beforeMessageId });
  }, [isConnected]);

  const updateTeamPresence = useCallback((teamId: string, status: 'active' | 'away' = 'active') => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('team:presence', { teamId, status });
  }, [isConnected]);

  const startTeamTyping = useCallback((teamId: string) => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('team:typing_start', { teamId });
  }, [isConnected]);

  const stopTeamTyping = useCallback((teamId: string) => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('team:typing_stop', { teamId });
  }, [isConnected]);

  const getTeamData = useCallback((teamId: string) => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('team:get_data', { teamId });
  }, [isConnected]);

  // Auto-connect on mount and auth changes
  useEffect(() => {
    // Setup token manager auth listener
    tokenManager.setupAuthListener();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        connect();
      } else if (event === 'SIGNED_OUT') {
        tokenManager.clearTokens();
        disconnect();
      }
    });

    // Initial connection if already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        connect();
      }
    });

    return () => {
      subscription.unsubscribe();
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    startTyping,
    stopTyping,
    updatePresence,
    // Team methods
    joinTeam,
    leaveTeam,
    sendTeamMessage,
    getTeamMessages,
    updateTeamPresence,
    startTeamTyping,
    stopTeamTyping,
    getTeamData
  };
}