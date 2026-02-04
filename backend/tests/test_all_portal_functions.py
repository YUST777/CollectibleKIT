#!/usr/bin/env python3
"""
Test all Portal Market functions on a user profile
Compares performance and results of different methods
"""
import asyncio
import sys
import json
import os
import time
from telethon import TelegramClient, types
from telethon.tl.functions.payments import GetSavedStarGiftsRequest
from telethon.errors import UsernameNotOccupiedError, PeerIdInvalidError, UsernameInvalidError

# CRITICAL: Patch timeout BEFORE importing aportalsmp functions
# This increases timeout from 15s to 60s
try:
    import aportalsmp.handlers as handlers
    _original_fetch = handlers.fetch
    async def patched_fetch(method="GET", url="", headers=None, json=None, timeout=60, impersonate="chrome110"):
        return await _original_fetch(method, url, headers, json, timeout, impersonate)
    handlers.fetch = patched_fetch
except:
    pass  # If patching fails, continue anyway

# Import aportalsmp functions
try:
    from aportalsmp import search as search_gifts
    from aportalsmp import topOffer
    from aportalsmp.gifts import giftsFloors, filterFloors
    from aportalsmp import update_auth
    APORTALSMP_AVAILABLE = True
except ImportError as e:
    print(f"❌ aportalsmp not available: {e}")
    sys.exit(1)

# Config
API_ID = 22307634
API_HASH = '7ab906fc6d065a2047a84411c1697593'
SESSION_NAME = 'gifts_session'

async def fetch_all_gifts(client, peer):
    """Fetch all Star Gifts for a peer"""
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

async def get_portal_auth():
    """Get Portal Market auth data"""
    gifts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gifts')
    try:
        authData = await update_auth(
            api_id=API_ID,
            api_hash=API_HASH,
            session_name="portals_session",
            session_path=gifts_dir
        )
        return authData
    except Exception as e:
        print(f"⚠️ Auth failed: {e}", file=sys.stderr)
        return None

async def test_giftsFloors(authData):
    """Test giftsFloors() - get all floor prices"""
    print("\n" + "="*60)
    print("📊 Testing giftsFloors() - Get ALL floor prices")
    print("="*60)
    start_time = time.time()
    try:
        floors = await giftsFloors(authData=authData)
        elapsed = time.time() - start_time
        print(f"✅ Success! Time: {elapsed:.2f} seconds")
        print(f"   Total collections: {len(floors) if hasattr(floors, '__len__') else 'N/A'}")
        return floors, elapsed, True
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ Failed! Time: {elapsed:.2f} seconds")
        print(f"   Error: {e}")
        return None, elapsed, False

async def test_topOffer(authData, gift_name):
    """Test topOffer() - get top offer for a gift"""
    print(f"\n📊 Testing topOffer() - Get top offer for '{gift_name}'")
    start_time = time.time()
    
    # Try different name formats
    name_variants = [
        gift_name,  # Original
        gift_name.replace(' ', ''),  # No spaces
        gift_name.lower().replace(' ', ''),  # Lowercase, no spaces
    ]
    
    # Try toShortName if available
    try:
        from aportalsmp.gifts import toShortName
        short_name = toShortName(gift_name)
        if short_name and short_name != gift_name:
            name_variants.insert(0, short_name)  # Try short name first
            print(f"   Trying short name: {short_name}")
    except:
        pass
    
    for name_variant in name_variants:
        try:
            print(f"   Trying name format: '{name_variant}'")
            offer = await topOffer(gift_name=name_variant, authData=authData)
            elapsed = time.time() - start_time
            if offer:
                print(f"✅ Success! Time: {elapsed:.2f} seconds")
                print(f"   Price: {offer.price} TON")
                print(f"   Working format: '{name_variant}'")
                return offer.price, elapsed, True
        except Exception as e:
            if "invalid" not in str(e).lower():
                # If it's not an invalid name error, it might be a timeout
                elapsed = time.time() - start_time
                if elapsed > 10:
                    print(f"❌ Timeout! Time: {elapsed:.2f} seconds")
                    print(f"   Error: {e}")
                    return None, elapsed, False
                continue
    
    elapsed = time.time() - start_time
    print(f"❌ Failed with all name formats. Time: {elapsed:.2f} seconds")
    return None, elapsed, False

