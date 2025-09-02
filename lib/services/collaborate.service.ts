import { supabase, Team, ChatMessage } from '../supabase';
import { socketService, SocketEvent } from './socket.service';

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: string;
  lastActive: string;
}

export interface TeamWithMembers extends Team {
  members: User[];
}

// Collaborate service for handling team and chat operations
class CollaborateService {
  // Get teams for a user
  async getTeams(userId: string): Promise<Team[]> {
    try {
      const response = await fetch(`/api/collaborate/teams?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }

      const data = await response.json();
      return data.teams.map((team: any) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        is_public: team.is_public,
        category: team.category,
        owner_id: team.owner_id,
        created_at: team.created_at,
        updated_at: team.updated_at || team.created_at,
      }));
    } catch (error) {
      console.error('Error fetching teams:', error);
      return [];
    }
  }

  // Create a new team
  async createTeam(
    name: string,
    description: string,
    category: string,
    isPublic: boolean,
    userId: string
  ): Promise<{ success: boolean; teamId?: string; error?: string }> {
    try {
      const response = await fetch('/api/collaborate/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          category,
          isPublic,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to create team' };
      }

      return { success: true, teamId: data.teamId };
    } catch (error) {
      console.error('Error creating team:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // Invite a member to a team
  async inviteMember(
    teamId: string,
    email: string,
    role: 'viewer' | 'editor' | 'admin' = 'viewer'
  ): Promise<{ success: boolean; userId?: string; userName?: string; error?: string }> {
    try {
      const response = await fetch('/api/collaborate/teams/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          email,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to invite member' };
      }

      return { 
        success: true, 
        userId: data.userId,
        userName: data.userName
      };
    } catch (error) {
      console.error('Error inviting member:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // Get team members
  async getTeamMembers(teamId: string): Promise<User[]> {
    try {
      const response = await fetch(`/api/collaborate/teams/members?teamId=${teamId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const data = await response.json();
      return data.members;
    } catch (error) {
      console.error('Error fetching team members:', error);
      return [];
    }
  }

  // Get messages for a team
  async getMessages(teamId: string, limit = 50, before?: string): Promise<ChatMessage[]> {
    try {
      let url = `/api/collaborate/messages?teamId=${teamId}&limit=${limit}`;
      if (before) {
        url += `&before=${before}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      return data.messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // Send a message
  async sendMessage(
    teamId: string,
    userId: string,
    content: string,
    type: 'text' | 'system' = 'text',
    mentions?: string[]
  ): Promise<{ success: boolean; message?: ChatMessage; error?: string }> {
    try {
      // If socket connected, send via websocket only (server persists and broadcasts)
      if (socketService.isConnected()) {
        socketService.sendMessage(teamId, content, type, mentions);
        return { success: true };
      }

      // Fallback: send via API when offline
      const response = await fetch('/api/collaborate/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          userId,
          content,
          type,
          mentions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to send message' };
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // Update user status
  async updateUserStatus(userId: string, status: 'online' | 'offline' | 'away'): Promise<boolean> {
    try {
      // Update via Socket.io for real-time status change
      socketService.updateUserStatus(status);
      
      // Also update in Supabase for persistence
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          status, 
          last_active: new Date().toISOString() 
        })
        .eq('id', userId);

      return !error;
    } catch (error) {
      console.error('Error updating user status:', error);
      return false;
    }
  }

  // Subscribe to new messages for a team
  subscribeToMessages(teamId: string, callback: (message: any) => void): () => void {
    const socket = socketService.initialize('current-user');
    
    // Join the team room
    socketService.joinTeam(teamId);
    
    // Listen for new messages
    const handleNewMessage = (data: any) => {
      if (data.teamId === teamId) {
        callback({
          id: data.id,
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          content: data.content,
          timestamp: data.timestamp,
          teamId: data.teamId,
          type: data.type,
          mentions: Array.isArray(data.mentions) ? data.mentions : [],
        });
      }
    };
    
    socket.on(SocketEvent.NEW_MESSAGE, handleNewMessage);
    
    // Return unsubscribe function
    return () => {
      socket.off(SocketEvent.NEW_MESSAGE, handleNewMessage);
      socketService.leaveTeam(teamId);
    };
  }

  // Subscribe to user status changes
  subscribeToUserStatus(callback: (userId: string, status: 'online' | 'offline' | 'away') => void): () => void {
    const socket = socketService.initialize('current-user');
    
    // Listen for status changes
    const handleStatusChange = (data: any) => {
      callback(data.userId, data.status);
    };
    
    // Server emits 'user-status-changed'
    socket.on('user-status-changed', handleStatusChange);
    
    // Return unsubscribe function
    return () => {
      socket.off('user-status-changed', handleStatusChange);
    };
  }
}

// Create singleton instance
export const collaborateService = new CollaborateService();
