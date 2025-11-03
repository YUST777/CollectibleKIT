#!/usr/bin/env python3
"""
Fetch saved Star Gifts for a Telegram user with Portal Market prices
Uses Telethon to get saved gifts via GetSavedStarGiftsRequest
Based on the working code from /gifts/bot.py
"""
import asyncio
import sys
import json
import os
import re
from telethon import TelegramClient, types
from telethon.tl.functions.payments import GetSavedStarGiftsRequest
from telethon.errors import SessionPasswordNeededError, UsernameNotOccupiedError, PeerIdInvalidError, UsernameInvalidError

# Import aportalsmp for Portal Market API
try:
    from aportalsmp import search as search_gifts
    from aportalsmp import update_auth
    APORTALSMP_AVAILABLE = True
except ImportError:
    APORTALSMP_AVAILABLE = False
    # Silent - library not available is not an error for user

# Import unupgradeable prices function
try:
    import sys
    import os
    bot_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, bot_dir)
    from get_unupgradeable_prices import fetch_unupgradeable_prices
    UNUPGRADEABLE_PRICES_AVAILABLE = True
except ImportError as e:
    print(f"DEBUG: Import failed: {e}", file=sys.stderr)
    UNUPGRADEABLE_PRICES_AVAILABLE = False

# Import config from gifts directory
try:
    # Use hardcoded values from gifts/bot.py (same as working code)
    API_ID = 22307634
    API_HASH = '7ab906fc6d065a2047a84411c1697593'
    SESSION_NAME = 'gifts_session'
except ImportError:
    # Fallback
    API_ID = 22307634
    API_HASH = '7ab906fc6d065a2047a84411c1697593'
    SESSION_NAME = 'gifts_session'

async def fetch_all_gifts(client, peer):
    """Fetch all Star Gifts for a peer (pinned and unpinned) - from gifts/bot.py"""
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
    return all_gifts, result.count

async def get_portal_market_price(slug, backdrop_name=None, model_name=None, symbol_name=None, portal_auth_data=None):
    """Fetch portal market floor price for a gift slug with optional attribute filters - from gifts/bot.py"""
    if not APORTALSMP_AVAILABLE or not portal_auth_data:
        return None
    
    try:
        # Parse slug to get collection name (e.g., "IceCream-15452" -> "IceCream")
        collection_name = slug.split('-')[0] if '-' in slug else slug
        
        # Try with collection + backdrop + model first for most accurate pricing
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
            price = float(results[0].price)
            return price
    except Exception as e:
        print(f"⚠️ Error fetching portal market price for {slug}: {e}", file=sys.stderr)
    return None

