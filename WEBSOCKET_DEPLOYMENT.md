# WebSocket Server Deployment on Render

## Overview
This guide covers deploying the ThesisFlow-AI WebSocket server to Render while keeping the main application on Vercel.

## Architecture
- **Frontend**: Vercel (https://your-app.vercel.app)
- **WebSocket Server**: Render (https://your-websocket.onrender.com)
- **Database**: Supabase (shared between both)

## Pre-Deployment Setup

### 1. Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Connect your repository

### 2. Environment Variables
Set these in Render Dashboard (Settings → Environment):

#### Required Variables:
```bash
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... # Your service role key - KEEP SECRET
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### Optional Variables:
```bash
WEBSOCKET_PORT=10000  # Render will override with PORT
```

### 3. Update Client Configuration
Update your frontend environment variables on Vercel:

```bash
# Add to Vercel environment variables
NEXT_PUBLIC_SOCKET_URL=https://your-websocket.onrender.com
```

## Deployment Steps

### 1. Push to GitHub
Ensure your code is pushed to the main branch:
```bash
git add .
git commit -m "Add Render WebSocket deployment configuration"
git push origin main
```

### 2. Create Render Service
1. Log into Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `thesisflow-websocket-server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server/websocket-server.js`
   - **Plan**: Start with `Starter` (free), upgrade to `Standard` for production

### 3. Configure Environment
1. Go to service Settings → Environment
2. Add all required environment variables listed above
3. **Important**: Never commit secrets to Git - use Render's environment variables

### 4. Deploy
1. Click "Deploy Latest Commit" or enable auto-deploy
2. Monitor logs for successful startup
3. Look for: `WebSocket server running on port XXXXX`

## Health Check Endpoint

Add this to your `websocket-server.js` before starting the server:

```javascript
// Add health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
  }
});
```

## Production Considerations

### 1. Resource Limits
- **Starter Plan**: 512 MB RAM, 0.1 CPU
- **Standard Plan**: 2 GB RAM, 1 CPU (recommended for production)
- **Pro Plan**: 4 GB RAM, 2 CPU (for high traffic)

### 2. Monitoring
- Monitor WebSocket connections in Render logs
- Set up alerts for service downtime
- Track memory and CPU usage

### 3. Scaling
- Render auto-scales based on traffic
- Configure min/max instances in `render.yaml`
- Consider Redis for session storage if scaling beyond 1 instance

### 4. Security
- Use HTTPS only (`wss://` protocol)
- Implement rate limiting
- Validate all socket events
- Keep Supabase service key secret

## Testing Deployment

### 1. Check Service Health
```bash
curl https://your-websocket.onrender.com/health
```

### 2. Test WebSocket Connection
Use browser developer tools:
```javascript
const socket = io('https://your-websocket.onrender.com', {
  auth: { token: 'your-jwt-token' }
});
socket.on('connect', () => console.log('Connected!'));
```

### 3. Monitor Logs
Watch Render logs for:
- Successful connections
- Authentication errors
- Database connectivity
- Memory usage warnings

## Troubleshooting

### Common Issues:

1. **Connection Refused**
   - Check if service is running
   - Verify environment variables
   - Check CORS configuration

2. **Authentication Errors**
   - Verify Supabase credentials
   - Check token format
   - Ensure service role key is set

3. **Memory Issues**
   - Upgrade plan if needed
   - Monitor connection cleanup
   - Check for memory leaks

4. **Database Connection Errors**
   - Verify Supabase URL and key
   - Check network connectivity
   - Review database permissions

## Maintenance

### Regular Tasks:
- Monitor service health
- Update dependencies monthly
- Review logs weekly
- Check resource usage
- Backup configuration

### Updates:
1. Push code changes to main branch
2. Render auto-deploys (if enabled)
3. Monitor deployment logs
4. Test functionality after deployment

## Cost Estimation

- **Starter Plan**: Free (limited resources)
- **Standard Plan**: ~$7/month (recommended)
- **Pro Plan**: ~$25/month (high traffic)

Choose plan based on concurrent users and message volume.
