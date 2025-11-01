# 🔌 Network Error Diagnostics Guide

## Common Causes & Solutions

### 1. **ngrok Verification Page**
**Symptom**: First request fails, works after refresh  
**Cause**: ngrok free tier shows a verification page  
**Solution**: 
- Click "Visit Site" on the ngrok page
- Or use ngrok with `--log=stdout` flag (already running)

### 2. **Server Not Running**
**Symptom**: All requests fail immediately  
**Check**:
```bash
# Check if Flask is running
ps aux | grep webapp_api.py

# Check if ngrok is running  
ps aux | grep ngrok
```

**Fix**:
```bash
cd /home/yousefmsm1/Desktop/Programing/Projects/cut\ it\ 0.1
source .venv/bin/activate
python webapp_api.py &
```

### 3. **Wrong ngrok URL**
**Symptom**: Connection timeout  
**Check**:
```bash
# Get current ngrok URL
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*'
```

**Fix**: Update `bot/config.py` with the new URL

### 4. **CORS Issues**
**Symptom**: Browser console shows CORS errors  
**Check**: Open browser DevTools (F12) → Console tab  
**Fix**: CORS is already enabled in `webapp_api.py`

### 5. **Internet Connection**
**Symptom**: All external requests fail  
**Check**: 
```bash
ping google.com
```

## Current Setup Status

**✅ Servers Running:**
```
Flask API: http://localhost:5000
ngrok URL: https://ed0dcebbf091.ngrok-free.app
Bot: Running on port 5000
```

## How to Debug

### Step 1: Check Browser Console
1. Open Mini App in Telegram
2. Open browser DevTools (if possible)
3. Look for these logs:
   - `Sending request to: ...`
   - `Response status: ...`
   - `❌ Network Error: ...`

### Step 2: Check if API is Accessible
```bash
# Test locally
curl http://localhost:5000/api/user-info \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"user_id": 800092886}'

# Test via ngrok
curl https://ed0dcebbf091.ngrok-free.app/api/user-info \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"user_id": 800092886}'
```

### Step 3: Check Server Logs
```bash
# Find webapp_api.py process
ps aux | grep webapp_api.py

# Check ngrok logs
curl http://localhost:4040/api/requests/http | jq
```

### Step 4: Restart Services
```bash
# Kill old processes
pkill -f webapp_api.py
pkill -f ngrok

# Start fresh
cd /home/yousefmsm1/Desktop/Programing/Projects/cut\ it\ 0.1
source .venv/bin/activate

# Start Flask
python webapp_api.py &

# Start ngrok (in another terminal)
ngrok http 5000
```

## Telegram-Specific Issues

### Issue: "Network error" only in Telegram
**Cause**: Telegram's built-in browser has strict security
**Solutions**:
1. Try on **mobile phone** instead of desktop
2. Use "Open in browser" option
3. Check ngrok verification page

### Issue: Works on phone but not desktop
**Cause**: Telegram Desktop uses system browser
**Solution**: 
- Clear Telegram Desktop cache
- Restart Telegram Desktop
- Try mobile app

### Issue: "Failed to fetch"
**Causes**:
1. ngrok tunnel expired (free tier = 2 hours)
2. Server crashed
3. HTTPS certificate issue

**Fix**:
```bash
# Restart ngrok
pkill ngrok
ngrok http 5000

# Get new URL
curl -s http://localhost:4040/api/tunnels | grep public_url

# Update bot/config.py with new URL
# Restart bot
```

## Error Messages Explained

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Failed to fetch" | Server unreachable | Check ngrok & Flask |
| "NetworkError" | Connection dropped | Check internet |
| "CORS error" | Cross-origin blocked | Already fixed |
| "500 Internal" | Server crash | Check logs |
| "403 Forbidden" | No credits/permission | Check user type |
| "404 Not Found" | Wrong endpoint URL | Check URL paths |

## Quick Health Check

Run this command to check everything:
```bash
cd /home/yousefmsm1/Desktop/Programing/Projects/cut\ it\ 0.1

echo "=== Checking Services ==="
echo "Flask API:" && ps aux | grep webapp_api.py | grep -v grep && echo "✅ Running" || echo "❌ Not running"
echo ""
echo "ngrok:" && ps aux | grep ngrok | grep -v grep && echo "✅ Running" || echo "❌ Not running"
echo ""
echo "ngrok URL:" && curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1
echo ""
echo "Flask health check:" && curl -s http://localhost:5000/ | head -c 50
```

## Still Having Issues?

1. **Check browser console** for detailed error messages
2. **Try on mobile** - works better than desktop
3. **Restart everything**:
   ```bash
   # Kill all
   pkill -f webapp_api.py
   pkill -f telegram_bot
   pkill -f ngrok
   
   # Start fresh
   cd /home/yousefmsm1/Desktop/Programing/Projects/cut\ it\ 0.1
   python start_mini_app.py
   ```

4. **Verify ngrok URL** is updated in:
   - `bot/config.py` → `MINI_APP_URL`
   - Bot needs restart after URL change

---

## Most Common Fix 🔧

**90% of network errors are because:**
1. ngrok tunnel expired (restart ngrok)
2. ngrok URL changed (update config.py)
3. ngrok verification page (click "Visit Site")

**Quick fix:**
```bash
# Get current URL
curl -s http://localhost:4040/api/tunnels | grep public_url

# If different from https://ed0dcebbf091.ngrok-free.app
# Update bot/config.py and restart bot
```

---

**Last Updated:** January 11, 2025  
**Status:** Diagnostics Ready




