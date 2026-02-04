#!/usr/bin/env python3
"""Test the complete bot flow"""
import asyncio
from telethon import TelegramClient, types
from telethon.tl.functions.payments import GetSavedStarGiftsRequest
from aportalsmp import search as search_gifts, update_auth

API_ID = 22307634
API_HASH = '7ab906fc6d065a2047a84411c1697593'

async def test():
    # Start Telethon
    client = TelegramClient('gifts_session', API_ID, API_HASH)
    await client.connect()
    
    # Get entity
    entity = await client.get_entity(800092886)
    
    # Fetch gifts
    result = await client(GetSavedStarGiftsRequest(
        peer=entity,
        offset='',
        limit=100,
        exclude_unsaved=False,
        exclude_saved=False,
        sort_by_value=False
    ))
    
    print(f"Found {len(result.gifts)} gifts")
    
    # Get Portal Market auth
    authData = await update_auth(api_id=API_ID, api_hash=API_HASH, session_name="portals_session", session_path="/home/yousefmsm1/Desktop/gifts")
    
    # Test price lookup for first gift
    for sg in result.gifts[:2]:
        gift = sg.gift
        if isinstance(gift, types.StarGiftUnique):
            slug = gift.slug
            attributes = gift.attributes
            
            backdrop_name = None
            for attr in attributes:
                if isinstance(attr, types.StarGiftAttributeBackdrop):
                    backdrop_name = attr.name
                    break
            
            print(f"\nSlug: {slug}")
            print(f"Backdrop: {backdrop_name}")
            
            collection_name = slug.split('-')[0]
            print(f"Collection: {collection_name}")
            
            # Search
            results = await search_gifts(
                sort="price_asc",
                limit=1,
                gift_name=collection_name,
                backdrop=backdrop_name,
                authData=authData
            )
            
            if results:
                print(f"✅ Price: {results[0].price} TON")
            else:
                print("❌ No price")
    
    await client.disconnect()

asyncio.run(test())
