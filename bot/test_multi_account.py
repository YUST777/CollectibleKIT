#!/usr/bin/env python3
"""
Test multi-account Portal Market fetching
Tests giftsFloors() with multiple accounts in parallel
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

# Import aportalsmp
try:
    from aportalsmp.gifts import giftsFloors
    from aportalsmp import update_auth
    APORTALSMP_AVAILABLE = True
except ImportError as e:
    print(f"❌ aportalsmp not available: {e}")
    sys.exit(1)

# Import multi-account config
try:
    from portal_accounts_config import PORTAL_ACCOUNTS
    MULTI_ACCOUNT_AVAILABLE = True
except ImportError:
    print("⚠️ Multi-account config not found, using single account")
    MULTI_ACCOUNT_AVAILABLE = False
    PORTAL_ACCOUNTS = []

# Default account (fallback)
DEFAULT_API_ID = 22307634
DEFAULT_API_HASH = '7ab906fc6d065a2047a84411c1697593'
SESSION_NAME = 'gifts_session'

async def get_portal_auth_for_account(account_config, gifts_dir):
    """Get Portal Market auth for a specific account"""
    account_id = account_config["account_id"]
    api_id = account_config["api_id"]
    api_hash = account_config["api_hash"]
    session_name = account_config["session_name"]
    
    try:
        authData = await update_auth(
            api_id=api_id,
            api_hash=api_hash,
            session_name=session_name,
            session_path=gifts_dir
        )
        return authData, account_id, True
    except Exception as e:
        print(f"⚠️ Account {account_id} auth failed: {e}", file=sys.stderr)
        return None, account_id, False

async def test_giftsFloors_multi_account(auth_data_list):
    """Test giftsFloors() with multiple accounts in parallel"""
    print("\n" + "="*60)
    print("📊 Testing giftsFloors() with Multiple Accounts (Parallel)")
    print("="*60)
    
    async def fetch_floors(authData, account_id):
        """Fetch floors for one account"""
        start_time = time.time()
        try:
            floors = await giftsFloors(authData=authData)
            elapsed = time.time() - start_time
            print(f"✅ Account {account_id}: Success! Time: {elapsed:.2f}s")
            return floors, elapsed, account_id, True
        except Exception as e:
            elapsed = time.time() - start_time
            error_msg = str(e)
            if "timeout" in error_msg.lower() or "connection reset" in error_msg.lower():
                print(f"❌ Account {account_id}: Timeout! Time: {elapsed:.2f}s")
            else:
                print(f"❌ Account {account_id}: Failed! Time: {elapsed:.2f}s - {error_msg}")
            return None, elapsed, account_id, False
    
    # Fetch from all accounts in parallel
    overall_start = time.time()
    print(f"🚀 Starting parallel fetch from {len(auth_data_list)} accounts...")
    
    tasks = [
        fetch_floors(authData, account_id) 
        for authData, account_id, _ in auth_data_list
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    overall_elapsed = time.time() - overall_start
    
    # Process results
    successful_results = []
    failed_results = []
    
    for result in results:
        if isinstance(result, Exception):
            print(f"❌ Exception: {result}")
            failed_results.append(result)
        else:
            floors, elapsed, account_id, success = result
            if success:
                successful_results.append((floors, account_id))
            else:
                failed_results.append((account_id, elapsed))
    
    print(f"\n📊 Results Summary:")
    print(f"   Total time: {overall_elapsed:.2f} seconds")
    print(f"   Successful: {len(successful_results)}/{len(auth_data_list)}")
    print(f"   Failed: {len(failed_results)}/{len(auth_data_list)}")
    
    return successful_results, overall_elapsed

async def merge_floors_results(results):
    """Merge floors results from multiple accounts"""
    if not results:
        return {}
    
    merged = {}
    
    # Collect all prices for each gift
    for floors, account_id in results:
        if floors:
            # Try to access floors as dict or object
            try:
                if hasattr(floors, '__dict__'):
                    # It's an object, try to get attributes
                    for key in dir(floors):
                        if not key.startswith('_'):
                            try:
                                value = getattr(floors, key)
                                if isinstance(value, (int, float)):
                                    merged[key] = merged.get(key, [])
                                    merged[key].append((value, account_id))
                            except:
                                pass
                elif isinstance(floors, dict):
                    # It's a dict
                    for gift_name, price in floors.items():
                        if price:
                            merged[gift_name] = merged.get(gift_name, [])
                            merged[gift_name].append((float(price), account_id))
                else:
                    # Try to iterate
                    for item in floors:
                        if hasattr(item, 'name') and hasattr(item, 'price'):
                            gift_name = item.name
                            price = item.price
                            merged[gift_name] = merged.get(gift_name, [])
                            merged[gift_name].append((float(price), account_id))
            except Exception as e:
                print(f"⚠️ Error processing floors from account {account_id}: {e}", file=sys.stderr)
    
    # Take best price (lowest) for each gift
    final_prices = {}
    for gift_name, prices in merged.items():
        if prices:
            # Sort by price (lowest first)
            prices.sort(key=lambda x: x[0])
            final_prices[gift_name] = prices[0][0]  # Take lowest price
    
    return final_prices

async def main():
    """Test multi-account system"""
    user_id = "@yousefmsm1"
    
    print("="*60)
    print("🧪 Testing Multi-Account Portal Market System")
    print("="*60)
    print(f"User: {user_id}")
    
    # Get gifts directory
    gifts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gifts')
    
    # Get auth for all accounts
    print("\n🔑 Getting Portal Market authentication for all accounts...")
    auth_data_list = []
    
    if MULTI_ACCOUNT_AVAILABLE and PORTAL_ACCOUNTS:
        print(f"📋 Found {len(PORTAL_ACCOUNTS)} configured accounts")
        for account in PORTAL_ACCOUNTS:
            authData, account_id, success = await get_portal_auth_for_account(account, gifts_dir)
            if success:
                auth_data_list.append((authData, account_id, True))
                print(f"✅ Account {account_id} ({account['app_title']}): Auth obtained")
            else:
                print(f"❌ Account {account_id} ({account['app_title']}): Auth failed")
            # Small delay between auth requests
            await asyncio.sleep(0.5)
    else:
        # Fallback to single account
        print("⚠️ Using single account (default)")
        try:
            authData = await update_auth(
                api_id=DEFAULT_API_ID,
                api_hash=DEFAULT_API_HASH,
                session_name="portals_session",
                session_path=gifts_dir
            )
            if authData:
                auth_data_list.append((authData, 0, True))
                print("✅ Default account: Auth obtained")
        except Exception as e:
            print(f"❌ Default account auth failed: {e}")
    
    if not auth_data_list:
        print("❌ No accounts authenticated")
        sys.exit(1)
    
    print(f"\n✅ {len(auth_data_list)} account(s) ready")
    
    # Test multi-account fetching
    results, total_time = await test_giftsFloors_multi_account(auth_data_list)
    
    if results:
        print("\n" + "="*60)
        print("🔄 Merging Results from All Accounts")
        print("="*60)
        
        merged_prices = await merge_floors_results(results)
        
        if merged_prices:
            print(f"✅ Merged {len(merged_prices)} gift prices")
            print("\n📋 Sample Prices (first 10):")
            for i, (gift_name, price) in enumerate(list(merged_prices.items())[:10], 1):
                print(f"   {i}. {gift_name}: {price} TON")
        else:
            print("⚠️ No prices in merged results")
            print("   (Floors object structure might be different)")
    else:
        print("\n❌ No successful results to merge")
    
    # Performance comparison
    print("\n" + "="*60)
    print("⏱️  Performance Analysis")
    print("="*60)
    print(f"Total time (parallel): {total_time:.2f} seconds")
    print(f"Accounts used: {len(auth_data_list)}")
    print(f"Successful: {len(results)}")
    
    if len(auth_data_list) > 1:
        estimated_sequential = total_time * len(auth_data_list)
        speedup = estimated_sequential / total_time if total_time > 0 else 0
        print(f"Estimated sequential time: {estimated_sequential:.2f} seconds")
        print(f"Speedup: {speedup:.1f}x faster")
    
    print("\n" + "="*60)
    print("💡 Recommendation")
    print("="*60)
    if len(results) > 0:
        print(f"✅ Multi-account system working! {len(results)}/{len(auth_data_list)} accounts succeeded")
        if len(results) == len(auth_data_list):
            print("✅ All accounts working - maximum redundancy!")
        elif len(results) > 0:
            print(f"⚠️ Some accounts failed, but {len(results)} account(s) working")
    else:
        print("❌ All accounts failed - Portal Market may be down")
        print("   Consider using fallback price sources")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️ Test cancelled by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()

