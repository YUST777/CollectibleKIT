#!/usr/bin/env python3
"""
Analyze stickerdom.store/stats page to understand image URL patterns
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import os
from urllib.parse import urljoin, urlparse
from pathlib import Path

def download_page():
    """Download the stats page"""
    url = 'https://stickerdom.store/web/stats'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    print(f'📥 Downloading {url}...')
    response = requests.get(url, headers=headers, timeout=15)
    
    if response.status_code == 200:
        return response.text
    else:
        print(f'❌ Failed to download: {response.status_code}')
        return None

def extract_image_urls(html_content):
    """Extract all image URLs from the HTML"""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    image_urls = set()
    
    # Find all img tags
    for img in soup.find_all('img'):
        src = img.get('src') or img.get('data-src') or img.get('data-url')
        if src:
            full_url = urljoin('https://stickerdom.store', src)
            image_urls.add(full_url)
    
    # Find background-image URLs in style attributes
    for element in soup.find_all(style=True):
        style = element.get('style', '')
        matches = re.findall(r'url\(["\']?([^"\'()]+)["\']?\)', style)
        for match in matches:
            full_url = urljoin('https://stickerdom.store', match)
            image_urls.add(full_url)
    
    # Find in JavaScript/data attributes
    for script in soup.find_all('script'):
        if script.string:
            # Look for CDN URLs
            cdn_matches = re.findall(r'https://cdn\.stickerdom\.store/[^\s"\'<>]+', script.string)
            image_urls.update(cdn_matches)
    
    # Look for any CDN references in the HTML
    cdn_matches = re.findall(r'https://cdn\.stickerdom\.store/[^\s"\'<>]+', html_content)
    image_urls.update(cdn_matches)
    
    return sorted(image_urls)

def analyze_url_patterns(urls):
    """Analyze URL patterns to understand the structure"""
    patterns = {
        'preview': [],  # /p/{number}/...
        'thumbnail': [],  # /t/{number}/...
        'header': [],  # /c/header.png
        'cover': [],  # /c/cover.png
        'logo': [],  # /c/logo.png
        'other': []
    }
    
    for url in urls:
        # Parse CDN URLs
        if 'cdn.stickerdom.store' in url:
            # Pattern: https://cdn.stickerdom.store/{collection_id}/p/{sticker_number}/{frame}.png?v={version}
            # Pattern: https://cdn.stickerdom.store/{collection_id}/t/{sticker_number}/{frame}.png?v={version}
            # Pattern: https://cdn.stickerdom.store/{collection_id}/c/{type}.png?v={version}
            
            match = re.search(r'cdn\.stickerdom\.store/(\d+)/([ptc])/(\d+)/(\d+)\.png', url)
            if match:
                collection_id = match.group(1)
                type_char = match.group(2)  # p=preview, t=thumbnail, c=cover/header/logo
                sticker_or_frame = match.group(3)
                frame = match.group(4)
                
                if type_char == 'p':
                    patterns['preview'].append({
                        'url': url,
                        'collection_id': collection_id,
                        'sticker_number': sticker_or_frame,
                        'frame': frame
                    })
                elif type_char == 't':
                    patterns['thumbnail'].append({
                        'url': url,
                        'collection_id': collection_id,
                        'sticker_number': sticker_or_frame,
                        'frame': frame
                    })
            
            # Collection images (header, cover, logo)
            match = re.search(r'cdn\.stickerdom\.store/(\d+)/c/(\w+)\.png', url)
            if match:
                collection_id = match.group(1)
                image_type = match.group(2)
                patterns['header'].append({
                    'url': url,
                    'collection_id': collection_id,
                    'type': image_type
                })
    
    return patterns

def main():
    print('🔍 Analyzing stickerdom.store/stats page...\n')
    
    # Download page
    html = download_page()
    if not html:
        return
    
    # Save HTML for inspection
    os.makedirs('analysis', exist_ok=True)
    with open('analysis/stats_page.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print('✅ Saved HTML to analysis/stats_page.html\n')
    
    # Extract image URLs
    print('📸 Extracting image URLs...')
    image_urls = extract_image_urls(html)
    print(f'Found {len(image_urls)} unique image URLs\n')
    
    # Save URLs
    with open('analysis/image_urls.txt', 'w') as f:
        for url in sorted(image_urls):
            f.write(url + '\n')
    print('✅ Saved URLs to analysis/image_urls.txt\n')
    
    # Analyze patterns
    print('🔬 Analyzing URL patterns...')
    patterns = analyze_url_patterns(image_urls)
    
    # Print results
    print('\n📊 URL Pattern Analysis:')
    print('=' * 60)
    
    print(f'\n🎨 Preview Images (p/): {len(patterns["preview"])}')
    if patterns['preview']:
        # Group by collection
        by_collection = {}
        for item in patterns['preview'][:20]:  # Show first 20
            coll_id = item['collection_id']
            if coll_id not in by_collection:
                by_collection[coll_id] = []
            by_collection[coll_id].append(item['sticker_number'])
        
        for coll_id, sticker_nums in sorted(by_collection.items()):
            sticker_nums_sorted = sorted(set(int(n) for n in sticker_nums))
            print(f'  Collection {coll_id}: stickers {min(sticker_nums_sorted)}-{max(sticker_nums_sorted)} ({len(sticker_nums_sorted)} unique)')
            print(f'    Example: {patterns["preview"][0]["url"]}')
    
    print(f'\n🖼️ Thumbnail Images (t/): {len(patterns["thumbnail"])}')
    if patterns['thumbnail']:
        print(f'    Example: {patterns["thumbnail"][0]["url"]}')
    
    print(f'\n📋 Collection Images (c/): {len(patterns["header"])}')
    if patterns['header']:
        for item in patterns['header'][:5]:
            print(f'    {item["url"]}')
    
    # Find CDN URL patterns in general
    print(f'\n🔗 All CDN URLs found: {len([u for u in image_urls if "cdn.stickerdom.store" in u])}')
    
    # Extract collection IDs and their sticker ranges
    print('\n📚 Collection Sticker Ranges:')
    print('=' * 60)
    collection_ranges = {}
    
    for url in image_urls:
        if 'cdn.stickerdom.store' in url:
            # Pattern: /{collection_id}/p/{sticker_number}/
            match = re.search(r'/(\d+)/p/(\d+)/', url)
            if match:
                coll_id = match.group(1)
                sticker_num = int(match.group(2))
                
                if coll_id not in collection_ranges:
                    collection_ranges[coll_id] = {'min': sticker_num, 'max': sticker_num, 'count': 0}
                
                collection_ranges[coll_id]['min'] = min(collection_ranges[coll_id]['min'], sticker_num)
                collection_ranges[coll_id]['max'] = max(collection_ranges[coll_id]['max'], sticker_num)
                collection_ranges[coll_id]['count'] += 1
    
    for coll_id in sorted(collection_ranges.keys(), key=int):
        info = collection_ranges[coll_id]
        print(f'  Collection {coll_id}: stickers {info["min"]}-{info["max"]} (found {info["count"]} URLs)')
    
    # Save analysis JSON
    with open('analysis/url_analysis.json', 'w') as f:
        json.dump({
            'total_urls': len(image_urls),
            'patterns': patterns,
            'collection_ranges': collection_ranges,
            'sample_urls': list(image_urls)[:50]
        }, f, indent=2)
    
    print(f'\n✅ Analysis saved to analysis/url_analysis.json')
    print(f'\n💡 Key Finding: URL format is:')
    print(f'   https://cdn.stickerdom.store/{{collection_id}}/p/{{sticker_number}}/1.png?v=3')
    print(f'   Where sticker_number is sequential (1, 2, 3...) within each collection')

if __name__ == '__main__':
    main()

