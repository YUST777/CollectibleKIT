#!/usr/bin/env python3
"""
Cross-platform startup script for Telegram Bot
Works on Windows, macOS, and Linux
"""

import os
import sys
import subprocess
import platform

def main():
    print("🚀 Starting Telegram Bot...")
    print(f"Platform: {platform.system()} {platform.release()}")
    print()
    
    # Check if virtual environment exists
    venv_activate = None
    if platform.system() == "Windows":
        venv_activate = os.path.join(".venv", "Scripts", "activate.bat")
        python_exe = os.path.join(".venv", "Scripts", "python.exe")
    else:
        venv_activate = os.path.join(".venv", "bin", "activate")
        python_exe = os.path.join(".venv", "bin", "python")
    
    if not os.path.exists(python_exe):
        print("📦 Virtual environment not found. Creating one...")
        subprocess.run([sys.executable, "-m", "venv", ".venv"], check=True)
        print("✅ Virtual environment created.")
    
    # Install requirements
    print("📥 Installing requirements...")
    if platform.system() == "Windows":
        subprocess.run([python_exe, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
    else:
        subprocess.run([python_exe, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
    
    # Start the bot
    print("🤖 Starting bot...")
    if platform.system() == "Windows":
        subprocess.run([python_exe, "-m", "bot.telegram_bot"], check=True)
    else:
        subprocess.run([python_exe, "-m", "bot.telegram_bot"], check=True)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 Bot stopped by user.")
    except Exception as e:
        print(f"❌ Error: {e}")
        input("Press Enter to exit...")
