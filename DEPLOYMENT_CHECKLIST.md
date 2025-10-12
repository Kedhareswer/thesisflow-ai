# WebSocket Deployment Checklist

## ✅ Pre-Deployment Setup

### 1. Repository Preparation
- [ ] Ensure `render.yaml` is in root directory
- [ ] Health check endpoint added to `websocket-server.js`
- [ ] All code committed and pushed to main branch
- [ ] Dependencies are properly listed in `package.json`

### 2. Environment Variables Ready
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (keep secret!)
- [ ] `NEXT_PUBLIC_APP_URL` - Your Vercel frontend URL
- [ ] `NODE_ENV=production` for production deployment

### 3. Frontend Configuration (Vercel)
- [ ] Add `NEXT_PUBLIC_SOCKET_URL` environment variable pointing to Render WebSocket URL
- [ ] Update socket connection logic to use production URL
- [ ] Test WebSocket connection from frontend

## ✅ Render Deployment Steps

### 1. Create Render Service
- [ ] Log into [render.com](https://render.com)
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub repository
- [ ] Configure service settings:
  - **Name**: `thesisflow-websocket-server`
  - **Runtime**: `Node`
  - **Build Command**: `npm install`
  - **Start Command**: `node server/websocket-server.js`
  - **Plan**: `Starter` (free) or `Standard` ($7/month)

### 2. Environment Configuration
- [ ] Go to service Settings → Environment
- [ ] Add all required environment variables
- [ ] Verify no secrets are in Git repository
- [ ] Save environment configuration

### 3. Initial Deployment
- [ ] Click "Deploy Latest Commit"
- [ ] Monitor deployment logs for errors
- [ ] Wait for successful build and start
- [ ] Verify health check endpoint responds

## ✅ Post-Deployment Testing

### 1. Health Check
- [ ] Test health endpoint: `https://your-websocket.onrender.com/health`
- [ ] Verify response includes status, timestamp, uptime, connections
- [ ] Confirm 200 status code

### 2. WebSocket Connectivity
- [ ] Test connection from browser developer tools
- [ ] Verify authentication works with Supabase JWT
- [ ] Test team joining functionality
- [ ] Test message sending/receiving

### 3. Integration Testing
- [ ] Update frontend `NEXT_PUBLIC_SOCKET_URL` on Vercel
- [ ] Test full chat functionality from production frontend
- [ ] Verify presence updates work
- [ ] Test with multiple users/browsers

### 4. Performance Monitoring
- [ ] Monitor Render logs for connection patterns
- [ ] Check memory and CPU usage in Render dashboard
- [ ] Set up alerts for service downtime
- [ ] Monitor error rates and response times

## ✅ Production Readiness

### 1. Scaling Configuration
- [ ] Configure min/max instances if needed
- [ ] Set up auto-scaling based on CPU/memory
- [ ] Consider upgrading to Standard plan for production traffic
- [ ] Review resource limits and adjust as needed

### 2. Security Checklist
- [ ] All environment variables are secure (no secrets in code)
- [ ] CORS is properly configured for your frontend domain
- [ ] Authentication is working correctly
- [ ] Rate limiting is in place if needed

### 3. Monitoring Setup
- [ ] Enable Render monitoring and alerts
- [ ] Set up uptime monitoring (optional: use UptimeRobot)
- [ ] Monitor database connection stability
- [ ] Track WebSocket connection metrics

### 4. Backup & Recovery
- [ ] Document environment variable configuration
- [ ] Backup Render service configuration
- [ ] Have rollback plan ready
- [ ] Test disaster recovery procedure

## ✅ Client-Side Updates

### 1. Socket Service Configuration
- [ ] Update socket service to use production WebSocket URL
- [ ] Implement proper error handling for connection failures
- [ ] Add reconnection logic with exponential backoff
- [ ] Handle network switching gracefully

### 2. Environment Configuration
```bash
# Add to Vercel environment variables
NEXT_PUBLIC_SOCKET_URL=https://your-websocket.onrender.com
```

### 3. Connection Logic
```javascript
// Example production connection
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:3001', {
  auth: { token: supabaseToken },
  transports: ['websocket', 'polling'],
  upgrade: true,
  rememberUpgrade: true
});
```

## ✅ Troubleshooting Guide

### Common Issues & Solutions

**Connection Refused**
- Check if Render service is running
- Verify environment variables are set
- Check CORS configuration
- Ensure health endpoint responds

**Authentication Errors**
- Verify Supabase service role key
- Check JWT token format and expiration
- Ensure auth middleware is working

**High Memory Usage**
- Monitor active connections count
- Check for memory leaks in connection cleanup
- Consider upgrading Render plan
- Review connection pooling

**Slow Response Times**
- Check database query performance
- Monitor Render resource usage
- Consider Redis caching for session data
- Optimize message broadcasting

## ✅ Maintenance Tasks

### Daily
- [ ] Check service health status
- [ ] Monitor connection count and patterns
- [ ] Review error logs for issues

### Weekly
- [ ] Check resource usage trends
- [ ] Review performance metrics
- [ ] Update dependencies if needed
- [ ] Test backup procedures

### Monthly
- [ ] Security audit of environment variables
- [ ] Performance optimization review
- [ ] Cost optimization analysis
- [ ] Disaster recovery testing

## 🚀 Go-Live Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Health check responding
- [ ] Frontend updated with production socket URL
- [ ] Monitoring and alerts active
- [ ] Team notified of deployment
- [ ] Rollback plan documented
- [ ] Post-deployment testing completed

## 📞 Support Resources

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Socket.IO Documentation**: [socket.io/docs](https://socket.io/docs)
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **Project Issues**: Create GitHub issue for bug reports

---

**Deployment Date**: _________________
**Deployed by**: _____________________
**Production URL**: ___________________
**Version**: _________________________
