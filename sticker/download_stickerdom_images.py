#!/usr/bin/env python3
"""
Download and analyze sticker images from stickerdom.store/stats
Uses Selenium to render the React app and extract image URLs
"""

import json
import re
import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from pathlib import Path
from urllib.parse import urlparse

def setup_driver():
    """Setup headless Chrome driver"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def extract_image_urls_from_page_source(page_source, network_logs=None):
    """Extract all CDN image URLs from page source and network logs"""
    image_urls = set()
    
    # Pattern 1: Direct CDN URLs in source
    cdn_pattern = r'https://cdn\.stickerdom\.store/[^\s"\'<>\)]+\.(?:png|jpg|jpeg|webp|gif|svg)'
    matches = re.findall(cdn_pattern, page_source)
    image_urls.update(matches)
    
    # Pattern 2: In JSON data
    json_patterns = [
        r'"(https://cdn\.stickerdom\.store/[^"]+)"',
        r"'(https://cdn\.stickerdom\.store/[^']+)'",
    ]
    for pattern in json_patterns:
        matches = re.findall(pattern, page_source)
        image_urls.update(matches)
    
    # Pattern 3: In network logs if available
    if network_logs:
        for log in network_logs:
            if 'message' in log and 'params' in log['message']:
                url = log['message']['params'].get('request', {}).get('url', '')
                if 'cdn.stickerdom.store' in url and any(ext in url for ext in ['.png', '.jpg', '.jpeg', '.webp']):
                    image_urls.add(url)
    
    return sorted(image_urls)

def analyze_url_pattern(url):
    """Parse a stickerdom CDN URL to extract structure"""
    # Pattern: https://cdn.stickerdom.store/{collection_id}/{type}/{sticker_number_or_type}/{frame}.png?v={version}
    # Types: p=preview, t=thumbnail, c=collection (header/cover/logo)
    
    pattern = r'cdn\.stickerdom\.store/(\d+)/([ptc])/([^/]+)/(\d+)\.(png|jpg|jpeg|webp)'
    match = re.search(pattern, url)
    
    if match:
        return {
            'collection_id': match.group(1),
            'type': match.group(2),  # p, t, or c
            'sticker_number_or_type': match.group(3),
            'frame': match.group(4),
            'format': match.group(5)
        }
    
    # Collection images (header, cover, logo)
    pattern2 = r'cdn\.stickerdom\.store/(\d+)/c/(\w+)\.(png|jpg|jpeg)'
    match2 = re.search(pattern2, url)
    if match2:
        return {
            'collection_id': match2.group(1),
            'type': 'c',
            'image_type': match2.group(2),  # header, cover, logo
            'format': match2.group(3)
        }
    
    return None

def main():
    print('🔍 Analyzing stickerdom.store/web/stats with Selenium...\n')
    
    driver = None
    try:
        print('🚀 Starting browser...')
        driver = setup_driver()
        
        url = 'https://stickerdom.store/web/stats'
        print(f'📥 Loading {url}...')
        driver.get(url)
        
        # Wait for page to load (React app needs time to render)
        print('⏳ Waiting for page to render (15 seconds)...')
        time.sleep(15)
        
        # Try to wait for content
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
        except:
            pass
        
        # Get page source after rendering
        page_source = driver.page_source
        
        # Save page source
        os.makedirs('analysis', exist_ok=True)
        with open('analysis/stats_page_rendered.html', 'w', encoding='utf-8') as f:
            f.write(page_source)
        print('✅ Saved rendered HTML to analysis/stats_page_rendered.html\n')
        
        # Get network logs if possible (may not work in headless)
        network_logs = []
        try:
            performance_logs = driver.get_log('performance')
            network_logs = [json.loads(log['message']) for log in performance_logs if 'Network' in log.get('message', '')]
        except:
            pass
        
        # Extract image URLs
        print('📸 Extracting image URLs from page...')
        image_urls = extract_image_urls_from_page_source(page_source, network_logs)
        print(f'Found {len(image_urls)} image URLs\n')
        
        # Filter CDN URLs
        cdn_urls = [url for url in image_urls if 'cdn.stickerdom.store' in url]
        print(f'Found {len(cdn_urls)} CDN URLs\n')
        
        # Analyze patterns
        print('🔬 Analyzing URL patterns...\n')
        analyzed = {}
        collection_stickers = {}  # collection_id -> set of sticker numbers
        
        for url in cdn_urls:
            parsed = analyze_url_pattern(url)
            if parsed:
                coll_id = parsed['collection_id']
                
                if coll_id not in analyzed:
                    analyzed[coll_id] = {
                        'collection_id': coll_id,
                        'preview_urls': [],
                        'thumbnail_urls': [],
                        'collection_images': [],
                        'sticker_numbers': set()
                    }
                
                if parsed['type'] == 'p':
                    sticker_num = parsed.get('sticker_number_or_type')
                    if sticker_num and sticker_num.isdigit():
                        analyzed[coll_id]['sticker_numbers'].add(int(sticker_num))
                        analyzed[coll_id]['preview_urls'].append(url)
                elif parsed['type'] == 't':
                    analyzed[coll_id]['thumbnail_urls'].append(url)
                elif parsed['type'] == 'c':
                    analyzed[coll_id]['collection_images'].append(url)
        
        # Print findings
        print('📊 Analysis Results:')
        print('=' * 80)
        
        for coll_id in sorted(analyzed.keys(), key=int):
            info = analyzed[coll_id]
            sticker_nums = sorted(info['sticker_numbers'])
            
            if sticker_nums:
                min_sticker = min(sticker_nums)
                max_sticker = max(sticker_nums)
                print(f'\n📦 Collection {coll_id}:')
                print(f'   Sticker range: {min_sticker} - {max_sticker} ({len(sticker_nums)} stickers)')
                print(f'   Preview URLs: {len(info["preview_urls"])}')
                print(f'   Thumbnail URLs: {len(info["thumbnail_urls"])}')
                print(f'   Example URL: {info["preview_urls"][0] if info["preview_urls"] else "N/A"}')
            else:
                print(f'\n📦 Collection {coll_id}:')
                print(f'   Collection images: {len(info["collection_images"])}')
                if info['collection_images']:
                    print(f'   Examples:')
                    for img_url in info['collection_images'][:3]:
                        print(f'     {img_url}')
        
        # Summary
        print('\n' + '=' * 80)
        print('📚 Summary:')
        print(f'   Total collections found: {len(analyzed)}')
        total_stickers = sum(len(info['sticker_numbers']) for info in analyzed.values())
        print(f'   Total unique sticker numbers: {total_stickers}')
        
        # Save results
        results = {
            'total_cdn_urls': len(cdn_urls),
            'collections': {}
        }
        
        for coll_id, info in analyzed.items():
            results['collections'][coll_id] = {
                'collection_id': coll_id,
                'sticker_numbers': sorted(info['sticker_numbers']),
                'sticker_range': {
                    'min': min(info['sticker_numbers']) if info['sticker_numbers'] else None,
                    'max': max(info['sticker_numbers']) if info['sticker_numbers'] else None,
                    'count': len(info['sticker_numbers'])
                },
                'sample_preview_urls': info['preview_urls'][:5],
                'collection_images': info['collection_images']
            }
        
        with open('analysis/sticker_analysis.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        with open('analysis/all_cdn_urls.txt', 'w') as f:
            for url in sorted(cdn_urls):
                f.write(url + '\n')
        
        print(f'\n✅ Results saved to:')
        print(f'   - analysis/sticker_analysis.json')
        print(f'   - analysis/all_cdn_urls.txt')
        print(f'\n💡 Key Finding:')
        print(f'   URL format: https://cdn.stickerdom.store/{{collection_id}}/p/{{sticker_number}}/1.png?v=3')
        print(f'   sticker_number is sequential (1, 2, 3...) within each collection')
        
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
    finally:
        if driver:
            driver.quit()
            print('\n✅ Browser closed')

if __name__ == '__main__':
    main()

