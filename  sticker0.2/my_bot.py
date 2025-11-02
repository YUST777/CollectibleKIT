#!/usr/bin/env python3
"""
Simple Sticker Portfolio Bot
A single-file bot that gets portfolio values from stickerdom.store
"""

import os
import re
import json
import requests
import logging
import asyncio
from datetime import datetime
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from telethon import TelegramClient, functions

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configuration
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
API_BASE = 'https://api.stickerdom.store'
PRICING_API = 'https://stickers.tools/api/stats-new'
BOT_USERNAME = os.getenv('TELEGRAM_BOT_USERNAME', '')
TELEGRAM_API_ID = os.getenv('TELEGRAM_API_ID')
TELEGRAM_API_HASH = os.getenv('TELEGRAM_API_HASH')
TELEGRAM_SESSION_NAME = os.getenv('TELEGRAM_SESSION_NAME', 'gifts_session')

# Setup logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Global variables for auth
current_jwt_token = None
pricing_data = None
refresh_task = None  # Background task for auto-refresh

async def get_webview_url(client: TelegramClient, bot_username: str = None) -> dict:
    """Get webview URL using Telethon - exact code from working implementation"""
    if not bot_username:
        bot_username = BOT_USERNAME
    
    if not bot_username:
        logger.error("bot_username not provided")
        return None
    
    try:
        bot = await client.get_entity(bot_username)
        
        # Exact code as provided - this should work
        result = await client(functions.messages.RequestWebViewRequest(
            peer=bot,
            bot=bot,
            platform="ios",
            url="https://api.stickerdom.store/api/v1/auth",
        ))
        
        logger.info(f"✅ WebView URL obtained successfully")
        return result
        
    except Exception as e:
        logger.error(f"WebView request error: {e}")
        return None

async def get_fresh_init_data() -> str:
    """Get fresh initData using Telethon webview"""
    if not TELEGRAM_API_ID or not TELEGRAM_API_HASH:
        logger.error("TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in environment")
        return None
    
    if not BOT_USERNAME:
        logger.error("BOT_USERNAME must be set in environment")
        return None
    
    client = None
    try:
        # Initialize Telethon client - must use USER account (not bot) for webview requests
        # Bots cannot request webviews, so we need a user session
        client = TelegramClient(TELEGRAM_SESSION_NAME, int(TELEGRAM_API_ID), TELEGRAM_API_HASH)
        
        # Check if session already exists
        if not client.is_connected():
            await client.connect()
        
        # Try to start with existing session, if not authenticated, will need phone login
        if not await client.is_user_authorized():
            logger.warning("Telethon session not authorized. Need to login with phone number.")
            logger.info("💡 Run 'python3 setup_telethon_session.py' to create the user session")
            logger.info("   This is a one-time setup - then the bot will work automatically!")
            return None
        
        logger.info("Telethon client started with user session")
        
        # Request webview
        result = await get_webview_url(client, BOT_USERNAME)
        
        if not result:
            logger.error("Failed to get webview URL")
            return None
        
        # Extract initData from webview result - handle both formats
        import urllib.parse
        
        webview_url = result.url if hasattr(result, 'url') else str(result)
        logger.info(f"WebView URL obtained: {webview_url[:100]}...")
        
        # Parse the URL
        parsed = urllib.parse.urlparse(webview_url)
        
        # Check query parameters first (like the working example format)
        query_params = urllib.parse.parse_qs(parsed.query)
        if 'tgWebAppData' in query_params:
            # This is the format that works! Extract and decode once
            tg_data_encoded = query_params['tgWebAppData'][0]
            init_data = urllib.parse.unquote(tg_data_encoded)
            logger.info(f"✅ Fresh initData extracted from query param (length: {len(init_data)})")
            logger.info(f"   Format: starts with 'user=' = {init_data.startswith('user=')}")
            return init_data
        
        # Fallback: check fragment (#) - this is what RequestWebViewRequest usually returns
        fragment = parsed.fragment
        if fragment and 'tgWebAppData=' in fragment:
            # Extract the value after tgWebAppData= in fragment
            init_data_encoded = fragment.split('tgWebAppData=')[1]
            # Take only up to & if present, or whole string
            if '&' in init_data_encoded:
                init_data_encoded = init_data_encoded.split('&')[0]
            
            # Decode once
            init_data_decoded = urllib.parse.unquote(init_data_encoded)
            
            # Check format - API needs format starting with 'user=', not 'query_id='
            if init_data_decoded.startswith('user='):
                # This is the webapp format that works!
                logger.info(f"✅ Fresh initData extracted from fragment (webapp format)")
                return init_data_decoded
            elif init_data_decoded.startswith('query_id='):
                # RequestWebViewRequest format - your code says this will work!
                logger.info(f"✅ RequestWebViewRequest initData obtained (query_id format)")
                logger.info(f"   Using your code - refreshing every 50 seconds!")
                return init_data_decoded
        
        logger.error("Could not extract initData from webview URL")
        return None
        
    except Exception as e:
        logger.error(f"Error getting fresh initData: {e}")
        return None
    finally:
        if client:
            await client.disconnect()
            logger.info("Telethon client disconnected")

