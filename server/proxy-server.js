/**
 * Proxy Server for Cloud Run Deployment
 * Handles both HTTP requests (Next.js) and WebSocket connections through a single port
 * This solves Cloud Run's single-port limitation
 */

const http = require('http');
const httpProxy = require('http-proxy');
const { URL } = require('url');

const PORT = process.env.PORT || 8080;
const NEXTJS_PORT = process.env.NEXTJS_PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

console.log(`Starting proxy server on port ${PORT}`);
console.log(`Next.js server expected on port ${NEXTJS_PORT}`);
console.log(`WebSocket server expected on port ${WS_PORT}`);

// Create proxy instances with optimized settings for Cloud Run
const proxy = httpProxy.createProxyServer({
  timeout: 60000, // Extended timeout for Cloud Run
  proxyTimeout: 60000,
  secure: false,
  changeOrigin: true
});

// Health check endpoint for Cloud Run
const isHealthy = () => {
  // Add basic health check logic
  return true;
};

// Create HTTP server
const server = http.createServer((req, res) => {
  // Health check endpoint for Cloud Run
  if (req.url === '/health' || req.url === '/_ah/health') {
    if (isHealthy()) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'unhealthy', timestamp: new Date().toISOString() }));
    }
    return;
  }

  // Add CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Add request logging for debugging
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Proxying to Next.js`);

  // Proxy all HTTP requests to Next.js server
  proxy.web(req, res, {
    target: `http://localhost:${NEXTJS_PORT}`,
    changeOrigin: true,
    timeout: 60000,
    proxyTimeout: 60000,
    headers: {
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-For': req.connection.remoteAddress
    }
  }, (error) => {
    console.error(`[${new Date().toISOString()}] Proxy error:`, error.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Bad Gateway', 
        message: 'Next.js server unavailable',
        timestamp: new Date().toISOString()
      }));
    }
  });
});

// Handle WebSocket upgrade requests
server.on('upgrade', (request, socket, head) => {
  console.log(`[${new Date().toISOString()}] WebSocket upgrade request received from ${request.socket.remoteAddress}`);
  
  // Proxy WebSocket connections to the WebSocket server with Cloud Run optimizations
  proxy.ws(request, socket, head, {
    target: `ws://localhost:${WS_PORT}`,
    changeOrigin: true,
    timeout: 60000,
    ws: true,
    headers: {
      'X-Forwarded-Proto': 'wss',
      'X-Forwarded-For': request.socket.remoteAddress
    }
  }, (error) => {
    console.error(`[${new Date().toISOString()}] WebSocket proxy error:`, error.message);
    if (socket && !socket.destroyed) {
      socket.destroy();
    }
  });
});

// Error handling
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  if (res && !res.headersSent) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

// Start the proxy server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Proxying HTTP requests to Next.js on port ${NEXTJS_PORT}`);
  console.log(`Proxying WebSocket requests to WebSocket server on port ${WS_PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing proxy server');
  server.close(() => {
    console.log('Proxy server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing proxy server');
  server.close(() => {
    console.log('Proxy server closed');
    process.exit(0);
  });
});

module.exports = server;
