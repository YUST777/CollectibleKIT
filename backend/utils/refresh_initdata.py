#!/usr/bin/env python3
"""
Auto-refresh initData from stickerdom webapp
This is a temporary solution until we get automatic refresh working.
"""
import asyncio
import os
from telethon import TelegramClient, functions

# Config
API_ID = 22307634
API_HASH = '7ab906fc6d065a2047a84411c1697593'
SESSION_NAME = ' sticker0.2/gifts_session'
BOT_USERNAME = 'StickerDomStoreBot'
API_BASE = 'https://api.stickerdom.store'

async def main():
    """Get fresh initData via webview request"""
    client = None
    try:
        client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        await client.connect()
        
        if not await client.is_user_authorized():
            print("ERROR: Not authorized")
            return
        
        # Request webview
        bot = await client.get_entity(BOT_USERNAME)
        result = await client(functions.messages.RequestWebViewRequest(
            peer=bot,
            bot=bot,
            platform="ios",
            url=f"{API_BASE}/api/v1/auth",
        ))
        
        # Extract initData
        import urllib.parse
        webview_url = result.url if hasattr(result, 'url') else str(result)
        parsed = urllib.parse.urlparse(webview_url)
        
        # Check fragment
        fragment = parsed.fragment
        if fragment and 'tgWebAppData=' in fragment:
            init_data_encoded = fragment.split('tgWebAppData=')[1]
            if '&' in init_data_encoded:
                init_data_encoded = init_data_encoded.split('&')[0]
            init_data = urllib.parse.unquote(init_data_encoded)
            
            # Check if we got the right format
            print("⚠️ Generated initData format:")
            print(f"  starts with user=: {init_data.startswith('user=')}")
            print(f"  starts with query_id=: {init_data.startswith('query_id=')}")
            print(f"\n⚠️ This format will be rejected by stickerdom API")
            print("\n💡 You need to get fresh initData from browser DevTools instead")
        
        await client.disconnect()
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == '__main__':
    asyncio.run(main())
