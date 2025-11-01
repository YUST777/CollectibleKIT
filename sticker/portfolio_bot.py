#!/usr/bin/env python3
"""
Telegram Bot for Sticker Portfolio Tracking
Sends portfolio value information to users
"""

import asyncio
import json
import os
import re
import requests
import jwt
import time
import subprocess
import glob


class StickerPortfolioBot:
    def __init__(self):
        self.bot_token = '7670774943:AAEzqHwScDo91kQydAu22QGpo-b2tvPnC1c'
        self.pricing_cache_file = 'pricing_data.json'
        self.auth_cache_file = 'auth_token_cache.json'
        self.session_file = 'sticker_bot_session.session'
        self.token_pool_dir = 'token_pool'
        # Create token pool directory if it doesn't exist
        os.makedirs(self.token_pool_dir, exist_ok=True)
    
    def is_token_expired(self, token):
        """Check if the auth token is expired by decoding the JWT"""
        if not token:
            return True
        
        try:
            # Decode JWT without verification to check expiry
            decoded = jwt.decode(token, options={"verify_signature": False})
            exp = decoded.get('exp', 0)
            current_time = int(time.time())
            
            # Check if token expires within next 10 minutes (600 seconds)
            return (exp - current_time) < 600
        except Exception as e:
            print(f"Error checking token expiry: {e}")
            return True
    
    def get_valid_token(self):
        """Get the first valid token from the pool, or fallback to init_data.txt"""
        token_files = []
        
        # Check token pool directory
        pool_files = glob.glob(os.path.join(self.token_pool_dir, '*.txt'))
        token_files.extend(pool_files)
        
        # Check main init_data.txt file
        if os.path.exists('init_data.txt'):
            token_files.append('init_data.txt')
        
        # Try each token file
        for token_file in token_files:
            try:
                with open(token_file, 'r') as f:
                    token = f.read().strip()
                
                if token and not self.is_token_expired(token):
                    print(f"✓ Using valid token from: {token_file}")
                    return token
                else:
                    print(f"✗ Token expired in: {token_file}")
            except Exception as e:
                print(f"Error reading {token_file}: {e}")
        
        print("✗ No valid tokens found!")
        return None
    
    def refresh_token_from_initdata(self, initdata_string):
        """Refresh auth token by sending initData to auth endpoint"""
        try:
            print("🔄 Attempting to refresh token from auth endpoint...")
            api_base = 'https://api.stickerdom.store'
            url = f"{api_base}/api/v1/auth"
            
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            }
            
            # Send initData in URL-encoded form
            response = requests.post(url, headers=headers, data=initdata_string, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') == True and data.get('token'):
                    new_token = data['token']
                    print("✓ Successfully got new token from auth endpoint!")
                    return new_token
                else:
                    print(f"✗ Auth endpoint returned error: {data}")
            else:
                print(f"✗ Auth endpoint returned HTTP {response.status_code}: {response.text[:200]}")
            
        except Exception as e:
            print(f"✗ Error refreshing token: {e}")
            import traceback
            traceback.print_exc()
        
        return None
        
    def load_pricing(self):
        """Load pricing data"""
        if os.path.exists(self.pricing_cache_file):
            with open(self.pricing_cache_file) as f:
                return json.load(f)
        return None
    
    def fetch_user_profile(self, user_id):
        """Fetch user profile from API if not cached"""
        portfolio_file = f'profile_{user_id}_minimal.json'
        if os.path.exists(portfolio_file):
            print(f"Using cached profile for {user_id}")
            return True
        
        print(f"Fetching profile for user {user_id}...")
        
        api_base = 'https://api.stickerdom.store'
        
        # Get valid token from pool
        auth_token = self.get_valid_token()
        if not auth_token:
            print("✗ No valid auth token available!")
            return False
        
        # Make request
        endpoint = f'/api/v1/user/{user_id}/profile'
        url = f"{api_base}{endpoint}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}',
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            data = None
            
            # Handle invalid auth token
            if response.status_code == 200:
                data = response.json()
                if data.get('errorCode') == 'invalid_auth_token':
                    print("✗ Token expired")
                    # Auto-refresh disabled - user must use /refresh command
                    return False
            
            # Process successful response
            if response.status_code == 200 and data:
                if data.get('ok') == True:
                    print(f"✓ Successfully fetched profile for {user_id}")
                    
                    # Process minimal data
                    user_meta = data['data']['meta']
                    owned_stickers = []
                    
                    for coll in data['data']['collections']:
                        coll_name = coll['collection']['title']
                        chars_with_nfts = [char for char in coll['characters'] if char.get('token_id')]
                        
                        if chars_with_nfts:
                            for char in chars_with_nfts:
                                owned_stickers.append({
                                    'collection': coll_name,
                                    'character': char['name'],
                                    'token_id': char['token_id'],
                                    'sticker_ids': char.get('stickers', []),
                                    'sticker_count': len(char.get('stickers', []))
                                })
                    
                    minimal_data = {
                        'user': {
                            'id': user_meta['id'],
                            'name': user_meta['full_name']
                        },
                        'owned_stickers': owned_stickers,
                        'total_nfts': len(owned_stickers),
                        'total_stickers': sum(s['sticker_count'] for s in owned_stickers)
                    }
                    
                    # Save to cache
                    with open(portfolio_file, 'w') as f:
                        json.dump(minimal_data, f, indent=2)
                    
                    return True
                else:
                    error_msg = f"API returned error: {data}"
                    print(f"✗ {error_msg}")
                    return False
            else:
                error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
                print(f"✗ {error_msg}")
                return False
                
        except Exception as e:
            import traceback
            print(f"✗ Error fetching profile: {e}")
            traceback.print_exc()
            return False
    
    def calculate_portfolio_value(self, user_id):
        """Calculate portfolio value for a user"""
        # Load pricing
        pricing = self.load_pricing()
        if not pricing:
            return None, "Pricing data not found"
        
        # Try to fetch profile if not cached
        if not self.fetch_user_profile(user_id):
            return None, f"Could not fetch or load portfolio for user {user_id}"
        
        # Load portfolio
        portfolio_file = f'profile_{user_id}_minimal.json'
        with open(portfolio_file) as f:
            portfolio = json.load(f)
        
        # Calculate values
        collections_data = []
        total_init = 0
        total_current = 0
        
        for nft in portfolio['owned_stickers']:
            coll_id = None
            
            # Map collection name to ID
            for coll_key, coll_data in pricing['collections'].items():
                if coll_data['name'] == nft['collection']:
                    coll_id = coll_key
                    break
            
            if not coll_id:
                continue
            
            # Find sticker pricing
            coll_data = pricing['collections'][coll_id]
            sticker_pricing = None
            
            # Try to match by character name
            for sticker_key, sticker_data in coll_data['stickers'].items():
                if sticker_data['name'].lower() == nft['character'].lower():
                    sticker_pricing = sticker_data
                    break
            
            if not sticker_pricing:
                continue
            
            # Calculate values
            init_price = sticker_pricing.get('init_price_usd', 0)
            current_price = sticker_pricing['current']['price']['floor']['usd']
            
            nft_count = 1  # Each entry is one NFT
            init_val = init_price * nft_count
            current_val = current_price * nft_count
            pnl = current_val - init_val
            
            total_init += init_val
            total_current += current_val
            
            collections_data.append({
                'collection': nft['collection'],
                'count': nft_count,
                'init': init_val,
                'current': current_val,
                'pnl': pnl
            })
        
        # Group by collection
        collection_totals = {}
        for item in collections_data:
            coll_name = item['collection']
            if coll_name not in collection_totals:
                collection_totals[coll_name] = {
                    'collection': coll_name,
                    'count': 0,
                    'init': 0,
                    'current': 0,
                    'pnl': 0
                }
            collection_totals[coll_name]['count'] += item['count']
            collection_totals[coll_name]['init'] += item['init']
            collection_totals[coll_name]['current'] += item['current']
            collection_totals[coll_name]['pnl'] += item['pnl']
        
        grouped_data = list(collection_totals.values())
        
        return grouped_data, total_init, total_current, (total_current - total_init)
    
    def format_portfolio_message(self, user_id, username=None):
        """Format portfolio message"""
        result = self.calculate_portfolio_value(user_id)
        
        if result[0] is None:
            error_msg = result[1]
            if "Could not fetch" in error_msg or "invalid_auth" in error_msg.lower():
                return (
                    f"❌ Auth token expired!\n\n"
                    f"🔧 To fix:\n"
                    f"1. Go to https://web.telegram.org → @sticker_bot → Open\n"
                    f"2. Press F12 → Type: window.Telegram.WebApp.initData\n"
                    f"3. Copy the string\n"
                    f"4. Send to bot: /refresh pasted_string_here\n\n"
                    f"Or message me with a fresh token to update it."
                )
            return f"❌ Error: {error_msg}"
        
        collections_data, total_init, total_current, total_pnl = result
        
        # Build message
        lines = []
        lines.append(f"📊 Portfolio: @{username if username else user_id}")
        lines.append("")
        
        # Sort by current value descending
        collections_data.sort(key=lambda x: x['current'], reverse=True)
        
        for coll in collections_data:
            pnl_sign = "+" if coll['pnl'] >= 0 else ""
            lines.append(
                f"🔹 {coll['collection']} — {coll['count']} packs | "
                f"Init: ${coll['init']:.0f} | Current: ${coll['current']:.0f} | "
                f"PNL: ${pnl_sign}{coll['pnl']:.0f}"
            )
        
        lines.append("")
        lines.append(f"💰 Total Initial: ${total_init:.2f}")
        lines.append(f"📈 Total Current: ${total_current:.2f}")
        lines.append(f"📊 Total PNL: ${total_pnl:+.2f}")
        
        return "\n".join(lines)


async def run_bot():
    """Run the Telegram bot"""
    from telegram.ext import Application, MessageHandler, filters, CommandHandler
    
    bot_instance = StickerPortfolioBot()
    
    async def start(update, context):
        await update.message.reply_text(
            "👋 Welcome to Sticker Portfolio Bot!\n\n"
            "Send me a user ID to get their portfolio value.\n"
            "Example: 800092886"
        )
    
    async def handle_user_id(update, context):
        chat_id = update.message.chat.id
        text = update.message.text
        
        # Extract user ID from message
        match = re.search(r'(\d+)', text)
        if match:
            user_id = match.group(1)
            username = update.message.from_user.username
            
            print(f"User {chat_id} requested portfolio for {user_id}")
            
            # Send typing action
            await context.bot.send_chat_action(chat_id=chat_id, action='typing')
            
            message = bot_instance.format_portfolio_message(user_id, username)
            
            try:
                await update.message.reply_text(message)
            except Exception as e:
                await update.message.reply_text(f"Error: {str(e)}")
        else:
            await update.message.reply_text(
                "Please send a valid user ID.\nExample: 800092886"
            )
    
    # Create application
    application = Application.builder().token(bot_instance.bot_token).build()
    
    # Add handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_user_id))
    
    print("Bot is running... Press Ctrl+C to stop")
    
    # Use run_polling with proper event loop handling
    await application.run_polling(drop_pending_updates=True, stop_signals=None)


async def test_bot():
    """Test the bot without running it"""
    bot = StickerPortfolioBot()
    
    # Test your portfolio
    print(bot.format_portfolio_message('800092886', 'yousef'))
    print("\n" + "="*70)
    print(bot.format_portfolio_message('6651978547', 'Bl0rm'))


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--run':
        # Simple run with direct application initialization
        from telegram.ext import Application, MessageHandler, filters, CommandHandler
        
        bot_instance = StickerPortfolioBot()
        
        def start(update, context):
            update.message.reply_text(
                "👋 Welcome to Sticker Portfolio Bot!\n\n"
                "Send me a user ID to get their portfolio value.\n"
                "Example: 800092886"
            )
        
        def handle_user_id(update, context):
            chat_id = update.message.chat.id
            text = update.message.text
            match = re.search(r'(\d+)', text)
            if match:
                user_id = match.group(1)
                username = update.message.from_user.username
                print(f"User {chat_id} requested portfolio for {user_id}")
                context.bot.send_chat_action(chat_id=chat_id, action='typing')
                message = bot_instance.format_portfolio_message(user_id, username)
                try:
                    update.message.reply_text(message)
                except Exception as e:
                    update.message.reply_text(f"Error: {str(e)}")
            else:
                update.message.reply_text("Please send a valid user ID.\nExample: 800092886")
        
        app = Application.builder().token(bot_instance.bot_token).build()
        app.add_handler(CommandHandler("start", start))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_user_id))
        
        print("Bot is running... Press Ctrl+C to stop")
        app.run_polling()
    else:
        asyncio.run(test_bot())

