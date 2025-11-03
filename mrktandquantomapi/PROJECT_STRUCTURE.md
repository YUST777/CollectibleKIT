# Project Structure Overview

## Directory Tree

```
.
├── mrkt/                           # TGMRKT API Scripts
│   ├── mrkt_bot.py                # Main Telegram bot with auto-refresh
│   ├── setup_mrkt_session.py      # Setup Telethon session
│   ├── test_mrkt_auth.py          # Test authentication
│   ├── test_fresh_mrkt_auth.py    # Test fresh auth generation
│   ├── download_gifts_json.py     # Download gifts collections
│   ├── extract_id_gifts.py        # Extract gifts with numeric IDs
│   ├── gifts_collections.json     # Full TGMRKT gifts data (111 items)
│   ├── id_gifts_mapping.json      # Special gifts mapping (6 items)
│   ├── start_mrkt.sh              # Bot startup script
│   └── README.md                  # MRKT documentation
│
├── quant/                          # Quant Marketplace API Scripts
│   ├── test_quant_cloudscraper.py # Working API access (Cloudflare bypass)
│   ├── test_quant_auth.py         # Initial auth testing
│   ├── test_quant_with_headers.py # Header-based auth testing
│   ├── filter_unique_gifts.py     # Filter unique gifts
│   ├── quant_api_gifts.json       # Full Quant gifts data (134 items)
│   ├── clean_unique_gifts.json    # Unique gifts only (29 items)
│   └── README.md                  # Quant documentation
│
├── .env                            # Environment configuration (not in git)
├── .env.example                    # Environment template
├── requirements.txt                # Python dependencies
├── README.md                       # Main documentation
└── PROJECT_STRUCTURE.md            # This file
```

## File Categories

### 🤖 Bot Scripts
- `mrkt/mrkt_bot.py` - Telegram bot for TGMRKT

### 🔧 Setup Scripts
- `mrkt/setup_mrkt_session.py` - One-time Telethon setup

### 🧪 Test Scripts
- `mrkt/test_mrkt_auth.py` - Test TGMRKT authentication
- `mrkt/test_fresh_mrkt_auth.py` - Test fresh auth generation
- `quant/test_quant_auth.py` - Test Quant auth (basic)
- `quant/test_quant_with_headers.py` - Test with headers
- `quant/test_quant_cloudscraper.py` - Test with Cloudflare bypass ✅

### 📥 Download Scripts
- `mrkt/download_gifts_json.py` - Download TGMRKT gifts
- `quant/test_quant_cloudscraper.py` - Download Quant gifts

### 🔍 Analysis Scripts
- `mrkt/extract_id_gifts.py` - Extract special gifts
- `quant/filter_unique_gifts.py` - Filter unique gifts

### 📊 Data Files
- `mrkt/gifts_collections.json` - 111 TGMRKT gifts
- `mrkt/id_gifts_mapping.json` - 6 special gifts (numeric IDs)
- `quant/quant_api_gifts.json` - 134 Quant gifts
- `quant/clean_unique_gifts.json` - 29 unique gifts

### 📖 Documentation
- `README.md` - Main project documentation
- `mrkt/README.md` - MRKT scripts documentation
- `quant/README.md` - Quant scripts documentation
- `PROJECT_STRUCTURE.md` - This file

### ⚙️ Configuration
- `.env` - Environment variables (create from .env.example)
- `.env.example` - Environment template
- `requirements.txt` - Python dependencies

### 🔐 Session Files (Generated)
- `gifts_session.session` - Telethon session
- `mrkt_test_session.session` - Test session

## Quick Reference

### Run TGMRKT Bot
```bash
cd mrkt && python3 mrkt_bot.py
```

### Download TGMRKT Data
```bash
cd mrkt && python3 download_gifts_json.py
```

### Download Quant Data
```bash
cd quant && python3 test_quant_cloudscraper.py
```

### Filter Unique Gifts
```bash
cd quant && python3 filter_unique_gifts.py
```

## Data Summary

| Source | Total Gifts | Unique Gifts | Special Gifts |
|--------|-------------|--------------|---------------|
| TGMRKT | 111         | -            | 6 (numeric IDs) |
| Quant  | 134         | 23           | 6 (from TGMRKT) |
| **Combined** | **245** | **29** | **6** |

### Special Gifts (6)
These gifts have numeric IDs as names:
1. Mask (5775966332847654507)
2. Coffin (5776227780391864916)
3. Gravestone (5775955135867913556)
4. Durov's Statuette (6003477390536213997)
5. T-shirt/Durov's Coat (6001425315291727333)
6. Sneakers/Durov's Boots (6001229799790478558)

### Unique Quant Gifts (23)
Gifts only available in Quant Marketplace:
- Backpack, Book, Case, Pencil
- Durov Glasses, REDO, Surfboard
- Sand Castle, Pink Flamingo, Coconut Drink
- Eagle, Torch, Statue
- Ice Cream variants, Golden Medal
- And more...

## API Endpoints

### TGMRKT
- **Base:** `https://api.tgmrkt.io`
- **Gifts:** `/api/v1/gifts/collections`
- **Auth:** Bearer JWT (from initData)
- **Bot:** @main_mrkt_bot

### Quant Marketplace
- **Base:** `https://quant-marketplace.com`
- **Gifts:** `/api/gifts`
- **Auth:** Bearer initData
- **Bot:** @QuantMarketRobot
- **Protection:** Cloudflare ⚠️

## Dependencies

```
python-telegram-bot  # Telegram bot framework
telethon            # Telegram client for auth
cloudscraper        # Cloudflare bypass
python-dotenv       # Environment variables
requests            # HTTP requests
```

## Notes

- Session files contain authentication - keep them secure
- `.env` file should never be committed to git
- Cloudflare protection requires `cloudscraper` for Quant API
- TGMRKT bot includes auto-refresh (every 50 seconds)
