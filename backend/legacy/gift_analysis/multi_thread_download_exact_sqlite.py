import sqlite3
import aiohttp
import asyncio
import threading
import os
from pathlib import Path
import json
from colorama import init, Fore, Style
import logging
from bs4 import BeautifulSoup
import re
import sys

# Initialize colorama for colored terminal output
init(autoreset=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('download_log.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration
DB_DIR = Path('exports/db')
FRAGMENT_URL = "https://nft.fragment.com/gift"
TELEGRAM_URL = "https://t.me/nft"
RETRIES = 5
INITIAL_RETRY_DELAY = 1000  # in milliseconds
BATCH_SIZE = 5  # Number of items per batch
MAX_CONCURRENT_REQUESTS = 10  # Maximum concurrent HTTP requests per gift

# Ensure directories exist
DB_DIR.mkdir(parents=True, exist_ok=True)

# Parse Telegram URL to extract gift name and item ID
def parse_telegram_url(url):
    """
    Parse a Telegram NFT URL to extract gift name and item ID.
    Example: http://t.me/nft/PetSnake-60869 -> ('PetSnake', 60869)
    """
    # Remove protocol and normalize
    url = url.replace('http://', '').replace('https://', '')
    
    # Match pattern: t.me/nft/GiftName-ItemID
    pattern = r't\.me/nft/([A-Za-z0-9]+)-(\d+)'
    match = re.search(pattern, url)
    
    if match:
        gift_name = match.group(1)
        item_id = int(match.group(2))
        return gift_name, item_id
    else:
        raise ValueError(f"Invalid Telegram URL format: {url}. Expected format: http://t.me/nft/GiftName-ItemID")

# Initialize SQLite database
def init_db(gift_name, append_mode=False):
    db_path = DB_DIR / f"{gift_name}.db"
    
    # Only remove existing database if not in append mode
    if db_path.exists() and not append_mode:
        os.remove(db_path)
    
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    
    # Create tables with new columns isOnTelegram and isOnBlockchain
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY,
            name TEXT,
            description TEXT,
            image TEXT,
            attributes TEXT,
            lottie TEXT,
            isOnTelegram INTEGER,
            isOnBlockchain INTEGER
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    
    # Verify table existence
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    if 'items' not in tables or 'metadata' not in tables:
        raise Exception("Table verification failed: items or metadata table not found")
    
    conn.commit()
    return conn

# Scrape Telegram page for item data
async def scrape_telegram(gift_name, item_id, session, semaphore):
    url = f"{TELEGRAM_URL}/{gift_name}-{item_id}"
    default_item = {
        'id': item_id,
        'name': f"{gift_name} #{item_id}",
        'description': f"An exclusive {gift_name} NFT",
        'image': f"{FRAGMENT_URL}/{gift_name}-{item_id}.webp",
        'attributes': [],
        'lottie': f"{FRAGMENT_URL}/{gift_name}-{item_id}.lottie.json",
        'isOnTelegram': 1,
        'isOnBlockchain': 0
    }
    
    async with semaphore:
        try:
            async with session.get(url, headers={
                'Accept': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }) as response:
                if response.ok:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Extract data from meta tags
                    name = soup.find('meta', property='og:title')
                    description = soup.find('meta', property='og:description')
                    image = soup.find('meta', property='og:image')
                    
                    item = default_item.copy()
                    item['name'] = name['content'] if name and name.get('content') else default_item['name']
                    item['description'] = description['content'] if description and description.get('content') else default_item['description']
                    item['image'] = image['content'] if image and image.get('content') else default_item['image']
                    
                    # Enhanced attribute extraction from HTML table
                    attributes = []
                    
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
                                    attributes.append({"trait_type": trait_type, "value": value})
                    
                    # Fallback to parsing description if no table found
                    if not attributes and description and description.get('content'):
                        for line in description['content'].strip().split('\n'):
                            if ':' in line:
                                parts = line.split(':', 1)
                                if len(parts) == 2:
                                    trait_type, value = map(str.strip, parts)
                                    attributes.append({"trait_type": trait_type, "value": value})
                    
                    item['attributes'] = attributes
                    
                    logger.info(f"{Fore.RED}Scraped item {gift_name} #{item_id} from Telegram{Style.RESET_ALL}")
                    return item
                else:
                    logger.warning(f"{Fore.LIGHTBLACK_EX}Failed to scrape {url}: HTTP {response.status}{Style.RESET_ALL}")
                    return default_item
        
        except Exception as e:
            logger.error(f"{Fore.LIGHTBLACK_EX}Error scraping {url}: {str(e)}{Style.RESET_ALL}")
            return default_item

# Download function for a single item (async)
async def download_item(gift_name, item_id, session, semaphore):
    url = f"{FRAGMENT_URL}/{gift_name}-{item_id}.json"
    item = None
    
    async with semaphore:
        for attempt in range(1, RETRIES + 1):
            try:
                async with session.get(url, headers={
                    'Accept': 'application/json',
                    'User-Agent': 'NFT-Fragment-Client/1.0'
                }) as response:
                    if response.status == 404:
                        logger.info(f"{Fore.RED}Item {gift_name} #{item_id} not found on Fragment, scraping from Telegram...{Style.RESET_ALL}")
                        return await scrape_telegram(gift_name, item_id, session, semaphore)
                    elif response.status == 429:
                        delay = INITIAL_RETRY_DELAY * (2 ** (attempt - 1)) / 1000
                        logger.warning(f"{Fore.LIGHTBLACK_EX}Rate limit (429) for {gift_name} #{item_id}. Retrying in {delay}s...{Style.RESET_ALL}")
                        await asyncio.sleep(delay)
                        continue
                    elif response.ok:
                        logger.info(f"{Fore.YELLOW}Item {gift_name} #{item_id} found (is on Blockchain){Style.RESET_ALL}")
                        data = await response.json()
                        item = {
                            'id': item_id,
                            'name': data.get('name', f"{gift_name} #{item_id}"),
                            'description': data.get('description', 'No description available'),
                            'image': data.get('image', f"{FRAGMENT_URL}/{gift_name}-{item_id}.webp"),
                            'attributes': data.get('attributes', []),
                            'lottie': data.get('lottie', f"{FRAGMENT_URL}/{gift_name}-{item_id}.lottie.json"),
                            'isOnTelegram': 0,
                            'isOnBlockchain': 1
                        }
                        return item
                    else:
                        raise Exception(f"HTTP error: {response.status} {response.reason}")
            
            except Exception as e:
                if attempt < RETRIES:
                    delay = INITIAL_RETRY_DELAY * (2 ** (attempt - 1)) / 1000
                    logger.warning(f"{Fore.LIGHTBLACK_EX}Attempt {attempt} failed for {gift_name} #{item_id}: {str(e)}. Retrying in {delay}s...{Style.RESET_ALL}")
                    await asyncio.sleep(delay)
                    continue
                logger.error(f"{Fore.LIGHTBLACK_EX}Failed to fetch {gift_name} #{item_id} after {RETRIES} attempts: {str(e)}, scraping from Telegram...{Style.RESET_ALL}")
                return await scrape_telegram(gift_name, item_id, session, semaphore)
    
    # Fallback (should not reach here due to Telegram scraping)
    return {
        'id': item_id,
        'name': f"{gift_name} #{item_id}",
        'description': f"An exclusive {gift_name} NFT",
        'image': f"{FRAGMENT_URL}/{gift_name}-{item_id}.webp",
        'attributes': [],
        'lottie': f"{FRAGMENT_URL}/{gift_name}-{item_id}.lottie.json",
        'isOnTelegram': 1,
        'isOnBlockchain': 0,
        'error': True,
        'errorMessage': 'Failed to fetch or scrape item'
    }

# Function to process a batch of items (async)
async def process_batch(gift_name, batch_items, conn, lock, session, semaphore, stats):
    tasks = [download_item(gift_name, item_id, session, semaphore) for item_id in batch_items]
    items = await asyncio.gather(*tasks, return_exceptions=True)
    
    for item in items:
        if isinstance(item, Exception):
            logger.error(f"{Fore.LIGHTBLACK_EX}Error processing item for {gift_name}: {str(item)}{Style.RESET_ALL}")
            continue
        
        item_id = item['id']
        if item['isOnTelegram']:
            stats['telegram'] += 1
        if item['isOnBlockchain']:
            stats['blockchain'] += 1
        
        try:
            async with lock:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO items (id, name, description, image, attributes, lottie, isOnTelegram, isOnBlockchain)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    item['id'],
                    item['name'],
                    item['description'],
                    item['image'],
                    json.dumps(item['attributes']),
                    item['lottie'],
                    item['isOnTelegram'],
                    item['isOnBlockchain']
                ))
                conn.commit()
                logger.info(f"Inserted item #{item_id} for {gift_name}")
                
                # Update last fetched item in metadata
                cursor.execute("""
                    INSERT OR REPLACE INTO metadata (key, value)
                    VALUES (?, ?)
                """, ('lastFetchedItem', str(item_id)))
                conn.commit()
        
        except Exception as e:
            logger.error(f"{Fore.LIGHTBLACK_EX}Error inserting item #{item_id} for {gift_name}: {str(e)}{Style.RESET_ALL}")

