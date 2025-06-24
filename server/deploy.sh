#!/bin/bash

echo "🚀 Deploying Voice Agent Server to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway..."
    railway login
fi

# Check if project is initialized
if [ ! -f "railway.json" ]; then
    echo "📁 Initializing Railway project..."
    railway init
fi

# Set environment variables if not already set
echo "🔑 Setting environment variables..."
railway variables set DEEPGRAM_API_KEY="$DEEPGRAM_API_KEY"
railway variables set OPENAI_API_KEY="$OPENAI_API_KEY"

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo "🌐 Your Railway URL will be shown above"
echo "📊 Check logs with: railway logs" 