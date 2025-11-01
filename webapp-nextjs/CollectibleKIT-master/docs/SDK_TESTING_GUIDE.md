# How to Test Telegram Analytics SDK Integration

**Quick Guide**: Verify your analytics are working

---

## Method 1: Check Console Logs (Easiest)

### Steps:
1. Run your Next.js app in development mode:
   ```bash
   cd webapp-nextjs
   npm run dev
   ```

2. Open the app in Telegram or in your browser

3. Open browser DevTools (F12 or right-click → Inspect)

4. Look for this message in the Console:
   ```
   ✅ Telegram Analytics initialized
   ```
   
   ✅ If you see this → **SDK is working!**
   
   ⚠️ If you see this instead → SDK is loading but needs retry:
   ```
   ⚠️ Telegram Analytics not loaded yet
   ```

5. If working, you should also see network requests to:
   - `https://tganalytics.xyz/index.js` (SDK loading)
   - API requests to `tganalytics.xyz` (event sending)

---

## Method 2: Check Network Requests

### Desktop Telegram:

1. **Enable Webview Inspecting**:
   - Go to Telegram Settings
   - Advanced Settings
   - Experimental Settings
   - Toggle ON "Enable webview inspecting"

2. **Open DevTools**:
   - Right-click in your Mini App
   - Select "Inspect" or "Developer Tools"

3. **Check Network Tab**:
   - Open the Network section
   - Filter by "tganalytics"
   - You should see:
     - `index.js` loading from `https://tganalytics.xyz`
     - POST requests sending events

### Web Telegram:

1. Open [Telegram Web](https://web.telegram.org/)
2. Open Developer Tools (F12)
3. Go to Network tab
4. Open your Mini App
5. Filter by `tganalytics.xyz`
6. Look for:
   - SDK script loading
   - Event data being sent

---

## Method 3: Check TON Builders Bot

1. Open your TON Builders bot (@TonBuilders_bot)
2. The bot will show the time of last recorded event
3. Example: "Last event: 1 minute ago"
4. ✅ If showing recent timestamps → **Analytics working!**

**Note**: Events may take 5-10 minutes to appear in the bot.

---

## Method 4: Check TON Builders Dashboard

1. Go to [builders.ton.org](https://builders.ton.org)
2. Select your CollectibleKIT project
3. Navigate to "Analytics" tab
4. Look for:
   - Active Users count
   - App launch events
   - Session data

**Note**: Dashboard data updates every 5-10 minutes.

---

## What You Should See

### ✅ Working Integration:

**Console:**
```
✅ Telegram Analytics initialized
```

**Network Tab:**
```
GET https://tganalytics.xyz/index.js (status: 200)
POST https://tganalytics.xyz/api/events (status: 200)
```

**Bot Response:**
```
Last event recorded: 1 minute ago
```

---

### ❌ Not Working - Troubleshooting

**Problem**: No console message
- **Check**: SDK scripts are uncommented in layout.tsx
- **Check**: Token is correct
- **Check**: Script is loading (Network tab)

**Problem**: "not loaded yet" message
- **Wait**: 1-2 seconds, SDK loads asynchronously
- **Refresh**: App if message persists

**Problem**: No network requests
- **Check**: Internet connection
- **Check**: No ad blockers interfering
- **Check**: Console for errors

**Problem**: Events not in dashboard
- **Wait**: 5-10 minutes for data propagation
- **Check**: Token matches project
- **Check**: appName is correct (collectiblekit)

---

## Quick Test Checklist

- [ ] Console shows "✅ Telegram Analytics initialized"
- [ ] Network tab shows index.js loading
- [ ] Network tab shows event POST requests
- [ ] No console errors
- [ ] Bot shows recent events (after a few minutes)
- [ ] Dashboard shows data (after 5-10 minutes)

---

## Testing Commands

### Start Dev Server:
```bash
cd webapp-nextjs
npm run dev
```

### Check Console Logs:
```bash
# Look for initialization message
# Check for any errors
```

### Monitor Network:
```bash
# Filter by "tganalytics"
# Verify requests are going through
```

---

## Expected Behavior

When you **open the app**:
1. SDK loads automatically
2. `app_launch` event fires
3. Event sent to analytics server
4. Console confirms initialization

When you **use the app**:
- Navigation between tabs
- User interactions
- TON Connect usage
- All tracked automatically!

---

## Need Help?

- Check our [Implementation Checklist](./SDK_IMPLEMENTATION_CHECKLIST.md)
- Review [Integration Study](./SDK_INTEGRATION_STUDY.md)
- Contact: @DataChief_bot on Telegram

---

**Quick Start**: Just run `npm run dev` and check console for the ✅ message!

