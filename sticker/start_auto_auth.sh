#!/bin/bash
# Start the automated Stickerdom auth service

cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install dependencies if needed
if [ ! -f "venv/bin/python3" ] || ! python3 -c "import aiohttp" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip install -r requirements_auth.txt
fi

# Check if init_data.txt exists
if [ ! -f "init_data.txt" ]; then
    echo "⚠️  WARNING: init_data.txt not found!"
    echo "   Please add your Telegram initData or JWT token to init_data.txt"
    echo ""
    echo "   To get initData:"
    echo "   1. Open stickerdom.com Mini App in Telegram"
    echo "   2. Press F12 to open console"
    echo "   3. Run: window.Telegram.WebApp.initData"
    echo "   4. Copy the result to init_data.txt"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🚀 Starting Stickerdom Auto Auth Service..."
echo "📡 Token service will be available at: http://localhost:8765/token"
echo ""

python3 auto_auth_service.py

