#!/usr/bin/env node

/**
 * WebSocket Connection Test Script
 * Usage: node scripts/test-websocket.js [url]
 */

const { io } = require('socket.io-client');

const url = process.argv[2] || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

console.log(`🔗 Testing WebSocket connection to: ${url}`);
console.log('========================================');

const socket = io(url, {
  transports: ['polling', 'websocket'],
  timeout: 10000,
  reconnection: false,
  auth: {
    token: 'test-token' // This will fail auth but test connection
  }
});

socket.on('connect', () => {
  console.log('✅ Connection successful!');
  console.log(`📡 Socket ID: ${socket.id}`);
  console.log(`🚀 Transport: ${socket.io.engine.transport.name}`);
  
  // Test health endpoint
  const healthUrl = url.replace(/\/$/, '') + '/health';
  fetch(healthUrl).then(res => res.json()).then(data => {
    console.log('❤️  Health check:', data);
  }).catch(err => {
    console.log('⚠️  Health check failed:', err.message);
  }).finally(() => {
    socket.disconnect();
    process.exit(0);
  });
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection failed:', error.message);
  socket.disconnect();
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('👋 Disconnected');
});

// Test timeout
setTimeout(() => {
  console.log('⏰ Connection timeout');
  socket.disconnect();
  process.exit(1);
}, 15000);
