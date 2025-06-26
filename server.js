const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create HTTP server
const server = http.createServer();

// Initialize Socket.io server
const io = new Server(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store active users
const activeUsers = new Map();
const userRooms = new Map();

// Socket.io events
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;
  console.log(`User connected: ${userId}`);
  
  // Store user connection
  activeUsers.set(userId, {
    socketId: socket.id,
    status: 'online',
    lastActive: new Date()
  });
  
  // Broadcast user status to all clients
  io.emit('user_status_change', {
    userId,
    status: 'online'
  });
  
  // Handle joining team rooms
  socket.on('join_team', ({ teamId }) => {
    console.log(`User ${userId} joined team ${teamId}`);
    socket.join(`team-${teamId}`);
    
    // Store user's rooms for cleanup
    if (!userRooms.has(userId)) {
      userRooms.set(userId, new Set());
    }
    userRooms.get(userId).add(`team-${teamId}`);
  });
  
  // Handle leaving team rooms
  socket.on('leave_team', ({ teamId }) => {
    console.log(`User ${userId} left team ${teamId}`);
    socket.leave(`team-${teamId}`);
    
    // Remove from user's rooms
    if (userRooms.has(userId)) {
      userRooms.get(userId).delete(`team-${teamId}`);
    }
  });
  
  // Handle new messages
  socket.on('new_message', async (data) => {
    const { teamId, userId, content, type } = data;
    console.log(`New message in team ${teamId} from user ${userId}`);
    
    // Generate message data
    const messageData = {
      id: `msg-${Date.now()}`,
      teamId,
      userId,
      content,
      type,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to team room
    io.to(`team-${teamId}`).emit('new_message', messageData);
  });
  
  // Handle user status changes
  socket.on('user_status_change', ({ userId, status }) => {
    console.log(`User ${userId} status changed to ${status}`);
    
    if (activeUsers.has(userId)) {
      activeUsers.get(userId).status = status;
      activeUsers.get(userId).lastActive = new Date();
    }
    
    // Broadcast to all clients
    io.emit('user_status_change', { userId, status });
  });
  
  // Handle typing indicators
  socket.on('typing', ({ teamId, userId }) => {
    socket.to(`team-${teamId}`).emit('typing', { teamId, userId });
  });
  
  socket.on('stop_typing', ({ teamId, userId }) => {
    socket.to(`team-${teamId}`).emit('stop_typing', { teamId, userId });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId}`);
    
    // Update user status
    if (activeUsers.has(userId)) {
      activeUsers.delete(userId);
    }
    
    // Leave all rooms
    if (userRooms.has(userId)) {
      userRooms.delete(userId);
    }
    
    // Broadcast offline status
    io.emit('user_status_change', {
      userId,
      status: 'offline'
    });
  });
});

// Start server
const PORT = process.env.SOCKET_PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});
