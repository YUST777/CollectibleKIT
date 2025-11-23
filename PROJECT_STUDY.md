# CollectibleKIT - Complete Project Study

## 📋 Project Overview

**CollectibleKIT** is a comprehensive Telegram Mini App platform for creating, sharing, and monetizing content within the Telegram ecosystem. It combines image processing, gift collection design, mini games, and TON blockchain payments into a unified platform.

**Live URL:** `https://collectablekit.01studio.xyz`  
**Bot:** `@CollectibleKITbot`

---

## 🏗️ Architecture Overview

### Core Components

1. **Telegram Bot (Python)** - Backend service for image processing and user management
2. **Next.js Web App** - Frontend mini app with React/TypeScript
3. **SQLite Database** - User data, payments, analytics storage
4. **TON Blockchain Integration** - Payment processing and withdrawals
5. **Market APIs** - Integration with TGMRKT and Quant Marketplace

---

## 📁 Project Structure

```
CollectibleKIT/
├── bot/                          # Python Telegram bot backend
│   ├── telegram_bot.py          # Main bot handler (1962 lines)
│   ├── database.py              # SQLite database operations
│   ├── processing.py            # Image cutting & watermarking
│   ├── payment.py               # TON payment verification
│   ├── config.py                # Configuration & secrets
│   ├── backup.py                # Database backup system
│   └── bot_data.db              # SQLite database
│
├── webapp-nextjs/                # Next.js frontend application
│   ├── src/
│   │   ├── app/                 # Next.js app router
│   │   │   ├── api/             # API routes (30+ endpoints)
│   │   │   ├── page.tsx         # Main entry point
│   │   │   └── layout.tsx       # Root layout
│   │   ├── components/          # React components
│   │   │   ├── tabs/            # Tab components (Story, Games, etc.)
│   │   │   ├── sections/        # Feature sections
│   │   │   └── ui/              # UI components
│   │   ├── lib/                 # Utilities & services
│   │   ├── store/               # Zustand state management
│   │   └── types/               # TypeScript definitions
│   └── public/                  # Static assets
│
├── mrktandquantomapi/            # Market API integrations
│   ├── mrkt/                    # TGMRKT API scripts
│   └── quant/                   # Quant Marketplace API
│
├── sticker_collections/          # Gift/sticker collection data
├── assets/                       # Bot assets (images, videos)
└── requirements.txt              # Python dependencies
```

---

## 🔧 Technology Stack

### Backend (Bot)
- **Python 3.7+**
- **python-telegram-bot** (v21.0.0+) - Telegram Bot API
- **Pillow** (v10.0.0+) - Image processing
- **SQLite3** - Database
- **requests** - HTTP client
- **Flask** - API server (optional)

### Frontend (Web App)
- **Next.js 16** (App Router)
- **React 18** with TypeScript
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **@tonconnect/ui-react** - TON wallet integration
- **@telegram-apps/analytics** - Telegram analytics

### Blockchain
- **TON Blockchain** - Payment processing
- **TON Center API** - Transaction verification
- **Tonkeeper** - Wallet integration

---

## 🎯 Core Features

### 1. Story Creator Tool
- **Functionality:** Cut photos into 12 story pieces (4x3 grid)
- **Output:** 1080x1920 Telegram Story format
- **Watermarking:** Optional watermark for free users
- **Processing:** Server-side image processing with PIL

**Key Files:**
- `bot/processing.py` - Image cutting logic
- `bot/telegram_bot.py` - Photo handler (lines 1662-1869)

### 2. Gift Collection Designer
- **Grid Sizes:** 3x3 to 18x18 customizable grids
- **Components:** Models, patterns, backdrops
- **Features:** Save/load collections, public/private sharing
- **Storage:** SQLite database with user designs

**Key Files:**
- `webapp-nextjs/src/components/tabs/CollectionTab.tsx`
- `webapp-nextjs/src/app/api/collection/` - Collection API routes

### 3. Mini Games
- **Daily Quiz:** Guess gifts from questions (10 credits reward)
- **Zoom Game:** Identify gifts from close-ups
- **Emoji Game:** Pattern matching game
- **Lucky Spin:** Random credit rewards (5-15 credits)

**Key Files:**
- `webapp-nextjs/src/app/api/game/` - Game API routes
- `bot/database.py` - Daily game tracking (lines 436-510)

