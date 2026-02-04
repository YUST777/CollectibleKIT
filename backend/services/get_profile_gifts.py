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
import time
from telethon import TelegramClient, types
from telethon.tl.functions.payments import GetSavedStarGiftsRequest
from telethon.errors import SessionPasswordNeededError, UsernameNotOccupiedError, PeerIdInvalidError, UsernameInvalidError

# Import cache helpers
import sys
import os
bot_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, bot_root)

try:
    from utils.get_portfolio_cache import get_cached_portfolio, set_cached_portfolio, set_fetching_status, is_fetching
    CACHE_AVAILABLE = True
except ImportError:
    CACHE_AVAILABLE = False

# Use our working Portal Market API wrapper
# This fixes all issues: correct domain, timeout, rate limiting
try:
    from services.portal_market_api import PortalMarketAPI, get_portal_market_price
    PORTAL_MARKET_API_AVAILABLE = True
    APORTALSMP_AVAILABLE = True  # For backward compatibility
except ImportError:
    # Fallback to old method if wrapper not available
    PORTAL_MARKET_API_AVAILABLE = False
try:
    from aportalsmp import search as search_gifts
    from aportalsmp import update_auth
    APORTALSMP_AVAILABLE = True
except ImportError:
    APORTALSMP_AVAILABLE = False

# Import unupgradeable prices function
try:
    from services.get_unupgradeable_prices import fetch_unupgradeable_prices
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

# Import multi-account configuration
try:
    from portal_accounts_config import PORTAL_ACCOUNTS, AUTH_CACHE_TTL  # Still in bot/ root
    MULTI_ACCOUNT_AVAILABLE = True
except ImportError:
    MULTI_ACCOUNT_AVAILABLE = False
    PORTAL_ACCOUNTS = []
    MULTI_ACCOUNT_AVAILABLE = False
    PORTAL_ACCOUNTS = []

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
    """Fetch portal market floor price for a gift slug with optional attribute filters
    Uses multi-account API for better performance and reliability"""
    if not PORTAL_MARKET_API_AVAILABLE:
        return None
    
    # Use multi-account API wrapper (round-robin across 3 accounts)
    try:
        # Import from same directory
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "portal_market_multi_account",
            os.path.join(os.path.dirname(__file__), "portal_market_multi_account.py")
        )
        multi_account_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(multi_account_module)
        get_portal_market_price_multi = multi_account_module.get_portal_market_price_multi
        
        gifts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gifts')
        price = await get_portal_market_price_multi(
            slug=slug,
            backdrop_name=backdrop_name,
            model_name=model_name,
            symbol_name=symbol_name,
            session_path=gifts_dir
        )
        return price
    except (ImportError, Exception) as e:
        # Fallback to single-account if multi-account not available
        try:
            from services.portal_market_api import get_portal_market_price as get_price_wrapper
            gifts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gifts')
            price = await get_price_wrapper(
                slug=slug,
                backdrop_name=backdrop_name,
                model_name=model_name,
                symbol_name=symbol_name,
                portal_auth_data=portal_auth_data,
                api_id=API_ID,
                api_hash=API_HASH,
                session_name="portals_session",
                session_path=gifts_dir
            )
            return price
        except Exception:
            return None
    except Exception as e:
        # Silent - don't spam errors
        return None

