#!/usr/bin/env python3
"""
CollectibleKIT Telegram Bot
A standalone Telegram bot for CollectibleKIT with video start message, referral system, and credit earning games.
"""

import asyncio
import json
import logging
import os
import time
import random
from io import BytesIO
from typing import List, Optional

from PIL import Image, ImageOps
from telegram import Update, InputFile, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, KeyboardButton, ReplyKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, CallbackQueryHandler, filters

# Configure logging
logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    level=logging.DEBUG,
)
logger = logging.getLogger("collectiblekit-bot")

# Bot Configuration
BOT_TOKEN = "8151264433:AAG92vbSyL6TKyP1kBxfG6WQfYoz0Jy9df0"
MINI_APP_URL = os.getenv("MINI_APP_URL", "https://your-domain.com")

# Constants
FREE_LIMIT = 3
WATERMARK_TEXT = "@CollectibleKITbot"
RECV_ADDR = "UQCFRqB2vZnGZRh3ZoZAItNidk8zpkN0uRHlhzrnwweU3mos"

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

# Admin users
ADMIN_USERS = {800092886}

# Package definitions (amount in nanoTON, credits granted)
PACKAGES = {
    "buy_1": {"amount_nano": 100_000_000, "credits": 1, "ton": 0.1},   # 0.1 TON -> 1 cut
    "buy_3": {"amount_nano": 200_000_000, "credits": 3, "ton": 0.2},   # 0.2 TON -> 3 cuts
    "buy_10": {"amount_nano": 500_000_000, "credits": 10, "ton": 0.5}, # 0.5 TON -> 10 cuts
}

# Simple in-memory database (replace with proper database in production)
class SimpleDatabase:
    def __init__(self):
        self.users = {}
        self.payments = {}
        self.interactions = []
        self.referrals = []
        self.feed_events = []
    
    def get_user(self, user_id: int, username: str = None, first_name: str = None):
        """Get or create user record"""
        if user_id not in self.users:
            self.users[user_id] = {
                'user_id': user_id,
                'username': username,
                'first_name': first_name,
                'free_uses': 0,
                'credits': 0,
                'created_at': time.time(),
                'last_activity': time.time()
            }
        else:
            # Update user info if provided
            if username:
                self.users[user_id]['username'] = username
            if first_name:
                self.users[user_id]['first_name'] = first_name
            self.users[user_id]['last_activity'] = time.time()
        
        return self.users[user_id]
    
    def add_credits(self, user_id: int, amount: int):
        """Add credits to user"""
        if user_id in self.users:
            self.users[user_id]['credits'] += amount
    
    def consume_credit(self, user_id: int) -> bool:
        """Consume one credit if available"""
        if user_id in self.users and self.users[user_id]['credits'] > 0:
            self.users[user_id]['credits'] -= 1
            return True
        return False
    
    def use_free_cut(self, user_id: int) -> bool:
        """Use one free cut if available"""
        if user_id in self.users and self.users[user_id]['free_uses'] < FREE_LIMIT:
            self.users[user_id]['free_uses'] += 1
            return True
        return False
    
    def add_referral(self, referrer_id: int, invited_id: int, invited_name: str, invited_photo: str):
        """Add a referral record"""
        self.referrals.append({
            'referrer_id': referrer_id,
            'invited_id': invited_id,
            'invited_name': invited_name,
            'invited_photo': invited_photo,
            'created_at': time.time()
        })
        return True
    
    def get_referral_stats(self, referrer_id: int):
        """Get referral statistics for a user"""
        total_referrals = sum(1 for r in self.referrals if r['referrer_id'] == referrer_id)
        week_ago = time.time() - (7 * 24 * 60 * 60)
        recent_referrals = sum(1 for r in self.referrals if r['referrer_id'] == referrer_id and r['created_at'] > week_ago)
        
        return {
            'total_referrals': total_referrals,
            'recent_referrals': recent_referrals
        }
    
    def record_interaction(self, user_id: int, interaction_type: str, data: str = None):
        """Record user interaction for analytics"""
        self.interactions.append({
            'user_id': user_id,
            'interaction_type': interaction_type,
            'data': data,
            'created_at': time.time()
        })
    
    def get_analytics_summary(self):
        """Get comprehensive analytics for the bot"""
        total_users = len(self.users)
        week_ago = time.time() - (7 * 24 * 3600)
        active_users = sum(1 for u in self.users.values() if u['last_activity'] > week_ago)
        
        interactions_by_type = {}
        for interaction in self.interactions:
            itype = interaction['interaction_type']
            interactions_by_type[itype] = interactions_by_type.get(itype, 0) + 1
        
        return {
            'total_users': total_users,
            'active_users_7d': active_users,
            'total_interactions': len(self.interactions),
            'interactions_by_type': interactions_by_type,
            'total_revenue_ton': 0,  # Placeholder
            'total_requests': 0,     # Placeholder
            'free_requests': 0,      # Placeholder
            'paid_requests': 0       # Placeholder
        }
    
    def get_all_users(self):
        """Get all users for broadcast"""
        return list(self.users.keys())

