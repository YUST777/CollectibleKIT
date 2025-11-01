# CollectibleKIT Telegram Bot

A standalone Telegram bot for CollectibleKIT with video start message, referral system, and credit earning games.

## Features

### 🎥 Video Start Message
- Shows `start.mp4` video with welcome message
- Fallback to `start.jpg` image if video not found
- Custom welcome message: "Welcome to CollectibleKIT!"

### 🔗 Referral System
- **50 credits bonus** for both referrer and referee
- Automatic referral link generation: `https://t.me/CollectibleKITbot?start=ref_{user_id}`
- Referral stats tracking (total and recent referrals)
- Proper referral processing with user data recording

### 🎮 Credit Earning Games
- **Daily Quiz**: 10 credits for correct answers
- **Lucky Spin**: 5-15 credits (random)
- **Share Story**: 20 credits
- All games properly track interactions and grant credits

### 💰 Credit System
- **100 credits = 0.1 TON** conversion rate
- Real-time credit balance display
- TON equivalent calculation
- Multiple earning methods (games, referrals, sharing)

### 📢 Admin Features
- `/broadcast` - Send messages to all users (admin only)
- `/analytics` - View bot statistics (admin only)
- `/credit` - Check user credits
- Broadcast confirmation system

## Installation

1. **Install dependencies:**
   ```bash
   pip install -r bot_requirements.txt
   ```

2. **Ensure assets directory exists:**
   ```
   assets/
   ├── start.mp4    # Start video
   ├── start.jpg    # Fallback image
   └── ...
   ```

3. **Run the bot:**
   ```bash
   python collectiblekit_bot.py
   # OR
   python start_bot.py
   ```

## Configuration

### Bot Token
The bot token is hardcoded in the file:
```python
BOT_TOKEN = "8151264433:AAG92vbSyL6TKyP1kBxfG6WQfYoz0Jy9df0"
```

### Admin Users
Add your user ID to the `ADMIN_USERS` set:
```python
ADMIN_USERS = {800092886}
```

### VIP Users
Add user IDs to the `VIP_USERS` set for unlimited access:
```python
VIP_USERS = {
    7416916695,
    6386563662,
    # ... more VIP users
}
```

## Commands

### User Commands
- `/start` - Start the bot with video and referral system
- `/credit` - Check your credits and account status

### Admin Commands
- `/broadcast <message>` - Send message to all users
- `/analytics` - View bot statistics

## Usage Examples

### Start Command
```
/start
```
Shows the welcome video with referral system and credit earning options.

### Broadcast Command (Admin)
```
/broadcast Hello everyone! New features are available!
```
Sends a message to all users with confirmation.

### Credit Check
```
/credit
```
Shows current credits, TON equivalent, and free cuts remaining.

## Database

The bot uses a simple in-memory database for demonstration. In production, replace with a proper database like SQLite, PostgreSQL, or MongoDB.

## File Structure

```
CollectibleKIT/
├── collectiblekit_bot.py      # Main bot file
├── start_bot.py              # Startup script
├── bot_requirements.txt     # Python dependencies
├── BOT_README.md            # This file
└── assets/
    ├── start.mp4            # Start video
    ├── start.jpg            # Fallback image
    └── ...
```

## Features Implemented

✅ Video start message with fallback  
✅ Referral system with 50 credit bonuses  
✅ Credit earning games (Quiz, Spin, Share)  
✅ Admin broadcast system  
✅ Analytics dashboard  
✅ Credit system (100 credits = 0.1 TON)  
✅ User management and tracking  
✅ Keyboard navigation  
✅ Error handling and logging  

## Notes

- The bot is designed to be standalone and not interfere with website code
- All features are self-contained in `collectiblekit_bot.py`
- Uses simple in-memory database (replace with proper DB in production)
- Includes comprehensive error handling and logging
- Supports both callback queries and text message handlers
