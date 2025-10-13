#!/usr/bin/env python3
"""
Startup script for Telegram Bot with Mini App
Runs both the bot and the Flask API server
"""

import os
import sys
import subprocess
import threading
import time
import signal
import logging

# Configure logging
logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("mini-app-starter")

def run_bot():
    """Run the Telegram bot"""
    try:
        logger.info("Starting Telegram Bot...")
        subprocess.run([sys.executable, "-m", "bot.telegram_bot"], check=True)
    except Exception as e:
        logger.error(f"Bot error: {e}")

def run_api():
    """Run the Flask API server"""
    try:
        logger.info("Starting Flask API server...")
        subprocess.run([sys.executable, "webapp_api.py"], check=True)
    except Exception as e:
        logger.error(f"API server error: {e}")

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info("Received shutdown signal. Stopping services...")
    sys.exit(0)

def main():
    """Main function to start both services"""
    print("🚀 Starting Telegram Bot with Mini App...")
    print(f"Platform: {os.name}")
    print()
    
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Check if virtual environment exists
    venv_python = None
    if os.name == 'nt':  # Windows
        venv_python = os.path.join(".venv", "Scripts", "python.exe")
    else:  # Linux/macOS
        venv_python = os.path.join(".venv", "bin", "python")
    
    if not os.path.exists(venv_python):
        print("📦 Virtual environment not found. Creating one...")
        subprocess.run([sys.executable, "-m", "venv", ".venv"], check=True)
        print("✅ Virtual environment created.")
    
    # Install requirements
    print("📥 Installing requirements...")
    subprocess.run([venv_python, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
    
    # Set environment variables
    os.environ["PYTHONPATH"] = os.getcwd()
    
    # Start API server in a separate thread
    api_thread = threading.Thread(target=run_api, daemon=True)
    api_thread.start()
    
    # Wait a moment for API to start
    time.sleep(2)
    
    print("🤖 Starting bot...")
    print("🌐 API server running on http://localhost:5000")
    print("📱 Mini App URL: Update MINI_APP_URL in bot/config.py with your domain")
    print()
    
    # Run the bot (main thread)
    try:
        run_bot()
    except KeyboardInterrupt:
        print("\n👋 Services stopped by user.")
    except Exception as e:
        print(f"❌ Error: {e}")
        input("Press Enter to exit...")

if __name__ == "__main__":
    main()



