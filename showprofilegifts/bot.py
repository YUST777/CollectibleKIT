#!/usr/bin/env python3
"""Working bot - proper async/sync separation"""

import asyncio
import requests
import threading
import time
import queue
import logging
from telethon import TelegramClient
from telethon.tl.functions.payments import GetSavedStarGiftsRequest
from config import API_ID, API_HASH, SESSION_NAME

# Enable debug logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(message)s')

TOKEN = "7367269425:AAElkm0afRKClK1TRrm7Z1G7O6-YAbXeado"
API_URL = f"https://api.telegram.org/bot{TOKEN}/"
last_update_id = 0

# Queues for communication
request_queue = queue.Queue()
result_queue = queue.Queue()


def telegram_poll():
    """Telegram Bot API polling"""
    global last_update_id
    
    print("🤖 Bot polling started...")
    
    while True:
        try:
            r = requests.get(f"{API_URL}getUpdates", params={'offset': last_update_id + 1, 'timeout': 5})
            data = r.json()
            
            for update in data.get('result', []):
                last_update_id = update['update_id']
                msg = update.get('message', {})
                
                if not msg:
                    continue
                
                chat_id = msg['chat']['id']
                text = msg.get('text', '').strip()
                
                if text in ['/start', '/help']:
                    requests.post(f"{API_URL}sendMessage", json={
                        'chat_id': chat_id,
                        'text': '🎁 Send username to check ALL Star Gifts!\n\nExample: @kallen5'
                    })
                
                elif text and not text.startswith('/'):
                    # Add to request queue
                    request_queue.put({
                        'chat_id': chat_id,
                        'identifier': text
                    })
                    
                    requests.post(f"{API_URL}sendMessage", json={
                        'chat_id': chat_id,
                        'text': f'⏳ Checking all gifts for {text}...'
                    })
        
        except Exception as e:
            print(f"Poll error: {e}")
        
        # Send any results
        try:
            while True:
                result = result_queue.get_nowait()
                requests.post(f"{API_URL}sendMessage", json={
                    'chat_id': result['chat_id'],
                    'text': result['text'][:4000]
                })
        except queue.Empty:
            pass
        
        time.sleep(1)


async def telethon_worker():
    """Telethon async worker"""
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.connect()
    
    if not await client.is_user_authorized():
        print("❌ Not authenticated! Run: python setup.py")
        return
    
    print("✅ Connected to Telegram")
    
    while True:
        try:
            # Check for requests
            try:
                req = request_queue.get(timeout=0.5)
            except:
                await asyncio.sleep(0.1)
                continue
            
            chat_id = req['chat_id']
            identifier = req['identifier']
            
            try:
                # Get entity
                if identifier.startswith('@'):
                    entity = await client.get_entity(identifier)
                else:
                    entity = await client.get_entity(int(identifier))
                
                name = getattr(entity, 'first_name', 'User') or 'User'
                username = getattr(entity, 'username', f"user{entity.id}")
                
                # Fetch ALL gifts with pagination
                all_gifts = []
                offset = ''
                count = 0
                
                while True:
                    result = await client(GetSavedStarGiftsRequest(
                        peer=entity,
                        offset=offset,
                        limit=100
                    ))
                    
                    # Debug: log first gift structure if available
                    if result.gifts and len(all_gifts) == 0:
                        first_gift = result.gifts[0]
                        logging.debug(f"First gift keys: {dir(first_gift)}")
                        if hasattr(first_gift, 'gift'):
                            logging.debug(f"Gift object keys: {dir(first_gift.gift)}")
                            if hasattr(first_gift.gift, 'unique'):
                                logging.debug(f"Unique object: {first_gift.gift.unique}")
                    
                    all_gifts.extend(result.gifts)
                    count = result.count
                    offset = result.next_offset
                    
                    if not offset or len(all_gifts) >= count:
                        break
                
                if not all_gifts:
                    result_queue.put({
                        'chat_id': chat_id,
                        'text': f"📦 No gifts found for {name} (@{username})"
                    })
                else:
                    # Count pinned vs unpinned and NFTs
                    pinned_count = sum(1 for g in all_gifts if getattr(g, 'pinned_to_top', False))
                    nft_count = sum(1 for g in all_gifts if hasattr(g.gift, 'slug') and hasattr(g.gift, 'num') and g.gift.slug and g.gift.num)
                    
                    output = f"🎁 {name} (@{username}) - ALL Gifts:\n"
                    output += f"Total: {len(all_gifts)} | Pinned: {pinned_count} | Unpinned: {len(all_gifts)-pinned_count} | Upgraded NFTs: {nft_count}\n\n"
                    
                    for i, saved_gift in enumerate(all_gifts, 1):
                        gift = saved_gift.gift if hasattr(saved_gift, 'gift') else saved_gift
                        
                        is_pinned = getattr(saved_gift, 'pinned_to_top', False)
                        pin_status = "✅ PINNED" if is_pinned else "❌ Not pinned"
                        
                        # Check for NFT using num and slug fields directly
                        has_nft = hasattr(gift, 'slug') and hasattr(gift, 'num') and gift.slug and gift.num
                        
                        output += f"{i}. {pin_status}\n"
                        
                        if has_nft:
                            try:
                                slug = gift.slug
                                num = gift.num
                                nft_link = f"https://t.me/nft/{slug}"
                                
                                output += f"   🎨 Collectible #{num}\n"
                                output += f"   🔗 {nft_link}\n"
                                
                                # Show other NFT fields if available
                                if hasattr(gift, 'attributes') and gift.attributes:
                                    output += f"   Trait: {gift.attributes}\n"
                                if hasattr(gift, 'owner_name') and gift.owner_name:
                                    output += f"   Owner: {gift.owner_name}\n"
                            except:
                                output += f"   ⚠️ Error reading NFT data\n"
                        else:
                            output += f"   ⚠️ Not Upgraded (Regular gift)\n"
                        
                        output += f"   Gift ID: {gift.id}\n"
                        if hasattr(gift, 'title'):
                            output += f"   Title: {gift.title}\n"
                        if hasattr(gift, 'stars'):
                            output += f"   Stars: {gift.stars}\n"
                        if hasattr(gift, 'availability_total'):
                            output += f"   Total Supply: {gift.availability_total}\n"
                        output += "\n"
                    
                    result_queue.put({
                        'chat_id': chat_id,
                        'text': output
                    })
                    
            except Exception as e:
                result_queue.put({
                    'chat_id': chat_id,
                    'text': f"❌ Error: {str(e)}"
                })
                
        except Exception as e:
            print(f"Worker error: {e}")
            await asyncio.sleep(1)


def main():
    """Start everything"""
    print("🚀 Starting bot...")
    
    # Start Telegram poller
    threading.Thread(target=telegram_poll, daemon=True).start()
    
    # Start Telethon worker
    threading.Thread(target=lambda: asyncio.run(telethon_worker()), daemon=True).start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopped")


if __name__ == "__main__":
    main()
