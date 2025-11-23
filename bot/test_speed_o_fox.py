#!/usr/bin/env python3
"""
Speed test for @o_fox profile with 4 accounts
Tests how many prices we can fetch and how fast
"""
import asyncio
import sys
import os
import time
import json
from portal_market_multi_account import get_multi_account_api

async def speed_test_o_fox():
    """Test speed and success rate on @o_fox profile"""
    print("="*60)
    print("🚀 SPEED TEST: @o_fox Profile")
    print("="*60)
    
    gifts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gifts')
    
    # Initialize multi-account API
    print("\n🔑 Initializing 4 accounts...")
    api = await get_multi_account_api(gifts_dir)
    print(f"✅ {len(api.accounts)} accounts ready")
    
    # Get profile gifts
    print("\n📊 Fetching @o_fox profile...")
    start_time = time.time()
    
    # Call get_profile_gifts.py
    import subprocess
    result = subprocess.run(
        ['python3', 'bot/get_profile_gifts.py', '@o_fox'],
        capture_output=True,
        text=True,
        timeout=300  # 5 minute timeout
    )
    
    elapsed_time = time.time() - start_time
    
    # Parse results
    try:
        # Extract JSON from output
        output = result.stdout
        json_start = output.find('{')
        json_end = output.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = output[json_start:json_end]
            data = json.loads(json_str)
            
            gifts = data.get('gifts', [])
            total_gifts = len(gifts)
            prices = [g.get('price') for g in gifts if g.get('price') is not None]
            prices_fetched = len(prices)
            total_value = data.get('total_value', 0)
            
            print("\n" + "="*60)
            print("📊 SPEED TEST RESULTS")
            print("="*60)
            print(f"\n⏱️  Total Time: {elapsed_time:.2f} seconds")
            print(f"📦 Total Gifts: {total_gifts}")
            print(f"💰 Prices Fetched: {prices_fetched}/{total_gifts} ({prices_fetched/total_gifts*100:.1f}%)")
            print(f"💵 Total Portfolio Value: {total_value} TON")
            print(f"⚡ Speed: {prices_fetched/elapsed_time:.2f} prices/second")
            print(f"📈 Success Rate: {prices_fetched/total_gifts*100:.1f}%")
            
            if prices:
                print(f"\n💰 Price Range:")
                valid_prices = [p for p in prices if p is not None and p > 0]
                if valid_prices:
                    print(f"   Min: {min(valid_prices)} TON")
                    print(f"   Max: {max(valid_prices)} TON")
                    print(f"   Avg: {sum(valid_prices)/len(valid_prices):.2f} TON")
            
            print("\n" + "="*60)
            print("✅ Test Complete!")
            print("="*60)
            
            return {
                'total_time': elapsed_time,
                'total_gifts': total_gifts,
                'prices_fetched': prices_fetched,
                'success_rate': prices_fetched/total_gifts*100 if total_gifts > 0 else 0,
                'speed': prices_fetched/elapsed_time if elapsed_time > 0 else 0,
                'total_value': total_value
            }
        else:
            print("❌ Could not parse JSON from output")
            print(f"Output (last 500 chars): {output[-500:]}")
            return None
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        print(f"Output (last 500 chars): {result.stdout[-500:]}")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    try:
        result = asyncio.run(speed_test_o_fox())
        if result:
            print(f"\n📋 Summary:")
            print(f"   {result['prices_fetched']}/{result['total_gifts']} prices in {result['total_time']:.1f}s")
            print(f"   Speed: {result['speed']:.2f} prices/sec")
    except KeyboardInterrupt:
        print("\n⚠️ Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

