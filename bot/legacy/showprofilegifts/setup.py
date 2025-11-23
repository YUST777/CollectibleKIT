#!/usr/bin/env python3
"""Setup script - authenticate once"""

import asyncio
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
from config import API_ID, API_HASH, SESSION_NAME


async def setup():
    """Setup authentication"""
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    
    await client.connect()
    
    if await client.is_user_authorized():
        me = await client.get_me()
        print(f"✅ Already authenticated as: {me.first_name}")
        await client.disconnect()
        return
    
    print("📱 First-time setup")
    
    phone = input("Enter your phone (e.g., +1234567890): ").strip()
    await client.send_code_request(phone)
    
    code = input("Enter the code: ").strip()
    
    try:
        await client.sign_in(phone, code)
    except SessionPasswordNeededError:
        password = input("Enter your 2FA password: ").strip()
        await client.sign_in(password=password)
    
    me = await client.get_me()
    print(f"✅ Authenticated as: {me.first_name}")
    print("\n✅ Setup complete! Run: python bot.py")
    
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(setup())
