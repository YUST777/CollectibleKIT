#!/usr/bin/env python3
"""
Get prices for unupgradeable gifts from MRKT and Quant APIs
"""

import sys
import json
import requests
import asyncio
import urllib.parse
from telethon import TelegramClient, functions

# Use same credentials as other scripts
API_ID = 22307634
API_HASH = '7ab906fc6d065a2047a84411c1697593'
SESSION_NAME = 'gifts_session'

# MRKT API
MRKT_API_BASE = 'https://api.tgmrkt.io'
MRKT_BOT_USERNAME = 'main_mrkt_bot'

# Quant API  
QUANT_API_BASE = 'https://quant-marketplace.com'
QUANT_BOT_USERNAME = 'QuantMarketRobot'

# The 6 unupgradeable gifts that only MRKT has prices for
MRKT_ONLY_IDS = [
    "5775955135867913556",  # Gravestone
    "5776227780391864916",  # Coffin
    "5775966332847654507",  # Mask
    "6001229799790478558",  # Durov's Boots
    "6001425315291727333",  # Durov's Coat
    "6003477390536213997",  # Durov's Figurine
]

async def get_mrkt_init_data():
    """Get MRKT initData"""
    try:
        client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        await client.connect()
        
        if not await client.is_user_authorized():
            return None
        
        bot = await client.get_entity(MRKT_BOT_USERNAME)
        result = await client(functions.messages.RequestWebViewRequest(
            peer=bot,
            bot=bot,
            platform="ios",
            url=f"{MRKT_API_BASE}/api/v1/auth",
        ))
        
        if not result or not hasattr(result, 'url'):
            return None
        
        parsed = urllib.parse.urlparse(result.url)
        query_params = urllib.parse.parse_qs(parsed.query)
        
        if 'tgWebAppData' in query_params:
            return urllib.parse.unquote(query_params['tgWebAppData'][0])
        
        fragment = parsed.fragment
        if fragment and 'tgWebAppData=' in fragment:
            init_data_encoded = fragment.split('tgWebAppData=')[1]
            if '&' in init_data_encoded:
                init_data_encoded = init_data_encoded.split('&')[0]
            return urllib.parse.unquote(init_data_encoded)
        
        return None
    except Exception as e:
        print(f"ERROR: MRKT initData failed: {e}", file=sys.stderr)
        return None
    finally:
        await client.disconnect()

