import { supabase } from '../supabase';
import type { 
  Conversation, 
  Message, 
  ConversationParticipant, 
  User,
  TypingIndicator 
} from '../supabase';

export class ChatService {
  // Conversations
  static async getConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        last_read_message_id,
        conversations!inner(
          *,
          last_message:messages!last_message_id(*,
            sender:user_profiles!sender_id(*)
          ),
          participants:conversation_participants(
            *,
            user:user_profiles!user_id(*)
          )
        )
      `)
      .eq('user_id', userId)
      .order('conversations(last_activity)', { ascending: false });

    if (error) throw error;

    return data?.map(item => {
      const conversation = item.conversations;
      return {
        ...conversation,
        unread_count: this.calculateUnreadCount(
          conversation.participants || [],
          item.last_read_message_id,
          conversation.last_message_id
        )
      };
    }) || [];
  }

  static async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          *,
          user:user_profiles!user_id(*)
        ),
        last_message:messages!last_message_id(*,
          sender:user_profiles!sender_id(*)
        )
      `)
      .eq('id', conversationId)
      .single();

    if (error) throw error;

    // Verify user is participant
    const isParticipant = data?.participants?.some(p => p.user_id === userId);
    if (!isParticipant) {
      throw new Error('Not authorized to access this conversation');
    }

    return data;
  }

  static async createDirectConversation(userId: string, otherUserId: string): Promise<Conversation> {
    // Check if direct conversation already exists
    const { data: existing } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations!inner(
          *,
          participants:conversation_participants(user_id)
        )
      `)
      .eq('user_id', userId);

    // Find existing direct conversation with the other user
    const existingConv = existing?.find(item => {
      const conv = item.conversations;
      return conv.type === 'direct' && 
             conv.participants?.length === 2 &&
             conv.participants.some(p => p.user_id === otherUserId);
    });

    if (existingConv) {
      return existingConv.conversations;
    }

    // Create new conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        type: 'direct',
        created_by: userId
      })
      .select('*')
      .single();

    if (convError) throw convError;

    // Add participants
    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: conversation.id, user_id: userId, role: 'admin' },
        { conversation_id: conversation.id, user_id: otherUserId, role: 'member' }
      ]);

    if (participantsError) throw participantsError;

    return conversation;
  }

  static async createGroupConversation(
    userId: string, 
    name: string, 
    description?: string,
    participantIds: string[] = []
  ): Promise<Conversation> {
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        type: 'group',
        name,
        description,
        created_by: userId
      })
      .select('*')
      .single();

    if (convError) throw convError;

    // Add creator as admin
    const participants = [
      { conversation_id: conversation.id, user_id: userId, role: 'admin' },
      ...participantIds.map(id => ({
        conversation_id: conversation.id,
        user_id: id,
        role: 'member' as const
      }))
    ];

    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert(participants);

    if (participantsError) throw participantsError;

    return conversation;
  }

  // Messages
  static async getMessages(
    conversationId: string, 
    userId: string,
    limit: number = 50,
    beforeMessageId?: string
  ): Promise<Message[]> {
    // Verify user is participant
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      throw new Error('Not authorized to access messages in this conversation');
    }

    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:user_profiles!sender_id(*),
        reply_to_message:messages!reply_to_message_id(*,
          sender:user_profiles!sender_id(*)
        ),
        reactions:message_reactions(*,
          user:user_profiles!user_id(*)
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (beforeMessageId) {
      // Get messages before a specific message (for pagination)
      const { data: beforeMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', beforeMessageId)
        .single();

      if (beforeMessage) {
        query = query.lt('created_at', beforeMessage.created_at);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    // Return in chronological order (oldest first)
    return data?.reverse() || [];
  }

  static async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    replyToMessageId?: string
  ): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: messageType,
        reply_to_message_id: replyToMessageId
      })
      .select(`
        *,
        sender:user_profiles!sender_id(*),
        reply_to_message:messages!reply_to_message_id(*,
          sender:user_profiles!sender_id(*)
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Participants
  static async addParticipant(
    conversationId: string, 
    userId: string, 
    newUserId: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<void> {
    // Verify current user is admin
    const { data: currentParticipant } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!currentParticipant || currentParticipant.role !== 'admin') {
      throw new Error('Only admins can add participants');
    }

    const { error } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: newUserId,
        role
      });

    if (error) throw error;
  }

  static async removeParticipant(
    conversationId: string, 
    userId: string, 
    targetUserId: string
  ): Promise<void> {
    // Users can remove themselves, or admins can remove others
    const { data: currentParticipant } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!currentParticipant) {
      throw new Error('Not a participant in this conversation');
    }

    if (userId !== targetUserId && currentParticipant.role !== 'admin') {
      throw new Error('Only admins can remove other participants');
    }

    const { error } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', targetUserId);

    if (error) throw error;
  }

  // Utility methods
  static async markAsRead(conversationId: string, userId: string, messageId: string): Promise<void> {
    const { error } = await supabase
      .from('conversation_participants')
      .update({ last_read_message_id: messageId })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  static async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .or(`display_name.ilike.%${query}%,full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;
    
    // Transform to match User interface
    return (data || []).map(profile => ({
      id: profile.id,
      username: profile.display_name || profile.full_name || profile.email,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      last_seen: profile.last_active,
      is_online: profile.status === 'online',
      status: profile.status || 'offline',
      created_at: profile.created_at,
      updated_at: profile.updated_at
    }));
  }

  static async getTypingIndicators(conversationId: string): Promise<TypingIndicator[]> {
    const { data, error } = await supabase
      .from('typing_indicators')
      .select(`
        *,
        user:user_profiles!user_id(*)
      `)
      .eq('conversation_id', conversationId)
      .eq('is_typing', true)
      .gt('updated_at', new Date(Date.now() - 30000).toISOString()); // Last 30 seconds

    if (error) throw error;
    return data || [];
  }

  // Private helper methods
  private static calculateUnreadCount(
    participants: ConversationParticipant[],
    lastReadMessageId?: string,
    lastMessageId?: string
  ): number {
    if (!lastMessageId || !lastReadMessageId) return 0;
    if (lastReadMessageId === lastMessageId) return 0;
    
    // This is a simplified calculation
    // In a real implementation, you'd query the actual count
    return 1;
  }

  // Sync methods for offline support
  static async getConversationsUpdatedSince(
    userId: string, 
    timestamp: string
  ): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations!inner(
          *,
          last_message:messages!last_message_id(*,
            sender:user_profiles!sender_id(*)
          )
        )
      `)
      .eq('user_id', userId)
      .gt('conversations.updated_at', timestamp);

    if (error) throw error;
    return data?.map(item => item.conversations) || [];
  }

  static async getMessagesUpdatedSince(
    conversationId: string,
    userId: string,
    timestamp: string,
    limit: number = 100
  ): Promise<Message[]> {
    // Verify user is participant
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      throw new Error('Not authorized to access messages in this conversation');
    }

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:user_profiles!sender_id(*)
      `)
      .eq('conversation_id', conversationId)
      .gt('updated_at', timestamp)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}