async def test_filterFloors(authData, gift_name):
    """Test filterFloors() - get attribute floors"""
    print(f"\n📊 Testing filterFloors() - Get attribute floors for '{gift_name}'")
    start_time = time.time()
    try:
        filters = await filterFloors(gift_name=gift_name, authData=authData)
        elapsed = time.time() - start_time
        print(f"✅ Success! Time: {elapsed:.2f} seconds")
        if hasattr(filters, 'models'):
            model_count = len(filters.models) if filters.models else 0
            backdrop_count = len(filters.backdrops) if filters.backdrops else 0
            symbol_count = len(filters.symbols) if filters.symbols else 0
            print(f"   Models: {model_count}, Backdrops: {backdrop_count}, Symbols: {symbol_count}")
        return filters, elapsed, True
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ Failed! Time: {elapsed:.2f} seconds")
        print(f"   Error: {e}")
        return None, elapsed, False

async def test_search(authData, gift_name, backdrop=None, model=None):
    """Test search() - current method"""
    print(f"\n📊 Testing search() - Search for '{gift_name}'")
    if backdrop:
        print(f"   With backdrop: {backdrop}")
    if model:
        print(f"   With model: {model}")
    start_time = time.time()
    try:
        results = await search_gifts(
            sort="price_asc",
            limit=1,
            gift_name=gift_name,
            backdrop=backdrop,
            model=model,
            authData=authData
        )
        elapsed = time.time() - start_time
        if results and len(results) > 0:
            print(f"✅ Success! Time: {elapsed:.2f} seconds")
            print(f"   Price: {results[0].price} TON")
            return results[0].price, elapsed, True
        else:
            print(f"⚠️ No results. Time: {elapsed:.2f} seconds")
            return None, elapsed, False
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ Failed! Time: {elapsed:.2f} seconds")
        print(f"   Error: {e}")
        return None, elapsed, False

