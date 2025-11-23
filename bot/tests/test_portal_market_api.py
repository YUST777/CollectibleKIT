#!/usr/bin/env python3
"""
Test the working Portal Market API wrapper
"""
import asyncio
import sys
import os
from portal_market_api import PortalMarketAPI, get_portal_market_price

# Config
API_ID = 22307634
API_HASH = '7ab906fc6d065a2047a84411c1697593'
SESSION_NAME = 'portals_session'
gifts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gifts')

async def test_api():
    """Test Portal Market API"""
    print("🧪 Testing Portal Market API Wrapper")
    print("="*60)
    
    # Initialize API
    api = PortalMarketAPI(API_ID, API_HASH, SESSION_NAME, gifts_dir)
    
    # Test 1: Authentication
    print("\n1️⃣ Testing authentication...")
    try:
        auth = await api.authenticate()
        print(f"   ✅ Auth successful: {len(auth)} chars")
    except Exception as e:
        print(f"   ❌ Auth failed: {e}")
        return
    
    # Test 2: Get all floor prices
    print("\n2️⃣ Testing get_all_floor_prices()...")
    try:
        floors = await api.get_all_floor_prices()
        print(f"   ✅ Got {len(floors)} floor prices")
        # Show a few examples
        sample = list(floors.items())[:5]
        for name, price in sample:
            print(f"      {name}: {price} TON")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    
    # Test 3: Get specific gift floor price
    print("\n3️⃣ Testing get_gift_floor_price('LunarSnake')...")
    try:
        price = await api.get_gift_floor_price("LunarSnake")
        print(f"   ✅ LunarSnake floor price: {price} TON")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    
    # Test 4: Search gifts
    print("\n4️⃣ Testing search_gifts('LunarSnake', limit=3)...")
    try:
        results = await api.search_gifts(gift_name="LunarSnake", limit=3)
        print(f"   ✅ Found {len(results)} results")
        for i, gift in enumerate(results[:3], 1):
            print(f"      {i}. Price: {gift.price} TON, ID: {gift.gift_id}")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    
    # Test 5: Get gift price with attributes
    print("\n5️⃣ Testing get_gift_price('LunarSnake', model='Python Dev', backdrop='Roman Silver')...")
    try:
        price = await api.get_gift_price(
            gift_name="LunarSnake",
            model="Python Dev",
            backdrop="Roman Silver"
        )
        print(f"   ✅ Price: {price} TON")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    
    # Test 6: Backward compatibility function
    print("\n6️⃣ Testing backward compatibility function...")
    try:
        price = await get_portal_market_price(
            slug="LunarSnake-121736",
            backdrop_name="Roman Silver",
            model_name="Python Dev",
            api_id=API_ID,
            api_hash=API_HASH,
            session_name=SESSION_NAME,
            session_path=gifts_dir
        )
        print(f"   ✅ Price: {price} TON")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    
    print("\n" + "="*60)
    print("✅ All tests complete!")

if __name__ == "__main__":
    try:
        asyncio.run(test_api())
    except KeyboardInterrupt:
        print("\n⚠️ Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

