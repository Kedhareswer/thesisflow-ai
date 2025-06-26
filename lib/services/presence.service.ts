import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { socketService, SocketEvent } from './socket.service';

// Types
export interface UserPresence {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastActive: string;
}

// Presence service for tracking user online status
class PresenceService {
  private presenceMap = new Map<string, UserPresence>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentUserId: string | null = null;
  
  // Initialize presence tracking for current user
  initialize(userId: string): void {
    if (this.currentUserId === userId && this.heartbeatInterval) {
      return; // Already initialized for this user
    }
    
    this.currentUserId = userId;
    
    // Clear previous interval if any
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Update user status to online
    this.updateStatus(userId, 'online');
    
    // Set up heartbeat to keep user status updated
    this.heartbeatInterval = setInterval(() => {
      if (this.currentUserId) {
        this.updateStatus(this.currentUserId, 'online');
      }
    }, 30000); // Every 30 seconds
    
    // Set up window events for away/online detection
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        if (this.currentUserId) {
          this.updateStatus(this.currentUserId, 'online');
        }
      });
      
      window.addEventListener('blur', () => {
        if (this.currentUserId) {
          // Don't immediately set to away, wait a bit
          setTimeout(() => {
            if (document.visibilityState === 'hidden' && this.currentUserId) {
              this.updateStatus(this.currentUserId, 'away');
            }
          }, 60000); // 1 minute of inactivity before away
        }
      });
      
      // Handle page unload
      window.addEventListener('beforeunload', () => {
        if (this.currentUserId) {
          // Synchronous update before page unloads
          this.updateStatus(this.currentUserId, 'offline', true);
        }
      });
    }
  }
  
  // Update user status
  async updateStatus(
    userId: string, 
    status: 'online' | 'offline' | 'away',
    sync: boolean = false
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      // Update local cache
      this.presenceMap.set(userId, {
        userId,
        status,
        lastActive: timestamp
      });
      
      // Update via Socket.io for real-time status change
      socketService.updateUserStatus(status);
      
      // Update in Supabase
      if (sync) {
        // Synchronous update for beforeunload event
        navigator.sendBeacon('/api/presence/update', JSON.stringify({
          userId,
          status,
          timestamp
        }));
      } else {
        // Regular async update
        await supabase
          .from('user_profiles')
          .update({ 
            status, 
            last_active: timestamp 
          })
          .eq('id', userId);
      }
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }
  
  // Get user status
  getStatus(userId: string): UserPresence | null {
    return this.presenceMap.get(userId) || null;
  }
  
  // Subscribe to presence changes
  subscribeToPresence(callback: (presence: UserPresence) => void): () => void {
    const socket = socketService.initialize(this.currentUserId || 'anonymous');
    
    // Listen for status changes
    const handleStatusChange = (data: any) => {
      const presence: UserPresence = {
        userId: data.userId,
        status: data.status,
        lastActive: new Date().toISOString()
      };
      
      // Update local cache
      this.presenceMap.set(data.userId, presence);
      
      // Notify callback
      callback(presence);
    };
    
    socket.on(SocketEvent.USER_STATUS_CHANGE, handleStatusChange);
    
    // Also subscribe to Supabase realtime presence updates
    const presenceSubscription = supabase
      .channel('presence_changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'user_profiles',
        filter: 'status:eq:online,status:eq:away,status:eq:offline'
      }, (payload) => {
        if (payload.new && payload.new.id) {
          const presence: UserPresence = {
            userId: payload.new.id,
            status: payload.new.status,
            lastActive: payload.new.last_active
          };
          
          // Update local cache
          this.presenceMap.set(payload.new.id, presence);
          
          // Notify callback
          callback(presence);
        }
      })
      .subscribe();
    
    // Return unsubscribe function
    return () => {
      socket.off(SocketEvent.USER_STATUS_CHANGE, handleStatusChange);
      presenceSubscription.unsubscribe();
    };
  }
  
  // Clean up resources
  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.currentUserId) {
      this.updateStatus(this.currentUserId, 'offline');
      this.currentUserId = null;
    }
  }
}

// Create singleton instance
export const presenceService = new PresenceService();

// React hook for using presence in components
export function usePresence(userId: string | null) {
  const [userPresences, setUserPresences] = useState<Map<string, UserPresence>>(new Map());
  
  useEffect(() => {
    if (!userId) return;
    
    // Initialize presence for current user
    presenceService.initialize(userId);
    
    // Subscribe to presence changes
    const unsubscribe = presenceService.subscribeToPresence((presence) => {
      setUserPresences(prev => {
        const updated = new Map(prev);
        updated.set(presence.userId, presence);
        return updated;
      });
    });
    
    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [userId]);
  
  return userPresences;
}
