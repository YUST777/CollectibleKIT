# TGMRKT API Scripts

Scripts for accessing and working with the TGMRKT (tgmrkt.io) API.

## Files

### Main Scripts
- **`mrkt_bot.py`** - Telegram bot for TGMRKT portfolio tracking with auto-refresh
- **`setup_mrkt_session.py`** - Setup Telethon session for automatic authentication
- **`test_mrkt_auth.py`** - Test authentication and API access
- **`download_gifts_json.py`** - Download full gifts collections JSON from API

### Data Files
- **`gifts_collections.json`** - Full gifts collections data from TGMRKT API (111 items)
- **`id_gifts_mapping.json`** - Mapping of 6 special gifts with numeric IDs

### Utility Scripts
- **`extract_id_gifts.py`** - Extract gifts that have numeric IDs as names
- **`start_mrkt.sh`** - Shell script to start the MRKT bot

## Setup

1. Install dependencies:
```bash
pip install python-telegram-bot telethon python-dotenv requests
```

2. Configure `.env` file with:
```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
```

3. Setup Telethon session:
```bash
python3 setup_mrkt_session.py
```

4. Test authentication:
```bash
python3 test_mrkt_auth.py
```

## API Endpoint

- **Base URL:** `https://api.tgmrkt.io`
- **Gifts Endpoint:** `/api/v1/gifts/collections`
- **Auth Method:** Bearer token (JWT from initData)

## Special Gifts

6 gifts with numeric IDs (Halloween & Durov themed):
- Gravestone (5775955135867913556)
- Coffin (5776227780391864916)
- Mask (5775966332847654507)
- Durov's Boots (6001229799790478558)
- Durov's Coat (6001425315291727333)
- Durov's Figurine (6003477390536213997)
