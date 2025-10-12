# 🚀 **COMPLETE DEPLOYMENT CHECKLIST**

## **✅ PHASE 1: RAILWAY WEBSOCKET DEPLOYMENT**

### **1. Setup Railway Account**
- [ ] Go to [railway.app](https://railway.app)
- [ ] Sign up with GitHub (free)
- [ ] Connect your GitHub repository

### **2. Deploy WebSocket Server**
- [ ] Create new Railway project
- [ ] Select "Deploy from GitHub Repo"
- [ ] Choose `thesisflow-ai` repository
- [ ] Set start command: `node server/websocket-server.js`

### **3. Configure Environment Variables in Railway**
Copy these from your `.env.local`:
```bash
- [ ] NEXT_PUBLIC_SUPABASE_URL=https://wvlxgbqjwgleizbpdulo.supabase.co
- [ ] SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
- [ ] NODE_ENV=production
- [ ] NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

### **4. Get Your Railway WebSocket URL**
- [ ] After deployment, copy the Railway URL (e.g., `https://thesisflow-websocket-production-xxxx.up.railway.app`)
- [ ] Test the URL by visiting `/health` endpoint

## **✅ PHASE 2: VERCEL ENVIRONMENT UPDATE**

### **5. Update Vercel Environment Variables**
- [ ] Go to Vercel dashboard → Your project → Settings → Environment Variables
- [ ] Add: `NEXT_PUBLIC_SOCKET_URL=https://your-railway-websocket-url.up.railway.app`
- [ ] Redeploy your Vercel app

### **6. Update Local Development**
- [ ] Update your `.env.local`:
```bash
# For production testing
NEXT_PUBLIC_SOCKET_URL=https://your-railway-websocket-url.up.railway.app

# For local development (uncomment when needed)
# NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## **✅ PHASE 3: TESTING & VERIFICATION**

### **7. Test WebSocket Connection**
- [ ] Run local test: `node scripts/test-websocket.js https://your-railway-url.up.railway.app`
- [ ] Should show "✅ Connection successful!"
- [ ] Health check should return server status

### **8. Test Production Features**
- [ ] Visit your Vercel app
- [ ] Create/join a team
- [ ] Test real-time chat
- [ ] Test presence indicators
- [ ] Check browser console for WebSocket errors

### **9. Monitor Railway Deployment**
- [ ] Check Railway logs for WebSocket connections
- [ ] Monitor server health at `/health` endpoint
- [ ] Verify CORS settings are working

## **🔧 TROUBLESHOOTING**

### **Common Issues:**

**❌ CORS Error**
- Check `NEXT_PUBLIC_APP_URL` in Railway matches your Vercel domain
- Ensure Railway WebSocket server shows your domain in CORS logs

**❌ Connection Refused**
- Verify Railway deployment is running
- Check Railway start command: `node server/websocket-server.js`
- Test health endpoint: `https://your-railway-url.up.railway.app/health`

**❌ Authentication Failed**
- Verify `SUPABASE_SERVICE_ROLE_KEY` in Railway environment
- Check Supabase project is active and accessible

**❌ Environment Variable Issues**
- Ensure all required env vars are set in Railway
- Redeploy after env var changes

## **💰 COST BREAKDOWN**

- **Railway**: FREE (500 hours/month)
- **Vercel**: Your existing plan
- **Upgrade Path**: Railway Pro ($5/month) if you exceed free tier

## **🎯 SUCCESS CRITERIA**

Your deployment is successful when:
- [ ] Railway WebSocket server shows "healthy" status
- [ ] Vercel app connects to Railway WebSocket server
- [ ] Real-time features work in production
- [ ] No CORS or connection errors in browser console
- [ ] Teams can chat and see presence indicators

## **📞 SUPPORT**

If you encounter issues:
1. Check Railway deployment logs
2. Test WebSocket connection with test script
3. Verify all environment variables are set correctly
4. Check browser console for specific error messages

**Your setup is now production-ready! 🎉**
