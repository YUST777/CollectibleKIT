# Telegram Sticker Scraper

Scrape sticker data from Stickerdom API using Telegram authentication.

## Overview

This project scrapes sticker data from the Stickerdom platform through their API. It requires Telegram WebApp authentication (initData) to access user-specific sticker information.

## Configuration

- **Target URL**: https://t.me/sticker_bot/?startapp=tid_ODAwMDkyODg2
- **User ID**: 800092886
- **API Endpoint**: https://api.stickerdom.store/api/v1/user/800092886/profile
- **Bot**: @sticker_bot (Sticker Pack)

## Quick Start

### 1. Install Dependencies

```bash
python3 -m venv venv
source venv/bin/activate  # On Linux/Mac
pip install -r requirements.txt
```

### 2. Get Telegram initData

**Method A: Browser Console (Easiest)**

1. Go to https://web.telegram.org
2. Open `@sticker_bot` and click "Open"
3. Open Developer Console (F12)
4. Type: `window.Telegram.WebApp.initData`
5. Copy the entire string
6. Save it to `init_data.txt`

**Method B: Chrome Extension**

1. Install: [Telegram Mini App Auth Extractor](https://chromewebstore.google.com/detail/telegram-mini-app-auth-ex/fjmkmlebpiodjmkpbpblflpgkmojigpm)
2. Follow extension instructions

### 3. Run Scraper

**Scrape any user's profile (minimal - only owned NFTs):**
```bash
./venv/bin/python scrape_profile.py <user_id>
# Example:
./venv/bin/python scrape_profile.py 6651978547

# To get full data with all collection info:
./venv/bin/python scrape_profile.py 6651978547 --full
```

The minimal mode saves only owned NFTs (99KB vs 3.8MB - 98% smaller!)

## Files

- `scrape_profile.py` - Scrape user sticker portfolios
- `portfolio_bot.py` - Telegram bot for portfolio tracking
- `start_bot.sh` - Helper script to start the bot
- `requirements.txt` - Dependencies
- `init_data.txt` - Telegram auth token

## Output

When successful, generates:
- `profile_{user_id}_minimal.json` - Minimal portfolio data
- `pricing_data.json` - Cached pricing from stickers.tools API
- Portfolio summaries via Telegram bot

## Authentication Requirements

The Stickerdom API requires:
- **Telegram WebApp initData** - obtained from browser console
- **User ID** - extracted from URL parameter
- **Valid session** - initData expires after 24 hours

## Dependencies

- requests==2.31.0
- python-telegram-bot==21.0.1

## Run Telegram Bot

**Start the portfolio bot:**
```bash
python3 bot_server.py
```

Or use the helper script:
```bash
bash start_bot.sh
```

The bot will respond to user IDs with portfolio summaries!

**Features:**
- Automatically fetches user profiles from Stickerdom API
- Caches profiles for faster future lookups
- Calculates real-time portfolio values
- Shows collection breakdown with PNL

**Important:** You must run this in a separate terminal window, NOT in the Cursor terminal.

## Troubleshooting

**Error: missing_auth_token**
- You need to get initData from Telegram Web

**Error: invalid_auth_token or invalid_init_data**
- **The auth token has expired or is invalid**
- **EASY FIX:** Send `/refresh` to your bot with the fresh initData
- To get initData: https://web.telegram.org → @sticker_bot → Open → F12 → `window.Telegram.WebApp.initData`
- Then message bot: `/refresh paste_your_initData_here`
- Or update `init_data.txt` manually and restart bot

**File not found: init_data.txt**
- Follow the steps above to create this file