def get_jwt_token(init_data: str) -> str:
    """Get JWT token from initData"""
    global current_jwt_token
    
    try:
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
        }
        
        # Try decoded format first (standard)
        response = requests.post(f"{API_BASE}/api/v1/auth", headers=headers, data=init_data, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok') and data.get('data'):
                current_jwt_token = data['data']
                logger.info("✅ JWT token obtained successfully")
                return current_jwt_token
            else:
                # If failed, maybe API needs encoded version - try it
                logger.warning(f"Decoded format rejected: {data.get('errorCode')}, trying URL-encoded...")
                import urllib.parse
                encoded_init = urllib.parse.quote(init_data, safe='=&')
                response2 = requests.post(f"{API_BASE}/api/v1/auth", headers=headers, data=encoded_init, timeout=15)
                if response2.status_code == 200:
                    data2 = response2.json()
                    if data2.get('ok') and data2.get('data'):
                        current_jwt_token = data2['data']
                        logger.info("✅ JWT token obtained with encoded format")
                        return current_jwt_token
        
        logger.error(f"Auth failed: {response.status_code} - {response.text}")
        return None
        
    except Exception as e:
        logger.error(f"Auth error: {e}")
        return None

def get_user_portfolio(user_id: str, retry_with_refresh: bool = True) -> dict:
    """Get user portfolio from API, auto-refresh token if expired"""
    global current_jwt_token
    
    if not current_jwt_token:
        # Try to refresh initData and get new token
        if retry_with_refresh:
            logger.info("No JWT token, attempting to refresh initData...")
            try:
                # Check if we're in an async context
                try:
                    loop = asyncio.get_running_loop()
                    # We're in async context - can't use asyncio.run()
                    # Create a task to run in background
                    logger.warning("Event loop running - refresh will happen in background")
                    # For now, return None - the refresh should happen on startup
                    # TODO: Use a background task for refresh
                except RuntimeError:
                    # No running loop - safe to use asyncio.run()
                    init_data = asyncio.run(get_fresh_init_data())
                    if init_data:
                        get_jwt_token(init_data)
            except Exception as e:
                logger.error(f"Failed to refresh initData: {e}")
        
        if not current_jwt_token:
            logger.error("No JWT token available - cannot fetch portfolio")
            logger.info("💡 To fix: Get initData from stickerdom.store and set MANUAL_INIT_DATA env var")
            logger.info("   Or run: python3 setup_telethon_session.py to enable auto-refresh")
            return None
    
    try:
        headers = {
            'Authorization': f'Bearer {current_jwt_token}',
            'Accept': 'application/json',
        }
        
        response = requests.get(f"{API_BASE}/api/v1/user/{user_id}/profile", headers=headers, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                return data.get('data')
        
        # If unauthorized (401) or forbidden (403), token might be expired
        if response.status_code in [401, 403] and retry_with_refresh:
            logger.warning(f"Token expired (status {response.status_code}), refreshing...")
            # Clear token and try to refresh
            current_jwt_token = None
            try:
                # Try to get existing event loop, or create new one
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        logger.warning("Event loop is running, cannot refresh initData synchronously")
                    else:
                        init_data = asyncio.run(get_fresh_init_data())
                        if init_data:
                            new_token = get_jwt_token(init_data)
                            if new_token:
                                # Retry the request once with new token
                                logger.info("Retrying portfolio request with refreshed token...")
                                headers['Authorization'] = f'Bearer {new_token}'
                                retry_response = requests.get(f"{API_BASE}/api/v1/user/{user_id}/profile", headers=headers, timeout=15)
                                if retry_response.status_code == 200:
                                    retry_data = retry_response.json()
                                    if retry_data.get('ok'):
                                        logger.info("✅ Successfully refreshed token and got portfolio")
                                        return retry_data.get('data')
                except RuntimeError:
                    # No event loop, create new one
                    init_data = asyncio.run(get_fresh_init_data())
                    if init_data:
                        new_token = get_jwt_token(init_data)
                        if new_token:
                            headers['Authorization'] = f'Bearer {new_token}'
                            retry_response = requests.get(f"{API_BASE}/api/v1/user/{user_id}/profile", headers=headers, timeout=15)
                            if retry_response.status_code == 200:
                                retry_data = retry_response.json()
                                if retry_data.get('ok'):
                                    logger.info("✅ Successfully refreshed token and got portfolio")
                                    return retry_data.get('data')
            except Exception as e:
                logger.error(f"Failed to refresh token: {e}")
        
        logger.error(f"Profile request failed: {response.status_code}")
        return None
        
    except Exception as e:
        logger.error(f"Profile error: {e}")
        return None

def get_pricing_data():
    """Get pricing data from stickers.tools"""
    global pricing_data
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
        }
        
        response = requests.get(PRICING_API, headers=headers, timeout=30)
        
        if response.status_code == 200:
            pricing_data = response.json()
            logger.info("Pricing data loaded successfully")
            return pricing_data
        
        logger.error(f"Pricing request failed: {response.status_code}")
        return None
        
    except Exception as e:
        logger.error(f"Pricing error: {e}")
        return None

def calculate_portfolio_value(profile_data: dict) -> dict:
    """Calculate portfolio value"""
    global pricing_data
    
    if not pricing_data:
        get_pricing_data()
    
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
        logger.error(f"Portfolio calculation error: {e}")
        return None

def format_portfolio_message(portfolio_data: dict) -> str:
    """Format portfolio data into a nice message"""
    
    if not portfolio_data:
        return "❌ Could not calculate portfolio value"
    
    user = portfolio_data['user']
    collections = portfolio_data['collections']
    totals = portfolio_data['totals']
    
    lines = []
    lines.append(f"📊 Portfolio: {user['name']}")
    if user['username'] != 'N/A':
        lines.append(f"👤 Username: @{user['username']}")
    lines.append(f"🆔 ID: {user['id']}")
    lines.append("")
    
    if not collections:
        lines.append("📭 No NFTs found in this portfolio")
        return "\n".join(lines)
    
    # Show collections
    for coll in collections:
        pnl_emoji = "📈" if coll['pnl'] >= 0 else "📉"
        pnl_sign = "+" if coll['pnl'] >= 0 else ""
        
        lines.append(f"🔹 {coll['name']}")
        lines.append(f"   NFTs: {coll['nfts']} | Stickers: {coll['stickers']}")
        lines.append(f"   Initial: ${coll['init_value']:.2f} | Current: ${coll['current_value']:.2f}")
        lines.append(f"   {pnl_emoji} PNL: ${pnl_sign}{coll['pnl']:.2f} ({coll['pnl_percent']:+.1f}%)")
        
        # Show top items
        for item in coll['items'][:3]:  # Show first 3 items
            lines.append(f"     • {item['name']} (#{item['token_id']}) - {item['stickers']} stickers")
        
        if len(coll['items']) > 3:
            lines.append(f"     • ... and {len(coll['items']) - 3} more")
        
        lines.append("")
    
    # Totals
    total_pnl_emoji = "📈" if totals['pnl'] >= 0 else "📉"
    total_pnl_sign = "+" if totals['pnl'] >= 0 else ""
    
    lines.append("=" * 30)
    lines.append(f"💰 Total Initial: ${totals['init_value']:.2f}")
    lines.append(f"📊 Total Current: ${totals['current_value']:.2f}")
    lines.append(f"{total_pnl_emoji} Total PNL: ${total_pnl_sign}{totals['pnl']:.2f} ({totals['pnl_percent']:+.1f}%)")
    lines.append("")
    lines.append(f"📈 Summary: {totals['nfts']} NFTs, {totals['stickers']} stickers")
    
    return "\n".join(lines)

# Bot command handlers
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send a message when the command /start is issued."""
    welcome_text = (
        "👋 Welcome to Sticker Portfolio Bot!\n\n"
        "📊 Get portfolio values from stickerdom.store\n\n"
        "🔧 Commands:\n"
        "• /portfolio <user_id> - Get portfolio value\n\n"
        "📱 Example:\n"
        "/portfolio 800092886\n\n"
        "✅ Auto-refresh: Bot automatically refreshes authentication!"
    )
    
    await update.message.reply_text(welcome_text)

async def portfolio_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /portfolio command"""
    
    # Extract user ID from command
    if not context.args:
        await update.message.reply_text(
            "❌ Please provide a user ID\n\n"
            "Example: /portfolio 800092886"
        )
        return
    
    user_id_text = ' '.join(context.args)
    
    # Extract numeric user ID
    match = re.search(r'(\d+)', user_id_text)
    if not match:
        await update.message.reply_text(
            "❌ Invalid user ID format\n\n"
            "Please provide a numeric user ID\n"
            "Example: /portfolio 800092886"
        )
        return
    
    user_id = match.group(1)
    
    # Validate user ID length
    if len(user_id) < 5 or len(user_id) > 15:
        await update.message.reply_text(
            "❌ Invalid user ID length\n\n"
            "User ID should be 5-15 digits"
        )
        return
    
    # Send typing action
    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action='typing')
    
    try:
        # Get user portfolio (will auto-refresh token if needed)
        profile_data = get_user_portfolio(user_id)
        
        if not profile_data:
            await update.message.reply_text(
                "❌ Could not fetch portfolio\n\n"
                "🔧 The bot needs 'initData' to login to stickerdom.store\n\n"
                "📝 QUICK FIX:\n"
                "1. Visit https://stickerdom.store in browser\n"
                "2. Get initData from browser network requests\n"
                "3. Add to .env file:\n"
                "   MANUAL_INIT_DATA=your_initdata_here\n"
                "4. Restart the bot\n\n"
                "Or run: python3 setup_telethon_session.py\n"
                "to enable auto-refresh forever!"
            )
            return
        
        # Calculate portfolio value
        portfolio_data = calculate_portfolio_value(profile_data)
        
        if not portfolio_data:
            await update.message.reply_text(
                "❌ Could not calculate portfolio value\n\n"
                "Pricing data may be unavailable"
            )
            return
        
        # Format and send message
        message = format_portfolio_message(portfolio_data)
        await update.message.reply_text(message)
        
        logger.info(f"Portfolio sent for user {user_id}")
        
    except Exception as e:
        logger.error(f"Portfolio command error: {e}")
        await update.message.reply_text(
            "❌ An error occurred while processing your request\n\n"
            "Please try again later"
        )

