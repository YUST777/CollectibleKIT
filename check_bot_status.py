#!/usr/bin/env python3
"""
Check CollectibleKIT Bot Status
"""

import subprocess
import sys

def check_bot_status():
    """Check if the CollectibleKIT bot is running"""
    try:
        # Check if collectiblekit_bot.py is running
        result = subprocess.run(
            ["pgrep", "-f", "collectiblekit_bot.py"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0 and result.stdout.strip():
            print("✅ CollectibleKIT Bot is running!")
            print(f"Process ID: {result.stdout.strip()}")
            return True
        else:
            print("❌ CollectibleKIT Bot is not running")
            return False
            
    except Exception as e:
        print(f"❌ Error checking bot status: {e}")
        return False

def main():
    """Main function"""
    print("🤖 CollectibleKIT Bot Status Check")
    print("=" * 40)
    
    if check_bot_status():
        print("\n🎉 Bot is active and ready to receive messages!")
        print("📱 Bot Token: 8151264433:AAG92vbSyL6TKyP1kBxfG6WQfYoz0Jy9df0")
        print("🔗 Bot Username: @CollectibleKITbot")
    else:
        print("\n⚠️  Bot is not running. Start it with:")
        print("   python collectiblekit_bot.py")

if __name__ == "__main__":
    main()
