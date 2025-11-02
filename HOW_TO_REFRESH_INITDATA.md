# How to Refresh Stickerdom initData

## Current Situation

✅ initData is configured and working
❌ initData expires after ~53 seconds
⚠️ Cannot auto-refresh (Telethon generates wrong format)

## The Problem

- Telethon `RequestWebViewRequest` generates `query_id=` format
- Stickerdom API requires `user=` format
- Cannot convert between formats (hash signature breaks)
- Need manual fresh initData from browser

## Solution: Manual Refresh Script

Since initData expires quickly, you'll need to update it periodically.

### Quick Way (Every time it expires):

1. Open https://stickerdom.store in Telegram WebApp
2. F12 → Network tab
3. Find `/api/v1/auth` request
4. Copy `tgWebAppData` value
5. Decode:
   ```bash
   echo "your_encoded_data" | python3 bot/decode_initdata.py
   ```
6. Update systemd service:
   ```bash
   # Edit /etc/systemd/system/collectiblekit.service
   # Update Environment="MANUAL_INIT_DATA=..."
   # Then:
   sudo systemctl daemon-reload
   sudo systemctl restart collectiblekit
   ```

### Automated Way (Cron Job):

Could set up a cron job, but you'd still need fresh webapp initData from browser.

## Why Not Automatic?

**Short Answer**: Telegram's hash signature validation prevents automatic conversion.

**Technical Details**: The `hash` parameter is cryptographically signed with ALL parameters including format-specific ones. Telethon generates `query_id=` format, but stickerdom expects `user=` format. You cannot modify the format without invalidating the hash unless you have the bot's secret signing key.

## Current Status

✅ Working: Manual initData from webapp
❌ Not working: Auto-refresh via Telethon
⚠️ Needs: Periodic manual updates when initData expires

## When Does initData Expire?

- Auth date + validity period
- Usually expires in 1-2 minutes
- Current initData timestamp: `auth_date=1762106824`
- Check expiry with: `date +%s` (expires when current time > auth_date + validity)

## Best Practice

Since sticker portfolio feature works perfectly with manual initData:

1. Use it for now
2. Accept that it needs periodic refresh
3. Monitor for any changes in stickerdom API
4. Consider asking stickerdom for API key or alternative auth method

