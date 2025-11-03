#!/bin/bash
# Simple script to start the MRKT bot

echo "🚀 Starting TGMRKT Bot..."
echo ""

# Check if session exists
if [ ! -f "gifts_session.session" ] && [ ! -f "mrkt_test_session.session" ]; then
    echo "⚠️  Telethon session not found!"
    echo "   Run: python3 setup_mrkt_session.py"
    echo ""
    read -p "Do you want to set it up now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        python3 setup_mrkt_session.py
    else
        exit 1
    fi
fi

# Start the bot
echo "✅ Starting bot..."
python3 mrkt_bot.py
