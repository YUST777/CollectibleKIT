#!/usr/bin/env python3
"""
Get sticker portfolio for a user from stickerdom.store API
Standalone script that returns JSON - can be called from Next.js API route
"""
import os
import sys
import json
import requests
import logging
import asyncio
import urllib.parse
from telethon import TelegramClient, functions

# Disable logging for cleaner output when called from API
logging.basicConfig(level=logging.ERROR)

# Configuration
API_BASE = 'https://api.stickerdom.store'
PRICING_API = 'https://stickers.tools/api/stats-new'
BOT_USERNAME = 'StickerDomStoreBot'  # The stickerdom bot

# Use same credentials as gifts script
API_ID = 22307634
API_HASH = '7ab906fc6d065a2047a84411c1697593'
SESSION_NAME = ' sticker0.2/gifts_session'  # Use authorized user session

# Global variables for auth
current_jwt_token = None
pricing_data = None

def convert_query_id_to_user_format(query_id_init_data: str) -> str:
    """Convert RequestWebViewRequest format to webapp format"""
    try:
        # Parse the query_id format
        params = {}
        for param in query_id_init_data.split('&'):
            if '=' in param:
                key, value = param.split('=', 1)
                params[key] = value
        
        print(f"DEBUG: Found params: {list(params.keys())}", file=sys.stderr)
        
        # Remove query_id, keep everything else
        if 'query_id' in params:
            del params['query_id']
        
        # Reconstruct as user= format (maintain order: user, auth_date, etc.)
        # Try to maintain order to preserve hash validity
        reconstructed = '&'.join(f"{k}={v}" for k, v in params.items())
        
        print(f"DEBUG: Converted params: {list(params.keys())}", file=sys.stderr)
        
        return reconstructed
    except Exception as e:
        print(f"ERROR: Failed to convert initData format: {e}", file=sys.stderr)
        return query_id_init_data  # Return original if conversion fails

async def get_webview_url(client: TelegramClient) -> dict:
    """Get webview URL using Telethon"""
    try:
        bot = await client.get_entity(BOT_USERNAME)
        result = await client(functions.messages.RequestWebViewRequest(
            peer=bot,
            bot=bot,
            platform="ios",
            url="https://api.stickerdom.store/api/v1/auth",
        ))
        return result
    except Exception as e:
        print(f"ERROR: WebView request failed: {e}", file=sys.stderr)
        return None

async def get_fresh_init_data() -> str:
    """Get fresh initData using Telethon webview"""
    client = None
    try:
        client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        
        if not client.is_connected():
            await client.connect()
        
        if not await client.is_user_authorized():
            print("ERROR: Telethon session not authorized", file=sys.stderr)
            return None
        
        result = await get_webview_url(client)
        if not result:
            print("ERROR: Failed to get webview URL", file=sys.stderr)
            return None
        
        webview_url = result.url if hasattr(result, 'url') else str(result)
        parsed = urllib.parse.urlparse(webview_url)
        print(f"DEBUG: Webview URL length: {len(webview_url)}", file=sys.stderr)
        
        # Check query parameters
        query_params = urllib.parse.parse_qs(parsed.query)
        if 'tgWebAppData' in query_params:
            tg_data_encoded = query_params['tgWebAppData'][0]
            init_data = urllib.parse.unquote(tg_data_encoded)
            print(f"DEBUG: Extracted initData from query param, starts with 'user=': {init_data.startswith('user=')}", file=sys.stderr)
            print(f"DEBUG: First 100 chars: {init_data[:100]}", file=sys.stderr)
            return init_data
        
        # Fallback: check fragment
        fragment = parsed.fragment
        if fragment and 'tgWebAppData=' in fragment:
            init_data_encoded = fragment.split('tgWebAppData=')[1]
            if '&' in init_data_encoded:
                init_data_encoded = init_data_encoded.split('&')[0]
            # Decode twice if needed (sometimes double-encoded)
            init_data = urllib.parse.unquote(init_data_encoded)
            if init_data.startswith('query_id='):
                # Still encoded, decode again
                init_data = urllib.parse.unquote(init_data)
            
            print(f"DEBUG: Extracted initData from fragment, starts with 'user=': {init_data.startswith('user=')}", file=sys.stderr)
            print(f"DEBUG: First 100 chars: {init_data[:100]}", file=sys.stderr)
            
            # Convert query_id= format to user= format if needed
            if init_data.startswith('query_id='):
                print(f"DEBUG: Converting query_id format to user format", file=sys.stderr)
                init_data = convert_query_id_to_user_format(init_data)
                print(f"DEBUG: Converted, now starts with 'user=': {init_data.startswith('user=')}", file=sys.stderr)
                print(f"DEBUG: Converted first 150 chars: {init_data[:150]}", file=sys.stderr)
            
            return init_data
        
        return None
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return None
    finally:
        if client:
            await client.disconnect()

