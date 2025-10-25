#!/usr/bin/env python3
"""
Startup script for CollectibleKIT Telegram Bot
"""

import subprocess
import sys
import os

def main():
    """Start the CollectibleKIT bot"""
    print("🚀 Starting CollectibleKIT Telegram Bot...")
    
    # Check if we're in the right directory
    if not os.path.exists("collectiblekit_bot.py"):
        print("❌ Error: collectiblekit_bot.py not found!")
        print("Please run this script from the CollectibleKIT directory.")
        sys.exit(1)
    
    # Check if assets directory exists
    if not os.path.exists("assets"):
        print("❌ Error: assets directory not found!")
        print("Please make sure the assets directory exists with start.mp4 and start.jpg")
        sys.exit(1)
    
    try:
        # Run the bot
        subprocess.run([sys.executable, "collectiblekit_bot.py"], check=True)
    except KeyboardInterrupt:
        print("\n🛑 Bot stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running bot: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()