def setup_bot():
    """Setup and configure the bot"""
    
    if not BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN not found in environment variables")
        print("Please set your bot token in .env file")
        return None
    
    # Create application
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Add command handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("portfolio", portfolio_command))
    
    return application

def main():
    """Main function"""
    
    print("🚀 Starting Simple Sticker Portfolio Bot...")
    
    # Setup bot
    application = setup_bot()
    if not application:
        return
    
    # Load initial data
    print("📊 Loading pricing data...")
    try:
        if get_pricing_data():
            print("✅ Pricing data loaded")
        else:
            print("⚠️ Could not load pricing data - will retry when needed")
    except Exception as e:
        print(f"⚠️ Pricing data error: {e}")
    
    # Get fresh initData using Telethon webview (auto-refresh)
    # Note: This runs BEFORE async event loop, so asyncio.run() is safe
    print("🔐 Getting fresh initData via Telethon webview...")
    init_data = None
    try:
        init_data = asyncio.run(get_fresh_init_data())
        if init_data and len(init_data) > 50:  # Valid initData should be longer
            print(f"✅ Fresh initData obtained (length: {len(init_data)})")
        else:
            print("⚠️ Could not get valid initData via webview")
            print("💡 Webview needs USER account (not bot) - this is expected")
    except Exception as e:
        print(f"⚠️ Error getting fresh initData: {e}")
    
    # Get JWT token using fresh initData
    if init_data and len(init_data) > 50:
        print("🔐 Getting JWT token from fresh initData...")
        try:
            token = get_jwt_token(init_data)
            if token:
                print("✅ Authentication successful!")
                print(f"✅ JWT token: {token[:30]}...")
            else:
                print("❌ Authentication failed - initData may be invalid")
        except Exception as e:
            print(f"❌ Authentication error: {e}")
    else:
        print("⚠️ No valid initData - portfolio commands won't work")
        print("💡 TEMPORARY FIX: You can manually set initData in code")
        print("   Or visit stickerdom.store to get fresh initData")
        print("   Then set MANUAL_INIT_DATA environment variable")
        
        # Check for manual initData override
        manual_init = os.getenv('MANUAL_INIT_DATA')
        if manual_init:
            print("🔧 Found MANUAL_INIT_DATA in environment, using it...")
            token = get_jwt_token(manual_init)
            if token:
                print("✅ Authentication successful with manual initData!")
            else:
                print("❌ Manual initData is invalid or expired")
    
    print("✅ Bot is ready!")
    print("\n📱 Available commands:")
    print("• /start - Welcome message")
    print("• /portfolio <user_id> - Get portfolio value")
    print("\n🔧 Example usage:")
    print("/portfolio 800092886")
    
    # Run bot - use asyncio.run with proper context manager
    print("🟢 Starting bot polling...")
    
    async def refresh_token_periodically():
        """Background task: Refresh JWT token every 50 seconds (before 53s expiration)"""
        global current_jwt_token
        while True:
            try:
                await asyncio.sleep(50)  # Refresh every 50 seconds
                logger.info("🔄 Auto-refreshing JWT token...")
                
                # Get fresh initData using RequestWebViewRequest (your code)
                init_data = await get_fresh_init_data()
                
                if init_data:
                    # Get new JWT token
                    new_token = get_jwt_token(init_data)
                    if new_token:
                        logger.info("✅ JWT token auto-refreshed successfully!")
                        current_jwt_token = new_token
                    else:
                        logger.warning("⚠️ Auto-refresh failed - token might still be valid")
                else:
                    logger.warning("⚠️ Could not get fresh initData for auto-refresh")
            except Exception as e:
                logger.error(f"❌ Auto-refresh error: {e}")
                # Continue trying
                await asyncio.sleep(10)
    
    async def main_async():
        global refresh_task
        async with application:
            await application.start()
            await application.updater.start_polling(drop_pending_updates=True)
            print("✅ Bot is now running and polling for messages!")
            
            # Start auto-refresh task
            refresh_task = asyncio.create_task(refresh_token_periodically())
            print("✅ Auto-refresh task started (refreshing every 50 seconds)")
            
            # Keep it alive
            try:
                await asyncio.Event().wait()
            except:
                pass
            finally:
                if refresh_task:
                    refresh_task.cancel()
    
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        print("\n🛑 Bot stopped by user")
    except Exception as e:
        print(f"\n❌ Bot error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()