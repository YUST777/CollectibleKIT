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
    
    try:
        with open(start_video_path, "rb") as video:
            await update.message.reply_video(
                video=video,
                caption=welcome_message,
                parse_mode="Markdown"
            )
    except FileNotFoundError:
        # Fallback to image if video not found
        start_image_path = os.path.join(assets_dir, "start.jpg")
        with open(start_image_path, "rb") as photo:
            await update.message.reply_photo(
                photo=photo,
                caption=welcome_message,
                parse_mode="Markdown"
            )
    except Exception as e:
        logger.error(f"Error sending start media: {e}")
        # Fallback to text only
        await update.message.reply_text(
            welcome_message,
            parse_mode="Markdown"
        )
        
    # Add the two inline buttons
    inline_keyboard = [
        [InlineKeyboardButton("Start", url="https://t.me/CollectibleKITbot/CollectableKIT")],
        [InlineKeyboardButton("Join our community", url="https://t.me/The01Studio")],
    ]
    
    await update.message.reply_text(
        "Choose your option:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard),
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
    
    while True:
        try:
            app = Application.builder().token(BOT_TOKEN).build()

            # Handlers
            app.add_handler(CommandHandler("start", start))
            app.add_handler(CommandHandler("credit", credit))
            app.add_handler(CommandHandler("analytics", analytics))
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

            logger.info("Bot handlers registered. Starting polling...")
            app.run_polling()
            
        except Exception as e:
            logger.error(f"Bot crashed with error: {e}")
            logger.info("Restarting bot in 10 seconds...")
            time.sleep(10)
            continue


if __name__ == "__main__":
    main()