def get_mrkt_token(init_data):
    """Get MRKT JWT token"""
    try:
        headers = {'Content-Type': 'application/json', 'Accept': 'application/json'}
        payload = {'data': init_data}
        response = requests.post(f"{MRKT_API_BASE}/api/v1/auth", headers=headers, json=payload, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if 'token' in data:
                return data['token']
            elif 'accessToken' in data:
                return data['accessToken']
        return None
    except Exception as e:
        print(f"ERROR: MRKT token failed: {e}", file=sys.stderr)
        return None

def get_mrkt_prices(token):
    """Get MRKT prices for unupgradeable gifts"""
    try:
        headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/json'}
        response = requests.get(f"{MRKT_API_BASE}/api/v1/gifts/collections", headers=headers, timeout=15)
        
        if response.status_code == 200:
            collections = response.json()
            prices = {}
            
            for coll in collections:
                name = coll.get('name')
                # Convert nanoTONs to TON for ALL gifts
                floor_price_nano = coll.get('floorPriceNanoTons', 0)
                floor_price_ton = floor_price_nano / 1_000_000_000 if floor_price_nano else 0
                if floor_price_ton > 0:  # Only include gifts with non-zero prices
                    prices[name] = floor_price_ton
            
            return prices
        return {}
    except Exception as e:
        print(f"ERROR: MRKT prices failed: {e}", file=sys.stderr)
        return {}

async def get_quant_init_data():
    """Get Quant initData"""
    try:
        client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        await client.connect()
        
        if not await client.is_user_authorized():
            return None
        
        bot = await client.get_entity(QUANT_BOT_USERNAME)
        result = await client(functions.messages.RequestWebViewRequest(
            peer=bot,
            bot=bot,
            platform="ios",
            url=QUANT_API_BASE,
        ))
        
        if not result or not hasattr(result, 'url'):
            return None
        
        parsed = urllib.parse.urlparse(result.url)
        fragment = parsed.fragment
        
        if fragment and 'tgWebAppData=' in fragment:
            init_data_encoded = fragment.split('tgWebAppData=')[1]
            if '&' in init_data_encoded:
                init_data_encoded = init_data_encoded.split('&')[0]
            return urllib.parse.unquote(init_data_encoded)
        
        return None
    except Exception as e:
        print(f"ERROR: Quant initData failed: {e}", file=sys.stderr)
        return None
    finally:
        await client.disconnect()

def get_quant_prices(init_data):
    """Get Quant prices for unupgradeable gifts - use static file as API is unreliable"""
    try:
        # Try API first
        import cloudscraper
        scraper = cloudscraper.create_scraper()
        headers = {'Authorization': f'tma {init_data}'}
        response = scraper.get(f"{QUANT_API_BASE}/api/gifts", headers=headers, timeout=20)
        
        if response.status_code == 200:
            data = response.json()
            prices = {}
            
            for item in data:
                gift_id = item.get('id')
                floor_price = item.get('floor_price', '0')
                try:
                    price = float(floor_price)
                    if price > 0:
                        prices[gift_id] = price
                except:
                    pass
            
            if prices:
                return prices
    except Exception as e:
        print(f"ERROR: Quant API failed: {e}", file=sys.stderr)
    
    # Fallback to static file
    try:
        quant_file = '/root/01studio/CollectibleKIT/mrktandquantomapi/quant/clean_unique_gifts.json'
        with open(quant_file, 'r') as f:
            data = json.load(f)
        
        prices = {}
        for item in data:
            gift_id = item.get('id')
            floor_price = item.get('floor_price', '0')
            try:
                price = float(floor_price)
                if price > 0:
                    prices[gift_id] = price
            except:
                pass
        
        return prices
    except Exception as e:
        print(f"ERROR: Quant file failed: {e}", file=sys.stderr)
        return {}

async def main():
    """Main function"""
    try:
        # Get MRKT prices
        print("Fetching MRKT prices...", file=sys.stderr)
        mrkt_init_data = await get_mrkt_init_data()
        if mrkt_init_data:
            mrkt_token = get_mrkt_token(mrkt_init_data)
            if mrkt_token:
                mrkt_prices = get_mrkt_prices(mrkt_token)
            else:
                mrkt_prices = {}
        else:
            mrkt_prices = {}
        
        # Get Quant prices as fallback
        print("Fetching Quant prices...", file=sys.stderr)
        quant_init_data = await get_quant_init_data()
        quant_prices = get_quant_prices(quant_init_data) if quant_init_data else {}
        
        # Merge prices - prefer MRKT for the 6 special IDs, otherwise use non-zero price
        final_prices = {}
        all_gift_ids = set(list(mrkt_prices.keys()) + list(quant_prices.keys()))
        
        for gift_id in all_gift_ids:
            mrkt_price = mrkt_prices.get(gift_id, 0)
            quant_price = quant_prices.get(gift_id, 0)
            
            # For MRKT-only IDs, always use MRKT
            if gift_id in MRKT_ONLY_IDS:
                final_prices[gift_id] = mrkt_price
            else:
                # Otherwise prefer non-zero price
                final_prices[gift_id] = mrkt_price if mrkt_price > 0 else quant_price
        
        output = {"success": True, "prices": final_prices}
        print(json.dumps(output))
        
    except Exception as e:
        output = {"success": False, "error": str(e)}
        print(json.dumps(output))

if __name__ == '__main__':
    asyncio.run(main())

