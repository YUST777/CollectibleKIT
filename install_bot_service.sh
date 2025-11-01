#!/bin/bash

echo "=== Installing Bot as System Service ==="
echo "This will make the bot run 24/7, even when laptop is suspended"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Get current user and path
CURRENT_USER=$(logname)
PROJECT_PATH=$(pwd)
BOT_PATH="$PROJECT_PATH/bot/telegram_bot.py"
VENV_PATH="$PROJECT_PATH/.venv/bin/python"

echo "User: $CURRENT_USER"
echo "Project Path: $PROJECT_PATH"
echo "Bot Path: $BOT_PATH"
echo ""

# Create systemd service file
SERVICE_FILE="/etc/systemd/system/telegram-bot.service"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Telegram Story Puzzle Bot
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$PROJECT_PATH
ExecStart=$VENV_PATH -m bot.telegram_bot
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service file created: $SERVICE_FILE"

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable telegram-bot.service

echo "✅ Service enabled and will start on boot"

# Start the service
systemctl start telegram-bot.service

echo "✅ Service started!"

# Show status
echo ""
echo "=== Service Status ==="
systemctl status telegram-bot.service --no-pager -l

echo ""
echo "=== Useful Commands ==="
echo "Check status: sudo systemctl status telegram-bot"
echo "Start bot:   sudo systemctl start telegram-bot"
echo "Stop bot:    sudo systemctl stop telegram-bot"
echo "Restart bot: sudo systemctl restart telegram-bot"
echo "View logs:   sudo journalctl -u telegram-bot -f"
