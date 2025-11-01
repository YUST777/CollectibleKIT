#!/usr/bin/env python3
"""
Test script to understand sticker ID mapping from API response
"""

import json
import os
from pathlib import Path

# Check if we have any cached profile data
profile_files = list(Path('.').glob('profile_*_minimal.json'))

if profile_files:
    print(f'Found {len(profile_files)} cached profiles\n')
    
    # Load one profile to see structure
    sample_file = profile_files[0]
    print(f'Loading {sample_file}...\n')
    
    with open(sample_file, 'r') as f:
        profile = json.load(f)
    
    print('Profile structure:')
    print(f'  User: {profile["user"]["name"]} (ID: {profile["user"]["id"]})')
    print(f'  Total NFTs: {profile["total_nfts"]}')
    print(f'  Total Stickers: {profile["total_stickers"]}')
    
    print('\n📊 Sample sticker entries:')
    for i, sticker in enumerate(profile['owned_stickers'][:5]):
        print(f'\n  Sticker #{i+1}:')
        print(f'    Collection: {sticker["collection"]}')
        print(f'    Character: {sticker["character"]}')
        print(f'    Token ID: {sticker["token_id"]}')
        print(f'    Sticker IDs (Telegram): {sticker["sticker_ids"]}')
        print(f'    Sticker Count: {sticker["sticker_count"]}')
    
    print('\n💡 Issue: We have Telegram sticker IDs but need sequential numbers (1, 2, 3...)')
    print('   The API provides sticker_ids like [685, 686, 687] but CDN needs [14, 15, 16]')
    print('   We need to find the stickers array in the full API response to map positions')
else:
    print('No cached profiles found. Run the portfolio bot first to fetch a profile.')

