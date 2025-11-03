#!/usr/bin/env python3
"""
Get all gifts (upgraded and unupgradeable) from a Telegram user account
This script fetches all star gifts from a public user account and returns their counts and prices
"""

import asyncio
import json
import sys
import re
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from telethon import TelegramClient, types
from telethon.tl.functions.payments import GetSavedStarGiftsRequest

# Try to import aportalsmp for Portal Market API
try:
    from aportalsmp import search as search_gifts
    from aportalsmp import update_auth
    APORTALSMP_AVAILABLE = True
except ImportError:
    APORTALSMP_AVAILABLE = False

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

async def get_portal_market_price(slug, backdrop_name=None, model_name=None, symbol_name=None, portal_auth_data=None):
    """Get price from Portal Market API"""
    if not APORTALSMP_AVAILABLE or not portal_auth_data:
        return None
    
    try:
        # Parse slug to get collection name (e.g., "JollyChimp-38859" -> "JollyChimp")
        collection_name = slug.split('-')[0] if '-' in slug else slug
        
        results = await search_gifts(
            sort="price_asc",
            limit=1,
            gift_name=collection_name,
            backdrop=backdrop_name,
            model=model_name,
            authData=portal_auth_data
        )
        
        # If no results with model, fallback to backdrop only
        if not results and backdrop_name:
            results = await search_gifts(
                sort="price_asc",
                limit=1,
                gift_name=collection_name,
                backdrop=backdrop_name,
                authData=portal_auth_data
            )
        
        if results and len(results) > 0:
            # Return the first result's price (lowest)
            price_nano = results[0].get('price')
            if price_nano:
                return price_nano / 1e9  # Convert from nanoTON to TON
        return None
    except Exception as e:
        print(f"Error fetching Portal price for {slug}: {e}", file=sys.stderr)
        return None

