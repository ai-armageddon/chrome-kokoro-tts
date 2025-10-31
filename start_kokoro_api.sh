#!/bin/bash

# Kokoro TTS API Startup Script
# This script starts the Kokoro TTS API server using PM2

echo "🎤 Starting Kokoro TTS API Server..."

# Navigate to the kokoro directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run setup first."
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing..."
    npm install -g pm2
fi

# Start the API server with PM2
echo "🚀 Starting API server with PM2..."
pm2 start ecosystem.config.js

# Wait a moment for startup
sleep 3

# Check if the server is running
echo "🔍 Checking server status..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Kokoro TTS API is running on http://localhost:8000"
    echo ""
    echo "📋 Available endpoints:"
    echo "  - Health check: http://localhost:8000/health"
    echo "  - Get voices:   http://localhost:8000/voices"
    echo "  - Generate TTS: http://localhost:8000/tts"
    echo ""
    echo "🎧 Chrome Extension:"
    echo "  1. Open Chrome and go to chrome://extensions/"
    echo "  2. Enable 'Developer mode'"
    echo "  3. Click 'Load unpacked' and select the current folder"
    echo "  4. The Kokoro TTS icon will appear in your toolbar"
    echo ""
    echo "📊 PM2 Commands:"
    echo "  - View status: pm2 status"
    echo "  - View logs:   pm2 logs kokoro-tts-api"
    echo "  - Restart:     pm2 restart kokoro-tts-api"
    echo "  - Stop:        pm2 stop kokoro-tts-api"
else
    echo "❌ Failed to start API server. Check logs with: pm2 logs kokoro-tts-api"
    exit 1
fi
