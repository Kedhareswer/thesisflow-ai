/**
 * WebSocket Server for Real-time Collaboration
 * Handles team chat, document collaboration, and presence tracking
 */

const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Service key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create HTTP server
const httpServer = createServer();

// Initialize Socket.IO with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store active users and their rooms
const activeUsers = new Map();
const roomUsers = new Map();

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      throw new Error('No token provided');
    }

    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      throw new Error('Invalid token');
    }

    // Attach user to socket
    socket.userId = user.id;
    socket.userEmail = user.email;
    
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    socket.userProfile = profile;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userEmail} (${socket.userId})`);
  
  // Store active user
  activeUsers.set(socket.userId, {
    socketId: socket.id,
    profile: socket.userProfile,
    lastActive: new Date(),
    rooms: new Set()
  });

  // Update user presence in database
  updateUserPresence(socket.userId, 'online');

  // =====================================
  // TEAM CHAT FUNCTIONALITY
  // =====================================

  // Join team room
  socket.on('join-team', async (teamId) => {
    try {
      // Verify user is member of the team
      const { data: membership } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', socket.userId)
        .single();

      if (!membership) {
        socket.emit('error', { message: 'Not authorized to join this team' });
        return;
      }

      socket.join(`team:${teamId}`);
      activeUsers.get(socket.userId).rooms.add(`team:${teamId}`);

      // Add user to room tracking
      if (!roomUsers.has(`team:${teamId}`)) {
        roomUsers.set(`team:${teamId}`, new Set());
      }
      roomUsers.get(`team:${teamId}`).add(socket.userId);

      // Notify team members
      socket.to(`team:${teamId}`).emit('user-joined', {
        user: socket.userProfile,
        timestamp: new Date()
      });

      // Send current room members
      const currentMembers = Array.from(roomUsers.get(`team:${teamId}`))
        .map(userId => activeUsers.get(userId)?.profile)
        .filter(Boolean);

      socket.emit('room-members', { teamId, members: currentMembers });

      console.log(`User ${socket.userEmail} joined team ${teamId}`);
    } catch (error) {
      console.error('Error joining team:', error);
      socket.emit('error', { message: 'Failed to join team' });
    }
  });

  // Leave team room
  socket.on('leave-team', (teamId) => {
    socket.leave(`team:${teamId}`);
    activeUsers.get(socket.userId)?.rooms.delete(`team:${teamId}`);
    roomUsers.get(`team:${teamId}`)?.delete(socket.userId);

    socket.to(`team:${teamId}`).emit('user-left', {
      user: socket.userProfile,
      timestamp: new Date()
    });

    console.log(`User ${socket.userEmail} left team ${teamId}`);
  });

  // Send team message
  socket.on('send-message', async (data) => {
    try {
      const { teamId, content, type = 'text' } = data;

      // Insert message into database
      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          team_id: teamId,
          sender_id: socket.userId,
          content,
          message_type: type
        })
        .select(`
          *,
          sender:user_profiles!chat_messages_sender_id_fkey(*)
        `)
        .single();

      if (error) throw error;

      // Broadcast to team members
      io.to(`team:${teamId}`).emit('new-message', {
        ...message,
        timestamp: new Date()
      });

      console.log(`Message sent to team ${teamId} by ${socket.userEmail}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // =====================================
  // DOCUMENT COLLABORATION
  // =====================================

  // Join document editing session
  socket.on('join-document', async (documentId) => {
    try {
      // Verify access to document
      const { data: document } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (!document) {
        socket.emit('error', { message: 'Document not found' });
        return;
      }

      // Check if user has access (owner, team member, or public)
      let hasAccess = false;
      
      if (document.owner_id === socket.userId || document.is_public) {
        hasAccess = true;
      } else if (document.team_id) {
        const { data: membership } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', document.team_id)
          .eq('user_id', socket.userId)
          .single();
        hasAccess = !!membership;
      }

      if (!hasAccess) {
        socket.emit('error', { message: 'Not authorized to access this document' });
        return;
      }

      socket.join(`document:${documentId}`);
      activeUsers.get(socket.userId).rooms.add(`document:${documentId}`);

      // Notify other editors
      socket.to(`document:${documentId}`).emit('editor-joined', {
        user: socket.userProfile,
        documentId,
        timestamp: new Date()
      });

      console.log(`User ${socket.userEmail} joined document ${documentId}`);
    } catch (error) {
      console.error('Error joining document:', error);
      socket.emit('error', { message: 'Failed to join document' });
    }
  });

  // Leave document editing session
  socket.on('leave-document', (documentId) => {
    socket.leave(`document:${documentId}`);
    activeUsers.get(socket.userId)?.rooms.delete(`document:${documentId}`);

    socket.to(`document:${documentId}`).emit('editor-left', {
      user: socket.userProfile,
      documentId,
      timestamp: new Date()
    });

    console.log(`User ${socket.userEmail} left document ${documentId}`);
  });

  // Handle document changes (collaborative editing)
  socket.on('document-change', (data) => {
    const { documentId, changes, version } = data;
    
    // Broadcast changes to other editors
    socket.to(`document:${documentId}`).emit('document-update', {
      changes,
      version,
      author: socket.userProfile,
      timestamp: new Date()
    });
  });

  // =====================================
  // PRESENCE TRACKING
  // =====================================

  // Update user activity
  socket.on('user-activity', () => {
    const user = activeUsers.get(socket.userId);
    if (user) {
      user.lastActive = new Date();
      updateUserPresence(socket.userId, 'online');
    }
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    const { teamId } = data;
    socket.to(`team:${teamId}`).emit('user-typing', {
      user: socket.userProfile,
      teamId,
      isTyping: true
    });
  });

  socket.on('typing-stop', (data) => {
    const { teamId } = data;
    socket.to(`team:${teamId}`).emit('user-typing', {
      user: socket.userProfile,
      teamId,
      isTyping: false
    });
  });

  // =====================================
  // DISCONNECTION HANDLING
  // =====================================

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userEmail}`);
    
    // Remove from all rooms
    const user = activeUsers.get(socket.userId);
    if (user) {
      user.rooms.forEach(room => {
        socket.to(room).emit('user-left', {
          user: socket.userProfile,
          timestamp: new Date()
        });
        
        // Clean up room tracking
        const roomId = room.split(':')[1];
        roomUsers.get(room)?.delete(socket.userId);
      });
    }

    // Remove from active users
    activeUsers.delete(socket.userId);
    
    // Update presence to offline
    updateUserPresence(socket.userId, 'offline');
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// =====================================
// UTILITY FUNCTIONS
// =====================================

async function updateUserPresence(userId, status) {
  try {
    await supabase
      .from('user_profiles')
      .update({
        status,
        last_active: new Date()
      })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error updating user presence:', error);
  }
}

// Clean up inactive users every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  for (const [userId, user] of activeUsers) {
    if (user.lastActive < fiveMinutesAgo) {
      updateUserPresence(userId, 'away');
    }
  }
}, 5 * 60 * 1000);

// =====================================
// SERVER STARTUP
// =====================================

const PORT = process.env.WEBSOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
  console.log(`📡 Real-time collaboration features enabled`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down WebSocket server...');
  httpServer.close(() => {
    console.log('WebSocket server shut down.');
  });
});

module.exports = { io, httpServer };