def get_jwt_token(init_data: str) -> str:
    """Get JWT token from initData"""
    try:
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
        }
        
        print(f"DEBUG: Sending initData to auth API (length: {len(init_data)})", file=sys.stderr)
        # Try decoded format first (ensure UTF-8 encoding)
        response = requests.post(f"{API_BASE}/api/v1/auth", headers=headers, data=init_data.encode('utf-8'), timeout=15)
        
        print(f"DEBUG: Auth response status: {response.status_code}", file=sys.stderr)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok') and data.get('data'):
                return data['data']
            else:
                print(f"DEBUG: Decoded format rejected: {data}", file=sys.stderr)
                # Try URL-encoded version
                print(f"DEBUG: Trying URL-encoded format", file=sys.stderr)
                encoded_init = urllib.parse.quote(init_data, safe='=&')
                response2 = requests.post(f"{API_BASE}/api/v1/auth", headers=headers, data=encoded_init, timeout=15)
                if response2.status_code == 200:
                    data2 = response2.json()
                    print(f"DEBUG: URL-encoded format response: {data2}", file=sys.stderr)
                    if data2.get('ok') and data2.get('data'):
                        return data2['data']
        
        print(f"DEBUG: All auth attempts failed", file=sys.stderr)
        return None
    except Exception as e:
        print(f"ERROR: Auth failed: {e}", file=sys.stderr)
        return None

def get_user_portfolio(user_id: str) -> dict:
    """Get user portfolio from API"""
    global current_jwt_token
    
    if not current_jwt_token:
        print("ERROR: No JWT token available", file=sys.stderr)
        return None
    
    try:
        headers = {
            'Authorization': f'Bearer {current_jwt_token}',
            'Accept': 'application/json',
        }
        
        print(f"DEBUG: Requesting profile for user {user_id}", file=sys.stderr)
        response = requests.get(f"{API_BASE}/api/v1/user/{user_id}/profile", headers=headers, timeout=15)
        
        print(f"DEBUG: Profile response status: {response.status_code}", file=sys.stderr)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                return data.get('data')
            else:
                print(f"DEBUG: API returned ok=False: {data}", file=sys.stderr)
        else:
            print(f"DEBUG: API error response: {response.text[:500]}", file=sys.stderr)
        
        return None
    except Exception as e:
        print(f"ERROR: Profile request failed: {e}", file=sys.stderr)
        return None

def get_pricing_data():
    """Get pricing data from stickers.tools"""
    global pricing_data
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
        }
        
        response = requests.get(PRICING_API, headers=headers, timeout=30)
        
        if response.status_code == 200:
            return response.json()
        
        return None
    except Exception as e:
        print(f"ERROR: Pricing request failed: {e}", file=sys.stderr)
        return None

def calculate_portfolio_value(profile_data: dict) -> dict:
    """Calculate portfolio value"""
    global pricing_data
    
    if not pricing_data:
        pricing_data = get_pricing_data()
    
    if not pricing_data:
        return None
    
    try:
        meta = profile_data.get('meta', {})
        collections = profile_data.get('collections', []) or []
        
        result = {
            'user': {
                'name': meta.get('full_name', 'Unknown'),
                'id': meta.get('id', 'Unknown'),
                'username': meta.get('username', 'N/A')
            },
            'collections': [],
            'totals': {
                'nfts': 0,
                'stickers': 0,
                'init_value': 0,
                'current_value': 0,
                'pnl': 0,
                'pnl_percent': 0
            }
        }
        
        collections_pricing = pricing_data.get('collections', {})
        
        for collection in collections:
            coll_info = collection.get('collection', {})
            coll_name = coll_info.get('title', 'Unknown')
            characters = collection.get('characters', []) or []
            
            coll_data = {
                'name': coll_name,
                'nfts': 0,
                'stickers': 0,
                'init_value': 0,
                'current_value': 0,
                'pnl': 0,
                'pnl_percent': 0,
                'items': []
            }
            
            # Find matching collection in pricing
            matching_coll_id = None
            for coll_id, coll_pricing in collections_pricing.items():
                if coll_pricing.get('name', '').lower() == coll_name.lower():
                    matching_coll_id = coll_id
                    break
            
            if matching_coll_id:
                stickers_pricing = collections_pricing[matching_coll_id].get('stickers', {})
                
                for character in characters:
                    if character.get('token_id'):
                        char_name = character.get('name', 'Unknown')
                        token_id = character.get('token_id')
                        sticker_count = len(character.get('stickers', []))
                        
                        # Find pricing for this character
                        init_price = 0
                        current_price = 0
                        
                        for sticker_id, sticker_data in stickers_pricing.items():
                            if sticker_data.get('name', '').lower() == char_name.lower():
                                init_price = sticker_data.get('init_price_usd', 0)
                                current_price = sticker_data.get('current', {}).get('price', {}).get('floor', {}).get('usd', 0)
                                break
                        
                        coll_data['nfts'] += 1
                        coll_data['stickers'] += sticker_count
                        coll_data['init_value'] += init_price
                        coll_data['current_value'] += current_price
                        
                        coll_data['items'].append({
                            'name': char_name,
                            'token_id': token_id,
                            'stickers': sticker_count,
                            'rarity': character.get('rarity', 'Common'),
                            'init_price': init_price,
                            'current_price': current_price
                        })
            
            if coll_data['nfts'] > 0:
                coll_data['pnl'] = coll_data['current_value'] - coll_data['init_value']
                if coll_data['init_value'] > 0:
                    coll_data['pnl_percent'] = (coll_data['pnl'] / coll_data['init_value']) * 100
                
                result['collections'].append(coll_data)
                
                # Add to totals
                result['totals']['nfts'] += coll_data['nfts']
                result['totals']['stickers'] += coll_data['stickers']
                result['totals']['init_value'] += coll_data['init_value']
                result['totals']['current_value'] += coll_data['current_value']
        
        # Calculate total PNL
        result['totals']['pnl'] = result['totals']['current_value'] - result['totals']['init_value']
        if result['totals']['init_value'] > 0:
            result['totals']['pnl_percent'] = (result['totals']['pnl'] / result['totals']['init_value']) * 100
        
        return result
    except Exception as e:
        print(f"ERROR: Portfolio calculation failed: {e}", file=sys.stderr)
        return None