async def main():
    """Test all functions on user profile"""
    user_id = "@yousefmsm1"
    
    print("="*60)
    print("🧪 Testing All Portal Market Functions")
    print("="*60)
    print(f"User: {user_id}")
    
    # Get Portal Market auth
    print("\n🔑 Getting Portal Market authentication...")
    authData = await get_portal_auth()
    if not authData:
        print("❌ Failed to get Portal Market auth")
        sys.exit(1)
    print("✅ Portal Market auth obtained")
    
    # Connect to Telegram
    gifts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gifts')
    session_path = os.path.join(gifts_dir, f'{SESSION_NAME}.session')
    client = TelegramClient(session_path, API_ID, API_HASH)
    
    try:
        await client.connect()
        if not await client.is_user_authorized():
            print("❌ Not authenticated")
            sys.exit(1)
        
        # Get user entity
        try:
            entity = await client.get_entity(user_id)
            target_user = entity
            print(f"✅ Found user: {target_user.first_name} (@{target_user.username})")
        except Exception as e:
            print(f"❌ Could not find user: {e}")
            sys.exit(1)
        
        # Fetch user's gifts
        print("\n📦 Fetching user's gifts...")
        all_gifts, total_count = await fetch_all_gifts(client, target_user)
        print(f"✅ Found {total_count} total gifts, {len(all_gifts)} fetched")
        
        # Filter upgraded gifts only
        upgraded_gifts = []
        for sg in all_gifts:
            gift = sg.gift
            if isinstance(gift, types.StarGiftUnique):
                slug = getattr(gift, 'slug', 'N/A')
                if slug != 'N/A':
                    # Extract collection name
                    collection_name = slug.split('-')[0] if '-' in slug else slug
                    # Extract attributes
                    attributes = getattr(gift, 'attributes', [])
                    model_name = None
                    backdrop_name = None
                    for attr in attributes:
                        if isinstance(attr, types.StarGiftAttributeModel):
                            model_name = attr.name
                        elif isinstance(attr, types.StarGiftAttributeBackdrop):
                            backdrop_name = attr.name
                    
                    upgraded_gifts.append({
                        'slug': slug,
                        'title': gift.title,
                        'collection_name': collection_name,
                        'model_name': model_name,
                        'backdrop_name': backdrop_name
                    })
        
        print(f"✅ Found {len(upgraded_gifts)} upgraded gifts")
        
        if len(upgraded_gifts) == 0:
            print("⚠️ No upgraded gifts to test")
            sys.exit(0)
        
        # Show gifts
        print("\n" + "="*60)
        print("📋 User's Upgraded Gifts:")
        print("="*60)
        for i, gift in enumerate(upgraded_gifts[:10], 1):  # Show first 10
            print(f"{i}. {gift['title']} ({gift['collection_name']})")
            if gift['model_name']:
                print(f"   Model: {gift['model_name']}")
            if gift['backdrop_name']:
                print(f"   Backdrop: {gift['backdrop_name']}")
        
        if len(upgraded_gifts) > 10:
            print(f"   ... and {len(upgraded_gifts) - 10} more")
        
        # Test 1: giftsFloors() - Get all floors
        floors_result, floors_time, floors_success = await test_giftsFloors(authData)
        
        # Test 2: topOffer() on first gift
        if upgraded_gifts:
            first_gift = upgraded_gifts[0]
            topOffer_result, topOffer_time, topOffer_success = await test_topOffer(
                authData, first_gift['collection_name']
            )
        
        # Test 3: filterFloors() on first gift
        if upgraded_gifts:
            first_gift = upgraded_gifts[0]
            filterFloors_result, filterFloors_time, filterFloors_success = await test_filterFloors(
                authData, first_gift['collection_name']
            )
        
        # Test 4: search() on first gift (with attributes)
        if upgraded_gifts:
            first_gift = upgraded_gifts[0]
            search_result, search_time, search_success = await test_search(
                authData,
                first_gift['collection_name'],
                backdrop=first_gift['backdrop_name'],
                model=first_gift['model_name']
            )
        
        # Test 5: search() on first gift (base only)
        if upgraded_gifts:
            first_gift = upgraded_gifts[0]
            search_base_result, search_base_time, search_base_success = await test_search(
                authData,
                first_gift['collection_name']
            )
        
        # Compare prices for first gift
        if upgraded_gifts:
            first_gift = upgraded_gifts[0]
            print("\n" + "="*60)
            print(f"💰 Price Comparison for '{first_gift['title']}' ({first_gift['collection_name']})")
            print("="*60)
            
            prices = {}
            
            # From giftsFloors
            if floors_success and floors_result:
                try:
                    floor_price = floors_result.get(first_gift['collection_name'])
                    if floor_price:
                        prices['giftsFloors'] = float(floor_price)
                        print(f"giftsFloors(): {prices['giftsFloors']} TON")
                except:
                    pass
            
            # From topOffer
            if topOffer_success and topOffer_result:
                prices['topOffer'] = float(topOffer_result)
                print(f"topOffer(): {prices['topOffer']} TON")
            
            # From filterFloors
            if filterFloors_success and filterFloors_result:
                try:
                    if hasattr(filterFloors_result, 'models') and first_gift['model_name']:
                        model_price = filterFloors_result.models.get(first_gift['model_name'])
                        if model_price:
                            prices['filterFloors (model)'] = float(model_price)
                            print(f"filterFloors (model): {prices['filterFloors (model)']} TON")
                    if hasattr(filterFloors_result, 'backdrops') and first_gift['backdrop_name']:
                        backdrop_price = filterFloors_result.backdrops.get(first_gift['backdrop_name'])
                        if backdrop_price:
                            prices['filterFloors (backdrop)'] = float(backdrop_price)
                            print(f"filterFloors (backdrop): {prices['filterFloors (backdrop)']} TON")
                except:
                    pass
            
            # From search (with attributes)
            if search_success and search_result:
                prices['search (with attributes)'] = float(search_result)
                print(f"search (with attributes): {prices['search (with attributes)']} TON")
            
            # From search (base)
            if search_base_success and search_base_result:
                prices['search (base)'] = float(search_base_result)
                print(f"search (base): {prices['search (base)']} TON")
            
            if not prices:
                print("⚠️ No prices obtained from any method")
        
        # Performance summary
        print("\n" + "="*60)
        print("⏱️  Performance Summary")
        print("="*60)
        print(f"giftsFloors(): {floors_time:.2f}s ({'✅' if floors_success else '❌'})")
        if upgraded_gifts:
            print(f"topOffer(): {topOffer_time:.2f}s ({'✅' if topOffer_success else '❌'})")
            print(f"filterFloors(): {filterFloors_time:.2f}s ({'✅' if filterFloors_success else '❌'})")
            print(f"search (with attributes): {search_time:.2f}s ({'✅' if search_success else '❌'})")
            print(f"search (base): {search_base_time:.2f}s ({'✅' if search_base_success else '❌'})")
        
        # Recommendation
        print("\n" + "="*60)
        print("💡 Recommendation")
        print("="*60)
        if floors_success:
            print("✅ Use giftsFloors() - Fastest for portfolios (gets all prices in one call)")
        elif topOffer_success:
            print("✅ Use topOffer() - Fast for individual gifts")
        elif filterFloors_success:
            print("✅ Use filterFloors() - Good for attribute-specific prices")
        else:
            print("⚠️ All methods failed - Portal Market may be down")
        
    finally:
        await client.disconnect()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️ Test cancelled by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()

