# Automated Stickerdom Auth Service

This service automatically maintains a valid Stickerdom authentication token using Telethon, eliminating the need for manual initData refresh.

## Setup

1. **Install dependencies:**
```bash
cd sticker
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements_auth.txt
```

2. **Add your Telegram initData:**
   - Open stickerdom.com Mini App in Telegram
   - Open browser console (F12)
   - Run: `window.Telegram.WebApp.initData`
   - Copy the result to `sticker/init_data.txt`

   OR add a valid JWT token directly to `init_data.txt`

3. **Run the service:**
```bash
python3 auto_auth_service.py
```

The service will:
- Automatically refresh tokens when they expire
- Cache tokens to avoid unnecessary requests
- Provide an HTTP endpoint at `http://localhost:8765/token`

## Integration with Next.js

The Next.js API will automatically try to use the automated service first, then fall back to user initData if the service is unavailable.

To configure the service URL:
```bash
# In webapp-nextjs/.env.local
STICKERDOM_TOKEN_SERVICE_URL=http://localhost:8765/token
```

## Running as Background Service

You can run this as a systemd service or use screen/tmux:

```bash
# Using screen
screen -S stickerdom-auth
cd /path/to/sticker
python3 auto_auth_service.py
# Press Ctrl+A then D to detach

# Using tmux
tmux new -s stickerdom-auth
cd /path/to/sticker
python3 auto_auth_service.py
# Press Ctrl+B then D to detach
```

## How It Works

1. Uses Telethon to maintain a Telegram session
2. Reads initData from `init_data.txt` or token from `token_pool/`
3. Automatically refreshes Stickerdom auth token when it expires
4. Caches tokens to minimize API calls
5. Provides HTTP endpoint for Next.js to query

## Troubleshooting

- **"No valid token found"**: Make sure `init_data.txt` contains valid initData or JWT token
- **"Token service unavailable"**: Ensure `auto_auth_service.py` is running
- **"Failed to refresh token"**: Check that initData is not expired (>24 hours old)

