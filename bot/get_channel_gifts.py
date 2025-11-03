#!/usr/bin/env python3
"""
Get unupgradeable gifts from a Telegram channel
This script fetches all star gifts from a public channel and returns their counts and prices
"""

import asyncio
import json
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from telethon import TelegramClient, types
from telethon.tl.functions.payments import GetSavedStarGiftsRequest

# Configuration
API_ID = 24443096
API_HASH = "0f26b0fb9d39e04b0cd5ec08eb9e7f76"
SESSION_FILE = "/root/01studio/CollectibleKIT/gifts/gifts_session.session"

def load_static_prices():
    """Load static prices from clean_unique_gifts.json"""
    static_file = "/root/01studio/CollectibleKIT/mrktandquantomapi/quant/clean_unique_gifts.json"
    try:
        with open(static_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        prices = {}
        names = {}
        for item in data:
            if 'id' in item:
                # Extract price (can be in 'floor_price', 'price', etc.)
                price = 0
                if 'floor_price' in item and item['floor_price']:
                    try:
                        price = float(item['floor_price'])
                    except:
                        pass
                elif 'price' in item:
                    try:
                        price = float(item['price'])
                    except:
                        pass
                prices[str(item['id'])] = price
                
                # Extract name
                name = item.get('full_name') or item.get('short_name') or item.get('name', f"Gift {item['id']}")
                names[str(item['id'])] = name
        return prices, names
    except Exception as e:
        print(f"Warning: Could not load static prices: {e}", file=sys.stderr)
        return {}, {}

async def get_channel_gifts(channel_username: str):
    """
    Fetch all unupgradeable gifts from a public channel
    
    Args:
        channel_username: The username of the channel (e.g., 'my_channel' or '@my_channel')
    
    Returns:
        Dictionary with gift_id as key and count as value
    """
    # Remove @ if present
    if channel_username.startswith('@'):
        channel_username = channel_username[1:]
    
    # Load static prices and names for unupgradeable gifts
    static_prices, static_names = load_static_prices()
    
    try:
        client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
        await client.start()
        
        # Get channel entity
        try:
            channel = await client.get_entity(channel_username)
        except Exception as e:
            print(json.dumps({
                "success": False,
                "error": f"Channel not found: {channel_username}. Make sure it's a public channel."
            }))
            await client.disconnect()
            return
        
        # Fetch all gifts from the channel using GetSavedStarGiftsRequest
        gift_counts = {}
        
        async def fetch_all_channel_gifts(client, peer):
            """Fetch all star gifts for a channel peer"""
            all_gifts = []
            offset = ''
            while True:
                result = await client(GetSavedStarGiftsRequest(
                    peer=peer,
                    offset=offset,
                    limit=100,
                    exclude_unsaved=False,
                    exclude_saved=False,
                    sort_by_value=False
                ))
                all_gifts.extend(result.gifts)
                offset = result.next_offset
                if not offset or len(all_gifts) >= result.count:
                    break
            return all_gifts
        
        # Fetch gifts
        saved_gifts = await fetch_all_channel_gifts(client, channel)
        
        # Count gifts by ID (only count unupgradeable gifts)
        for sg in saved_gifts:
            gift = sg.gift
            # Check if it's an unupgradeable gift (StarGift, not StarGiftUnique)
            if isinstance(gift, types.StarGift):
                gift_id = gift.id
                gift_counts[gift_id] = gift_counts.get(gift_id, 0) + 1
        
        await client.disconnect()
        
        # Prepare result
        gifts = []
        total_value = 0
        
        for gift_id, count in gift_counts.items():
            price = static_prices.get(str(gift_id), 0)
            gift_name = static_names.get(str(gift_id), f'Gift {gift_id}')
            gift_value = price * count
            
            gifts.append({
                "id": str(gift_id),  # Convert to string to avoid JS precision loss
                "name": gift_name,
                "count": count,
                "price_per_unit": price,
                "total_value": gift_value
            })
            
            total_value += gift_value
        
        # Sort by total_value descending
        gifts.sort(key=lambda x: x['total_value'], reverse=True)
        
        print(json.dumps({
            "success": True,
            "channel_username": channel_username,
            "channel_id": channel.id if hasattr(channel, 'id') else None,
            "total_gifts": sum(gift_counts.values()),
            "unique_gifts": len(gift_counts),
            "gifts": gifts,
            "total_value": total_value
        }, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        if 'client' in locals():
            await client.disconnect()

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: get_channel_gifts.py <channel_username>"
        }))
        sys.exit(1)
    
    channel_username = sys.argv[1]
    
    asyncio.run(get_channel_gifts(channel_username))

if __name__ == "__main__":
    main()

