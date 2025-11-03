# Telegram Gifts API Project

A collection of scripts for accessing and working with Telegram gift marketplace APIs (TGMRKT and Quant Marketplace).

## 📁 Project Structure

```
.
├── mrkt/           # TGMRKT (tgmrkt.io) API scripts
├── quant/          # Quant Marketplace API scripts
├── .env            # Environment configuration
├── requirements.txt
└── README.md
```

## 🎯 Folders

### 📦 mrkt/
Scripts for accessing **TGMRKT API** (tgmrkt.io)
- Telegram bot for portfolio tracking
- Automatic authentication with Telethon
- Gift collections data (111 items)
- Auto-refresh JWT tokens
- **See [mrkt/README.md](mrkt/README.md) for details**

### 📦 quant/
Scripts for accessing **Quant Marketplace API**
- Cloudflare bypass with cloudscraper
- Gift collections data (134 items)
- Filtered unique gifts (29 items)
- **See [quant/README.md](quant/README.md) for details**

## 🚀 Quick Setup

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Configure `.env` file:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Get Telegram API credentials:**
   - Visit https://my.telegram.org/apps
   - Create a new application
   - Add API ID and API Hash to `.env`

4. **Setup Telethon session:**
```bash
python3 mrkt/setup_mrkt_session.py
```

## 🔌 APIs

### TGMRKT API
- **URL:** `https://api.tgmrkt.io`
- **Endpoint:** `/api/v1/gifts/collections`
- **Auth:** Bearer JWT token
- **Bot:** @main_mrkt_bot

### Quant Marketplace API
- **URL:** `https://quant-marketplace.com`
- **Endpoint:** `/api/gifts`
- **Auth:** Bearer initData
- **Bot:** @QuantMarketRobot
- **Protection:** Cloudflare (requires cloudscraper)

## ✨ Key Features

- 🔐 Automatic authentication via Telegram WebView
- 🔄 Auto-refresh JWT tokens
- 🛡️ Cloudflare bypass for protected APIs
- 📊 Gift collections data from multiple sources
- 🧹 Duplicate filtering and data cleaning
- 📁 Organized project structure

## 📦 Requirements

- Python 3.7+
- python-telegram-bot
- telethon
- cloudscraper
- python-dotenv
- requests

## 🎯 Quick Start Examples

### Run TGMRKT Bot
```bash
cd mrkt
python3 mrkt_bot.py
```

### Download TGMRKT Gifts
```bash
cd mrkt
python3 download_gifts_json.py
```

### Download Quant Marketplace Gifts
```bash
cd quant
python3 test_quant_cloudscraper.py
```

### Filter Unique Gifts
```bash
cd quant
python3 filter_unique_gifts.py
```

## 📊 Data Files

- `mrkt/gifts_collections.json` - Full TGMRKT gifts (111 items)
- `mrkt/id_gifts_mapping.json` - Special gifts with numeric IDs (6 items)
- `quant/quant_api_gifts.json` - Full Quant gifts (134 items)
- `quant/clean_unique_gifts.json` - Unique gifts only (29 items)

## 🔑 Environment Variables

```bash
# Telegram Bot Token (from @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token

# Telegram API Credentials (from my.telegram.org/apps)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash

# Session name (optional)
TELEGRAM_SESSION_NAME=mrkt_session
```

## 📖 Documentation

- [MRKT Scripts Documentation](mrkt/README.md)
- [Quant Scripts Documentation](quant/README.md)

## 🔐 Security

- ✅ Never commit `.env` file
- ✅ Keep bot tokens secret
- ✅ Protect Telethon session files
- ✅ Use environment variables for credentials

## 📝 License

MIT

---

**Made for Telegram Gifts Community** 🎁
