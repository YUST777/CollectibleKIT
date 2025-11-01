#!/usr/bin/env python3
"""
Simple Telegram Bot Server for Sticker Portfolios
Runs the bot in a separate process that handles Telegram messages
"""

from telegram.ext import Application, MessageHandler, filters, CommandHandler, ApplicationBuilder
from portfolio_bot import StickerPortfolioBot
import re
import jwt
import asyncio
import time

def main():
    bot_instance = StickerPortfolioBot()
    
    async def start(update, context):
        await update.message.reply_text(
            "👋 Welcome to Sticker Portfolio Bot!\n\n"
            "📊 Send me a user ID to get their portfolio value.\n\n"
            "Example: 800092886\n\n"
            "💡 Tip: Use /refresh if you get 'invalid auth' error"
        )
    
    async def refresh_token_command(update, context):
        """Handle /refresh command with initData"""
        text = update.message.text
        
        # Extract initData - could be on same line or subsequent lines
        if text.strip() == '/refresh':
            # User sent just /refresh without token
            await update.message.reply_text(
                "📝 Please send your initData token.\n\n"
                "**Option 1:** Send it on the same line:\n"
                "`/refresh eyJhbGc...`\n\n"
                "**Option 2:** Send it on the next line:\n"
                "`/refresh`\n"
                "`eyJhbGc...`\n\n"
                "To get initData: https://web.telegram.org → @sticker_bot → Open → F12 → `window.Telegram.WebApp.initData`",
                parse_mode='Markdown'
            )
            return
        
        # Try to extract initData from the message
        # Remove /refresh command if it exists
        text_cleaned = text.replace('/refresh', '').strip()
        
        if not text_cleaned:
            await update.message.reply_text(
                "❌ No token found. Please include the initData token in your message."
            )
            return
        
        try:
            # Check if it's a JWT token or raw initData
            is_jwt = text_cleaned.count('.') == 2
            
            if is_jwt:
                # It's a JWT token - save it directly
                decoded = jwt.decode(text_cleaned, options={"verify_signature": False})
                
                # Save the new token to pool with timestamp
                timestamp = int(time.time())
                token_file = f"token_pool/token_{timestamp}.txt"
                os.makedirs("token_pool", exist_ok=True)
                
                with open(token_file, 'w') as f:
                    f.write(text_cleaned)
                
                # Also save to main init_data.txt
                with open('init_data.txt', 'w') as f:
                    f.write(text_cleaned)
                
                await update.message.reply_text("✅ New JWT token saved to pool and init_data.txt!")
            else:
                # It's raw initData - try to get JWT from auth endpoint
                await update.message.reply_text("🔄 Raw initData detected, fetching JWT from auth endpoint...")
                
                new_jwt = bot_instance.refresh_token_from_initdata(text_cleaned)
                
                if new_jwt:
                    # Save the new JWT token
                    timestamp = int(time.time())
                    token_file = f"token_pool/token_{timestamp}.txt"
                    os.makedirs("token_pool", exist_ok=True)
                    
                    with open(token_file, 'w') as f:
                        f.write(new_jwt)
                    
                    # Also save to main init_data.txt
                    with open('init_data.txt', 'w') as f:
                        f.write(new_jwt)
                    
                    await update.message.reply_text("✅ Successfully refreshed! New JWT token saved!")
                else:
                    await update.message.reply_text(
                        "❌ Failed to refresh token. initData might be expired.\n\n"
                        "Please get a fresh initData from: https://web.telegram.org → @sticker_bot → Open → F12 → window.Telegram.WebApp.initData"
                    )
                    
        except jwt.InvalidTokenError:
            await update.message.reply_text(
                "❌ Invalid token format. Please send either:\n"
                "- A JWT token (starts with eyJ)\n"
                "- Raw initData string from Telegram WebApp"
            )
        except Exception as e:
            await update.message.reply_text(
                f"❌ Error: {str(e)}\n\n"
                "Please make sure you copied the complete string."
            )
    
    async def handle_user_id(update, context):
        chat_id = update.message.chat.id
        text = update.message.text.strip()
        requester_username = update.message.from_user.username
        
        # Extract user ID (digits only)
        match = re.search(r'(\d+)', text)
        if match:
            user_id = match.group(1)
            print(f"User {chat_id} requested portfolio for ID: {user_id}")
            
            await context.bot.send_chat_action(chat_id=chat_id, action='typing')
            message = bot_instance.format_portfolio_message(user_id, requester_username)
            try:
                await update.message.reply_text(message)
            except Exception as e:
                await update.message.reply_text(f"Error: {str(e)}")
        else:
            await update.message.reply_text(
                "Please send a numeric user ID.\n\n"
                "Example: 800092886"
            )
    
    async def check_token_status_command(update, context):
        """Check current auth token status"""
        try:
            # Get valid token from pool
            token = bot_instance.get_valid_token()
            
            if not token:
                await update.message.reply_text(
                    "❌ Auth token is EXPIRED!\n\n"
                    "Use /refresh to update it with a new token."
                )
            else:
                # Decode to show expiry info
                decoded = jwt.decode(token, options={"verify_signature": False})
                exp = decoded.get('exp', 0)
                current_time = int(time.time())
                time_left = exp - current_time
                hours_left = time_left / 3600
                
                await update.message.reply_text(
                    f"✅ Auth token is valid!\n\n"
                    f"⏰ Time remaining: {hours_left:.1f} hours\n"
                    f"🕐 Expires: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(exp))}"
                )
        except FileNotFoundError:
            await update.message.reply_text("❌ No auth token found!")
        except Exception as e:
            await update.message.reply_text(f"Error checking status: {str(e)}")
    
    async def auto_check_expiry():
        """Background task to check token expiry periodically"""
        while True:
            try:
                # Check every 10 minutes
                await asyncio.sleep(600)
                
                token = bot_instance.get_valid_token()
                if not token:
                    print("⚠️ No valid auth token! Please refresh using /refresh")
                        
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in auto_check_expiry: {e}")
    
    app = Application.builder().token(bot_instance.bot_token).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("refresh", refresh_token_command))
    app.add_handler(CommandHandler("status", check_token_status_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_user_id))
    
    # Start background task when app starts
    async def start_background(application: Application):
        application.create_task(auto_check_expiry())
    
    app.post_init = start_background
    
    print("🚀 Sticker Portfolio Bot is now RUNNING!")
    print("Send messages in Telegram to test it!")
    app.run_polling()

if __name__ == '__main__':
    main()

