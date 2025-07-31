/**
 * WebSocket Server for Real-time Collaboration
 * Handles team chat, document collaboration, and presence tracking
 */

const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const PORT = process.env.WS_PORT || 3001;
const CORS_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Create Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Store active connections
const activeConnections = new Map(); // socketId -> { userId, teamIds }
const userSockets = new Map(); // userId -> Set<socketId>
const teamPresence = new Map(); // teamId -> Set<userId>

// Helper function to verify user token
async function verifyUser(token) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user;
  } catch (error) {
    console.error('Error verifying user:', error);
    return null;
  }
}

// Helper function to check team membership
async function checkTeamMembership(userId, teamId) {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();

    return !error && data;
  } catch (error) {
    console.error('Error checking team membership:', error);
    return false;
  }
}

// Helper function to get user profile
async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url, status')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

// Update user's online status
async function updateUserStatus(userId, status, lastActive = null) {
  try {
    const updateData = { status };
    if (lastActive) {
      updateData.last_active = lastActive;
    }

    await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId);
  } catch (error) {
    console.error('Error updating user status:', error);
  }
}

// Socket.IO middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const user = await verifyUser(token);
    if (!user) {
      return next(new Error('Invalid authentication'));
    }

    socket.userId = user.id;
    socket.userEmail = user.email;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

// Handle socket connections
io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.userId} (${socket.id})`);

  // Store connection info
  activeConnections.set(socket.id, { userId: socket.userId, teamIds: new Set() });
  
  // Track user's sockets
  if (!userSockets.has(socket.userId)) {
    userSockets.set(socket.userId, new Set());
  }
  userSockets.get(socket.userId).add(socket.id);

  // Update user status to online
  await updateUserStatus(socket.userId, 'online');

  // Get user profile for presence
  const userProfile = await getUserProfile(socket.userId);

  // Join user's personal room (for notifications)
  socket.join(`user:${socket.userId}`);

  // Handle joining team rooms
  socket.on('join_team', (data) => {
    try {
      const { teamId } = data;
      
      // Verify team membership
      checkTeamMembership(socket.userId, teamId).then(isMember => {
        if (!isMember) {
          socket.emit('error', { message: 'Not a member of this team' });
          return;
        }

        // Join the team room
        socket.join(`team:${teamId}`);
        
        // Update tracking
        const connection = activeConnections.get(socket.id);
        if (connection) {
          connection.teamIds.add(teamId);
        }

        // Update team presence
        if (!teamPresence.has(teamId)) {
          teamPresence.set(teamId, new Set());
        }
        teamPresence.get(teamId).add(socket.userId);

        // Notify other team members
        socket.to(`team:${teamId}`).emit('user-joined', {
          userId: socket.userId,
          teamId
        });

        console.log(`User ${socket.userId} joined team ${teamId}`);
      });
    } catch (error) {
      console.error('Error joining team:', error);
      socket.emit('error', { message: 'Failed to join team' });
    }
  });

  // Handle leaving team rooms
  socket.on('leave_team', (data) => {
    const { teamId } = data;
    socket.leave(`team:${teamId}`);
    
    // Update tracking
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.teamIds.delete(teamId);
    }

    // Update team presence if this is the user's last socket in the team
    const userSocketIds = userSockets.get(socket.userId) || new Set();
    let userStillInTeam = false;
    
    for (const socketId of userSocketIds) {
      if (socketId !== socket.id) {
        const conn = activeConnections.get(socketId);
        if (conn && conn.teamIds.has(teamId)) {
          userStillInTeam = true;
          break;
        }
      }
    }

    if (!userStillInTeam && teamPresence.has(teamId)) {
      teamPresence.get(teamId).delete(socket.userId);
      
      // Notify other team members
      socket.to(`team:${teamId}`).emit('user-left', {
        userId: socket.userId,
        teamId
      });
    }

    console.log(`User ${socket.userId} left team ${teamId}`);
  });

  // Handle chat messages
  socket.on('new_message', async (data) => {
    try {
      const { teamId, content, type = 'text', mentions = [] } = data;

      // Verify team membership
      const isMember = await checkTeamMembership(socket.userId, teamId);
      if (!isMember) {
        socket.emit('error', { message: 'Not a member of this team' });
        return;
      }

      // Create message in database
      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          team_id: teamId,
          sender_id: socket.userId,
          content,
          message_type: type,
          mentions,
          metadata: {},
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          sender:user_profiles!chat_messages_sender_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('Error creating message:', error);
        socket.emit('error', { message: 'Failed to send message' });
        return;
      }

      // Broadcast message to team members
      io.to(`team:${teamId}`).emit('new_message', {
        id: message.id,
        content: message.content,
        type: message.message_type,
        timestamp: message.created_at,
        teamId: message.team_id,
        senderId: message.sender_id,
        senderName: message.sender?.full_name || 'Unknown User',
        senderAvatar: message.sender?.avatar_url || null,
        mentions: message.mentions || [],
        metadata: message.metadata || {}
      });

      // Send notifications for mentions
      if (mentions && mentions.length > 0) {
        for (const mentionedUserId of mentions) {
          if (mentionedUserId !== socket.userId) {
            io.to(`user:${mentionedUserId}`).emit('notification', {
              type: 'message_mention',
              title: `Mentioned in team chat`,
              message: `${userProfile?.full_name || 'Someone'} mentioned you`,
              data: {
                teamId,
                messageId: message.id,
                senderId: socket.userId
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing', ({ teamId }) => {
    socket.to(`team:${teamId}`).emit('typing', {
      userId: socket.userId,
      teamId,
      isTyping: true
    });
  });

  socket.on('stop_typing', ({ teamId }) => {
    socket.to(`team:${teamId}`).emit('typing', {
      userId: socket.userId,
      teamId,
      isTyping: false
    });
  });

  // Handle status updates
  socket.on('update-status', async (status) => {
    if (['online', 'away', 'busy', 'offline'].includes(status)) {
      await updateUserStatus(socket.userId, status);
      
      // Notify all teams the user is in
      const connection = activeConnections.get(socket.id);
      if (connection) {
        for (const teamId of connection.teamIds) {
          socket.to(`team:${teamId}`).emit('user-status-changed', {
            userId: socket.userId,
            status,
            teamId
          });
        }
      }
    }
  });

  // Handle notifications
  socket.on('mark-notification-read', async (notificationId) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', socket.userId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.userId} (${socket.id})`);

    // Remove socket from tracking
    const connection = activeConnections.get(socket.id);
    if (connection) {
      // Check if user has other active sockets
      const userSocketSet = userSockets.get(socket.userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        
        // If no more sockets, user is offline
        if (userSocketSet.size === 0) {
          userSockets.delete(socket.userId);
          await updateUserStatus(socket.userId, 'offline', new Date().toISOString());
          
          // Notify all teams
          for (const teamId of connection.teamIds) {
            teamPresence.get(teamId)?.delete(socket.userId);
            
            io.to(`team:${teamId}`).emit('user-left', {
              userId: socket.userId,
              teamId
            });
          }
        }
      }
    }

    activeConnections.delete(socket.id);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error for user ${socket.userId}:`, error);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { io, httpServer };
