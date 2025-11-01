#!/usr/bin/env python3
"""
Fetch gift price from Portal Market
Uses aportalsmp to search for gifts with optional model/backdrop filters
"""
import asyncio
import sys
import json
import os

# Try to import aportalsmp - this requires the package to be installed
try:
    from aportalsmp import search as search_gifts
    from aportalsmp import update_auth
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "aportalsmp package not available"
    }))
    sys.exit(1)

# Import config
try:
    from config import API_ID, API_HASH
except ImportError:
    try:
        # Try showprofilegifts config
        showprofile_config = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'showprofilegifts', 'config.py')
        if os.path.exists(showprofile_config):
            import importlib.util
            spec = importlib.util.spec_from_file_location("config", showprofile_config)
            config_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(config_module)
            API_ID = config_module.API_ID
            API_HASH = config_module.API_HASH
        else:
            print(json.dumps({
                "success": False,
                "error": "No config.py found"
            }))
            sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Error loading config: {e}"
        }))
        sys.exit(1)

async def get_gift_price(gift_name, model_name=None, backdrop_name=None):
    """Fetch Portal Market floor price for a gift"""
    try:
        # Initialize Portal Market auth
        # Use the gifts directory where the portals_session should be
        gifts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gifts')
        portal_auth_data = await update_auth(
            api_id=API_ID,
            api_hash=API_HASH,
            session_name="portals_session",
            session_path=gifts_dir
        )
        
        if not portal_auth_data:
            print(json.dumps({
                "success": False,
                "error": "Failed to authenticate with Portal Market"
            }))
            sys.exit(1)
        
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
        
        # If still no results, try with gift name only
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
        else:
            print(json.dumps({
                "success": True,
                "price": None,
                "error": "No listings found"
            }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Missing gift_name parameter"
        }))
        sys.exit(1)
    
    gift_name = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != 'None' else None
    backdrop_name = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != 'None' else None
    
    asyncio.run(get_gift_price(gift_name, model_name, backdrop_name))

