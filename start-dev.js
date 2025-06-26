const { spawn } = require('child_process');
const path = require('path');

// Start Next.js dev server
const nextProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Start Socket.io server
const socketProcess = spawn('node', ['server.js'], {
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  nextProcess.kill();
  socketProcess.kill();
  process.exit();
});

console.log('Development servers started:');
console.log('- Next.js running on http://localhost:3000');
console.log('- Socket.io server running on http://localhost:3001');