### 4. TON Payment System
- **Packages:**
  - 0.1 TON → 1 cut
  - 0.2 TON → 3 cuts
  - 0.5 TON → 10 cuts
- **Payment Flow:** Tonkeeper link → TON Center verification → Credit grant
- **Withdrawals:** 100 credits = 0.1 TON withdrawal

**Key Files:**
- `bot/payment.py` - Payment verification
- `webapp-nextjs/src/app/api/withdraw-rewards/` - Withdrawal API

### 5. Credit System
- **Free Tier:** 3 free cuts (watermarked)
- **New Users:** 20 free credits on signup
- **Earning Methods:**
  - Play games: 5-20 credits
  - Refer friends: 50 credits each
  - Share stories: 20 credits
- **Conversion:** 100 credits = 0.1 TON

### 6. Referral System
- **Mechanics:** Referral links with `ref_<user_id>` parameter
- **Rewards:** 50 credits for both referrer and referee
- **Tracking:** Database table with referral stats

**Key Files:**
- `bot/database.py` - Referral methods (lines 556-609)
- `bot/telegram_bot.py` - Referral processing (lines 146-171)

### 7. Premium Features
- **Subscription:** 1 TON/month
- **Benefits:**
  - 300 credits/month
  - No watermarks
  - Priority features
  - VIP badge

### 8. Admin Features
- **Commands:**
  - `/admin` - User statistics
  - `/analytics` - Bot analytics dashboard
  - `/broadcast` - Send messages to all users
  - `/backup` - Manual database backup
- **Access Control:** Admin user ID: `800092886`

**Key Files:**
- `bot/telegram_bot.py` - Admin handlers (lines 451-1078)

---

## 💾 Database Schema

### Tables

1. **users**
   - `user_id` (PRIMARY KEY)
   - `username`, `first_name`
   - `free_uses` (0-3)
   - `credits` (default: 20)
   - `created_at`, `last_activity`

2. **payments**
   - `id`, `user_id`, `memo` (UNIQUE)
   - `amount_nano`, `credits_to_grant`
   - `status` (pending/completed)
   - `transaction_hash`

3. **requests**
   - Image processing history
   - `request_type`, `image_size`, `pieces_count`
   - `watermarked`, `credits_used`, `processing_time`

4. **interactions**
   - User interaction tracking for analytics
   - `interaction_type`, `data` (JSON)

5. **referrals**
   - Referral tracking
   - `referrer_id`, `invited_id`, `invited_name`, `invited_photo`

6. **daily_game_questions**
   - Daily game questions by date/time slot

7. **daily_game_solves**
   - User game solutions
   - `is_first_solver` flag

8. **daily_game_rewards**
   - TON rewards for game winners
   - `amount`, `tx_hash`

9. **sales**
   - Completed payment records

10. **feed_events**
    - Social feed events

11. **broadcasts**
    - Admin broadcast history

**Key File:** `bot/database.py` (695 lines)

---

## 🔐 Security & Configuration

### Environment Variables
```bash
TELEGRAM_BOT_TOKEN          # Bot token from @BotFather
TELEGRAM_API_ID            # From my.telegram.org/apps
TELEGRAM_API_HASH          # From my.telegram.org/apps
MINI_APP_URL               # https://collectablekit.01studio.xyz
TON_WALLET_MNEMONIC        # 24-word wallet mnemonic
```

### VIP Users
Hardcoded VIP user IDs with unlimited access:
- No watermark
- No credit consumption
- Infinite uses

**Key File:** `bot/telegram_bot.py` (lines 53-67)

### Payment Security
- Secure memo generation (8 random alphanumeric)
- TON Center API verification
- Transaction hash tracking
- Duplicate payment prevention

---

## 📊 API Endpoints

### Bot API (Python)
- `/start` - Welcome message with referral handling
- `/credit` - Show user credits
- `/myid` - Show user ID
- `/admin` - Admin dashboard
- `/analytics` - Analytics report
- `/broadcast` - Broadcast composer
- `/backup` - Manual backup

### Web App API (Next.js)
Located in `webapp-nextjs/src/app/api/`:

**Collection:**
- `POST /api/collection/save` - Save collection
- `GET /api/collection/load` - Load user collections
- `DELETE /api/collection/delete` - Delete collection
- `GET /api/collection/gifts` - Get available gifts
- `GET /api/collection/backdrops` - Get backdrops