async def get_profile_gifts(user_id=None):
    """Fetch saved gifts for a Telegram user with Portal Market prices"""
    # Use the session from gifts directory (where it actually works)
    gifts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gifts')
    session_path = os.path.join(gifts_dir, f'{SESSION_NAME}.session')
    
    client = TelegramClient(session_path, API_ID, API_HASH)
    portal_auth_data = None
    
    try:
        await client.connect()
        
        if not await client.is_user_authorized():
            print(json.dumps({
                "success": False,
                "error": "Not authenticated. Please configure Telethon session in gifts directory."
            }))
            sys.exit(1)
        
        # Initialize Portal Market auth (same as gifts/bot.py)
        if APORTALSMP_AVAILABLE:
            try:
                portal_auth_data = await update_auth(
                    api_id=API_ID,
                    api_hash=API_HASH,
                    session_name="portals_session",
                    session_path=gifts_dir
                )
                # Silent success - no need to print to stderr
            except Exception as e:
                # Only log errors, not success messages
                print(f"⚠️ Portal Market not available: {e}", file=sys.stderr)
                portal_auth_data = None
        
        # Get target user entity
        if user_id is not None:
            try:
                # Try to get entity - handle both numeric IDs and usernames
                if isinstance(user_id, str) and not user_id.isdigit():
                    # Username
                    entity = await client.get_entity(user_id)
                else:
                    # Numeric ID
                    entity = await client.get_entity(int(user_id))
                target_user = entity
                # Silent - no need to print user info to stderr
            except (UsernameNotOccupiedError, UsernameInvalidError):
                print(json.dumps({
                    "success": False,
                    "error": f"Username not found or invalid: {user_id}"
                }))
                sys.exit(1)
            except PeerIdInvalidError:
                print(json.dumps({
                    "success": False,
                    "error": f"User ID invalid, private, or blocked: {user_id}"
                }))
                sys.exit(1)
            except Exception as e:
                print(json.dumps({
                    "success": False,
                    "error": f"Could not find user {user_id}: {str(e)}"
                }))
                sys.exit(1)
        else:
            # Get the current user (session owner)
            target_user = await client.get_me()
            # Silent - no need to print connection info to stderr
        
        # Fetch ALL saved gifts with pagination using the working method
        all_gifts, total_count = await fetch_all_gifts(client, target_user)
        
        # Fetch unupgradeable gift prices once at the start
        unupgradeable_prices = {}
        unupgradeable_names = {}
        try:
            # Load Quant static data for names and supplies
            quant_file = '/root/01studio/CollectibleKIT/mrktandquantomapi/quant/clean_unique_gifts.json'
            with open(quant_file, 'r') as f:
                quant_data = json.load(f)
                for item in quant_data:
                    gift_id = item.get('id')
                    unupgradeable_names[gift_id] = {
                        'name': item.get('full_name', item.get('short_name', 'Unknown')),
                        'supply': item.get('supply', None)
                    }
        except Exception as e:
            # Silently fail
            pass
        
        # Fetch unupgradeable prices using imported function with shared client
        if UNUPGRADEABLE_PRICES_AVAILABLE:
            try:
                unupgradeable_prices = await fetch_unupgradeable_prices(client)
            except Exception as e:
                # Fallback to static file
                try:
                    quant_file = '/root/01studio/CollectibleKIT/mrktandquantomapi/quant/clean_unique_gifts.json'
                    with open(quant_file, 'r') as f:
                        quant_data = json.load(f)
                        for item in quant_data:
                            gift_id = item.get('id')
                            floor_price = item.get('floor_price', '0')
                            try:
                                price = float(floor_price)
                                if price > 0:
                                    unupgradeable_prices[str(gift_id)] = price
                            except:
                                pass
                except:
                    pass
        
        # Also load static prices to supplement live API data
        try:
            quant_file = '/root/01studio/CollectibleKIT/mrktandquantomapi/quant/clean_unique_gifts.json'
            with open(quant_file, 'r') as f:
                quant_data = json.load(f)
                for item in quant_data:
                    gift_id = item.get('id')
                    floor_price = item.get('floor_price', '0')
                    gift_id_str = str(gift_id)
                    # Only add if not already present in live prices
                    if gift_id_str not in unupgradeable_prices:
                        try:
                            price = float(floor_price)
                            if price > 0:
                                unupgradeable_prices[gift_id_str] = price
                        except:
                            pass
        except:
            pass
        
        # Process gifts (same as gifts/bot.py)
        processed_gifts = []
        for sg in all_gifts:
            try:
                gift = sg.gift
                pinned = getattr(sg, 'pinned_to_top', False)
                is_upgraded = isinstance(gift, types.StarGiftUnique)
                
                gift_data = {
                    'pinned': pinned,
                    'is_upgraded': is_upgraded
                }
                
                if is_upgraded:
                    slug = getattr(gift, 'slug', 'N/A')
                    gift_num = getattr(gift, 'num', None)
                    # Convert slug to lowercase and remove spaces (Python way)
                    slug_lower = re.sub(r'\s+', '', slug.lower()) if slug != 'N/A' else ''
                    
                    # Generate fragment.com image URL - format: https://nft.fragment.com/gift/{collection}-{number}.medium.jpg
                    # The slug might be "Collection-Number" or just "Collection", and num is the number
                    fragment_image_url = None
                    if slug != 'N/A':
                        if gift_num:
                            # If we have both slug and num, combine them (slug might already have number, but use num if available)
                            # Format: collection-number.medium.jpg (e.g., tamagadget-65287.medium.jpg)
                            fragment_image_url = f'https://nft.fragment.com/gift/{slug_lower}-{gift_num}.medium.jpg'
                        else:
                            # If slug already contains the number (e.g., "TamaGadget-65287"), use it directly
                            fragment_image_url = f'https://nft.fragment.com/gift/{slug_lower}.medium.jpg'
                    
                    # Extract attributes (model, backdrop, pattern) - same as gifts/bot.py
                    attributes = getattr(gift, 'attributes', [])
                    model_name = None
                    backdrop_name = None
                    pattern_name = None
                    model_display = 'N/A'
                    backdrop_display = 'N/A'
                    pattern_display = 'N/A'
                    model_rarity = None
                    backdrop_rarity = None
                    pattern_rarity = None
                    
                    for attr in attributes:
                        if isinstance(attr, types.StarGiftAttributeModel):
                            model_name = attr.name
                            model_rarity = attr.rarity_permille / 10
                            model_display = f"{attr.name} {model_rarity}%"
                        elif isinstance(attr, types.StarGiftAttributeBackdrop):
                            backdrop_name = attr.name
                            backdrop_rarity = attr.rarity_permille / 10
                            backdrop_display = f"{attr.name} {backdrop_rarity}%"
                        elif isinstance(attr, types.StarGiftAttributePattern):
                            pattern_name = attr.name
                            pattern_rarity = attr.rarity_permille / 10
                            pattern_display = f"{attr.name} {pattern_rarity}%"
                    
                    # Fetch Portal Market price with attributes (same as gifts/bot.py)
                    price = None
                    if portal_auth_data and slug != 'N/A':
                        price = await get_portal_market_price(
                            slug,
                            backdrop_name=backdrop_name,
                            model_name=model_name,
                            symbol_name=pattern_name,
                            portal_auth_data=portal_auth_data
                        )
                    
                    # Get availability info
                    availability_issued = getattr(gift, 'availability_issued', None)
                    availability_total = getattr(gift, 'availability_total', None)
                    
                    gift_data.update({
                        'slug': slug,
                        'title': gift.title,
                        'gift_id': gift.gift_id,
                        'num': gift_num,
                        'fragment_url': fragment_image_url,  # Image URL for display (fragment.com)
                        'fragment_link': f'https://t.me/nft/{slug}' if slug != 'N/A' else None,  # Telegram link
                        'total_supply': f"{availability_issued}/{availability_total}" if availability_issued is not None else 'N/A',
                        'availability_issued': availability_issued,
                        'availability_total': availability_total,
                        # Attributes
                        'model_name': model_name,
                        'backdrop_name': backdrop_name,
                        'pattern_name': pattern_name,
                        'model_display': model_display,
                        'backdrop_display': backdrop_display,
                        'pattern_display': pattern_display,
                        'model_rarity': model_rarity,
                        'backdrop_rarity': backdrop_rarity,
                        'pattern_rarity': pattern_rarity,
                        # Portal Market price
                        'price': price
                    })
                else:
                    # Not upgraded gift - need to check if it's upgradeable
                    gift_id = gift.id
                    upgrade_stars = getattr(gift, 'upgrade_stars', None)
                    availability_remains = getattr(gift, 'availability_remains', None)
                    
                    # Determine upgrade status
                    is_unupgradeable = upgrade_stars is None  # Can't be upgraded (no mint available)
                    is_unupgraded = upgrade_stars is not None  # Can be upgraded but user hasn't
                    
                    # For unupgradeable gifts, use original.png URL
                    original_image_url = None
                    price = None
                    title = 'N/A'
                    total_supply_value = None
                    if gift_id and is_unupgradeable:
                        original_image_url = f'https://cdn.changes.tg/gifts/originals/{gift_id}/Original.png'
                        # Get price and metadata from unupgradeable dicts
                        gift_id_str = str(gift_id)
                        if gift_id_str in unupgradeable_prices:
                            price = unupgradeable_prices[gift_id_str]
                        if gift_id_str in unupgradeable_names:
                            gift_info = unupgradeable_names[gift_id_str]
                            title = gift_info.get('name', 'N/A')
                            total_supply_value = gift_info.get('supply')
                    
                    # For unupgraded gifts, try to get base floor price (no attributes)
                    if is_unupgraded and portal_auth_data:
                        # Try to get floor price for this gift type (no specific attributes)
                        # We need the title/slug to search for it
                        try:
                            # Use the title to find the gift
                            title_for_search = gift.title or 'N/A'
                            if title_for_search != 'N/A':
                                results = await search_gifts(
                                    sort="price_asc",
                                    limit=1,
                                    gift_name=title_for_search,
                                    authData=portal_auth_data
                                )
                                if results and len(results) > 0:
                                    price = float(results[0].price)
                        except Exception as e:
                            print(f"⚠️ Error fetching floor price for unupgraded {title_for_search}: {e}", file=sys.stderr)
                    
                    # Use metadata from unupgradeable lookup if available
                    final_title = title if title != 'N/A' else (gift.title or 'N/A')
                    final_supply = f"{availability_remains or 'N/A'}/{total_supply_value or getattr(gift, 'availability_total', 'N/A')}"
                    
                    gift_data.update({
                        'slug': None,
                        'title': final_title,
                        'gift_id': gift_id,
                        'num': None,
                        'fragment_url': original_image_url,  # Use Original.png for unupgradeable
                        'fragment_link': None,
                        'total_supply': final_supply,
                        'model_name': None,
                        'backdrop_name': None,
                        'pattern_name': None,
                        'model_display': 'N/A',
                        'backdrop_display': 'N/A',
                        'pattern_display': 'N/A',
                        'price': price,
                        'is_unupgradeable': is_unupgradeable,  # Can't be upgraded
                        'is_unupgraded': is_unupgraded  # Can be upgraded but not yet
                    })
                
                processed_gifts.append(gift_data)
                
            except Exception as e:
                print(f"⚠️ Error processing gift: {e}", file=sys.stderr)
                continue
        
        # Calculate total value
        total_value = sum(gift.get('price', 0) or 0 for gift in processed_gifts)
        
        # Return as JSON
        output = {
            "success": True,
            "gifts": processed_gifts,
            "total": total_count,
            "nft_count": len([g for g in processed_gifts if g.get('is_upgraded')]),
            "total_value": total_value
        }
        
        print(json.dumps(output))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)
    finally:
        await client.disconnect()

if __name__ == "__main__":
    # Get user_id from command line if provided
    user_id = None
    if len(sys.argv) > 1:
        user_input = sys.argv[1]
        try:
            # Try to parse as integer ID
            user_id = int(user_input)
        except ValueError:
            # If not an integer, treat as username
            user_id = user_input
    
    asyncio.run(get_profile_gifts(user_id))
