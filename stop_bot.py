#!/usr/bin/env python3
"""
Stop CollectibleKIT Bot
"""

import subprocess
import sys

def stop_bot():
    """Stop the CollectibleKIT bot"""
    try:
        # Kill the collectiblekit_bot.py process
        result = subprocess.run(
            ["pkill", "-f", "collectiblekit_bot.py"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ CollectibleKIT Bot stopped successfully!")
            return True
        else:
            print("❌ Failed to stop bot or bot was not running")
            return False
            
    except Exception as e:
        print(f"❌ Error stopping bot: {e}")
        return False

def main():
    """Main function"""
    print("🛑 Stopping CollectibleKIT Bot...")
    print("=" * 40)
    
    if stop_bot():
        print("\n🎉 Bot has been stopped!")
    else:
        print("\n⚠️  Bot may not have been running or there was an error")

if __name__ == "__main__":
    main()
