#!/usr/bin/env python3
"""
Get sticker pack pricing from stickers.tools API
"""

import requests
import json


def get_pricing_data():
    """Fetch pricing data from stickers.tools API"""
    
    url = 'https://stickers.tools/api/stats-new'
    
    print("Fetching pricing data from stickers.tools...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Save to file
            with open('pricing_data.json', 'w') as f:
                json.dump(data, f, indent=2)
            print(f"✓ Pricing data saved to pricing_data.json")
            print(f"✓ Found {len(data)} collections")
            return data
        else:
            print(f"Error: {response.status_code}")
            print(response.text[:500])
            return None
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def analyze_pricing():
    """Analyze the pricing structure"""
    try:
        with open('pricing_data.json') as f:
            data = json.load(f)
        
        print("\n" + "="*70)
        print("PRICING DATA STRUCTURE")
        print("="*70)
        
        if isinstance(data, list) and len(data) > 0:
            print(f"\nFirst collection sample:")
            print(json.dumps(data[0], indent=2))
        elif isinstance(data, dict):
            print("\nData structure:")
            print(json.dumps(data, indent=2))
        else:
            print(f"\nUnknown data structure: {type(data)}")
        
    except Exception as e:
        print(f"Error analyzing: {e}")


if __name__ == '__main__':
    data = get_pricing_data()
    if data:
        analyze_pricing()