**Games:**
- `GET /api/game/daily-question` - Get daily question
- `POST /api/game/submit-answer` - Submit answer
- `GET /api/game/gifts` - Get game gifts
- `GET /api/game/random-gift` - Random gift for games

**Portfolio:**
- `GET /api/portfolio/gifts` - User's Telegram gifts
- `GET /api/portfolio/stickers` - User's stickers
- `GET /api/portfolio/chart` - Portfolio value chart

**User:**
- `GET /api/user/info` - User information
- `POST /api/user/init` - Initialize user

**Payments:**
- `POST /api/premium/upgrade` - Upgrade to premium
- `POST /api/withdraw-rewards` - Withdraw TON rewards
- `GET /api/ton-price` - Get TON price

**Tasks:**
- `GET /api/tasks` - Get user tasks
- `POST /api/tasks/complete` - Complete task
- `GET /api/tasks/streak` - Get streak info

---

## 🎮 Game Mechanics

### Daily Game
- **Question Types:** Gift identification, pattern matching
- **Time Slots:** Multiple questions per day
- **Rewards:**
  - First solver: Higher TON reward
  - Other solvers: Credit rewards
- **Tracking:** Database records solve time and rewards

### Zoom Game
- Identify gifts from zoomed-in images
- Credit rewards based on difficulty

### Emoji Game
- Match emoji patterns to gifts
- Pattern recognition challenge

---

## 💰 Monetization Model

### Revenue Streams
1. **Premium Subscriptions:** 1 TON/month
2. **Credit Purchases:** 0.1-0.5 TON packages
3. **Future:** Featured collections, API access

### Pricing
- **Free:** 3 cuts (watermarked) + 20 credits
- **Premium:** 1 TON/month = 300 credits + no watermark
- **Pay-per-use:** 0.1 TON = 1 cut

### Withdrawal System
- Minimum: 100 credits = 0.1 TON
- TON wallet integration via Tonkeeper
- Transaction tracking in database

---

## 🔄 Image Processing Pipeline

### Story Cutting Process
1. **Input:** User uploads photo via Telegram
2. **Grid Cut:** 4x3 grid (12 pieces)
3. **Resize:** Each piece → 1080x1336
4. **Canvas:** Center on 1080x1920 black canvas
5. **Watermark:** Add watermark if free user
6. **Output:** 12 PNG files sent as documents

**Key File:** `bot/processing.py` (155 lines)

### Watermarking
- Position: Middle-left of content area
- Style: Subtle white text with shadow
- Font: DejaVu Sans Bold (fallback to default)
- Visibility: Semi-transparent (120 alpha)

---

## 📱 Telegram Integration

### WebApp SDK
- Full Telegram WebApp SDK integration
- Theme detection (light/dark)
- Haptic feedback
- Story sharing via `shareToStory()`
- Analytics tracking

### Bot Features
- Private chat only (security)
- Video start message
- Inline keyboards
- Callback query handling
- File upload/download

---

## 🚀 Deployment

### Bot Deployment
- **Script:** `start_bot.py`
- **Service:** `mini_app.service` (systemd)
- **Monitoring:** `monitor_bot.sh`
- **Backup:** Automatic hourly backups

### Web App Deployment
- **Platform:** Netlify-ready configuration
- **Build:** `npm run build`
- **Port:** 3003 (development)
- **HTTPS:** Let's Encrypt SSL

**Key Files:**
- `netlify.toml` - Netlify configuration
- `NETLIFY_READY_SUMMARY.txt` - Deployment guide

---

## 📈 Analytics & Tracking

### User Analytics
- Total users, active users (7/30 days)
- Interaction tracking by type
- Revenue tracking
- Request statistics (free vs paid)
- Conversion rates

### Database Analytics
- User sessions
- Feed events
- Broadcast history
- Referral statistics

**Key File:** `bot/database.py` - `get_analytics_summary()` (lines 378-432)

---

## 🔗 External Integrations

### Market APIs
1. **TGMRKT API** (`tgmrkt.io`)
   - 111 gift collections
   - JWT authentication
   - Auto-refresh tokens

2. **Quant Marketplace** (`quant-marketplace.com`)
   - 134 gift collections
   - Cloudflare bypass (cloudscraper)
   - 29 unique filtered gifts

