// Collaboration-specific types
export interface ChatMessage {
  id: string;
  team_id: string;
  user_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  // Optional user info for display
  user?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  owner_id: string;
  created_at: string;
  updated_at?: string;
  // Additional fields
  members_count?: number;
  projects_count?: number;
  // Relations
  members?: TeamMember[];
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  updated_at?: string;
  // User profile information
  user_profile: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status?: 'online' | 'offline' | 'away';
    last_seen?: string;
  };
}

// Socket event payloads
export interface TypingEventPayload {
  userId: string;
  teamId: string;
  isTyping: boolean;
}

export interface MemberEventPayload {
  userId: string;
  teamId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    email: string;
  };
}

// Socket service events
export enum SocketEvent {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  
  // Team events
  JOIN_TEAM = 'join_team',
  LEAVE_TEAM = 'leave_team',
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
  
  // Message events
  NEW_MESSAGE = 'new_message',
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received',
  
  // Presence events
  USER_STATUS_CHANGE = 'user_status_change',
  
  // Typing indicators
  TYPING = 'typing',
  STOP_TYPING = 'stop_typing',
  
  // Error events
  ERROR = 'error',
  CONNECTION_ERROR = 'connection_error',
  AUTH_ERROR = 'auth_error'
}

// Socket service interface
export interface ISocketService {
  // Connection management
  initialize(userId: string): void;
  disconnect(): void;
  isConnected(): boolean;
  
  // Team management
  joinTeam(teamId: string): void;
  leaveTeam(teamId: string): void;
  
  // Message handling
  sendMessage(message: Omit<ChatMessage, 'id' | 'created_at' | 'updated_at'>): void;
  
  // Typing indicators
  sendTypingStatus(teamId: string, isTyping: boolean): void;
  
  // Event subscription
  on<T = any>(event: string, callback: (data: T) => void): void;
  off(event: string, callback?: (data: any) => void): void;
  
  // Presence
  updateUserStatus(status: 'online' | 'away' | 'offline'): void;
}

// Service response types
export type ServiceResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
};