async def get_profile_gifts(user_id=None, return_cached=False, background_update=False):
    """
    Fetch saved Star Gifts for a Telegram user with Portal Market prices
    
    Args:
        user_id: Telegram user ID or username
        return_cached: If True, return cached data immediately and start background update
        background_update: If True, update cache in background without blocking
    """
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
        
        # Mark as fetching if cache available
        if CACHE_AVAILABLE and not background_update:
            try:
                cache_user_id = getattr(target_user, 'id', None) if 'target_user' in locals() else None
                if cache_user_id:
                    set_fetching_status(cache_user_id, True)
            except Exception:
                pass
        
        # Initialize Portal Market auth
        # Multi-account API handles auth internally, no need to set portal_auth_data
        # Prices will be fetched in parallel batches after processing all gifts
        portal_auth_data = None  # Not needed with multi-account wrapper
        
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
        
        # Process gifts and collect price requests for parallel fetching
        processed_gifts = []
        price_requests = []  # Collect all price requests for parallel fetching
        
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
                    
                    # Generate fragment.com image URL like Collection tab does
                    fragment_image_url = None
                    if slug != 'N/A' and gift_num:
                        fragment_image_url = f'https://nft.fragment.com/gift/{slug_lower}-{gift_num}.medium.jpg'
                    
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
                    
                    # Collect price request for parallel fetching later
                    # Only use model + backdrop (symbol/pattern not needed for pricing)
                    price = None
                    if PORTAL_MARKET_API_AVAILABLE and slug != 'N/A':
                        price_requests.append({
                            'index': len(processed_gifts),
                            'slug': slug,
                            'backdrop_name': backdrop_name,
                            'model_name': model_name
                            # symbol_name removed - not needed for price fetching
                        })
                    
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
                    
                    # For unupgraded gifts, collect price request for parallel fetching
                    if is_unupgraded and PORTAL_MARKET_API_AVAILABLE:
                        title_for_search = gift.title or 'N/A'
                        if title_for_search != 'N/A':
                            price_requests.append({
                                'index': len(processed_gifts),
                                'slug': f"{title_for_search}-0",  # Use title as collection name
                                'backdrop_name': None,
                                'model_name': None,
                                'symbol_name': None
                            })
                    
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
        
        # Fetch all prices in parallel batches (using 4 accounts with rate limiting)
        # Cache prices by (gift_name, model, backdrop) to avoid duplicate searches
        # Use global cache (shared across users) + local cache (this session)
        if price_requests and PORTAL_MARKET_API_AVAILABLE:
            try:
                from portal_market_multi_account import get_multi_account_api
                try:
                    from utils.global_price_cache import get_cached_price, set_cached_price, normalize_attr
                    GLOBAL_CACHE_AVAILABLE = True
                except ImportError:
                    # Fallback if global cache not available
                    def normalize_attr(attr):
                        if attr is None:
                            return ""
                        return str(attr).strip().lower()
                    def get_cached_price(*args):
                        return None
                    def set_cached_price(*args):
                        pass
                    GLOBAL_CACHE_AVAILABLE = False
                
                api = await get_multi_account_api(gifts_dir)
                
                # Local price cache for this session: key = (gift_name, model, backdrop), value = price
                price_cache = {}
                
                # Check global cache first (saves API calls across users)
                print(f"🔍 Checking global cache for {len(price_requests)} price requests...", file=sys.stderr)
                global_cache_hits = 0
                for req in price_requests:
                    collection_name = req['slug'].split('-')[0] if '-' in req['slug'] else req['slug']
                    cached_price = get_cached_price(
                        collection_name,
                        req.get('model_name'),
                        req.get('backdrop_name')
                    )
                    if cached_price is not None:
                        # Found in global cache, use it
                        normalized_model = normalize_attr(req.get('model_name'))
                        normalized_backdrop = normalize_attr(req.get('backdrop_name'))
                        cache_key = (collection_name.lower().strip(), normalized_model, normalized_backdrop)
                        price_cache[cache_key] = cached_price
                        global_cache_hits += 1
                
                if global_cache_hits > 0:
                    print(f"✅ Found {global_cache_hits} prices in global cache (saved {global_cache_hits} API calls)", file=sys.stderr)
                
                # Group requests by unique (gift_name, model, backdrop) combination
                # Skip requests already in cache
                unique_requests = {}  # key: (gift_name, model, backdrop), value: list of indices
                requests_to_fetch = []  # Requests not in cache
                
                for req in price_requests:
                    collection_name = req['slug'].split('-')[0] if '-' in req['slug'] else req['slug']
                    normalized_model = normalize_attr(req.get('model_name'))
                    normalized_backdrop = normalize_attr(req.get('backdrop_name'))
                    cache_key = (
                        collection_name.lower().strip(),
                        normalized_model,
                        normalized_backdrop
                    )
                    
                    # Check if already in local cache (from global cache check)
                    if cache_key not in price_cache:
                        if cache_key not in unique_requests:
                            unique_requests[cache_key] = []
                        unique_requests[cache_key].append(req['index'])
                        requests_to_fetch.append((cache_key, req))
                
                print(f"📊 Found {len(price_requests)} price requests, {len(unique_requests)} unique combinations to fetch ({len(price_requests) - len(requests_to_fetch)} already cached)", file=sys.stderr)
                
                # Fetch unique prices with retry logic and dynamic batch sizing
                async def get_price_with_retry(api, gift_name, model, backdrop, max_retries=3):
                    """Get price with retry logic, exponential backoff, and network error handling"""
                    last_error = None
                    for attempt in range(max_retries):
                        try:
                            price = await api.get_gift_price(
                                gift_name=gift_name,
                                model=model if model else None,
                                backdrop=backdrop if backdrop else None
                            )
                            if price is not None:
                                # Save to global cache
                                set_cached_price(gift_name, model, backdrop, price)
                                return price
                        except Exception as e:
                            last_error = e
                            # Check if it's a rate limit error (429)
                            error_str = str(e).lower()
                            is_rate_limit = '429' in error_str or 'rate limit' in error_str or 'too many' in error_str
                            
                            if attempt < max_retries - 1:
                                # Exponential backoff: 0.5s, 1s, 2s
                                # Longer wait for rate limits
                                base_wait = 1.0 if is_rate_limit else 0.5
                                wait_time = base_wait * (2 ** attempt)
                                await asyncio.sleep(wait_time)
                            else:
                                # Last attempt failed, log error
                                print(f"⚠️ Price fetch failed after {max_retries} attempts for {gift_name} (model: {model}, backdrop: {backdrop}): {last_error}", file=sys.stderr)
                    return None
                
                # Dynamic batch sizing: start with 4, adjust based on errors
                batch_size = 4  # Start conservative
                unique_keys = list(unique_requests.keys())
                consecutive_errors = 0
                
                for i in range(0, len(unique_keys), batch_size):
                    batch_keys = unique_keys[i:i+batch_size]
                    
                    # Create tasks for unique requests
                    tasks = []
                    for cache_key in batch_keys:
                        gift_name, model, backdrop = cache_key
                        task = get_price_with_retry(api, gift_name, model, backdrop)
                        tasks.append((cache_key, task))
                    
                    # Execute batch in parallel
                    results = await asyncio.gather(*[task for _, task in tasks], return_exceptions=True)
                    
                    # Store results in cache and track errors
                    batch_errors = 0
                    batch_successes = 0
                    for (cache_key, _), price_result in zip(tasks, results):
                        if not isinstance(price_result, Exception) and price_result is not None:
                            price_cache[cache_key] = price_result
                            batch_successes += 1
                        elif isinstance(price_result, Exception):
                            # Log exception
                            error_str = str(price_result).lower()
                            is_rate_limit = '429' in error_str or 'rate limit' in error_str
                            if is_rate_limit:
                                print(f"⚠️ Rate limit hit for {cache_key[0]}, reducing batch size", file=sys.stderr)
                            batch_errors += 1
                    
                    # Dynamic batch sizing: adjust based on errors
                    if batch_errors > batch_successes:
                        # More errors than successes, reduce batch size
                        consecutive_errors += 1
                        if consecutive_errors >= 2 and batch_size > 2:
                            batch_size = max(2, batch_size - 1)
                            print(f"📉 Reducing batch size to {batch_size} due to errors", file=sys.stderr)
                    else:
                        # Success, can try increasing batch size
                        consecutive_errors = 0
                        if batch_size < 8 and i > 0 and (i // batch_size) % 3 == 0:
                            # Gradually increase if stable
                            batch_size = min(8, batch_size + 1)
                            print(f"📈 Increasing batch size to {batch_size} (stable)", file=sys.stderr)
                    
                    # Adaptive delay between batches based on errors
                    delay = 0.5 if batch_errors > 0 else 0.3
                    if i + batch_size < len(unique_keys):
                        await asyncio.sleep(delay)
                
                # Apply cached prices to all gifts with matching attributes
                # Use normalized keys for matching
                for req in price_requests:
                    collection_name = req['slug'].split('-')[0] if '-' in req['slug'] else req['slug']
                    normalized_model = normalize_attr(req.get('model_name'))
                    normalized_backdrop = normalize_attr(req.get('backdrop_name'))
                    cache_key = (
                        collection_name.lower().strip(),
                        normalized_model,
                        normalized_backdrop
                    )
                    
                    if cache_key in price_cache:
                        price = price_cache[cache_key]
                        idx = req['index']
                        if idx < len(processed_gifts):
                            processed_gifts[idx]['price'] = price
                    else:
                        # Price not found, try sequential fallback with retry
                        idx = req['index']
                        if idx < len(processed_gifts) and processed_gifts[idx].get('price') is None:
                            try:
                                from portal_market_multi_account import get_portal_market_price_multi
                                # Try sequential fetch with small delay
                                await asyncio.sleep(0.2)
                                price = await get_portal_market_price_multi(
                                    slug=req['slug'],
                                    backdrop_name=req.get('backdrop_name'),
                                    model_name=req.get('model_name'),
                                    session_path=gifts_dir
                                )
                                if price is not None:
                                    processed_gifts[idx]['price'] = price
                                    # Cache it for future use (both local and global)
                                    price_cache[cache_key] = price
                                    set_cached_price(collection_name, req.get('model_name'), req.get('backdrop_name'), price)
                            except Exception as e:
                                print(f"⚠️ Sequential fallback failed for {req['slug']}: {e}", file=sys.stderr)
                
                # Log final statistics
                prices_fetched = sum(1 for g in processed_gifts if g.get('price') is not None)
                total_gifts = len(processed_gifts)
                print(f"✅ Price fetching complete: {prices_fetched}/{total_gifts} gifts have prices ({prices_fetched/total_gifts*100:.1f}%)", file=sys.stderr)
            except Exception as e:
                # If parallel fetching fails, try sequential fallback
                print(f"⚠️ Parallel fetching failed, using sequential fallback: {e}", file=sys.stderr)
                try:
                    from portal_market_multi_account import get_portal_market_price_multi
                    for req in price_requests:
                        try:
                            price = await get_portal_market_price_multi(
                                slug=req['slug'],
                                backdrop_name=req.get('backdrop_name'),
                                model_name=req.get('model_name'),
                                # symbol_name not needed - only model + backdrop
                                session_path=gifts_dir
                            )
                            if price is not None and req['index'] < len(processed_gifts):
                                processed_gifts[req['index']]['price'] = price
                            # Small delay to avoid rate limiting
                            await asyncio.sleep(0.2)
                        except Exception:
                            pass
                except Exception:
                    pass
        
        # Calculate total value
        total_value = sum(gift.get('price', 0) or 0 for gift in processed_gifts)
        
        # Save to cache
        if CACHE_AVAILABLE:
            try:
                # Get user_id from target_user
                cache_user_id = getattr(target_user, 'id', None)
                if cache_user_id:
                    set_cached_portfolio(cache_user_id, processed_gifts, total_value, is_fetching=False)
                    set_fetching_status(cache_user_id, False)
            except Exception as e:
                print(f"⚠️ Error saving to cache: {e}", file=sys.stderr)
        
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

async def update_portfolio_background(user_id):
    """Background task to update portfolio cache"""
    try:
        await get_profile_gifts(user_id, return_cached=False, background_update=True)
    except Exception as e:
        print(f"⚠️ Background update error: {e}", file=sys.stderr)

if __name__ == "__main__":
    # Get user_id from command line if provided
    user_id = None
    return_cached = False
    
    if len(sys.argv) > 1:
        user_input = sys.argv[1]
        try:
            # Try to parse as integer ID
            user_id = int(user_input)
        except ValueError:
            # If not an integer, treat as username
            user_id = user_input
    
    # Check for --cached flag
    if '--cached' in sys.argv:
        return_cached = True
    
    asyncio.run(get_profile_gifts(user_id, return_cached=return_cached))
