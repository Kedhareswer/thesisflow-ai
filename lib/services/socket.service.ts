import { io, Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

// Socket events
export enum SocketEvent {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  JOIN_TEAM = 'join_team',
  LEAVE_TEAM = 'leave_team',
  NEW_MESSAGE = 'new_message',
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
  USER_STATUS_CHANGE = 'user_status_change',
  TYPING = 'typing',
  STOP_TYPING = 'stop_typing',
}

// Socket service for real-time communication
class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  // Initialize socket connection
  initialize(userId: string): Socket {
    if (this.socket && this.userId === userId) {
      return this.socket;
    }

    // Close existing connection if user changed
    if (this.socket) {
      this.socket.disconnect();
    }

    this.userId = userId;
    
    // Connect to WebSocket server
    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: {
        userId,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on(SocketEvent.CONNECT, () => {
      console.log('Socket connected');
      this.updateUserStatus('online');
    });

    this.socket.on(SocketEvent.DISCONNECT, () => {
      console.log('Socket disconnected');
    });

    // Set up disconnect handler for when user leaves the page
    window.addEventListener('beforeunload', () => {
      this.updateUserStatus('offline');
      this.socket?.disconnect();
    });

    return this.socket;
  }

  // Join a team room to receive team-specific messages
  joinTeam(teamId: string): void {
    if (!this.socket) return;
    this.socket.emit(SocketEvent.JOIN_TEAM, { teamId });
  }

  // Leave a team room
  leaveTeam(teamId: string): void {
    if (!this.socket) return;
    this.socket.emit(SocketEvent.LEAVE_TEAM, { teamId });
  }

  // Send a new message to a team
  sendMessage(teamId: string, message: string, type: 'text' | 'system' = 'text'): void {
    if (!this.socket || !this.userId) return;
    
    this.socket.emit(SocketEvent.NEW_MESSAGE, {
      teamId,
      userId: this.userId,
      content: message,
      type,
    });
  }

  // Update user status (online, offline, away)
  updateUserStatus(status: 'online' | 'offline' | 'away'): void {
    if (!this.socket || !this.userId) return;
    
    this.socket.emit(SocketEvent.USER_STATUS_CHANGE, {
      userId: this.userId,
      status,
    });

    // Also update in Supabase
    supabase
      .from('user_profiles')
      .update({ 
        status, 
        last_active: new Date().toISOString() 
      })
      .eq('id', this.userId)
      .then(() => console.log(`User status updated to ${status}`))
      .catch((err: any) => console.error('Error updating user status:', err));
  }

  // Notify that user is typing
  startTyping(teamId: string): void {
    if (!this.socket || !this.userId) return;
    
    this.socket.emit(SocketEvent.TYPING, {
      teamId,
      userId: this.userId,
    });
  }

  // Notify that user stopped typing
  stopTyping(teamId: string): void {
    if (!this.socket || !this.userId) return;
    
    this.socket.emit(SocketEvent.STOP_TYPING, {
      teamId,
      userId: this.userId,
    });
  }

  // Add event listener
  on(event: SocketEvent | string, callback: (...args: any[]) => void): void {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  // Remove event listener
  off(event: SocketEvent | string, callback: (...args: any[]) => void): void {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  // Send typing status (alias for startTyping/stopTyping)
  sendTypingStatus(teamId: string, isTyping: boolean): void {
    if (isTyping) {
      this.startTyping(teamId);
    } else {
      this.stopTyping(teamId);
    }
  }

  // Disconnect socket
  disconnect(): void {
    if (this.socket) {
      this.updateUserStatus('offline');
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }
}

// Create singleton instance
export const socketService = new SocketService();

// React hook for using socket in components
export function useSocket(userId: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;
    
    const newSocket = socketService.initialize(userId);
    setSocket(newSocket);

    return () => {
      // No need to disconnect here as we want to maintain the singleton
    };
  }, [userId]);

  return socket;
}
