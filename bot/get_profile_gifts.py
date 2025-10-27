#!/usr/bin/env python3
"""
Fetch saved Star Gifts for a Telegram user
Uses Telethon to get saved gifts via GetSavedStarGiftsRequest
"""
import asyncio
import sys
import json
import os
from telethon import TelegramClient
from telethon.tl.functions.payments import GetSavedStarGiftsRequest
from telethon.errors import SessionPasswordNeededError

# Import config - try bot/config.py first, fallback to showprofilegifts
try:
    from config import API_ID, API_HASH, SESSION_NAME
except ImportError:
    try:
        # Try showprofilegifts config
        import sys
        import os
        showprofile_config = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'showprofilegifts', 'config.py')
        if os.path.exists(showprofile_config):
            import importlib.util
            spec = importlib.util.spec_from_file_location("config", showprofile_config)
            config_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(config_module)
            API_ID = config_module.API_ID
            API_HASH = config_module.API_HASH
            SESSION_NAME = 'gifts_session'  # Use the session from showprofilegifts
        else:
            print("Error: No config.py found")
            sys.exit(1)
    except Exception as e:
        print(f"Error loading config: {e}")
        sys.exit(1)

async def get_profile_gifts(user_id=None):
    """Fetch saved gifts for a Telegram user (defaults to session owner if no user_id provided)"""
    # Use the session from showprofilegifts directory
    session_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'showprofilegifts', f'{SESSION_NAME}.session')
    client = TelegramClient(session_path, API_ID, API_HASH)
    
    try:
        await client.connect()
        
        if not await client.is_user_authorized():
            print(json.dumps({
                "success": False,
                "error": "Not authenticated. Please run: python -m telethon -s"
            }))
            sys.exit(1)
        
        # If user_id is provided, get that user's gifts, otherwise use current user
        if user_id is not None:
            try:
                entity = await client.get_entity(int(user_id))
                target_user = entity
                print(f"✅ Fetching gifts for user: {getattr(entity, 'first_name', 'User')} (@{getattr(entity, 'username', 'unknown')})", file=sys.stderr)
            except Exception as e:
                print(json.dumps({
                    "success": False,
                    "error": f"Could not find user with ID {user_id}: {str(e)}"
                }))
                sys.exit(1)
        else:
            # Get the current user (session owner)
            target_user = await client.get_me()
            print(f"✅ Connected as: {target_user.first_name} (@{target_user.username})", file=sys.stderr)
        
        # Fetch ALL saved gifts with pagination
        all_gifts = []
        offset = ''
        
        while True:
            result = await client(GetSavedStarGiftsRequest(
                peer=target_user,
                offset=offset,
                limit=100
            ))
            
            all_gifts.extend(result.gifts)
            offset = result.next_offset
            
            # Break if no more results
            if not offset or len(all_gifts) >= result.count:
                break
        
        print(f"📦 Found {len(all_gifts)} saved gifts", file=sys.stderr)
        
        # Process gifts and extract NFT info
        processed_gifts = []
        for saved_gift in all_gifts:
            gift = saved_gift.gift if hasattr(saved_gift, 'gift') else saved_gift
            
            # Check if this gift is an NFT (has slug and num)
            has_nft = hasattr(gift, 'slug') and hasattr(gift, 'num') and gift.slug and gift.num
            
            if has_nft:
                try:
                    slug = gift.slug
                    num = gift.num
                    
                    # Clean slug (remove the number suffix if present, e.g., "IceCream-15452" -> "IceCream")
                    clean_slug = slug.split('-')[0] if '-' in slug and slug.split('-')[1].isdigit() else slug
                    
                    processed_gifts.append({
                        "slug": clean_slug,
                        "num": num,
                        "title": getattr(gift, 'title', ''),
                        "pinned": getattr(saved_gift, 'pinned_to_top', False),
                        "fragment_url": f"https://nft.fragment.com/gift/{clean_slug}-{num}.medium.jpg"
                    })
                except Exception as e:
                    print(f"⚠️ Error processing gift: {e}", file=sys.stderr)
                    continue
        
        # Return as JSON
        output = {
            "success": True,
            "gifts": processed_gifts,
            "total": len(all_gifts),
            "nft_count": len(processed_gifts)
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
        try:
            user_id = int(sys.argv[1])
        except ValueError:
            print(json.dumps({
                "success": False,
                "error": f"Invalid user_id: {sys.argv[1]}. Must be an integer."
            }))
            sys.exit(1)
    
    asyncio.run(get_profile_gifts(user_id))