async def get_account_gifts(account_username: str):
    """
    Fetch all gifts (upgraded and unupgradeable) from a user account
    
    NOTE: GetSavedStarGiftsRequest only works for:
    - Your own profile (current authenticated user)
    - Channels
    
    For other users, this will return 0 gifts. To track gifts from a secondary account,
    you need to use a different Telegram session file for that account and use get_profile_gifts.py
    
    Args:
        account_username: The username of the account (e.g., 'username' or '@username')
                         NOTE: This only works if account_username is YOUR OWN account
    
    Returns:
        Dictionary with gift counts and prices
    """
    # Remove @ if present
    if account_username.startswith('@'):
        account_username = account_username[1:]
    
    # Load static prices and names for unupgradeable gifts
    static_prices, static_names = load_static_prices()
    
    try:
        client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
        await client.start()
        
        # Get user entity
        try:
            user = await client.get_entity(account_username)
        except Exception as e:
            print(json.dumps({
                "success": False,
                "error": f"Account not found: {account_username}. Make sure it's a public account."
            }))
            await client.disconnect()
            return
        

        # Initialize Portal Market auth for upgraded gifts
        portal_auth_data = None
        if APORTALSMP_AVAILABLE:
            try:
                # Get the gifts directory path (same as get_profile_gifts.py)
                gifts_dir = str(Path(SESSION_FILE).parent)
                portal_auth_data = await update_auth(
                    api_id=API_ID,
                    api_hash=API_HASH,
                    session_name="portals_session",
                    session_path=gifts_dir
                )
            except Exception as e:
                print(f"Warning: Could not initialize Portal auth: {e}", file=sys.stderr)
        
        # Fetch all gifts from the account using GetSavedStarGiftsRequest
        unupgradeable_counts = {}  # {gift_id: count}
        upgraded_gifts = []  # List of upgraded gift objects
        
        async def fetch_all_account_gifts(client, peer):
            """Fetch all star gifts for a user peer"""
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
        saved_gifts = await fetch_all_account_gifts(client, user)
        
        # Process all gifts - separate upgraded and unupgradeable
        for sg in saved_gifts:
            gift = sg.gift
            
            if isinstance(gift, types.StarGift):
                # Unupgradeable gift - count by ID
                gift_id = gift.id
                unupgradeable_counts[gift_id] = unupgradeable_counts.get(gift_id, 0) + 1
            elif isinstance(gift, types.StarGiftUnique):
                # Upgraded gift - store for processing
                upgraded_gifts.append(gift)
        
        await client.disconnect()
        
        # Prepare result
        gifts = []
        total_value = 0
        
        # Process unupgradeable gifts
        for gift_id, count in unupgradeable_counts.items():
            price = static_prices.get(str(gift_id), 0)
            gift_name = static_names.get(str(gift_id), f'Gift {gift_id}')
            gift_value = price * count
            
            gifts.append({
                "id": str(gift_id),  # Convert to string to avoid JS precision loss
                "name": gift_name,
                "count": count,
                "price_per_unit": price,
                "total_value": gift_value,
                "is_upgraded": False
            })
            
            total_value += gift_value
        
        # Process upgraded gifts - group by slug
        upgraded_by_slug = {}
        for gift in upgraded_gifts:
            slug = getattr(gift, 'slug', 'N/A')
            if slug == 'N/A':
                continue
            
            if slug not in upgraded_by_slug:
                upgraded_by_slug[slug] = {
                    'gifts': [],
                    'count': 0
                }
            upgraded_by_slug[slug]['gifts'].append(gift)
            upgraded_by_slug[slug]['count'] += 1
        
        # Fetch prices and calculate totals for upgraded gifts
        for slug, data in upgraded_by_slug.items():
            # Get average price from Portal API
            # Use first gift's attributes as representative
            first_gift = data['gifts'][0]
            attributes = getattr(first_gift, 'attributes', [])
            backdrop_name = None
            model_name = None
            pattern_name = None
            
            for attr in attributes:
                if isinstance(attr, types.StarGiftAttributeBackdrop):
                    backdrop_name = attr.name
                elif isinstance(attr, types.StarGiftAttributeModel):
                    model_name = attr.name
                elif isinstance(attr, types.StarGiftAttributePattern):
                    pattern_name = attr.name
            
            # Try to get price from Portal API
            price = await get_portal_market_price(
                slug,
                backdrop_name=backdrop_name,
                model_name=model_name,
                symbol_name=pattern_name,
                portal_auth_data=portal_auth_data
            )
            
            # If no price from Portal, try to calculate average from all gifts
            if price is None:
                # Fetch prices for all gifts in this slug and average them
                prices = []
                for gift_item in data['gifts']:
                    attrs = getattr(gift_item, 'attributes', [])
                    bd_name = None
                    md_name = None
                    pt_name = None
                    for attr in attrs:
                        if isinstance(attr, types.StarGiftAttributeBackdrop):
                            bd_name = attr.name
                        elif isinstance(attr, types.StarGiftAttributeModel):
                            md_name = attr.name
                        elif isinstance(attr, types.StarGiftAttributePattern):
                            pt_name = attr.name
                    
                    p = await get_portal_market_price(
                        slug,
                        backdrop_name=bd_name,
                        model_name=md_name,
                        symbol_name=pt_name,
                        portal_auth_data=portal_auth_data
                    )
                    if p is not None:
                        prices.append(p)
                
                if prices:
                    price = sum(prices) / len(prices)
                else:
                    price = 0  # No price available
            
            count = data['count']
            gift_value = price * count
            
            # Get image URL for upgraded gift (use first gift's number if available)
            first_gift = data['gifts'][0]
            gift_num = getattr(first_gift, 'num', None)
            image_url = None
            if gift_num:
                slug_lower = re.sub(r'\s+', '', slug.lower())
                image_url = f'https://nft.fragment.com/gift/{slug_lower}-{gift_num}.medium.jpg'
            
            gifts.append({
                "id": slug,  # Use slug as ID for upgraded gifts
                "slug": slug,
                "name": slug,  # Use slug as name
                "count": count,
                "price_per_unit": price,
                "total_value": gift_value,
                "is_upgraded": True,
                "image_url": image_url
            })
            
            total_value += gift_value
        
        # Sort by total_value descending
        gifts.sort(key=lambda x: x['total_value'], reverse=True)
        
        print(json.dumps({
            "success": True,
            "account_username": account_username,
            "account_id": user.id if hasattr(user, 'id') else None,
            "total_gifts": len(saved_gifts),
            "unique_gifts": len(unupgradeable_counts) + len(upgraded_by_slug),
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
            "error": "Usage: get_account_gifts.py <account_username>"
        }))
        sys.exit(1)
    
    account_username = sys.argv[1]
    
    asyncio.run(get_account_gifts(account_username))

if __name__ == "__main__":
    main()
