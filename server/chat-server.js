const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

class ChatServer {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXT_PUBLIC_APP_URL 
          : ["http://localhost:3000", "http://127.0.0.1:3000"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for server operations
    );

    // Store active connections: userId -> socketId
    this.activeConnections = new Map();
    // Store user rooms: userId -> Set of roomIds (conversations + teams)
    this.userRooms = new Map();
    // Store typing timeouts
    this.typingTimeouts = new Map();
    // Store user data cache
    this.userCache = new Map();
    // Store team data cache
    this.teamCache = new Map();

    this.setupSocketHandlers();
    this.setupCleanupInterval();
  }

  setupSocketHandlers() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token with Supabase
        const { data: { user }, error } = await this.supabase.auth.getUser(token);
        if (error || !user) {
          return next(new Error('Invalid authentication token'));
        }

        socket.userId = user.id;
        socket.userEmail = user.email;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', async (socket) => {
      console.log(`User ${socket.userId} connected`);
      
      try {
        await this.handleUserConnection(socket);
        this.setupMessageHandlers(socket);
        this.setupTypingHandlers(socket);
        this.setupPresenceHandlers(socket);
        this.setupTeamHandlers(socket);
        this.setupCollaborationHandlers(socket);
        
        socket.on('disconnect', () => this.handleUserDisconnection(socket));
      } catch (error) {
        console.error('Error setting up socket handlers:', error);
        socket.disconnect();
      }
    });
  }

  async handleUserConnection(socket) {
    const userId = socket.userId;
    
    // Store connection
    this.activeConnections.set(userId, socket.id);
    
    // Cache user data from user_profiles
    const { data: userData } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userData) {
      // Transform to match our user interface
      const user = {
        id: userData.id,
        username: userData.display_name || userData.full_name || userData.email,
        email: userData.email,
        full_name: userData.full_name,
        avatar_url: userData.avatar_url,
        last_seen: userData.last_active,
        is_online: userData.status === 'online',
        status: userData.status || 'offline',
        created_at: userData.created_at,
        updated_at: userData.updated_at
      };
      this.userCache.set(userId, user);
    }

    // Update user online status in user_presence
    await this.supabase
      .from('user_presence')
      .upsert({
        user_id: userId,
        status: 'online',
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    // Get user's conversations and teams
    const [conversationsResult, teamsResult] = await Promise.all([
      this.supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(*)
        `)
        .eq('user_id', userId),
      
      this.supabase
        .from('team_members')
        .select(`
          team_id,
          teams!inner(*)
        `)
        .eq('user_id', userId)
    ]);

    const allRooms = new Set();

    // Handle conversations
    if (conversationsResult.data) {
      const conversationIds = conversationsResult.data.map(cp => cp.conversation_id);
      conversationIds.forEach(convId => {
        const roomId = `conversation_${convId}`;
        socket.join(roomId);
        allRooms.add(roomId);
      });

      // Notify other users in conversations that this user is online
      conversationIds.forEach(convId => {
        socket.to(`conversation_${convId}`).emit('user:online', {
          userId,
          timestamp: new Date().toISOString()
        });
      });
    }

    // Handle teams
    if (teamsResult.data) {
      const teamIds = teamsResult.data.map(tm => tm.team_id);
      teamIds.forEach(teamId => {
        const roomId = `team_${teamId}`;
        socket.join(roomId);
        allRooms.add(roomId);
        
        // Cache team data
        const teamData = teamsResult.data.find(tm => tm.team_id === teamId)?.teams;
        if (teamData) {
          this.teamCache.set(teamId, teamData);
        }
      });

      // Notify team members that user is online
      teamIds.forEach(teamId => {
        socket.to(`team_${teamId}`).emit('user:online', {
          userId,
          timestamp: new Date().toISOString()
        });
      });
    }

    this.userRooms.set(userId, allRooms);

    // Send initial data
    await this.sendInitialData(socket, userId);
  }

  async handleUserDisconnection(socket) {
    const userId = socket.userId;
    console.log(`User ${userId} disconnected`);

    // Remove from active connections
    this.activeConnections.delete(userId);
    
    // Clear typing timeouts
    const typingKey = `${userId}_typing`;
    if (this.typingTimeouts.has(typingKey)) {
      clearTimeout(this.typingTimeouts.get(typingKey));
      this.typingTimeouts.delete(typingKey);
    }

    // Update user offline status
    await this.supabase
      .from('user_presence')
      .upsert({
        user_id: userId,
        status: 'offline',
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    // Notify other users in conversations that this user is offline
    const userRooms = this.userRooms.get(userId);
    if (userRooms) {
      userRooms.forEach(convId => {
        socket.to(`conversation_${convId}`).emit('user:offline', {
          userId,
          timestamp: new Date().toISOString()
        });
      });
      this.userRooms.delete(userId);
    }
  }

  setupMessageHandlers(socket) {
    socket.on('message:send', async (data) => {
      try {
        const { conversationId, content, messageType = 'text', replyToMessageId, tempId } = data;
        
        // Verify user is participant in conversation
        const { data: participant } = await this.supabase
          .from('conversation_participants')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('user_id', socket.userId)
          .single();

        if (!participant) {
          socket.emit('message:error', { 
            error: 'Not authorized to send messages to this conversation',
            tempId 
          });
          return;
        }

        // Insert message into database
        const { data: message, error } = await this.supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: socket.userId,
            content,
            message_type: messageType,
            reply_to_message_id: replyToMessageId
          })
          .select(`
            *,
            sender:user_profiles!sender_id(*),
            reply_to_message:messages!reply_to_message_id(*)
          `)
          .single();

        if (error) {
          console.error('Error inserting message:', error);
          socket.emit('message:error', { error: error.message, tempId });
          return;
        }

        // Broadcast message to all participants except sender
        socket.to(`conversation_${conversationId}`).emit('message:new', message);
        
        // Send acknowledgment to sender
        socket.emit('message:sent', { 
          message, 
          tempId,
          timestamp: new Date().toISOString()
        });

        // Update conversation last activity (handled by database trigger)
        
      } catch (error) {
        console.error('Error handling message send:', error);
        socket.emit('message:error', { 
          error: 'Failed to send message',
          tempId: data.tempId 
        });
      }
    });

    socket.on('message:edit', async (data) => {
      try {
        const { messageId, content } = data;
        
        // Update message (RLS will ensure user can only edit their own messages)
        const { data: message, error } = await this.supabase
          .from('messages')
          .update({ 
            content, 
            edited_at: new Date().toISOString() 
          })
          .eq('id', messageId)
          .eq('sender_id', socket.userId)
          .select(`
            *,
            sender:user_profiles!sender_id(*)
          `)
          .single();

        if (error || !message) {
          socket.emit('message:error', { error: 'Failed to edit message' });
          return;
        }

        // Broadcast edit to all participants
        this.io.to(`conversation_${message.conversation_id}`).emit('message:edited', message);
        
      } catch (error) {
        console.error('Error handling message edit:', error);
        socket.emit('message:error', { error: 'Failed to edit message' });
      }
    });

    socket.on('message:delete', async (data) => {
      try {
        const { messageId } = data;
        
        // Soft delete message
        const { data: message, error } = await this.supabase
          .from('messages')
          .update({ is_deleted: true })
          .eq('id', messageId)
          .eq('sender_id', socket.userId)
          .select('*')
          .single();

        if (error || !message) {
          socket.emit('message:error', { error: 'Failed to delete message' });
          return;
        }

        // Broadcast deletion to all participants
        this.io.to(`conversation_${message.conversation_id}`).emit('message:deleted', {
          messageId,
          conversationId: message.conversation_id
        });
        
      } catch (error) {
        console.error('Error handling message delete:', error);
        socket.emit('message:error', { error: 'Failed to delete message' });
      }
    });

    socket.on('message:read', async (data) => {
      try {
        const { conversationId, messageId } = data;
        
        // Update last read message for user
        await this.supabase
          .from('conversation_participants')
          .update({ last_read_message_id: messageId })
          .eq('conversation_id', conversationId)
          .eq('user_id', socket.userId);

        // Broadcast read receipt
        socket.to(`conversation_${conversationId}`).emit('message:read', {
          userId: socket.userId,
          messageId,
          conversationId,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Error handling message read:', error);
      }
    });
  }

  setupTypingHandlers(socket) {
    socket.on('typing:start', async (data) => {
      try {
        const { conversationId } = data;
        
        // Verify user is participant
        const { data: participant } = await this.supabase
          .from('conversation_participants')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('user_id', socket.userId)
          .single();

        if (!participant) return;

        // Update typing indicator
        await this.supabase
          .from('typing_indicators')
          .upsert({
            conversation_id: conversationId,
            user_id: socket.userId,
            is_typing: true,
            updated_at: new Date().toISOString()
          });

        // Broadcast typing status
        socket.to(`conversation_${conversationId}`).emit('user:typing', {
          userId: socket.userId,
          conversationId,
          isTyping: true
        });

        // Set timeout to auto-stop typing
        const typingKey = `${socket.userId}_${conversationId}`;
        if (this.typingTimeouts.has(typingKey)) {
          clearTimeout(this.typingTimeouts.get(typingKey));
        }
        
        this.typingTimeouts.set(typingKey, setTimeout(() => {
          this.handleTypingStop(socket, conversationId);
        }, 3000)); // Auto-stop after 3 seconds
        
      } catch (error) {
        console.error('Error handling typing start:', error);
      }
    });

    socket.on('typing:stop', (data) => {
      this.handleTypingStop(socket, data.conversationId);
    });
  }

  async handleTypingStop(socket, conversationId) {
    try {
      // Update typing indicator
      await this.supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: socket.userId,
          is_typing: false,
          updated_at: new Date().toISOString()
        });

      // Broadcast typing stopped
      socket.to(`conversation_${conversationId}`).emit('user:typing', {
        userId: socket.userId,
        conversationId,
        isTyping: false
      });

      // Clear timeout
      const typingKey = `${socket.userId}_${conversationId}`;
      if (this.typingTimeouts.has(typingKey)) {
        clearTimeout(this.typingTimeouts.get(typingKey));
        this.typingTimeouts.delete(typingKey);
      }
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  }

  setupPresenceHandlers(socket) {
    socket.on('presence:update', async (data) => {
      try {
        const { status } = data; // 'online', 'away', 'offline'
        
        await this.supabase
          .from('user_presence')
          .upsert({ 
            user_id: socket.userId,
            status,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        // Broadcast status update to user's conversations
        const userRooms = this.userRooms.get(socket.userId);
        if (userRooms) {
          userRooms.forEach(convId => {
            socket.to(`conversation_${convId}`).emit('user:status', {
              userId: socket.userId,
              status,
              timestamp: new Date().toISOString()
            });
          });
        }
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    });
  }

  async sendInitialData(socket, userId) {
    try {
      // Send user's conversations with recent messages
      const { data: conversations } = await this.supabase
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

      if (conversations) {
        socket.emit('conversations:initial', conversations.map(cp => ({
          ...cp.conversations,
          unread_count: this.calculateUnreadCount(cp.last_read_message_id, cp.conversations.last_message_id)
        })));
      }

      // Send user's teams
      const { data: teams } = await this.supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          teams!inner(
            *,
            members:team_members(
              *,
              user:user_profiles!user_id(*)
            )
          )
        `)
        .eq('user_id', userId);

      if (teams) {
        socket.emit('teams:initial', teams.map(tm => tm.teams));
      }

      // Send recent team messages for each team
      if (teams) {
        for (const team of teams) {
          const { data: messages } = await this.supabase
            .from('chat_messages')
            .select(`
              *,
              sender:user_profiles!sender_id(*)
            `)
            .eq('team_id', team.team_id)
            .order('created_at', { ascending: false })
            .limit(50);

          if (messages) {
            socket.emit('team:messages', {
              teamId: team.team_id,
              messages: messages.reverse()
            });
          }
        }
      }

      // Send online users
      const onlineUsers = Array.from(this.userCache.values()).filter(user => 
        this.activeConnections.has(user.id)
      );
      socket.emit('users:online', onlineUsers);

    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  calculateUnreadCount(lastReadMessageId, lastMessageId) {
    if (!lastMessageId || !lastReadMessageId) return 0;
    if (lastReadMessageId === lastMessageId) return 0;
    return 1; // Simplified - in production, calculate actual count
  }

  setupCleanupInterval() {
    // Clean up old typing indicators every 30 seconds
    setInterval(async () => {
      try {
        await this.supabase
          .from('typing_indicators')
          .delete()
          .lt('updated_at', new Date(Date.now() - 30000).toISOString());
      } catch (error) {
        console.error('Error cleaning up typing indicators:', error);
      }
    }, 30000);
  }

  setupTeamHandlers(socket) {
    // Join team room
    socket.on('team:join', async (data) => {
      try {
        const { teamId } = data;
        
        // Verify user is team member
        const { data: member } = await this.supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId)
          .eq('user_id', socket.userId)
          .single();

        if (!member) {
          socket.emit('team:error', { error: 'Not authorized to join this team' });
          return;
        }

        socket.join(`team_${teamId}`);
        
        // Add to user rooms
        const userRooms = this.userRooms.get(socket.userId) || new Set();
        userRooms.add(`team_${teamId}`);
        this.userRooms.set(socket.userId, userRooms);

        // Notify other team members
        socket.to(`team_${teamId}`).emit('team:user_joined', {
          userId: socket.userId,
          teamId,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error joining team:', error);
        socket.emit('team:error', { error: 'Failed to join team' });
      }
    });

    // Leave team room
    socket.on('team:leave', (data) => {
      const { teamId } = data;
      socket.leave(`team_${teamId}`);
      
      const userRooms = this.userRooms.get(socket.userId);
      if (userRooms) {
        userRooms.delete(`team_${teamId}`);
      }

      socket.to(`team_${teamId}`).emit('team:user_left', {
        userId: socket.userId,
        teamId,
        timestamp: new Date().toISOString()
      });
    });

    // Send team message
    socket.on('team:message', async (data) => {
      try {
        const { teamId, content, messageType = 'text' } = data;
        
        // Verify team membership
        const { data: member } = await this.supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId)
          .eq('user_id', socket.userId)
          .single();

        if (!member) {
          socket.emit('team:error', { error: 'Not authorized to send messages to this team' });
          return;
        }

        // Insert message into chat_messages (existing team chat table)
        const { data: message, error } = await this.supabase
          .from('chat_messages')
          .insert({
            team_id: teamId,
            sender_id: socket.userId,
            content,
            message_type: messageType
          })
          .select(`
            *,
            sender:user_profiles!sender_id(*)
          `)
          .single();

        if (error) {
          socket.emit('team:error', { error: 'Failed to send message' });
          return;
        }

        // Broadcast to team
        this.io.to(`team_${teamId}`).emit('team:message_new', message);

      } catch (error) {
        console.error('Error sending team message:', error);
        socket.emit('team:error', { error: 'Failed to send message' });
      }
    });

    // Get team messages
    socket.on('team:get_messages', async (data) => {
      try {
        const { teamId, limit = 50, beforeMessageId } = data;
        
        // Verify team membership
        const { data: member } = await this.supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId)
          .eq('user_id', socket.userId)
          .single();

        if (!member) {
          socket.emit('team:error', { error: 'Not authorized to access team messages' });
          return;
        }

        let query = this.supabase
          .from('chat_messages')
          .select(`
            *,
            sender:user_profiles!sender_id(*)
          `)
          .eq('team_id', teamId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (beforeMessageId) {
          const { data: beforeMessage } = await this.supabase
            .from('chat_messages')
            .select('created_at')
            .eq('id', beforeMessageId)
            .single();

          if (beforeMessage) {
            query = query.lt('created_at', beforeMessage.created_at);
          }
        }

        const { data: messages } = await query;
        
        socket.emit('team:messages', {
          teamId,
          messages: messages ? messages.reverse() : []
        });

      } catch (error) {
        console.error('Error getting team messages:', error);
        socket.emit('team:error', { error: 'Failed to get messages' });
      }
    });
  }

  setupCollaborationHandlers(socket) {
    // Update presence in team
    socket.on('team:presence', async (data) => {
      try {
        const { teamId, status = 'active' } = data;
        
        // Update presence in database
        await this.supabase
          .from('team_presence')
          .upsert({
            team_id: teamId,
            user_id: socket.userId,
            status,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        // Broadcast to team
        socket.to(`team_${teamId}`).emit('team:presence_update', {
          userId: socket.userId,
          teamId,
          status,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error updating team presence:', error);
      }
    });

    // Typing in team chat
    socket.on('team:typing_start', (data) => {
      const { teamId } = data;
      socket.to(`team_${teamId}`).emit('team:user_typing', {
        userId: socket.userId,
        teamId,
        isTyping: true
      });
    });

    socket.on('team:typing_stop', (data) => {
      const { teamId } = data;
      socket.to(`team_${teamId}`).emit('team:user_typing', {
        userId: socket.userId,
        teamId,
        isTyping: false
      });
    });

    // Request team data
    socket.on('team:get_data', async (data) => {
      try {
        const { teamId } = data;
        
        // Verify team membership
        const { data: member } = await this.supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId)
          .eq('user_id', socket.userId)
          .single();

        if (!member) {
          socket.emit('team:error', { error: 'Not authorized to access team data' });
          return;
        }

        // Get team data
        const { data: team } = await this.supabase
          .from('teams')
          .select(`
            *,
            members:team_members(
              *,
              user:user_profiles!user_id(*)
            )
          `)
          .eq('id', teamId)
          .single();

        if (team) {
          socket.emit('team:data', team);
        }

      } catch (error) {
        console.error('Error getting team data:', error);
        socket.emit('team:error', { error: 'Failed to get team data' });
      }
    });
  }

  // Method to send system messages
  async sendSystemMessage(conversationId, content, messageType = 'system') {
    try {
      const { data: message, error } = await this.supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: null, // System message
          content,
          message_type: messageType
        })
        .select('*')
        .single();

      if (!error && message) {
        this.io.to(`conversation_${conversationId}`).emit('message:new', message);
      }
    } catch (error) {
      console.error('Error sending system message:', error);
    }
  }
}

module.exports = ChatServer;