**Key Directory:** `mrktandquantomapi/`

### TON Blockchain
- **TON Center API:** Transaction verification
- **Tonkeeper:** Payment links
- **Wallet Integration:** TON Connect UI

---

## 🛠️ Development Workflow

### Bot Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run bot
python -m bot.telegram_bot
# or
python start_bot.py
```

### Web App Development
```bash
cd webapp-nextjs
npm install
npm run dev  # Port 3003
```

### Database Management
- SQLite file: `bot/bot_data.db`
- Backup system: Automatic hourly + manual
- Backup location: Telegram chat (-4944651195)

---

## 📝 Key Code Patterns

### State Management (Zustand)
- Centralized store with persistence
- TypeScript interfaces
- Selector hooks for performance
- Actions for mutations

**Key File:** `webapp-nextjs/src/store/useAppStore.ts` (377 lines)

### Error Handling
- Try-catch blocks with logging
- User-friendly error messages
- Graceful degradation
- Database transaction safety

### Image Processing
- PIL (Pillow) for image manipulation
- BytesIO for in-memory processing
- EXIF orientation correction
- Format conversion (RGB, PNG)

---

## 🎨 UI/UX Features

### Design System
- Tailwind CSS utility classes
- Responsive mobile-first design
- Dark/light theme support
- Telegram-native feel

### Components
- Loading screens with Lottie animations
- Modal dialogs (Radix UI)
- Bottom navigation
- Side drawers
- Toast notifications (react-hot-toast)

### Navigation
- Tab-based navigation
- Multi-level navigation (main/tools/games)
- Back button handling
- Drawer system

---

## 🔍 Code Quality

### Python
- Type hints
- Logging throughout
- Error handling
- Docstrings

### TypeScript
- Strict type checking
- Interface definitions
- Component typing
- API route typing

### Database
- Parameterized queries (SQL injection prevention)
- Transaction safety
- Index optimization
- Connection pooling

---

## 📚 Documentation

### Available Docs
- `PITCH_DECK.txt` - Business pitch (555 lines)
- `NETLIFY_READY_SUMMARY.txt` - Deployment guide
- `mrktandquantomapi/README.md` - Market API docs
- `webapp-nextjs/CollectibleKIT-master/docs/` - Feature docs

### Key Documentation Files
- `README_NEXTJS.md` - Next.js setup
- `README_BOT.md` - Bot setup
- `TON_CONNECT_INTEGRATION.md` - TON wallet setup
- `STORY_SHARING_IMPLEMENTATION.md` - Story feature

---

## 🐛 Known Issues & Considerations

### Database
- SQLite doesn't work on Netlify (needs external DB)
- File uploads need cloud storage (not persistent on Netlify)

### Scalability
- SQLite may become bottleneck at scale
- Consider PostgreSQL migration
- Image processing may need queue system

### Security
- Bot token in config (should use env var)
- VIP users hardcoded (should be in DB)
- Payment verification has rate limits

---

## 🎯 Future Enhancements

### Planned Features
- Multi-language support
- Custom gift uploads
- Template marketplace
- Enhanced social features
- NFT collection support
- Creator monetization tools
- API & SDK release

---

## 📊 Project Statistics

### Codebase Size
- **Bot:** ~2000 lines (Python)
- **Web App:** ~5000+ lines (TypeScript/React)
- **Database:** 11 tables, comprehensive schema
- **API Routes:** 30+ endpoints

### Features Count
- **Core Features:** 8 major features
- **Games:** 4 game types
- **Admin Commands:** 7 commands
- **API Endpoints:** 30+ routes

---

## 🔐 Security Best Practices

### Implemented
- ✅ Private chat only
- ✅ Admin access control
- ✅ SQL injection prevention (parameterized queries)
- ✅ Secure memo generation
- ✅ Transaction verification

### Recommendations
- Move secrets to environment variables
- Implement rate limiting
- Add CSRF protection
- Encrypt sensitive data
- Regular security audits

---

## 📞 Support & Contact

- **Bot:** @CollectibleKITbot
- **Website:** collectablekit.01studio.xyz
- **Community:** @The01Studio

---

## 📄 License

MIT License

---

**Last Updated:** Based on current codebase analysis  
**Project Status:** Production-ready, actively maintained  
**Version:** 0.1.0

