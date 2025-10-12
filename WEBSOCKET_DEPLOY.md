# WebSocket Server Deployment Guide

## ✅ **DEPLOY TO RAILWAY (RECOMMENDED)**

Your WebSocket server needs to be deployed separately from Vercel since Vercel doesn't support persistent WebSocket connections.

### **1. Setup Railway Account**
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (free tier available)
3. Connect your GitHub repository

### **2. Deploy WebSocket Server**
1. **Create New Project** on Railway
2. **Deploy from GitHub Repo**: Select `thesisflow-ai`
3. **Configure Start Command**: `node server/websocket-server.js`
4. **Set Environment Variables** (copy from your `.env.local`):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://wvlxgbqjwgleizbpdulo.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

### **3. Get Your WebSocket URL**
After deployment, Railway will give you a URL like:
```
https://your-app-production-xxxx.up.railway.app
```

### **4. Update Vercel Environment Variables**
In your Vercel dashboard, add:
```bash
NEXT_PUBLIC_SOCKET_URL=https://your-websocket-railway-url.up.railway.app
```

### **5. Update Local Development**
In your `.env.local`:
```bash
# For production
NEXT_PUBLIC_SOCKET_URL=https://your-websocket-railway-url.up.railway.app

# For local development (comment out production URL above)
# NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## **Alternative Options**

### **Option 2: Render**
- Similar to Railway but slightly more complex setup
- Free tier available
- Good performance

### **Option 3: Heroku**
- No longer has free tier
- More expensive but battle-tested

### **Option 4: DigitalOcean App Platform**
- $5/month minimum
- Excellent performance

## **Health Check**
Your WebSocket server now includes a health check at `/health` that returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-18T10:30:00.000Z",
  "activeConnections": 5,
  "uptime": 3600
}
```

## **Testing**
1. Deploy to Railway
2. Update `NEXT_PUBLIC_SOCKET_URL` in Vercel
3. Test real-time features in production
4. Monitor Railway logs for WebSocket connections

## **Troubleshooting**
- **CORS Issues**: Update `NEXT_PUBLIC_APP_URL` in Railway env vars
- **Connection Failures**: Check Railway logs for authentication errors
- **Performance**: Railway free tier has limits, upgrade if needed

## **Cost**
- **Railway**: Free tier (500 hours/month) - perfect for WebSocket server
- **Scaling**: Upgrade to Railway Pro ($5/month) when needed
