#!/usr/bin/env python3
"""
Test multi-account Portal Market API
"""
import asyncio
import sys
import os
from portal_market_multi_account import MultiAccountPortalMarketAPI

gifts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gifts')

async def test_multi_account():
    """Test multi-account API"""
    print("🧪 Testing Multi-Account Portal Market API")
    print("="*60)
    
    # Initialize multi-account API
    api = MultiAccountPortalMarketAPI(session_path=gifts_dir)
    
    # Test 1: Initialize accounts
    print("\n1️⃣ Initializing accounts...")
    try:
        await api._initialize_accounts()
        print(f"   ✅ {len(api.accounts)} accounts initialized")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return
    
    # Test 2: Get all floor prices
    print("\n2️⃣ Testing get_all_floor_prices()...")
    try:
        floors = await api.get_all_floor_prices()
        print(f"   ✅ Got {len(floors)} floor prices")
        sample = list(floors.items())[:3]
        for name, price in sample:
            print(f"      {name}: {price} TON")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    
    # Test 3: Test round-robin account usage
    print("\n3️⃣ Testing round-robin account rotation...")
    try:
        prices = []
        for i in range(5):
            account = await api._get_next_account()
            # Get account ID from session name
            account_id = "unknown"
            for acc_config in PORTAL_ACCOUNTS:
                if acc_config["session_name"] in str(account.session_name):
                    account_id = acc_config["account_id"]
                    break
            print(f"   Request {i+1}: Using account {account_id}")
            price = await api.get_gift_floor_price("LunarSnake")
            prices.append(price)
            await asyncio.sleep(0.1)  # Small delay
        
        print(f"   ✅ Round-robin working! Prices: {prices}")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 4: Parallel price fetching
    print("\n4️⃣ Testing parallel price fetching...")
    try:
        requests = [
            {"id": "1", "gift_name": "LunarSnake", "model": "Python Dev", "backdrop": "Roman Silver"},
            {"id": "2", "gift_name": "LunarSnake", "model": None, "backdrop": "Roman Silver"},
            {"id": "3", "gift_name": "TamaGadget", "model": None, "backdrop": None},
        ]
        results = await api.fetch_prices_parallel(requests)
        print(f"   ✅ Parallel fetch complete!")
        for gift_id, price in results.items():
            print(f"      Gift {gift_id}: {price} TON")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "="*60)
    print("✅ All tests complete!")

if __name__ == "__main__":
    try:
        from portal_accounts_config import PORTAL_ACCOUNTS
        asyncio.run(test_multi_account())
    except ImportError:
        print("❌ portal_accounts_config not found")
    except KeyboardInterrupt:
        print("\n⚠️ Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

