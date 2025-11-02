#!/usr/bin/env python3
"""
Fetch gift metadata (attributes) from Telegram NFT page
Usage: python get_gift_metadata.py PetSnake 60869
Returns JSON with attributes (Model, Backdrop, Symbol, Quantity)
"""
import asyncio
import sys
import json
import re
import aiohttp
from bs4 import BeautifulSoup

# Configuration
TELEGRAM_URL = "https://t.me/nft"

async def get_gift_metadata(gift_name, item_id):
    """Fetch gift metadata from Telegram NFT page"""
    url = f"{TELEGRAM_URL}/{gift_name}-{item_id}"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers={
                'Accept': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }) as response:
                if response.ok:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Extract attributes from HTML table
                    attributes = {}
                    
                    # Try to extract from table rows
                    table = soup.find('table')
                    if table:
                        rows = table.find_all('tr')
                        for row in rows:
                            cells = row.find_all(['td', 'th'])
                            if len(cells) >= 2:
                                trait_type = cells[0].get_text(strip=True)
                                value = cells[1].get_text(strip=True)
                                if trait_type and value and trait_type not in ['Owner', 'Portal']:
                                    attributes[trait_type] = value
                    
                    # Parse specific attributes and clean up (remove percentages)
                    model_raw = attributes.get('Model', '')
                    backdrop_raw = attributes.get('Backdrop', '')
                    symbol_raw = attributes.get('Symbol', '')
                    quantity = attributes.get('Quantity', None)
                    
                    # Extract just the name part (remove percentage)
                    # Handle cases like "Sunflower 0.3%" -> "Sunflower"
                    model = re.sub(r'\s*\d+\.?\d*\s*%?$', '', model_raw).strip() if model_raw else None
                    backdrop = re.sub(r'\s*\d+\.?\d*\s*%?$', '', backdrop_raw).strip() if backdrop_raw else None
                    symbol = re.sub(r'\s*\d+\.?\d*\s*%?$', '', symbol_raw).strip() if symbol_raw else None
                    
                    result = {
                        "success": True,
                        "gift_name": gift_name,
                        "item_id": item_id,
                        "model": model,
                        "backdrop": backdrop,
                        "symbol": symbol,
                        "quantity": quantity,
                        "attributes": attributes
                    }
                    
                    print(json.dumps(result))
                    return result
                else:
                    error = {
                        "success": False,
                        "error": f"HTTP {response.status}: Could not fetch gift metadata"
                    }
                    print(json.dumps(error))
                    return error
                    
    except Exception as e:
        error = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error))
        return error

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        gift_name = sys.argv[1]
        item_id = int(sys.argv[2])
        asyncio.run(get_gift_metadata(gift_name, item_id))
    else:
        error = {
            "success": False,
            "error": "Usage: python get_gift_metadata.py <GiftName> <ItemID>"
        }
        print(json.dumps(error))
        sys.exit(1)

