# How to Get Telegram initData

Since `window.Telegram.WebApp.initData` is only available inside Telegram Mini Apps, here are your options:

## Option 1: Get initData from Telegram Desktop/Web (Recommended)

1. **Open Telegram Desktop or Web** (https://web.telegram.org)
2. **Navigate to stickerdom.com** Mini App in Telegram
3. **Open Developer Tools**:
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Press `Cmd+Option+I` (Mac)
4. **Go to Console tab**
5. **Run this command**:
   ```javascript
   window.Telegram.WebApp.initData
   ```
6. **Copy the entire result** (it's a long string starting with `user=...`)
7. **Save to file**:
   ```bash
   cd sticker
   # Paste your initData string into init_data.txt
   nano init_data.txt
   # Or use echo:
   echo "YOUR_INIT_DATA_STRING_HERE" > init_data.txt
   ```

## Option 2: Use Existing Token

If you already have a valid JWT token from Stickerdom, you can use it directly:

```bash
cd sticker
echo "YOUR_JWT_TOKEN_HERE" > init_data.txt
```

## Option 3: Use Automated Service (Easiest)

The automated service will try to generate initData from your Telethon session:

1. **Make sure Telethon session exists** (from gifts/ or other bots):
   ```bash
   # Copy existing session if available
   cp ../gifts/gifts_session.session stickerdom_auth_session.session
   ```

2. **Run the service** - it will automatically generate initData:
   ```bash
   cd sticker
   ./start_auto_auth.sh
   ```

## Option 4: Get from Mobile App

If you're testing on mobile:

1. Open the Mini App in Telegram mobile app
2. Use remote debugging (Chrome DevTools for Android/iOS)
3. Or use the Telegram Desktop method above

## Troubleshooting

- **"Cannot read properties of undefined"**: You're not in a Telegram Mini App. Use Telegram Desktop/Web.
- **"telegram is not defined"**: The Mini App hasn't loaded. Wait a few seconds and try again.
- **No initData returned**: The Mini App might be blocking access. Try another Mini App or use Option 3.

## Quick Test

After saving initData, test it:
```bash
cd sticker
python3 -c "
from auto_auth_service import StickerdomAuthService
import asyncio

async def test():
    service = StickerdomAuthService()
    await service.start()
    token = await service.refresh_token()
    if token:
        print('✅ Token obtained:', token[:50] + '...')
    else:
        print('❌ Failed to get token')
    await service.stop()

asyncio.run(test())
"
```

