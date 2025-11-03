# Quant Marketplace API Scripts

Scripts for accessing the Quant Marketplace (quant-marketplace.com) API.

## Files

### Main Scripts
- **`test_quant_cloudscraper.py`** - Working script to access API with Cloudflare bypass
- **`test_quant_auth.py`** - Initial authentication testing script
- **`test_quant_with_headers.py`** - Testing with browser headers
- **`filter_unique_gifts.py`** - Filter unique gifts from Quant API

### Data Files
- **`quant_api_gifts.json`** - Full gifts data from Quant Marketplace API (134 items)
- **`clean_unique_gifts.json`** - Filtered unique gifts (29 items: 6 TGMRKT special + 23 Quant unique)

## Setup

1. Install dependencies:
```bash
pip install cloudscraper telethon python-dotenv requests
```

2. Configure `.env` file with:
```
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_NAME=mrkt_session
```

3. Run the script:
```bash
python3 test_quant_cloudscraper.py
```

## API Details

- **Base URL:** `https://quant-marketplace.com`
- **Gifts Endpoint:** `/api/gifts`
- **Auth Method:** `Authorization: Bearer {initData}`
- **Protection:** Cloudflare (requires cloudscraper)
- **Bot:** @QuantMarketRobot (ID: 7970333721)

## Unique Gifts

The `clean_unique_gifts.json` contains:
- **6 Special TGMRKT gifts** (Mask, Coffin, Grave, Durov's Statuette, T-shirt, Sneakers)
- **23 Unique Quant gifts** not found in TGMRKT (Backpack, Book, Case, Durov Glasses, etc.)

Total: 29 unique gifts after filtering out 105 duplicates.

## Notes

- The API is protected by Cloudflare, so regular requests won't work
- Use `cloudscraper` library to bypass Cloudflare protection
- Authentication requires fresh initData from Telegram bot
