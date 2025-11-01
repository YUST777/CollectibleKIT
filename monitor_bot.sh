#!/bin/bash

echo "=== Bot Status Monitor ==="
echo "Time: $(date)"
echo ""

# Check if bot is running
if pgrep -f "python -m bot.telegram_bot" > /dev/null; then
    echo "✅ Bot is RUNNING"
    ps aux | grep "python -m bot.telegram_bot" | grep -v grep
else
    echo "❌ Bot is NOT RUNNING"
fi

echo ""
echo "=== System Resources ==="
echo "Memory:"
free -h | grep -E "Mem|Swap"
echo ""
echo "Disk Space:"
df -h . | grep -v "Filesystem"
echo ""
echo "=== Recent Logs ==="
echo "Last 5 lines from bot (if any):"
tail -5 nohup.out 2>/dev/null || echo "No log file found"
