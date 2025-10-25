"""
CollectibleKIT Telegram Bot
A comprehensive bot for CollectibleKIT with video start message, referral system, and credit earning games.
Supports image cutting, watermarking, freemium model, TON payments, and gamification features.
"""

import asyncio
import json
import logging
import os
import time
from io import BytesIO
from typing import List, Optional

from PIL import Image, ImageOps
from telegram import Update, InputFile, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, KeyboardButton, ReplyKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, CallbackQueryHandler, filters

from .config import BOT_TOKEN
from .processing import cut_into_4x3_and_prepare_story_pieces
from .database import BotDatabase
from .payment import PaymentManager

# Configure logging
logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    level=logging.DEBUG,
)
logger = logging.getLogger("collectiblekit-bot")

# Initialize database and payment manager
db = BotDatabase()
payment_manager = PaymentManager(db)

# Constants
FREE_LIMIT = 3
WATERMARK_TEXT = "@CollectibleKITbot"
RECV_ADDR = "UQCFRqB2vZnGZRh3ZoZAItNidk8zpkN0uRHlhzrnwweU3mos"

# Mini App configuration
MINI_APP_URL = os.getenv("MINI_APP_URL", "https://your-domain.com")  # Update this with your actual domain

# VIP users with infinite uses (no watermark, no credit consumption)
VIP_USERS = {
    7416916695,
    6386563662,
    6841385539,
    7476391409,
    1251203296,
    178956025,
    1845807623,
    6063450915,
    1796229441,
    1109811477,
    879660478,
    1979991371,
    800092886,
}

# Package definitions (amount in nanoTON, credits granted)
PACKAGES = {
    "buy_1": {"amount_nano": 100_000_000, "credits": 1, "ton": 0.1},   # 0.1 TON -> 1 cut
    "buy_3": {"amount_nano": 200_000_000, "credits": 3, "ton": 0.2},   # 0.2 TON -> 3 cuts
    "buy_10": {"amount_nano": 500_000_000, "credits": 10, "ton": 0.5}, # 0.5 TON -> 10 cuts
}


def _is_authorized(update: Update) -> bool:
    """Only allow private chats for security"""
    if update.effective_chat and update.effective_chat.type != "private":
        return False
    return True


def _is_vip_user(user_id: int) -> bool:
    """Check if user has infinite uses"""
    return user_id in VIP_USERS


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_authorized(update):
        return
    
    user_id = update.effective_user.id
    username = update.effective_user.username
    first_name = update.effective_user.first_name
    
    # Handle referral parameters
    start_param = context.args[0] if context.args else None
    referral_bonus_granted = False
    
    if start_param and start_param.startswith('ref_'):
        try:
            referrer_id = int(start_param.replace('ref_', ''))
            if referrer_id and referrer_id != user_id:
                logger.info(f"🔗 Processing referral: {user_id} referred by {referrer_id}")
                
                # Record referral in database
                db.add_referral(
                    referrer_id=referrer_id,
                    invited_id=user_id,
                    invited_name=f"{first_name} {update.effective_user.last_name or ''}".strip() or f"User {user_id}",
                    invited_photo=update.effective_user.photo.small_file_id if update.effective_user.photo else ''
                )
                
                # Grant referral bonus credits (50 credits for both referrer and referee)
                db.add_credits(user_id, 50)  # Bonus for new user
                db.add_credits(referrer_id, 50)  # Bonus for referrer
                referral_bonus_granted = True
                
                logger.info(f"✅ Referral processed successfully: {user_id} referred by {referrer_id}")
        except (ValueError, Exception) as e:
            logger.error(f"Error processing referral: {e}")
    
    # Get or create user record and record start interaction
    user = db.get_user(user_id, username, first_name)
    db.record_interaction(user_id, "start", json.dumps({
        "username": username,
        "first_name": first_name,
        "start_param": start_param,
        "referral_bonus": referral_bonus_granted
    }))
    
    # Clean interface - no persistent keyboard or inline buttons
    
    # Send the start video with welcome message
    assets_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
    start_video_path = os.path.join(assets_dir, "start.mp4")
    
    welcome_message = "**Welcome to CollectibleKIT**\n\n"
    welcome_message += "Use free tools.\n\n"
    welcome_message += "Play free games and earn credits.\n\n"
    welcome_message += "Every 100 credits = 0.1 TON"
    
    if referral_bonus_granted:
        welcome_message += "\n\n**Referral Bonus!** You received 50 credits for joining through a referral!"
    
    # Add the two inline buttons
    inline_keyboard = [
        [InlineKeyboardButton("Start", web_app=WebAppInfo(url=MINI_APP_URL))],
        [InlineKeyboardButton("Join our community", url="https://t.me/The01Studio")],
    ]
    
    try:
        with open(start_video_path, "rb") as video:
            await update.message.reply_video(
                video=video,
                caption=welcome_message,
                reply_markup=InlineKeyboardMarkup(inline_keyboard),
                parse_mode="Markdown"
            )
    except FileNotFoundError:
        # Fallback to image if video not found
        start_image_path = os.path.join(assets_dir, "start.jpg")
        with open(start_image_path, "rb") as photo:
            await update.message.reply_photo(
                photo=photo,
                caption=welcome_message,
                reply_markup=InlineKeyboardMarkup(inline_keyboard),
                parse_mode="Markdown"
            )
    except Exception as e:
        logger.error(f"Error sending start media: {e}")
        # Fallback to text only
        await update.message.reply_text(
            welcome_message,
            reply_markup=InlineKeyboardMarkup(inline_keyboard),
            parse_mode="Markdown"
        )