async def main():
    """Main function - called from command line"""
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'User ID required'}), flush=True)
        return
    
    user_id = sys.argv[1]
    
    # Try to get initData from environment first (manual override)
    import os
    init_data = os.getenv('MANUAL_INIT_DATA')
    if init_data:
        print(f"DEBUG: Using MANUAL_INIT_DATA from environment", file=sys.stderr)
    else:
        # Get fresh initData and JWT token
        init_data = await get_fresh_init_data()
    
    if not init_data:
        # Return empty data if auth fails (requires user session to be set up)
        print(json.dumps({
            'success': True,
            'stickers': [],
            'portfolio_value': {
                'collections': [],
                'total_init': 0,
                'total_current': 0,
                'total_pnl': 0
            },
            'profile': {
                'user': {'id': user_id, 'name': 'Unknown', 'username': 'N/A'},
                'total_nfts': 0,
                'total_stickers': 0
            }
        }), flush=True)
        return
    
    global current_jwt_token
    current_jwt_token = get_jwt_token(init_data)
    if not current_jwt_token:
        print("DEBUG: JWT token auth failed", file=sys.stderr)
        # Return empty data if auth fails
        print(json.dumps({
            'success': True,
            'stickers': [],
            'portfolio_value': {
                'collections': [],
                'total_init': 0,
                'total_current': 0,
                'total_pnl': 0
            },
            'profile': {
                'user': {'id': user_id, 'name': 'Unknown', 'username': 'N/A'},
                'total_nfts': 0,
                'total_stickers': 0
            }
        }), flush=True)
        return
    
    print(f"DEBUG: JWT token obtained: {current_jwt_token[:50]}...", file=sys.stderr)
    
    # Get user portfolio
    profile_data = get_user_portfolio(user_id)
    if not profile_data:
        print(f"DEBUG: No profile data returned for user {user_id}", file=sys.stderr)
        # Return empty data if profile fetch fails
        print(json.dumps({
            'success': True,
            'stickers': [],
            'portfolio_value': {
                'collections': [],
                'total_init': 0,
                'total_current': 0,
                'total_pnl': 0
            },
            'profile': {
                'user': {'id': user_id, 'name': 'Unknown', 'username': 'N/A'},
                'total_nfts': 0,
                'total_stickers': 0
            }
        }), flush=True)
        return
    
    print(f"DEBUG: Got profile data with {len(profile_data.get('collections', []))} collections", file=sys.stderr)
    
    # Calculate portfolio value
    portfolio_data = calculate_portfolio_value(profile_data)
    if not portfolio_data:
        # Return empty data if calculation fails
        print(json.dumps({
            'success': True,
            'stickers': [],
            'portfolio_value': {
                'collections': [],
                'total_init': 0,
                'total_current': 0,
                'total_pnl': 0
            },
            'profile': {
                'user': {'id': user_id, 'name': 'Unknown', 'username': 'N/A'},
                'total_nfts': 0,
                'total_stickers': 0
            }
        }), flush=True)
        return
    
    # Output result
    output = {
        'success': True,
        'stickers': portfolio_data['collections'],
        'portfolio_value': {
            'collections': portfolio_data['collections'],
            'total_init': portfolio_data['totals']['init_value'],
            'total_current': portfolio_data['totals']['current_value'],
            'total_pnl': portfolio_data['totals']['pnl']
        },
        'profile': {
            'user': portfolio_data['user'],
            'total_nfts': portfolio_data['totals']['nfts'],
            'total_stickers': portfolio_data['totals']['stickers']
        }
    }
    
    print(json.dumps(output), flush=True)

if __name__ == '__main__':
    asyncio.run(main())
