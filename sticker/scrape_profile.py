#!/usr/bin/env python3
"""
Scrape any user's sticker profile by ID
Usage: python scrape_profile.py <user_id>
"""

import sys
import requests
import json
import os


def scrape_profile(user_id, minimal=True):
    """Scrape a user's sticker profile"""
    
    api_base = 'https://api.stickerdom.store'
    init_data_file = 'init_data.txt'
    
    # Load auth token
    if not os.path.exists(init_data_file):
        print(f"✗ File {init_data_file} not found")
        return None
    
    with open(init_data_file, 'r') as f:
        auth_token = f.read().strip()
    
    # Make request
    endpoint = f'/api/v1/user/{user_id}/profile'
    url = f"{api_base}{endpoint}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {auth_token}',
    }
    
    print(f"Scraping profile for user: {user_id}")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok') == True:
                print("✓ SUCCESS!")
                
                # Display summary
                print("\n" + "="*70)
                print("PROFILE SUMMARY")
                print("="*70)
                
                user_meta = data['data']['meta']
                print(f"Name: {user_meta['full_name']}")
                print(f"ID: {user_meta['id']}")
                
                collections = data['data']['collections']
                print(f"Collections: {len(collections)}")
                print()
                
                # Process minimal data
                owned_stickers = []
                
                for coll in collections:
                    coll_name = coll['collection']['title']
                    chars_with_nfts = [char for char in coll['characters'] if char.get('token_id')]
                    
                    if chars_with_nfts:
                        for char in chars_with_nfts:
                            char_name = char['name']
                            token_id = char['token_id']
                            
                            # Get sticker IDs for this character
                            sticker_ids = char.get('stickers', [])
                            
                            owned_stickers.append({
                                'collection': coll_name,
                                'character': char_name,
                                'token_id': token_id,
                                'sticker_ids': sticker_ids,
                                'sticker_count': len(sticker_ids)
                            })
                            
                            print(f"✓ {coll_name} > {char_name} (#{token_id}) - {len(sticker_ids)} stickers")
                
                print()
                print(f"Total NFTs Owned: {len(owned_stickers)}")
                
                # Create minimal output
                minimal_data = {
                    'user': {
                        'id': user_meta['id'],
                        'name': user_meta['full_name']
                    },
                    'owned_stickers': owned_stickers,
                    'total_nfts': len(owned_stickers),
                    'total_stickers': sum(s['sticker_count'] for s in owned_stickers)
                }
                
                # Save minimal data
                filename = f'profile_{user_id}_minimal.json'
                with open(filename, 'w') as f:
                    json.dump(minimal_data, f, indent=2)
                print(f"✓ Minimal data saved to {filename}")
                
                # Optionally save full data
                if not minimal:
                    filename_full = f'profile_{user_id}_full.json'
                    with open(filename_full, 'w') as f:
                        json.dump(data, f, indent=2)
                    print(f"✓ Full data saved to {filename_full}")
                
                return minimal_data
            else:
                print(f"API Error: {data}")
        else:
            print(f"HTTP Error: {response.text[:300]}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    
    return None


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python scrape_profile.py <user_id> [--full]")
        print("Example: python scrape_profile.py 6651978547")
        print("Options:")
        print("  --full  Save full data (default: minimal)")
        sys.exit(1)
    
    user_id = sys.argv[1]
    full_mode = '--full' in sys.argv
    
    scrape_profile(user_id, minimal=not full_mode)