# Initialize database
db = SimpleDatabase()

def _is_authorized(update: Update) -> bool:
    """Only allow private chats for security"""
    if update.effective_chat and update.effective_chat.type != "private":
        return False
    return True

def _is_vip_user(user_id: int) -> bool:
    """Check if user has infinite uses"""
    return user_id in VIP_USERS

def _is_admin_user(user_id: int) -> bool:
    """Check if user is admin"""
    return user_id in ADMIN_USERS

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command with video and referral system"""
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
    assets_dir = os.path.join(os.path.dirname(__file__), "assets")
    start_video_path = os.path.join(assets_dir, "start.mp4")
    
    welcome_message = "**Welcome to CollectibleKIT**\n\n"
    welcome_message += "Use free tools.\n\n"
    welcome_message += "Play free games and earn credits.\n\n"
    welcome_message += "Every 100 credits = 0.1 TON"
    
    if referral_bonus_granted:
        welcome_message += "\n\n**Referral Bonus!** You received 50 credits for joining through a referral!"
    
    # Add the two inline buttons
    inline_keyboard = [
        [InlineKeyboardButton("Start", web_app=WebAppInfo(url="https://t.me/CollectibleKITbot/CollectableKIT"))],
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

async def broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /broadcast command (admin only)"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    
    # Only allow admin users to broadcast
    if not _is_admin_user(user_id):
        await update.message.reply_text("❌ Access denied. Admin only command.")
        return
    
    # Get broadcast message
    if not context.args:
        await update.message.reply_text(
            "Usage: /broadcast <message>\n\n"
            "Example: /broadcast Hello everyone! New features are available!"
        )
        return
    
    broadcast_message = " ".join(context.args)
    
    # Get all users
    all_users = db.get_all_users()
    total_users = len(all_users)
    
    if total_users == 0:
        await update.message.reply_text("❌ No users found to broadcast to.")
        return
    
    # Send confirmation
    await update.message.reply_text(
        f"📢 **Broadcast Preview**\n\n"
        f"Message: {broadcast_message}\n\n"
        f"Recipients: {total_users} users\n\n"
        f"Type 'CONFIRM' to send the broadcast:",
        parse_mode="Markdown"
    )
    
    # Store broadcast data in context for confirmation
    context.user_data['pending_broadcast'] = {
        'message': broadcast_message,
        'users': all_users,
        'timestamp': time.time()
    }

async def confirm_broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle broadcast confirmation"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    
    if not _is_admin_user(user_id):
        return
    
    if update.message.text and update.message.text.upper() == "CONFIRM":
        if 'pending_broadcast' in context.user_data:
            broadcast_data = context.user_data['pending_broadcast']
            message = broadcast_data['message']
            users = broadcast_data['users']
            
            # Send broadcast to all users
            sent_count = 0
            failed_count = 0
            
            await update.message.reply_text("📢 Sending broadcast...")
            
            for user_id in users:
                try:
                    await context.bot.send_message(
                        chat_id=user_id,
                        text=f"📢 **CollectibleKIT Announcement**\n\n{message}",
                        parse_mode="Markdown"
                    )
                    sent_count += 1
                except Exception as e:
                    logger.error(f"Failed to send broadcast to user {user_id}: {e}")
                    failed_count += 1
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.1)
            
            # Send completion report
            await update.message.reply_text(
                f"✅ **Broadcast Complete**\n\n"
                f"✅ Sent: {sent_count}\n"
                f"❌ Failed: {failed_count}\n"
                f"📊 Total: {len(users)}",
                parse_mode="Markdown"
            )
            
            # Clear pending broadcast
            del context.user_data['pending_broadcast']
        else:
            await update.message.reply_text("❌ No pending broadcast to confirm.")

async def analytics(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show comprehensive bot analytics (admin only)"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    
    # Only allow admin users to view analytics
    if not _is_admin_user(user_id):
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

async def credit(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show user their current credits and usage stats"""
    if not _is_authorized(update):
        return
    
    user_id = update.message.from_user.id
    user = db.get_user(user_id, update.message.from_user.username, update.message.from_user.first_name)
    
    # Record credit command interaction
    db.record_interaction(user_id, "credit_command")
    
    if _is_vip_user(user_id):
        await update.message.reply_text(
            f"👑 VIP Account Status\n\n"
            f"Status: UNLIMITED ACCESS\n"
            f"Credits: ∞ (Infinite)\n\n"
            f"You have unlimited cuts with no watermark! 🔥"
        )
    else:
        remaining_free = max(0, FREE_LIMIT - user['free_uses'])
        ton_equivalent = user['credits'] / 1000  # 100 credits = 0.1 TON, so 1000 credits = 1 TON
        
        await update.message.reply_text(
            f"💳 Your Account Status\n\n"
            f"Credits: {user['credits']}\n"
            f"TON Equivalent: {ton_equivalent:.3f} TON\n"
            f"Free cuts remaining: {remaining_free}/{FREE_LIMIT}\n\n"
            f"Need more credits? Use /start to see our packages!"
        )