# Main download function for a single gift (async)
async def download_collection_async(gift_name, total_items, stats):
    try:
        conn = init_db(gift_name)
        lock = asyncio.Lock()
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
        
        # Divide items into batches
        batches = [list(range(i, min(i + BATCH_SIZE, total_items + 1))) for i in range(1, total_items + 1, BATCH_SIZE)]
        
        async with aiohttp.ClientSession() as session:
            # Process batches sequentially to maintain order
            for batch in batches:
                await process_batch(gift_name, batch, conn, lock, session, semaphore, stats)
        
        logger.info(f"{Fore.GREEN}Completed downloading {total_items} items for {gift_name}{Style.RESET_ALL}")
    
    except Exception as e:
        logger.error(f"{Fore.LIGHTBLACK_EX}Error downloading collection {gift_name}: {str(e)}{Style.RESET_ALL}")
    
    finally:
        if 'conn' in locals():
            conn.close()

# Save single item to database
def save_item_to_db(conn, item, gift_name):
    """Save a single item to the database."""
    try:
        cursor = conn.cursor()
        
        # Check if item already exists
        cursor.execute("SELECT id FROM items WHERE id = ?", (item['id'],))
        exists = cursor.fetchone()
        
        if exists:
            # Update existing item
            cursor.execute("""
                UPDATE items 
                SET name = ?, description = ?, image = ?, attributes = ?, lottie = ?, 
                    isOnTelegram = ?, isOnBlockchain = ?
                WHERE id = ?
            """, (
                item['name'],
                item['description'],
                item['image'],
                json.dumps(item['attributes']),
                item['lottie'],
                item['isOnTelegram'],
                item['isOnBlockchain'],
                item['id']
            ))
            logger.info(f"{Fore.YELLOW}Updated item #{item['id']} for {gift_name}{Style.RESET_ALL}")
        else:
            # Insert new item
            cursor.execute("""
                INSERT INTO items (id, name, description, image, attributes, lottie, isOnTelegram, isOnBlockchain)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item['id'],
                item['name'],
                item['description'],
                item['image'],
                json.dumps(item['attributes']),
                item['lottie'],
                item['isOnTelegram'],
                item['isOnBlockchain']
            ))
            logger.info(f"{Fore.GREEN}Inserted item #{item['id']} for {gift_name}{Style.RESET_ALL}")
        
        conn.commit()
        
        # Update metadata
        cursor.execute("""
            INSERT OR REPLACE INTO metadata (key, value)
            VALUES (?, ?)
        """, ('lastFetchedItem', str(item['id'])))
        conn.commit()
        
        return True
    except Exception as e:
        logger.error(f"{Fore.LIGHTBLACK_EX}Error saving item #{item['id']} for {gift_name}: {str(e)}{Style.RESET_ALL}")
        return False

# Download a single gift item from URL
async def download_single_gift(url):
    """Download a single gift item from a Telegram URL."""
    try:
        # Parse URL to extract gift name and item ID
        gift_name, item_id = parse_telegram_url(url)
        logger.info(f"{Fore.BLUE}Downloading gift: {gift_name} #{item_id} from URL: {url}{Style.RESET_ALL}")
        
        # Initialize database (append mode to keep existing items)
        conn = init_db(gift_name, append_mode=True)
        
        # Statistics
        stats = {'blockchain': 0, 'telegram': 0}
        
        # Create semaphore for rate limiting
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
        
        async with aiohttp.ClientSession() as session:
            # Download the item
            item = await download_item(gift_name, item_id, session, semaphore)
            
            # Update statistics
            if item['isOnTelegram']:
                stats['telegram'] += 1
            if item['isOnBlockchain']:
                stats['blockchain'] += 1
            
            # Save to database
            save_item_to_db(conn, item, gift_name)
            
            # Print item details
            logger.info(f"{Fore.GREEN}{'='*60}{Style.RESET_ALL}")
            logger.info(f"{Fore.GREEN}Item Details:{Style.RESET_ALL}")
            logger.info(f"  ID: {item['id']}")
            logger.info(f"  Name: {item['name']}")
            logger.info(f"  Description: {item['description'][:100]}..." if len(item['description']) > 100 else f"  Description: {item['description']}")
            logger.info(f"  Image: {item['image']}")
            logger.info(f"  Attributes: {len(item['attributes'])} attributes")
            if item['attributes']:
                for attr in item['attributes']:
                    logger.info(f"    - {attr.get('trait_type', 'N/A')}: {attr.get('value', 'N/A')}")
            logger.info(f"  Source: {'Blockchain (Fragment)' if item['isOnBlockchain'] else 'Telegram'}")
            logger.info(f"{Fore.GREEN}{'='*60}{Style.RESET_ALL}")
            
        conn.close()
        
        # Summary
        logger.info(f"{Fore.CYAN}Download Summary:{Style.RESET_ALL}")
        logger.info(f"  Gift: {gift_name}")
        logger.info(f"  Item ID: {item_id}")
        logger.info(f"  Source: {'Blockchain' if stats['blockchain'] > 0 else 'Telegram'}")
        logger.info(f"  Database: {DB_DIR / f'{gift_name}.db'}")
        logger.info(f"{Fore.GREEN}✓ Download completed successfully!{Style.RESET_ALL}")
        
        return item
        
    except ValueError as e:
        logger.error(f"{Fore.RED}Invalid URL format: {str(e)}{Style.RESET_ALL}")
        return None
    except Exception as e:
        logger.error(f"{Fore.RED}Error downloading gift: {str(e)}{Style.RESET_ALL}")
        return None

# Wrapper to run async code
def download_single_gift_sync(url):
    """Synchronous wrapper for downloading a single gift."""
    return asyncio.run(download_single_gift(url))

# Wrapper to run async code in a thread
def download_collection(gift_name, total_items, stats):
    asyncio.run(download_collection_async(gift_name, total_items, stats))

if __name__ == "__main__":
    # Check if URL is provided as command line argument
    if len(sys.argv) > 1:
        url = sys.argv[1]
        logger.info(f"{Fore.CYAN}Downloading single gift from URL: {url}{Style.RESET_ALL}")
        download_single_gift_sync(url)
    else:
        # Original behavior: Download collections
        # List of gifts to download
        gifts = [
            {"name": "durovscap", "total_items": 30},
            {"name": "signetring", "total_items": 10},
        ]
        
        # Statistics for summary report
        stats = {gift['name']: {'blockchain': 0, 'telegram': 0} for gift in gifts}
        
        # Download all gifts concurrently
        threads = []
        for gift in gifts:
            thread = threading.Thread(target=download_collection, args=(gift['name'], gift['total_items'], stats[gift['name']]))
            thread.start()
            threads.append(thread)
            logger.info(f"{Fore.BLUE}Started downloading {gift['name']} ({gift['total_items']} items){Style.RESET_ALL}")
        
        # Wait for all gift downloads to complete
        for thread in threads:
            thread.join()
        
        # Print summary report
        logger.info(f"{Fore.GREEN}All gifts have been downloaded{Style.RESET_ALL}")
        logger.info(f"{Fore.CYAN}Summary Report:{Style.RESET_ALL}")
        for gift in gifts:
            name = gift['name']
            logger.info(f"{Fore.CYAN}{name}: {stats[name]['blockchain']} items on Blockchain, {stats[name]['telegram']} items on Telegram{Style.RESET_ALL}")