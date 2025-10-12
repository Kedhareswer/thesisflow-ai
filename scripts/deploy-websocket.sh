#!/bin/bash

# Quick WebSocket Deployment Script for Railway
# Usage: ./scripts/deploy-websocket.sh

echo "🚀 ThesisFlow-AI WebSocket Deployment Guide"
echo "=========================================="
echo ""

echo "📋 Prerequisites:"
echo "1. Railway account (free): https://railway.app"
echo "2. GitHub repository connected to Railway"
echo "3. Environment variables ready"
echo ""

echo "🔧 Deployment Steps:"
echo "1. Go to railway.app and create new project"
echo "2. Select 'Deploy from GitHub Repo' -> thesisflow-ai"
echo "3. Set start command: node server/websocket-server.js"
echo "4. Add environment variables:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - NODE_ENV=production"
echo "   - NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app"
echo ""

echo "🌐 After deployment:"
echo "1. Copy your Railway WebSocket URL"
echo "2. Update Vercel environment variable:"
echo "   NEXT_PUBLIC_SOCKET_URL=https://your-websocket.up.railway.app"
echo "3. Redeploy your Vercel app"
echo ""

echo "✅ Test your deployment:"
echo "1. Visit your Vercel app"
echo "2. Try real-time collaboration features"
echo "3. Check Railway logs for connections"
echo ""

echo "💡 Need help? Check WEBSOCKET_DEPLOY.md for detailed instructions"
