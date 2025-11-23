<div align="center">

# 🎁 CollectibleKIT

### **The Ultimate Telegram Star Gifts Portfolio Manager**

[![Telegram](https://img.shields.io/badge/Telegram-Mini%20App-blue?style=for-the-badge&logo=telegram)](https://t.me/CollectibleKITbot)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org/)

**Track, manage, and analyze your Telegram Star Gifts collection with real-time pricing and portfolio insights**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [API](#-api-endpoints)

</div>

---

## ✨ Features

### 🎯 Core Functionality

- **📊 Portfolio Management**
  - Real-time gift price tracking from Portal Market
  - Automatic portfolio synchronization
  - Upgraded & unupgraded gift categorization
  - Channel gifts support
  - Custom gift additions

- **💰 Price Tracking**
  - Live price updates from Portal Market API
  - Historical price charts (24h, 3d, 1w, 1m, 3m)
  - Profit/Loss calculations
  - Daily portfolio snapshots
  - Price alerts and notifications

- **🎨 Gift Designer**
  - Create custom gift designs
  - Model, background, and pattern selection
  - Real-time preview
  - Collection management
  - Story sharing integration

- **🏆 Gamification**
  - Daily quiz challenges
  - Leaderboard rankings
  - Achievement system
  - Streak tracking
  - Reward system

- **👥 Social Features**
  - Referral program
  - Public collections
  - Collection likes
  - Feed events
  - User profiles

- **💳 Monetization**
  - TON wallet integration
  - Credit system
  - Premium subscriptions
  - Ad integration
  - Withdrawal system

---

## 🛠 Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **UI Library:** React 18
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Icons:** Heroicons, Lucide React
- **Animations:** Lottie React
- **Notifications:** React Hot Toast

### Backend
- **Runtime:** Node.js
- **API:** Next.js API Routes
- **Database:** SQLite
- **Authentication:** Telegram WebApp SDK

### Python Services
- **Telegram API:** Telethon
- **Market API:** Portal Market (Multi-account)
- **Price Caching:** Global price cache system
- **Portfolio Sync:** Background Python scripts

### Infrastructure
- **Web Server:** Nginx
- **Process Manager:** Systemd
- **Deployment:** Linux Server
- **CDN:** Static asset serving

---

## 🚀 Quick Start

### Prerequisites

```bash
# Node.js 18+
node --version

# Python 3.10+
python3 --version

# Git
git --version
```

### Installation

#### 1. Clone Repository

```bash
git clone https://github.com/YUST777/CollectibleKIT.git
cd CollectibleKIT
```

#### 2. Backend Setup (Python)

```bash
# Install Python dependencies
pip3 install -r bot_requirements.txt

# Configure Telegram credentials
cp bot/config.py.example bot/config.py
# Edit bot/config.py with your credentials
```

#### 3. Frontend Setup (Next.js)

```bash
cd webapp-nextjs

# Install dependencies
npm install

# Configure environment (if needed)
cp .env.example .env.local
# Edit .env.local with your settings
```

#### 4. Database Setup

```bash
# Database is auto-created on first run
# Located at: bot/bot_data.db
```

#### 5. Run Development Server

```bash
# Terminal 1: Next.js dev server
cd webapp-nextjs
npm run dev

# Terminal 2: Python bot (if needed)
cd bot
python3 telegram_bot.py
```

#### 6. Production Deployment

```bash
# Build Next.js app
cd webapp-nextjs
npm run build
npm start

# Setup Nginx (see deployment section)
# Setup systemd service (see deployment section)
```

---

## 🏗 Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Telegram Mini App                     │
│              (Next.js Frontend + API Routes)            │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌─────────┴─────────┐
         │                      │
    ┌────▼────┐         ┌─────▼─────┐
    │ SQLite  │         │  Python   │
    │ Database│         │  Services │
    └─────────┘         └─────┬─────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              ┌─────▼─────┐    ┌─────▼─────┐
              │  Telethon │    │   Portal   │
              │    API    │    │   Market   │
              └───────────┘    └────────────┘
```

### Key Components

#### 1. **Frontend (Next.js)**
- **Location:** `webapp-nextjs/`
- **Pages:** App Router with dynamic routes
- **Components:** Modular React components
- **State:** Zustand store for global state
- **API:** Next.js API routes for backend logic

#### 2. **Backend Services (Python)**
- **Location:** `bot/`
- **Main Scripts:**
  - `get_profile_gifts.py` - Portfolio synchronization
  - `portal_market_api.py` - Market price fetching
  - `global_price_cache.py` - Price caching system
  - `create_portfolio_snapshot.py` - Daily snapshots

#### 3. **Database (SQLite)**
- **Location:** `bot/bot_data.db`
- **Tables:**
  - `users` - User accounts and preferences
  - `portfolio_auto_gifts_cache` - Cached portfolio data
  - `portfolio_snapshots` - Historical portfolio data
  - `referrals` - Referral system data
  - `tasks` - Task completion tracking
  - `payments` - Payment transactions

#### 4. **API Endpoints**
- **User Management:** `/api/user/*`
- **Portfolio:** `/api/portfolio/*`
- **Referrals:** `/api/referral/*`
- **Tasks:** `/api/tasks/*`
- **Games:** `/api/game/*`
- **Collections:** `/api/collection/*`

---

## 📡 API Endpoints

### User Endpoints

```typescript
POST   /api/user/init          // Initialize user account
GET    /api/user/info          // Get user information
```

### Portfolio Endpoints

```typescript
GET    /api/portfolio/gifts              // Get user portfolio
GET    /api/portfolio/preload            // Preload portfolio (background)
GET    /api/portfolio/chart              // Portfolio chart data
GET    /api/portfolio/profit-loss        // P/L calculations
GET    /api/portfolio/stickers           // Sticker portfolio
GET    /api/portfolio/custom-gifts       // Custom gifts
```

### Referral Endpoints

```typescript
POST   /api/referral                     // Add referral
GET    /api/referral                     // Get invited users
GET    /api/referral/stats               // Referral statistics
```

### Game Endpoints

```typescript
GET    /api/game/daily-question          // Daily quiz question
POST   /api/game/submit-answer           // Submit quiz answer
GET    /api/game/random-gift             // Random gift for quiz
```

### Collection Endpoints

```typescript
GET    /api/collection/load              // Load user collection
POST   /api/collection/save              // Save collection
DELETE /api/collection/delete            // Delete collection
GET    /api/collections/public            // Public collections
```

---

## 🎨 Key Features Deep Dive

### Portfolio Management

- **Real-time Sync:** Automatic synchronization with Telegram Star Gifts
- **Price Tracking:** Live prices from Portal Market with caching
- **Filtering:** Advanced filters (status, collection, model, background, price range)
- **Charts:** Interactive price charts with multiple timeframes
- **Snapshots:** Daily portfolio snapshots for P/L tracking

### Gift Designer

- **Custom Designs:** Create unique gift combinations
- **Preview:** Real-time preview of designs
- **Collections:** Organize gifts into collections
- **Sharing:** Share designs as Telegram stories
- **Templates:** Pre-built templates for quick creation

### Referral System

- **Invite Friends:** Share referral links
- **Track Invites:** See all invited users
- **Statistics:** Total and recent referral counts
- **Rewards:** Task completion rewards for referrals

### Price Optimization

- **Multi-Account:** Multiple Portal Market accounts for rate limiting
- **Global Cache:** Shared price cache across users
- **Background Updates:** Non-blocking price updates
- **Smart Caching:** 10-minute TTL with intelligent invalidation

---

## 🔧 Configuration

### Environment Variables

```bash
# Telegram Bot (bot/config.py)
BOT_TOKEN=your_bot_token
API_ID=your_api_id
API_HASH=your_api_hash

# Portal Market Accounts
PORTAL_ACCOUNTS=[
    {"phone": "+1234567890", "password": "password1"},
    {"phone": "+0987654321", "password": "password2"}
]

# Next.js (webapp-nextjs/.env.local)
NEXT_PUBLIC_BOT_USERNAME=CollectibleKITbot
```

### Database Schema

Key tables:
- `users` - User accounts with credits, premium status
- `portfolio_auto_gifts_cache` - Cached portfolio with TTL
- `portfolio_snapshots` - Daily portfolio history
- `referrals` - Referral relationships
- `tasks` - Task completion tracking

---

## 📊 Performance

### Optimization Features

- ✅ **Cache-First Architecture:** Instant responses with background updates
- ✅ **Global Price Cache:** Shared cache reduces API calls by 90%+
- ✅ **Multi-Account System:** Parallel fetching with rate limit distribution
- ✅ **Background Processing:** Non-blocking Python script execution
- ✅ **Smart Rate Limiting:** 60-second cooldown with cache fallback
- ✅ **Lazy Loading:** Components loaded on demand
- ✅ **Image Optimization:** Optimized asset delivery

### Performance Metrics

- **Cache Hit Rate:** >95%
- **Average Response Time:** <50ms (cached), <2s (fresh)
- **Price Fetch Success Rate:** >96%
- **Portfolio Sync Time:** 30-120 seconds (background)

---

## 🚢 Deployment

### Production Setup

#### 1. Build Next.js App

```bash
cd webapp-nextjs
npm run build
```

#### 2. Setup Nginx

```nginx
server {
    listen 80;
    server_name collectablekit.01studio.xyz;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 3. Setup Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/collectiblekit.service

# Enable and start
sudo systemctl enable collectiblekit
sudo systemctl start collectiblekit
```

#### 4. Setup Cron Jobs

```bash
# Daily portfolio snapshots
0 0 * * * /root/01studio/CollectibleKIT/bot/create_portfolio_snapshot.py
```

---

## 🧪 Testing

### Test Scripts

```bash
# Test referral system
./test_referral_apis.sh

# Test full referral flow
./test_full_referral_flow.sh

# Test portfolio APIs
curl http://localhost:3003/api/portfolio/gifts
```

### Manual Testing

1. **User Initialization:** Test `/api/user/init` with Telegram WebApp
2. **Portfolio Sync:** Verify portfolio loads and updates
3. **Price Fetching:** Check price accuracy and caching
4. **Referral System:** Test referral link and tracking
5. **Gift Designer:** Create and save custom gifts

---

## 📝 Development

### Project Structure

```
CollectibleKIT/
├── bot/                    # Python backend services
│   ├── get_profile_gifts.py
│   ├── portal_market_api.py
│   ├── global_price_cache.py
│   └── config.py
├── webapp-nextjs/          # Next.js frontend
│   ├── src/
│   │   ├── app/           # App Router pages & API
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities & services
│   └── public/            # Static assets
├── assets/                # Shared assets
└── bot_data.db           # SQLite database
```

### Code Style

- **TypeScript:** Strict mode enabled
- **Python:** PEP 8 style guide
- **React:** Functional components with hooks
- **API:** RESTful conventions

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary and confidential.

---

## 📞 Support

- **Telegram Bot:** [@CollectibleKITbot](https://t.me/CollectibleKITbot)
- **Issues:** GitHub Issues
- **Documentation:** See code comments and inline docs

---

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Social trading features
- [ ] NFT marketplace integration
- [ ] Multi-language support
- [ ] Advanced charting tools
- [ ] Portfolio sharing
- [ ] Gift trading system

---

<div align="center">

**Built with ❤️ for the Telegram Star Gifts community**

[⭐ Star this repo](https://github.com/YUST777/CollectibleKIT) • [🐛 Report Bug](https://github.com/YUST777/CollectibleKIT/issues) • [💡 Request Feature](https://github.com/YUST777/CollectibleKIT/issues)

</div>