async def credit(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show user their current credits and usage stats"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    user = db.get_user(user_id, update.message.from_user.username, update.message.from_user.first_name)
    stats = db.get_user_stats(user_id)
    
    # Record credit command interaction
    db.record_interaction(user_id, "credit_command")
    
    if _is_vip_user(user_id):
        await update.message.reply_text(
            f"👑 VIP Account Status\n\n"
            f"Status: UNLIMITED ACCESS\n"
            f"Credits: ∞ (Infinite)\n"
            f"Total requests: {stats['request_count']}\n\n"
            f"You have unlimited cuts with no watermark! 🔥"
        )
    else:
        remaining_free = max(0, FREE_LIMIT - user['free_uses'])
        await update.message.reply_text(
            f"💳 Your Account Status\n\n"
            f"Credits: {user['credits']}\n"
            f"Free cuts remaining: {remaining_free}/{FREE_LIMIT}\n"
            f"Total requests: {stats['request_count']}\n"
            f"Total spent: {stats['total_spent']:.2f} TON\n\n"
            f"Need more credits? Use /start to see our packages!"
        )


# Web app data handler removed - now using native shareToStory() method


async def test_users(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Test command to check users in database (admin only)"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    
    # Only allow specific admin users
    ADMIN_USERS = {800092886}
    if user_id not in ADMIN_USERS:
        await update.message.reply_text("❌ Access denied. Admin only command.")
        return
    
    # Get user counts
    all_users = db.get_all_users()
    active_users = db.get_active_users(30)
    
    message = f"""
📊 **Database User Test**

**All Users:** {len(all_users)}
**Active Users (30 days):** {len(active_users)}

**First 5 users:**
"""
    
    for i, user in enumerate(all_users[:5]):
        message += f"{i+1}. ID: {user['user_id']}, Username: {user.get('username', 'None')}, Name: {user.get('first_name', 'None')}\n"
    
    await update.message.reply_text(message)


async def send_to_chat(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send message to specific chat ID (admin only)"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    
    # Only allow specific admin users
    ADMIN_USERS = {800092886}
    if user_id not in ADMIN_USERS:
        await update.message.reply_text("❌ Access denied. Admin only command.")
        return
    
    if not context.args:
        await update.message.reply_text(
            "💬 **Send to Chat**\n\n"
            "Usage: `/send_to_chat <chat_id> <message>`\n"
            "Example: `/send_to_chat -1001234567890 Hello everyone!`\n\n"
            "To get chat ID, add the bot to the chat and use /start",
            parse_mode="Markdown"
        )
        return
    
    try:
        chat_id = int(context.args[0])
        message_text = " ".join(context.args[1:])
        
        if not message_text:
            await update.message.reply_text("❌ Please provide a message to send.")
            return
        
        # Send message to specified chat
        await context.bot.send_message(
            chat_id=chat_id,
            text=message_text,
            parse_mode="Markdown"
        )
        
        await update.message.reply_text(f"✅ Message sent to chat {chat_id}")
        
    except ValueError:
        await update.message.reply_text("❌ Invalid chat ID. Please provide a valid number.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error sending message: {str(e)}")


async def test_media(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Test media sending (admin only)"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    
    # Only allow specific admin users
    ADMIN_USERS = {800092886}
    if user_id not in ADMIN_USERS:
        await update.message.reply_text("❌ Access denied. Admin only command.")
        return
    
    if not context.args:
        await update.message.reply_text(
            "🧪 **Test Media**\n\n"
            "Usage: `/test_media <chat_id>`\n"
            "Example: `/test_media -1001234567890`\n\n"
            "This will send a test photo to the specified chat.",
            parse_mode="Markdown"
        )
        return
    
    try:
        chat_id = int(context.args[0])
        
        # Send test photo
        await context.bot.send_photo(
            chat_id=chat_id,
            photo="https://via.placeholder.com/300x200/FF0000/FFFFFF?text=Test+Photo",
            caption="🧪 **Test Photo**\n\nThis is a test photo to verify media sending works.",
            parse_mode="Markdown"
        )
        
        await update.message.reply_text(f"✅ Test photo sent to chat {chat_id}")
        
    except ValueError:
        await update.message.reply_text("❌ Invalid chat ID. Please provide a valid number.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error sending test photo: {str(e)}")


async def analytics(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show comprehensive bot analytics (admin only)"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    
    # Only allow specific admin users to view analytics
    ADMIN_USERS = {800092886}  # Add your admin user ID here
    if user_id not in ADMIN_USERS:
        await update.message.reply_text("❌ Access denied. Admin only command.")
        return
    
    # Record analytics command
    db.record_interaction(user_id, "analytics_command")
    
    try:
        stats = db.get_analytics_summary()
        
        # Format interactions by type
        interactions_text = "\n".join([f"  • {k}: {v}" for k, v in stats['interactions_by_type'].items()])
        
        analytics_message = f"""
📊 **Bot Analytics Dashboard**

👥 **Users:**
• Total users: {stats['total_users']}
• Active (7 days): {stats['active_users_7d']}

💰 **Revenue:**
• Total revenue: {stats['total_revenue_ton']:.2f} TON

🔄 **Requests:**
• Total processed: {stats['total_requests']}
• Free requests: {stats['free_requests']}
• Paid requests: {stats['paid_requests']}

📱 **Interactions ({stats['total_interactions']} total):**
{interactions_text}

💡 **Conversion Rate:**
• Free to paid: {(stats['paid_requests'] / max(stats['free_requests'], 1) * 100):.1f}%
"""
        
        await update.message.reply_text(analytics_message, parse_mode="Markdown")
        
    except Exception as e:
        logger.exception("Analytics error: %s", e)
        await update.message.reply_text("❌ Error generating analytics report.")


async def broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Start broadcast composition process (admin only)"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    logger.info(f"Broadcast command received from user {user_id}")
    
    # Only allow specific admin users to broadcast
    ADMIN_USERS = {800092886}  # Add your admin user ID here
    if user_id not in ADMIN_USERS:
        await update.message.reply_text("❌ Access denied. Admin only command.")
        return
    
    # Record broadcast command
    db.record_interaction(user_id, "broadcast_command")
    
    # Start broadcast composition
    await update.message.reply_text(
        "📢 **Broadcast Message Composer**\n\n"
        "Please send your broadcast message. You can send:\n"
        "• Text only\n"
        "• Text + Photo\n"
        "• Text + Video\n\n"
        "After you send the message, you'll see a preview with options to send or edit.\n\n"
        "**Send your message now:**",
        parse_mode="Markdown"
    )
    
    # Set state to waiting for broadcast content
    context.user_data['broadcast_state'] = 'composing'
    logger.info(f"Broadcast state set to 'composing' for user {user_id}")


async def handle_broadcast_content(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle broadcast content (text, photo, video)"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    logger.info(f"Broadcast content handler called for user {user_id}")
    
    # Only allow specific admin users
    ADMIN_USERS = {800092886}
    if user_id not in ADMIN_USERS:
        logger.info(f"User {user_id} not in admin list")
        return
    
    # Check if we're in broadcast composition mode
    broadcast_state = context.user_data.get('broadcast_state')
    logger.info(f"Broadcast state for user {user_id}: {broadcast_state}")
    if broadcast_state != 'composing':
        return
    
    message = update.message
    broadcast_content = {
        'text': None,
        'photo': None,
        'video': None,
        'media_type': None
    }
    
    # Extract text content
    if message.text:
        broadcast_content['text'] = message.text
        broadcast_content['media_type'] = 'text_only'
    elif message.caption:
        broadcast_content['text'] = message.caption
    else:
        broadcast_content['text'] = "📢 **Broadcast from CollectibleKIT**"
    
    # Extract media content
    if message.photo:
        broadcast_content['photo'] = message.photo[-1].file_id  # Store file ID instead of object
        broadcast_content['media_type'] = 'photo'
        logger.info(f"Stored photo file_id: {broadcast_content['photo']}")
        logger.info(f"Photo file_id type: {type(broadcast_content['photo'])}")
    elif message.video:
        broadcast_content['video'] = message.video.file_id  # Store file ID instead of object
        broadcast_content['media_type'] = 'video'
        logger.info(f"Stored video file_id: {broadcast_content['video']}")
        logger.info(f"Video file_id type: {type(broadcast_content['video'])}")
    elif message.document and message.document.mime_type.startswith('video/'):
        broadcast_content['video'] = message.document.file_id  # Store file ID instead of object
        broadcast_content['media_type'] = 'video'
        logger.info(f"Stored document video file_id: {broadcast_content['video']}")
        logger.info(f"Document video file_id type: {type(broadcast_content['video'])}")
    
    # Store broadcast content
    context.user_data['broadcast_content'] = broadcast_content
    context.user_data['broadcast_state'] = 'preview'
    
    # Get user counts for preview
    all_users = db.get_all_users()
    active_users = db.get_active_users(30)
    
    # Create preview message
    preview_text = f"""
📢 **Broadcast Preview**

**Message Type:** {broadcast_content['media_type'].replace('_', ' ').title()}
**Target Users:** All users ({len(all_users)} total)
**Active Users:** {len(active_users)} (last 30 days)

**Message Content:**
{broadcast_content['text'][:200]}{'...' if len(broadcast_content['text']) > 200 else ''}
"""
    
    # Create inline keyboard for actions
    keyboard = [
        [InlineKeyboardButton("📤 Send to All Users", callback_data="broadcast_send_all")],
        [InlineKeyboardButton("👥 Send to Active Users", callback_data="broadcast_send_active")],
        [InlineKeyboardButton("💬 Send to This Chat", callback_data="broadcast_send_chat")],
        [InlineKeyboardButton("✏️ Edit Message", callback_data="broadcast_edit")],
        [InlineKeyboardButton("❌ Cancel", callback_data="broadcast_cancel")]
    ]
    
    # Send preview with media if available
    if broadcast_content['photo']:
        await message.reply_photo(
            photo=broadcast_content['photo'],  # file_id works directly
            caption=preview_text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="Markdown"
        )
    elif broadcast_content['video']:
        await message.reply_video(
            video=broadcast_content['video'],  # file_id works directly
            caption=preview_text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="Markdown"
        )
    else:
        await message.reply_text(
            preview_text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="Markdown"
        )


async def handle_broadcast_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle broadcast callback queries"""
    if not _is_authorized(update):
        return
    
    user_id = update.callback_query.from_user.id
    
    # Only allow specific admin users
    ADMIN_USERS = {800092886}
    if user_id not in ADMIN_USERS:
        await update.callback_query.answer("❌ Access denied.")
        return
    
    query = update.callback_query
    data = query.data
    
    if data == "broadcast_send_all":
        await _execute_broadcast(query, context, "all")
    elif data == "broadcast_send_active":
        await _execute_broadcast(query, context, "active")
    elif data == "broadcast_send_chat":
        await _execute_broadcast(query, context, "chat")
    elif data == "broadcast_edit":
        await _edit_broadcast(query, context)
    elif data == "broadcast_cancel":
        await _cancel_broadcast(query, context)


async def _execute_broadcast(query, context, target_type):
    """Execute the broadcast"""
    broadcast_content = context.user_data.get('broadcast_content')
    if not broadcast_content:
        await query.answer("❌ No broadcast content found.")
        return
    
    logger.info(f"Executing broadcast for target_type: {target_type}")
    logger.info(f"Broadcast content: {broadcast_content}")
    logger.info(f"Media type: {broadcast_content.get('media_type')}")
    logger.info(f"Photo file_id: {broadcast_content.get('photo')}")
    logger.info(f"Video file_id: {broadcast_content.get('video')}")
    
    # Get users based on target type
    if target_type == "active":
        users = db.get_active_users(30)
        target_description = "active users (last 30 days)"
    elif target_type == "chat":
        # Send to current chat only
        chat_id = query.message.chat_id
        users = [{"user_id": chat_id, "username": "chat", "first_name": "Chat"}]
        target_description = "current chat"
        logger.info(f"Chat broadcast to chat_id: {chat_id}")
    else:
        users = db.get_all_users()
        target_description = "all users"
    
    logger.info(f"Found {len(users)} users for broadcast")
    
    if not users:
        await query.edit_message_text("❌ No users found in database. Make sure users have interacted with the bot first.")
        return
    
    # Log first few users for debugging
    if users:
        logger.info(f"First user: {users[0]}")
        if len(users) > 1:
            logger.info(f"Second user: {users[1]}")
    
    # Start broadcasting - use appropriate edit method based on message type
    try:
        await query.edit_message_text(f"🚀 Starting broadcast to {len(users)} {target_description}...")
    except Exception as e:
        # If the original message has media, try editing caption instead
        try:
            await query.edit_message_caption(caption=f"🚀 Starting broadcast to {len(users)} {target_description}...")
        except Exception as caption_error:
            logger.error(f"Failed to edit message: {e}, caption error: {caption_error}")
            # Send a new message instead
            await query.message.reply_text(f"🚀 Starting broadcast to {len(users)} {target_description}...")
    
    sent_count = 0
    failed_count = 0
    failed_users = []
    
    # Send messages with rate limiting
    for i, user in enumerate(users):
        try:
            # Rate limiting: wait 0.1 seconds between messages
            if i > 0:
                await asyncio.sleep(0.1)
            
            logger.info(f"Sending broadcast to user {user['user_id']} ({i+1}/{len(users)})")
            
            # Send message based on media type
            if broadcast_content['media_type'] == 'photo':
                logger.info(f"Sending photo to user {user['user_id']}, file_id: {broadcast_content['photo']}")
                try:
                    # Ensure we have a valid file_id
                    if not broadcast_content['photo']:
                        logger.error(f"No photo file_id found for user {user['user_id']}")
                        raise ValueError("No photo file_id available")
                    
                    # Always download and re-upload for reliability
                    logger.info(f"Downloading and re-uploading photo for user {user['user_id']}")
                    try:
                        # Get the file object
                        file = await context.bot.get_file(broadcast_content['photo'])
                        # Download the file
                        file_data = await file.download_as_bytearray()
                        
                        # Convert to PNG for better compatibility
                        from PIL import Image
                        import io
                        
                        # Open the image and convert to PNG
                        img = Image.open(io.BytesIO(file_data))
                        png_buffer = io.BytesIO()
                        img.save(png_buffer, format='PNG')
                        png_buffer.seek(0)
                        
                        # Send as InputFile with PNG format
                        from telegram import InputFile
                        await context.bot.send_photo(
                            chat_id=user['user_id'],
                            photo=InputFile(png_buffer, filename="broadcast_photo.png"),
                            caption=broadcast_content['text'],
                            parse_mode="Markdown"
                        )
                        logger.info(f"Photo sent successfully to {user['user_id']} using download and PNG conversion")
                        
                    except Exception as download_error:
                        logger.error(f"Download and PNG conversion failed for user {user['user_id']}: {download_error}")
                        # Fallback: try original file_id method
                        try:
                            await context.bot.send_photo(
                                chat_id=user['user_id'],
                                photo=broadcast_content['photo'],
                                caption=broadcast_content['text'],
                                parse_mode="Markdown"
                            )
                            logger.info(f"Photo sent successfully to {user['user_id']} using fallback file_id method")
                        except Exception as fallback_error:
                            logger.error(f"Fallback file_id method also failed for user {user['user_id']}: {fallback_error}")
                            raise download_error  # Raise the original error
                            
                except Exception as e:
                    logger.error(f"Failed to send photo to {user['user_id']}: {e}")
                    raise
            elif broadcast_content['media_type'] == 'video':
                logger.info(f"Sending video to user {user['user_id']}, file_id: {broadcast_content['video']}")
                try:
                    # Ensure we have a valid file_id
                    if not broadcast_content['video']:
                        logger.error(f"No video file_id found for user {user['user_id']}")
                        raise ValueError("No video file_id available")
                    
                    # Always download and re-upload for reliability
                    logger.info(f"Downloading and re-uploading video for user {user['user_id']}")
                    try:
                        # Get the file object
                        file = await context.bot.get_file(broadcast_content['video'])
                        # Download the file
                        file_data = await file.download_as_bytearray()
                        
                        # Send as InputFile with MP4 format
                        from telegram import InputFile
                        await context.bot.send_video(
                            chat_id=user['user_id'],
                            video=InputFile(BytesIO(file_data), filename="broadcast_video.mp4"),
                            caption=broadcast_content['text'],
                            parse_mode="Markdown"
                        )
                        logger.info(f"Video sent successfully to {user['user_id']} using download method")
                        
                    except Exception as download_error:
                        logger.error(f"Download method failed for user {user['user_id']}: {download_error}")
                        # Fallback: try original file_id method
                        try:
                            await context.bot.send_video(
                                chat_id=user['user_id'],
                                video=broadcast_content['video'],
                                caption=broadcast_content['text'],
                                parse_mode="Markdown"
                            )
                            logger.info(f"Video sent successfully to {user['user_id']} using fallback file_id method")
                        except Exception as fallback_error:
                            logger.error(f"Fallback file_id method also failed for user {user['user_id']}: {fallback_error}")
                            raise download_error  # Raise the original error
                            
                except Exception as e:
                    logger.error(f"Failed to send video to {user['user_id']}: {e}")
                    raise
            else:
                logger.info(f"Sending text to user {user['user_id']}")
                await context.bot.send_message(
                    chat_id=user['user_id'],
                    text=broadcast_content['text'],
                    parse_mode="Markdown"
                )
            sent_count += 1
            logger.info(f"Successfully sent to user {user['user_id']}")
            
            # Update progress every 50 messages
            if (i + 1) % 50 == 0:
                try:
                    await query.edit_message_text(f"📤 Progress: {i + 1}/{len(users)} messages sent...")
                except Exception as e:
                    # If the original message has media, try editing caption instead
                    try:
                        await query.edit_message_caption(caption=f"📤 Progress: {i + 1}/{len(users)} messages sent...")
                    except Exception as caption_error:
                        logger.warning(f"Failed to update progress: {e}, caption error: {caption_error}")
                        # Continue without updating progress message
                
        except Exception as e:
            failed_count += 1
            failed_users.append({
                'user_id': user['user_id'],
                'username': user.get('username', 'Unknown'),
                'error': str(e)
            })
            logger.error(f"Failed to send broadcast to user {user['user_id']}: {e}")
            # Continue with next user instead of stopping
    
    # Record broadcast in database
    db.record_broadcast(query.from_user.id, broadcast_content['text'], sent_count, failed_count)
    
    # Send completion report
    completion_message = f"""
✅ **Broadcast Completed**

📊 **Statistics:**
• Target: {target_description}
• Total users: {len(users)}
• Successfully sent: {sent_count}
• Failed: {failed_count}
• Success rate: {(sent_count / len(users) * 100):.1f}%

📝 **Message sent:**
{broadcast_content['text'][:200]}{'...' if len(broadcast_content['text']) > 200 else ''}
"""
    
    if failed_users:
        completion_message += f"\n❌ **Failed users ({len(failed_users)}):**\n"
        for failed in failed_users[:10]:  # Show first 10 failures
            completion_message += f"• {failed['username']} (ID: {failed['user_id']})\n"
        if len(failed_users) > 10:
            completion_message += f"... and {len(failed_users) - 10} more"
    
    # Send completion message - use appropriate method based on message type
    try:
        await query.edit_message_text(completion_message, parse_mode="Markdown")
    except Exception as e:
        # If the original message has media, try editing caption instead
        try:
            await query.edit_message_caption(caption=completion_message, parse_mode="Markdown")
        except Exception as caption_error:
            logger.error(f"Failed to edit completion message: {e}, caption error: {caption_error}")
            # Send a new message instead
            await query.message.reply_text(completion_message, parse_mode="Markdown")
    
    # Clear broadcast data
    context.user_data.pop('broadcast_content', None)
    context.user_data.pop('broadcast_state', None)
    
    # Log broadcast completion
    logger.info(f"Broadcast completed: {sent_count} sent, {failed_count} failed")


async def _edit_broadcast(query, context):
    """Edit broadcast message"""
    try:
        await query.edit_message_text(
            "✏️ **Edit Broadcast Message**\n\n"
            "Please send your new broadcast message. You can send:\n"
            "• Text only\n"
            "• Text + Photo\n"
            "• Text + Video\n\n"
            "**Send your new message now:**",
            parse_mode="Markdown"
        )
    except Exception as e:
        # If the original message has media, try editing caption instead
        try:
            await query.edit_message_caption(
                caption="✏️ **Edit Broadcast Message**\n\n"
                "Please send your new broadcast message. You can send:\n"
                "• Text only\n"
                "• Text + Photo\n"
                "• Text + Video\n\n"
                "**Send your new message now:**",
                parse_mode="Markdown"
            )
        except Exception as caption_error:
            logger.error(f"Failed to edit broadcast message: {e}, caption error: {caption_error}")
            # Send a new message instead
            await query.message.reply_text(
                "✏️ **Edit Broadcast Message**\n\n"
                "Please send your new broadcast message. You can send:\n"
                "• Text only\n"
                "• Text + Photo\n"
                "• Text + Video\n\n"
                "**Send your new message now:**",
                parse_mode="Markdown"
            )
    context.user_data['broadcast_state'] = 'composing'


async def _cancel_broadcast(query, context):
    """Cancel broadcast"""
    try:
        await query.edit_message_text("❌ Broadcast cancelled.")
    except Exception as e:
        # If the original message has media, try editing caption instead
        try:
            await query.edit_message_caption(caption="❌ Broadcast cancelled.")
        except Exception as caption_error:
            logger.error(f"Failed to edit cancel message: {e}, caption error: {caption_error}")
            # Send a new message instead
            await query.message.reply_text("❌ Broadcast cancelled.")
    context.user_data.pop('broadcast_content', None)
    context.user_data.pop('broadcast_state', None)


async def _handle_free_plan(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_authorized(update):
        return
    assert update.callback_query is not None
    cq = update.callback_query
    user_id = cq.from_user.id
    
    # Get user from database and record interaction
    user = db.get_user(user_id, cq.from_user.username, cq.from_user.first_name)
    remaining_free = max(0, FREE_LIMIT - user['free_uses'])
    db.record_interaction(user_id, "free_plan_clicked", json.dumps({
        "remaining_free": remaining_free
    }))
    
    # Send the free plan image
    assets_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
    freeplan_image_path = os.path.join(assets_dir, "freeplan.jpg")
    with open(freeplan_image_path, "rb") as photo:
        await cq.message.reply_photo(
            photo=photo,
            caption="You're lucky today — congratulations! 🎉 You've received a free trial plan with 3 photo cuts at no cost 😍\n\nSend me a photo to start cutting!"
        )
    await cq.answer("Free plan activated!")


async def _handle_paid_plan(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_authorized(update):
        return
    assert update.callback_query is not None
    cq = update.callback_query
    user_id = cq.from_user.id
    
    # Record paid plan interaction
    db.record_interaction(user_id, "paid_plan_clicked")
    
    keyboard = [
        [InlineKeyboardButton("Buy 1 cut - 0.1 TON", callback_data="buy_1")],
        [InlineKeyboardButton("Buy 3 cuts - 0.2 TON", callback_data="buy_3")],
        [InlineKeyboardButton("Buy 10 cuts - 0.5 TON", callback_data="buy_10")],
    ]
    
    # Send the premium image
    assets_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
    premium_image_path = os.path.join(assets_dir, "preuime .jpg")
    with open(premium_image_path, "rb") as photo:
        await cq.message.reply_photo(
            photo=photo,
            caption="Welcome to the Premium Section!\nOur offers are very cheap — I recommend the 10 cuts package with a 50% discount 💀\n\n"
            "Pricing:\n"
            "- 0.1 TON → 1 cut\n"
            "- 0.2 TON → 3 cuts\n"
            "- 0.5 TON → 10 cuts",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )
    await cq.answer("Paid plans shown!")


async def _handle_play_games(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle play games callback - show available games"""
    if not _is_authorized(update):
        return
    assert update.callback_query is not None
    cq = update.callback_query
    user_id = cq.from_user.id
    
    # Record games interaction
    db.record_interaction(user_id, "games_clicked")
    
    keyboard = [
        [InlineKeyboardButton("🎯 Daily Quiz (10 credits)", callback_data="daily_quiz")],
        [InlineKeyboardButton("🎲 Lucky Spin (5 credits)", callback_data="lucky_spin")],
        [InlineKeyboardButton("📝 Share Story (20 credits)", callback_data="share_story")],
        [InlineKeyboardButton("🔙 Back to Menu", callback_data="back_to_menu")],
    ]
    
    await cq.message.reply_text(
        "🎮 **CollectibleKIT Games**\n\n"
        "Play games and earn credits!\n"
        "Every 100 credits = 0.1 TON\n\n"
        "Choose a game to play:",
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="Markdown"
    )
    await cq.answer("Games menu opened!")


async def _handle_my_credits(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle my credits callback - show user's credit balance and earning options"""
    if not _is_authorized(update):
        return
    assert update.callback_query is not None
    cq = update.callback_query
    user_id = cq.from_user.id
    
    # Get user data
    user = db.get_user(user_id)
    stats = db.get_user_stats(user_id)
    
    # Record credits interaction
    db.record_interaction(user_id, "credits_clicked")
    
    # Calculate TON equivalent
    ton_equivalent = user['credits'] / 1000  # 100 credits = 0.1 TON, so 1000 credits = 1 TON
    
    keyboard = [
        [InlineKeyboardButton("🎮 Play Games", callback_data="play_games")],
        [InlineKeyboardButton("🔗 Invite Friends", callback_data="invite_friends")],
        [InlineKeyboardButton("💎 Buy Credits", callback_data="paid_plan")],
        [InlineKeyboardButton("🔙 Back to Menu", callback_data="back_to_menu")],
    ]
    
    credits_message = f"💰 **Your Credits**\n\n"
    credits_message += f"Current Credits: {user['credits']}\n"
    credits_message += f"TON Equivalent: {ton_equivalent:.3f} TON\n"
    credits_message += f"Free Cuts Used: {user['free_uses']}/3\n\n"
    credits_message += f"**Earn Credits:**\n"
    credits_message += f"• Play games: 5-20 credits\n"
    credits_message += f"• Invite friends: 50 credits each\n"
    credits_message += f"• Share stories: 20 credits\n\n"
    credits_message += f"**Withdraw:** 100 credits = 0.1 TON"
    
    await cq.message.reply_text(
        credits_message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="Markdown"
    )
    await cq.answer("Credits info shown!")


async def _handle_invite_friends(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle invite friends callback - show referral link"""
    if not _is_authorized(update):
        return
    assert update.callback_query is not None
    cq = update.callback_query
    user_id = cq.from_user.id
    
    # Record invite interaction
    db.record_interaction(user_id, "invite_clicked")
    
    # Get referral stats
    referral_stats = db.get_referral_stats(user_id)
    
    keyboard = [
        [InlineKeyboardButton("🔙 Back to Credits", callback_data="my_credits")],
    ]
    
    invite_message = f"🔗 **Invite Friends & Earn Credits**\n\n"
    invite_message += f"**Your Referral Link:**\n"
    invite_message += f"`https://t.me/CollectibleKITbot?start=ref_{user_id}`\n\n"
    invite_message += f"**How it works:**\n"
    invite_message += f"• Share your link with friends\n"
    invite_message += f"• You get 50 credits when they join\n"
    invite_message += f"• They get 50 credits too!\n\n"
    invite_message += f"**Your Stats:**\n"
    invite_message += f"• Total referrals: {referral_stats['total_referrals']}\n"
    invite_message += f"• Recent referrals: {referral_stats['recent_referrals']}\n\n"
    invite_message += f"Copy the link above and share it with your friends!"
    
    await cq.message.reply_text(
        invite_message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="Markdown"
    )
    await cq.answer("Referral link shown!")


async def _handle_back_to_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle back to menu callback"""
    if not _is_authorized(update):
        return
    assert update.callback_query is not None
    cq = update.callback_query
    
    # Just answer the callback - the user can use /start to get back to main menu
    await cq.answer("Use /start to return to main menu")


# Text message handlers for keyboard buttons
async def _handle_free_plan_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle free plan text message"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    user = db.get_user(user_id, update.message.from_user.username, update.message.from_user.first_name)
    remaining_free = max(0, FREE_LIMIT - user['free_uses'])
    db.record_interaction(user_id, "free_plan_clicked", json.dumps({
        "remaining_free": remaining_free
    }))
    
    # Send the free plan image
    assets_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
    freeplan_image_path = os.path.join(assets_dir, "freeplan.jpg")
    with open(freeplan_image_path, "rb") as photo:
        await update.message.reply_photo(
            photo=photo,
            caption="You're lucky today — congratulations! 🎉 You've received a free trial plan with 3 photo cuts at no cost 😍\n\nSend me a photo to start cutting!"
        )


async def _handle_paid_plan_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle paid plan text message"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    db.record_interaction(user_id, "paid_plan_clicked")
    
    keyboard = [
        [InlineKeyboardButton("Buy 1 cut - 0.1 TON", callback_data="buy_1")],
        [InlineKeyboardButton("Buy 3 cuts - 0.2 TON", callback_data="buy_3")],
        [InlineKeyboardButton("Buy 10 cuts - 0.5 TON", callback_data="buy_10")],
    ]
    
    # Send the premium image
    assets_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
    premium_image_path = os.path.join(assets_dir, "preuime .jpg")
    with open(premium_image_path, "rb") as photo:
        await update.message.reply_photo(
            photo=photo,
            caption="Welcome to the Premium Section!\nOur offers are very cheap — I recommend the 10 cuts package with a 50% discount 💀\n\n"
            "Pricing:\n"
            "- 0.1 TON → 1 cut\n"
            "- 0.2 TON → 3 cuts\n"
            "- 0.5 TON → 10 cuts",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )


async def _handle_play_games_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle play games text message"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    db.record_interaction(user_id, "games_clicked")
    
    keyboard = [
        [InlineKeyboardButton("🎯 Daily Quiz (10 credits)", callback_data="daily_quiz")],
        [InlineKeyboardButton("🎲 Lucky Spin (5 credits)", callback_data="lucky_spin")],
        [InlineKeyboardButton("📝 Share Story (20 credits)", callback_data="share_story")],
        [InlineKeyboardButton("🔙 Back to Menu", callback_data="back_to_menu")],
    ]
    
    await update.message.reply_text(
        "🎮 **CollectibleKIT Games**\n\n"
        "Play games and earn credits!\n"
        "Every 100 credits = 0.1 TON\n\n"
        "Choose a game to play:",
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="Markdown"
    )


async def _handle_my_credits_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle my credits text message"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    user = db.get_user(user_id)
    stats = db.get_user_stats(user_id)
    
    db.record_interaction(user_id, "credits_clicked")
    
    # Calculate TON equivalent
    ton_equivalent = user['credits'] / 1000  # 100 credits = 0.1 TON, so 1000 credits = 1 TON
    
    keyboard = [
        [InlineKeyboardButton("🎮 Play Games", callback_data="play_games")],
        [InlineKeyboardButton("🔗 Invite Friends", callback_data="invite_friends")],
        [InlineKeyboardButton("💎 Buy Credits", callback_data="paid_plan")],
        [InlineKeyboardButton("🔙 Back to Menu", callback_data="back_to_menu")],
    ]
    
    credits_message = f"💰 **Your Credits**\n\n"
    credits_message += f"Current Credits: {user['credits']}\n"
    credits_message += f"TON Equivalent: {ton_equivalent:.3f} TON\n"
    credits_message += f"Free Cuts Used: {user['free_uses']}/3\n\n"
    credits_message += f"**Earn Credits:**\n"
    credits_message += f"• Play games: 5-20 credits\n"
    credits_message += f"• Invite friends: 50 credits each\n"
    credits_message += f"• Share stories: 20 credits\n\n"
    credits_message += f"**Withdraw:** 100 credits = 0.1 TON"
    
    await update.message.reply_text(
        credits_message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="Markdown"
    )


# Game handlers
async def _handle_daily_quiz(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle daily quiz game"""
    if not _is_authorized(update):
        return
    assert update.callback_query is not None
    cq = update.callback_query
    user_id = cq.from_user.id
    
    # Simple quiz question
    question = "🎯 **Daily Quiz**\n\nWhat is the capital of France?"
    options = ["London", "Berlin", "Paris", "Madrid"]
    correct_answer = "Paris"
    
    keyboard = [
        [InlineKeyboardButton("A) London", callback_data="quiz_answer_London")],
        [InlineKeyboardButton("B) Berlin", callback_data="quiz_answer_Berlin")],
        [InlineKeyboardButton("C) Paris", callback_data="quiz_answer_Paris")],
        [InlineKeyboardButton("D) Madrid", callback_data="quiz_answer_Madrid")],
    ]
    
    await cq.message.reply_text(
        question,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="Markdown"
    )
    await cq.answer("Quiz started!")


async def _handle_lucky_spin(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle lucky spin game"""
    if not _is_authorized(update):
        return
    assert update.callback_query is not None
    cq = update.callback_query
    user_id = cq.from_user.id
    
    import random
    
    # Random spin result
    spin_results = [
        {"credits": 5, "message": "🎉 You won 5 credits!"},
        {"credits": 10, "message": "🎉 You won 10 credits!"},
        {"credits": 15, "message": "🎉 You won 15 credits!"},
        {"credits": 0, "message": "😔 Better luck next time!"},
    ]
    
    result = random.choice(spin_results)
    
    if result["credits"] > 0:
        db.add_credits(user_id, result["credits"])
        db.record_interaction(user_id, "lucky_spin_won", json.dumps({
            "credits_won": result["credits"]
        }))
    else:
        db.record_interaction(user_id, "lucky_spin_lost")
    
    keyboard = [
        [InlineKeyboardButton("🎮 Play Again", callback_data="lucky_spin")],
        [InlineKeyboardButton("🔙 Back to Games", callback_data="play_games")],
    ]
    
    await cq.message.reply_text(
        f"🎲 **Lucky Spin**\n\n{result['message']}\n\nYour current credits: {db.get_user(user_id)['credits']}",
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="Markdown"
    )
    await cq.answer("Spin completed!")


async def _handle_share_story(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle share story game"""
    if not _is_authorized(update):
        return
    assert update.callback_query is not None
    cq = update.callback_query
    user_id = cq.from_user.id
    
    # Grant credits for sharing story
    db.add_credits(user_id, 20)
    db.record_interaction(user_id, "story_shared", json.dumps({
        "credits_earned": 20
    }))
    
    keyboard = [
        [InlineKeyboardButton("🎮 Back to Games", callback_data="play_games")],
    ]
    
    await cq.message.reply_text(
        f"📝 **Story Shared!**\n\n🎉 You earned 20 credits for sharing your story!\n\nYour current credits: {db.get_user(user_id)['credits']}",
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="Markdown"
    )
    await cq.answer("Story shared!")


async def _handle_quiz_answer(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle quiz answer"""
    if not _is_authorized(update):
        return
    assert update.callback_query is not None
    cq = update.callback_query
    user_id = cq.from_user.id
    
    # Extract answer from callback data
    answer = cq.data.replace("quiz_answer_", "")
    correct_answer = "Paris"
    
    if answer == correct_answer:
        # Correct answer - grant credits
        db.add_credits(user_id, 10)
        db.record_interaction(user_id, "quiz_correct", json.dumps({
            "answer": answer,
            "credits_earned": 10
        }))
        
        message = f"✅ **Correct!**\n\n🎉 You earned 10 credits!\n\nYour current credits: {db.get_user(user_id)['credits']}"
    else:
        # Wrong answer
        db.record_interaction(user_id, "quiz_incorrect", json.dumps({
            "answer": answer,
            "correct_answer": correct_answer
        }))
        
        message = f"❌ **Wrong answer!**\n\nThe correct answer was: {correct_answer}\n\nBetter luck next time!"
    
    keyboard = [
        [InlineKeyboardButton("🎮 Back to Games", callback_data="play_games")],
    ]
    
    await cq.message.reply_text(
        message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="Markdown"
    )
    await cq.answer("Quiz completed!")


async def _handle_buy_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle buy_1, buy_3, buy_10 callbacks - create payment and show button"""
    if not _is_authorized(update):
        return
    assert update.callback_query is not None
    cq = update.callback_query
    user_id = cq.from_user.id
    package_key = cq.data
    
    if package_key not in PACKAGES:
        await cq.answer("Invalid package!")
        return
    
    package = PACKAGES[package_key]
    
    # Record payment initiation
    db.record_interaction(user_id, "payment_initiated", json.dumps({
        "package": package_key,
        "amount_ton": package["ton"],
        "credits": package["credits"]
    }))
    
    # Create payment with secure memo
    memo = payment_manager.create_payment(
        user_id=user_id,
        amount_nano=package["amount_nano"],
        credits_to_grant=package["credits"]
    )
    
    # Create payment link
    payment_link = payment_manager.get_payment_link(RECV_ADDR, package["amount_nano"], memo)
    
    # Create keyboard with hidden payment link and check button
    keyboard = [
        [InlineKeyboardButton("💳 Pay Now", url=payment_link)],
        [InlineKeyboardButton("✅ Check Payment", callback_data=f"check_{memo}")],
    ]
    
    await cq.message.reply_text(
        f"💰 Payment Request\n\n"
        f"Package: {package['credits']} cut{'s' if package['credits'] > 1 else ''}\n"
        f"Amount: {package['ton']} TON\n\n"
        f"Click \"Pay Now\" to open Tonkeeper and complete your payment.\n"
        f"After payment, click \"Check Payment\" to verify and receive your credits.\n\n"
        f"⚠️ Warning\n\n"
        f"1. You need Telegram Premium to post all the stories; otherwise, it will take you weeks to complete your profile.\n"
        f"2. No refunds for any reason except if the bot is not working correctly.\n"
        f"3. When paying, make sure to press the Send button only once in Tonkeeper.\n"
        f"If the payment panel appears twice, it's a glitch from Tonkeeper — do not send twice.",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )
    await cq.answer(f"Payment link generated for {package['credits']} cuts!")


async def _handle_check_payment(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle check_MEMO callbacks"""
    if not _is_authorized(update):
        return
    assert update.callback_query is not None
    cq = update.callback_query
    user_id = cq.from_user.id
    
    # Extract memo from callback data
    if not cq.data.startswith("check_"):
        await cq.answer("Invalid check request!")
        return
    
    memo = cq.data[6:]  # Remove "check_" prefix
    
    # Verify payment
    if payment_manager.verify_payment(memo, RECV_ADDR):
        # Get updated user credits
        user = db.get_user(user_id)
        await cq.message.reply_text(
            f"✅ Payment verified!\n\n"
            f"Credits added to your account.\n"
            f"Current credits: {user['credits']}\n\n"
            f"Send me a photo to start cutting!"
        )
        await cq.answer("Payment verified! Credits added.")
    else:
        await cq.message.reply_text(
            "❌ Payment not found yet.\n\n"
            "Please wait a few moments after payment and try again.\n"
            "If you just paid, it may take 1-2 minutes to appear on the blockchain."
        )
        await cq.answer("Payment not found yet. Please wait and try again.")


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_authorized(update):
        return

    message = update.message
    assert message is not None
    user_id = message.from_user.id
    
    # Check if we're in broadcast composition mode - if so, let broadcast handler take over
    if context.user_data.get('broadcast_state') == 'composing':
        return
    
    # Get user from database
    try:
        user = db.get_user(user_id, message.from_user.username, message.from_user.first_name)
    except Exception as e:
        logger.error(f"Database error for user {user_id}: {e}")
        await message.reply_text("Database error. Please try again later.")
        return
    
    try:
        start_time = time.time()
        await message.chat.send_action(action="upload_photo")

        file = None
        if message.photo:
            file = await message.photo[-1].get_file()
        elif message.document:
            file = await message.document.get_file()
        else:
            await message.reply_text("Please send a photo or an image file.")
            return

        bio = BytesIO()
        try:
            await file.download_to_memory(out=bio)
            bio.seek(0)
        except Exception as e:
            logger.error(f"File download failed for user {user_id}: {e}")
            await message.reply_text("Failed to download image. Please try again.")
            return

        try:
            original = Image.open(bio)
            original = ImageOps.exif_transpose(original).convert("RGB")
            image_size = f"{original.size[0]}x{original.size[1]}"
        except Exception as e:
            logger.error(f"Image processing failed for user {user_id}: {e}")
            await message.reply_text("Invalid image format. Please send a valid image.")
            return

        logger.debug("Received image size: %s", original.size)
        
        # Record photo upload interaction
        try:
            db.record_interaction(user_id, "photo_uploaded", json.dumps({
                "image_size": image_size,
                "file_type": "photo" if message.photo else "document"
            }))
        except Exception as e:
            logger.warning(f"Failed to record interaction for user {user_id}: {e}")
            # Continue processing even if logging fails

        # Determine if free cut, paid cut, VIP, or needs payment
        watermark_text: Optional[str] = None
        credits_used = 0
        
        if _is_vip_user(user_id):
            # VIP user - infinite uses, no watermark, no credit consumption
            try:
                db.record_interaction(user_id, "vip_processing", json.dumps({
                    "image_size": image_size
                }))
            except Exception as e:
                logger.warning(f"Failed to record VIP interaction: {e}")
            await message.reply_text("👑 VIP Access - Processing unlimited cut...")
        elif user['credits'] > 0:
            # Use paid credit
            try:
                if db.consume_credit(user_id):
                    credits_used = 1
                    user = db.get_user(user_id)  # Refresh user data
                    db.record_interaction(user_id, "paid_processing", json.dumps({
                        "image_size": image_size,
                        "credits_remaining": user['credits']
                    }))
                    await message.reply_text(f"Using 1 credit. {user['credits']} credits remaining.")
                else:
                    await message.reply_text("Error consuming credit. Please try again.")
                    return
            except Exception as e:
                logger.error(f"Credit consumption failed for user {user_id}: {e}")
                await message.reply_text("Credit system error. Please try again.")
                return
        elif user['free_uses'] < FREE_LIMIT:
            # Use free cut with watermark
            try:
                if db.use_free_cut(user_id):
                    watermark_text = WATERMARK_TEXT
                    user = db.get_user(user_id)  # Refresh user data
                    remaining = FREE_LIMIT - user['free_uses']
                    db.record_interaction(user_id, "free_processing", json.dumps({
                        "image_size": image_size,
                        "remaining_free": remaining,
                        "watermarked": True
                    }))
                    await message.reply_text(f"Free trial used. Remaining free: {remaining}/3 (watermarked).")
                else:
                    await message.reply_text("Error using free cut. Please try again.")
                    return
            except Exception as e:
                logger.error(f"Free cut failed for user {user_id}: {e}")
                await message.reply_text("Free cut system error. Please try again.")
                return
        else:
            # No credits or free uses left
            try:
                db.record_interaction(user_id, "payment_required", json.dumps({
                    "image_size": image_size,
                    "free_uses": user['free_uses'],
                    "credits": user['credits']
                }))
            except Exception as e:
                logger.warning(f"Failed to record payment required: {e}")
            keyboard = [
                [InlineKeyboardButton("💎 Buy Credits", callback_data="paid_plan")],
            ]
            await message.reply_text(
                "You've used all your free cuts and have no credits. "
                "Please buy more cuts to continue:",
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return

        progress = await message.reply_text("Received. Processing...")

        # Process with or without watermark
        try:
            story_images: List[BytesIO] = cut_into_4x3_and_prepare_story_pieces(original, watermark_text=watermark_text)
        except Exception as e:
            logger.error(f"Image cutting failed for user {user_id}: {e}")
            await progress.edit_text("Failed to process image. Please try again.")
            return

        # Send sequentially with progress; UNCOMPRESSED (as documents)
        sent_count = 0
        for idx, img_bytes in enumerate(story_images, start=1):
            try:
                img_bytes.seek(0)
                # Use decreasing numbers: 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
                display_number = 13 - idx  # This gives us 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
                await progress.edit_text(f"Sending {display_number}/12 (uncompressed)...")
                await context.bot.send_document(
                    chat_id=message.chat_id,
                    document=InputFile(img_bytes, filename=f"{display_number}cut.png"),
                    caption=f"{display_number}/12" if display_number in (1, 12) else None,
                )
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed sending item {display_number} for user {user_id}: {e}")
                await message.reply_text(f"Failed to send {display_number}/12. Please try again later.")
                continue

        if sent_count == 0:
            await progress.edit_text("Failed to send any pieces. Please try again.")
            return

        processing_time = time.time() - start_time
        await progress.edit_text(f"Done. {sent_count}/12 sent.")
        
        # Send Pro Tip message with image
        try:
            assets_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
            protip_image_path = os.path.join(assets_dir, "protip.jpg")
            with open(protip_image_path, "rb") as photo:
                await message.reply_photo(
                    photo=photo,
                    caption="Pro Tip: How to build your story\nStart from the top (piece 12) and work down to the bottom (piece 1)."
                )
        except Exception as e:
            logger.warning(f"Failed to send Pro Tip image: {e}")
            # Fallback to text-only if image fails
            await message.reply_text("Pro Tip: How to build your story\nStart from the top (piece 12) and work down to the bottom (piece 1).")
        
        # Record the request in database
        try:
            db.record_request(
                user_id=user_id,
                request_type="4x3_story_cut",
                image_size=image_size,
                pieces_count=sent_count,
                watermarked=watermark_text is not None,
                credits_used=credits_used,
                processing_time=processing_time
            )
        except Exception as e:
            logger.error(f"Failed to record request for user {user_id}: {e}")
            # Don't fail the whole operation if logging fails
        
        logger.info(f"Processed image for user {user_id}: {image_size} -> {sent_count} pieces, watermarked={watermark_text is not None}")

    except Exception as exc:
        logger.exception("Processing failed: %s", exc)
        try:
            await message.reply_text("Error while processing the image. Please try again later.")
        except Exception:
            logger.error("Failed to send error message to user")


def main():
    logger.info("Bot is starting...")
    
    # Check for existing bot instances (optional)
    try:
        import psutil
        import os
        
        current_pid = os.getpid()
        bot_processes = []
        
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.info['cmdline'] and any('telegram_bot.py' in cmd for cmd in proc.info['cmdline']):
                    if proc.info['pid'] != current_pid:
                        bot_processes.append(proc.info['pid'])
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        if bot_processes:
            logger.warning(f"Found other bot instances running: {bot_processes}")
            logger.warning("This may cause conflicts. Consider stopping other instances.")
    except ImportError:
        logger.info("psutil not available - skipping bot instance check")
    except Exception as e:
        logger.warning(f"Could not check for other bot instances: {e}")
    
    while True:
        try:
            app = Application.builder().token(BOT_TOKEN).build()

            # Handlers
            app.add_handler(CommandHandler("start", start))
            app.add_handler(CommandHandler("credit", credit))
            app.add_handler(CommandHandler("analytics", analytics))
            app.add_handler(CommandHandler("test_users", test_users))
            app.add_handler(CommandHandler("send_to_chat", send_to_chat))
            app.add_handler(CommandHandler("test_media", test_media))
            app.add_handler(CommandHandler("broadcast", broadcast))
            # Broadcast content handler (must come before photo handler)
            app.add_handler(MessageHandler(filters.TEXT | filters.PHOTO | filters.VIDEO | filters.Document.VIDEO, handle_broadcast_content))
            # Photo handler for image processing (only when not in broadcast mode)
            app.add_handler(MessageHandler(filters.PHOTO | filters.Document.IMAGE, handle_photo))
            
            # Callback handlers
            app.add_handler(CallbackQueryHandler(_handle_free_plan, pattern="^free_plan$"))
            app.add_handler(CallbackQueryHandler(_handle_paid_plan, pattern="^paid_plan$"))
            app.add_handler(CallbackQueryHandler(_handle_buy_callback, pattern="^buy_"))
            app.add_handler(CallbackQueryHandler(_handle_check_payment, pattern="^check_"))
            app.add_handler(CallbackQueryHandler(_handle_play_games, pattern="^play_games$"))
            app.add_handler(CallbackQueryHandler(_handle_my_credits, pattern="^my_credits$"))
            app.add_handler(CallbackQueryHandler(_handle_invite_friends, pattern="^invite_friends$"))
            app.add_handler(CallbackQueryHandler(_handle_back_to_menu, pattern="^back_to_menu$"))
            # Game handlers
            app.add_handler(CallbackQueryHandler(_handle_daily_quiz, pattern="^daily_quiz$"))
            app.add_handler(CallbackQueryHandler(_handle_lucky_spin, pattern="^lucky_spin$"))
            app.add_handler(CallbackQueryHandler(_handle_share_story, pattern="^share_story$"))
            app.add_handler(CallbackQueryHandler(_handle_quiz_answer, pattern="^quiz_answer_"))
            # Broadcast handlers
            app.add_handler(CallbackQueryHandler(handle_broadcast_callback, pattern="^broadcast_"))

            logger.info("Bot handlers registered. Starting polling...")
            app.run_polling()
            
        except Exception as e:
            logger.error(f"Bot crashed with error: {e}")
            logger.info("Restarting bot in 10 seconds...")
            time.sleep(10)
            continue


if __name__ == "__main__":
    main()