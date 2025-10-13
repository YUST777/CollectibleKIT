#!/bin/bash

# Story Canvas Cutter - Next.js App Startup Script

echo "🚀 Starting Story Canvas Cutter Next.js App..."

# Navigate to the Next.js app directory
cd "$(dirname "$0")/webapp-nextjs"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if Flask API is running
echo "🔍 Checking Flask API connection..."
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Flask API is running"
else
    echo "⚠️  Flask API is not running. Please start it with:"
    echo "   cd bot && python telegram_bot.py"
    echo ""
fi

# Start the Next.js development server
echo "🎨 Starting Next.js development server..."
echo "📍 App will be available at: http://localhost:3000"
echo "🤖 Make sure your Telegram bot is configured to use this URL"
echo ""

npm run dev


