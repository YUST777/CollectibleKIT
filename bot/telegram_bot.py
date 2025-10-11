"""
Telegram bot for cutting images into 4x3 grid pieces for Telegram stories.
Each piece is scaled to fill 1080x1336 content area and centered on 1080x1920 canvas.
Supports watermarking, freemium model, and TON payments.
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
logger = logging.getLogger("story-puzzle-bot")

# Initialize database and payment manager
db = BotDatabase()
payment_manager = PaymentManager(db)

# Constants
FREE_LIMIT = 3
WATERMARK_TEXT = "@CanvasStoryBot"
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
    
    # Get or create user record and record start interaction
    user = db.get_user(user_id, username, first_name)
    db.record_interaction(user_id, "start", json.dumps({
        "username": username,
        "first_name": first_name
    }))
    
    # Create keyboard with Mini App button and inline buttons
    reply_keyboard = [
        [KeyboardButton("🎨 Mini App (Recommended)", web_app=WebAppInfo(url=MINI_APP_URL))],
        ["🆓 Free Plan", "💎 Paid Plan"]
    ]
    
    inline_keyboard = [
        [InlineKeyboardButton("🆓 Free Plan", callback_data="free_plan")],
        [InlineKeyboardButton("💎 Paid Plan", callback_data="paid_plan")],
    ]
    
    # Send the start image with welcome message
    assets_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
    start_image_path = os.path.join(assets_dir, "start.jpg")
    with open(start_image_path, "rb") as photo:
        await update.message.reply_photo(
            photo=photo,
            caption="Welcome!\n\n🎨 **Try our Mini App for the best experience!**\n\nSend me any photo of any size, and I will create a story canvas for you — just like @etosirius's profile 🔥",
            reply_markup=ReplyKeyboardMarkup(reply_keyboard, resize_keyboard=True, one_time_keyboard=False),
        )
        
        # Send inline buttons separately for other options
        await update.message.reply_text(
            "Or use these options:",
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
            # Web app data handler removed - using native shareToStory() method
            app.add_handler(MessageHandler(filters.Regex("^🎨 Mini App"), start))  # Handle Mini App button press
            
            # Callback handlers
            app.add_handler(CallbackQueryHandler(_handle_free_plan, pattern="^free_plan$"))
            app.add_handler(CallbackQueryHandler(_handle_paid_plan, pattern="^paid_plan$"))
            app.add_handler(CallbackQueryHandler(_handle_buy_callback, pattern="^buy_"))
            app.add_handler(CallbackQueryHandler(_handle_check_payment, pattern="^check_"))

            logger.info("Bot handlers registered. Starting polling...")
            app.run_polling()
            
        except Exception as e:
            logger.error(f"Bot crashed with error: {e}")
            logger.info("Restarting bot in 10 seconds...")
            time.sleep(10)
            continue


if __name__ == "__main__":
    main()