# Game handlers
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

async def _handle_lucky_spin(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle lucky spin game"""
    if not _is_authorized(update):
        return
    assert update.callback_query is not None
    cq = update.callback_query
    user_id = cq.from_user.id
    
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

async def _handle_daily_quiz(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle daily quiz game"""
    if not _is_authorized(update):
        return
    assert update.callback_query is not None
    cq = update.callback_query
    user_id = cq.from_user.id
    
    # Simple quiz question
    question = "🎯 **Daily Quiz**\n\nWhat is the capital of France?"
    
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
    
    await update.message.reply_text(
        "You're lucky today — congratulations! 🎉 You've received a free trial plan with 3 photo cuts at no cost 😍\n\nSend me a photo to start cutting!"
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
    
    await update.message.reply_text(
        "Welcome to the Premium Section!\nOur offers are very cheap — I recommend the 10 cuts package with a 50% discount 💀\n\n"
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

def main():
    """Main function to run the bot"""
    logger.info("CollectibleKIT Bot is starting...")
    
    while True:
        try:
            app = Application.builder().token(BOT_TOKEN).build()

            # Command handlers
            app.add_handler(CommandHandler("start", start))
            app.add_handler(CommandHandler("credit", credit))
            app.add_handler(CommandHandler("analytics", analytics))
            app.add_handler(CommandHandler("broadcast", broadcast))
            
            # Message handlers
            app.add_handler(MessageHandler(filters.Regex("^🎨 Mini App"), start))  # Handle Mini App button press
            app.add_handler(MessageHandler(filters.Regex("^🆓 Free Plan"), _handle_free_plan_text))
            app.add_handler(MessageHandler(filters.Regex("^💎 Paid Plan"), _handle_paid_plan_text))
            app.add_handler(MessageHandler(filters.Regex("^🎮 Play Games"), _handle_play_games_text))
            app.add_handler(MessageHandler(filters.Regex("^💰 My Credits"), _handle_my_credits_text))
            
            # Callback handlers
            app.add_handler(CallbackQueryHandler(_handle_play_games, pattern="^play_games$"))
            app.add_handler(CallbackQueryHandler(_handle_my_credits, pattern="^my_credits$"))
            app.add_handler(CallbackQueryHandler(_handle_invite_friends, pattern="^invite_friends$"))
            app.add_handler(CallbackQueryHandler(_handle_back_to_menu, pattern="^back_to_menu$"))
            # Game handlers
            app.add_handler(CallbackQueryHandler(_handle_daily_quiz, pattern="^daily_quiz$"))
            app.add_handler(CallbackQueryHandler(_handle_lucky_spin, pattern="^lucky_spin$"))
            app.add_handler(CallbackQueryHandler(_handle_share_story, pattern="^share_story$"))
            app.add_handler(CallbackQueryHandler(_handle_quiz_answer, pattern="^quiz_answer_"))
            
            # Handle broadcast confirmation
            app.add_handler(MessageHandler(filters.TEXT & filters.Regex("^CONFIRM$"), confirm_broadcast))

            logger.info("Bot handlers registered. Starting polling...")
            app.run_polling()
            
        except Exception as e:
            logger.error(f"Bot crashed with error: {e}")
            logger.info("Restarting bot in 10 seconds...")
            time.sleep(10)
            continue

if __name__ == "__main__":
    main()
