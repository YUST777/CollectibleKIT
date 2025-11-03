# Quantom 0.2 - Quant Marketplace API Client

Clean and simple API client for accessing Quant Marketplace gifts data.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure credentials in `.env` file (in project root):
```env
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_NAME=quantom_session
```

3. Authorize Telegram session (first time only):
```bash
python setup.py
```

## Usage

Run the main script to fetch gifts data:
```bash
python main.py
```

This will:
- Authenticate with Telegram
- Fetch data from `https://quant-marketplace.com/api/gifts/gifts`
- Save results to `gifts_data.json`
- Display summary

## Files

- `config.py` - Configuration settings
- `auth.py` - Telegram authentication
- `api.py` - API client class
- `setup.py` - Session setup script
- `main.py` - Main execution script

## API Response

The endpoint returns:
- `gifts[]` - Array of gift objects with price, supply, etc.
- `backdrops[]` - Array of backdrop items
- `symbols[]` - Array of symbol items
