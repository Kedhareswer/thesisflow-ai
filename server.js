const http = require('http');
const dotenv = require('dotenv');
const ChatServer = require('./server/chat-server');

// Load environment variables
dotenv.config();

// Create HTTP server
const server = http.createServer();

// Initialize Chat Server with Socket.io
const chatServer = new ChatServer(server);

console.log('Chat server initialized with real-time messaging capabilities');

// Start server
const PORT = process.env.SOCKET_PORT || 3001;
server.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
  console.log('Features enabled:');
  console.log('- Real-time messaging');
  console.log('- Typing indicators');
  console.log('- User presence');
  console.log('- Message delivery receipts');
  console.log('- Offline message sync');
});
