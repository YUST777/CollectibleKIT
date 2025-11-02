#!/usr/bin/env python3
"""
Fetch Portal Market floor price for a gift
Usage: python get_portal_price.py --gift GiftName [--model ModelName] [--backdrop BackdropName]
"""
import asyncio
import sys
import json
import argparse
import os

# Import aportalsmp for Portal Market API
try:
    from aportalsmp import search as search_gifts
    from aportalsmp import update_auth
    APORTALSMP_AVAILABLE = True
except ImportError:
    APORTALSMP_AVAILABLE = False

# Config
API_ID = 22307634
API_HASH = '7ab906fc6d065a2047a84411c1697593'

async def get_portal_market_price(gift_name, model_name=None, backdrop_name=None):
    """Fetch portal market floor price for a gift with optional attribute filters"""
    if not APORTALSMP_AVAILABLE:
        print(json.dumps({
            "success": False,
            "error": "aportalsmp library not available",
            "price": None
        }))
        sys.exit(1)
    
    portal_auth_data = None
    
    try:
        # Initialize Portal Market auth
        gifts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gifts')
        portal_auth_data = await update_auth(
            api_id=API_ID,
            api_hash=API_HASH,
            session_name="portals_session",
            session_path=gifts_dir
        )
        # Silent success
        
        # Try with collection + backdrop + model first for most accurate pricing
        results = await search_gifts(
            sort="price_asc",
            limit=1,
            gift_name=gift_name,
            backdrop=backdrop_name,
            model=model_name,
            authData=portal_auth_data
        )
        
        # If no results with model, fallback to backdrop only
        if not results and backdrop_name:
            results = await search_gifts(
                sort="price_asc",
                limit=1,
                gift_name=gift_name,
                backdrop=backdrop_name,
                authData=portal_auth_data
            )
        
        # If still no results, try gift name only
        if not results:
            results = await search_gifts(
                sort="price_asc",
                limit=1,
                gift_name=gift_name,
                authData=portal_auth_data
            )
        
        if results and len(results) > 0:
            price = float(results[0].price)
            print(json.dumps({
                "success": True,
                "price": price
            }))
            sys.exit(0)
        else:
            print(json.dumps({
                "success": False,
                "error": "No price found for this gift",
                "price": None
            }))
            sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "price": None
        }))
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Get Portal Market price for a gift')
    parser.add_argument('--gift', required=True, help='Gift collection name (e.g., IceCream)')
    parser.add_argument('--model', help='Model name (optional)')
    parser.add_argument('--backdrop', help='Backdrop name (optional)')
    
    args = parser.parse_args()
    
    asyncio.run(get_portal_market_price(args.gift, args.model, args.backdrop))

