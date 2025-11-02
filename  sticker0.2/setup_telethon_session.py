#!/usr/bin/env python3
"""
Helper script to setup Telethon user session
Run this once to authenticate with your phone number
"""

import os
import asyncio
from telethon import TelegramClient
from dotenv import load_dotenv

load_dotenv()

API_ID = int(os.getenv('TELEGRAM_API_ID', '0'))
API_HASH = os.getenv('TELEGRAM_API_HASH', '')
SESSION_NAME = os.getenv('TELEGRAM_SESSION_NAME', 'telethon_user_session')

if not API_ID or not API_HASH:
    print("❌ TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env")
    exit(1)

async def setup_session():
    """Setup Telethon user session"""
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    
    print("🔐 Setting up Telethon user session...")
    print("📱 You'll need to provide your phone number and verification code")
    print("   This is a one-time setup - session will be saved for future use\n")
    
    await client.start()
    
    me = await client.get_me()
    print(f"\n✅ Session setup complete!")
    print(f"👤 Logged in as: {me.first_name}")
    if me.username:
        print(f"📱 Username: @{me.username}")
    print(f"🆔 User ID: {me.id}")
    print(f"\n💾 Session saved to: {SESSION_NAME}.session")
    print("   You can now run the bot and it will use this session automatically!")
    
    await client.disconnect()

if __name__ == '__main__':
    asyncio.run(setup_session())

