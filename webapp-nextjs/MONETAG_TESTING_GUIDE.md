# Monetag In-App Interstitial Testing Guide

## ✅ App is Now Running on Ngrok!

**🌐 Public URL:** https://dd9dea106121.ngrok-free.app

## How to Test Monetag In-App Interstitial Ads

### 1. Open in Telegram Mini App
1. Open Telegram app
2. Find your bot (or open mini app via bot)
3. The app will load from the ngrok URL

### 2. Test the In-App Interstitial Ads

#### What to Expect:
- **Initial Delay:** 5 seconds after app opens
- **Ads appear:** Every 30 seconds automatically
- **Session Duration:** Up to 1 ad per 6-minute session
- **Behavior:** Fully automatic, no user interaction needed

#### Step-by-Step Testing:
1. Open the Telegram Mini App
2. Wait 5 seconds (initial delay)
3. Continue using the app normally (play games, browse)
4. Ad should appear automatically after 5 seconds
5. After ad completes, wait 30 seconds
6. Next ad will appear (if within 6-minute session)

### 3. Monitor Ad Behavior

#### Check Browser Console:
```javascript
// Look for Monetag SDK logs
🎬 Triggering Monetag In-App Interstitial ad...
✅ Ad shown successfully
```

#### Check Ngrok Dashboard:
- Open: http://localhost:4040
- Monitor all HTTP requests
- See when ads are triggered

### 4. Expected Behavior

#### Configuration (`data-auto="1/0.1/30/5/0"`):
- **frequency:** 1 ad max
- **capping:** 0.1 hours (6 minutes)
- **interval:** 30 seconds between ads
- **timeout:** 5 seconds before first ad
- **everyPage:** false (session persists)

#### Testing Scenarios:

**Scenario 1: Quick Test (5 seconds)**
1. Open app
2. Wait 5 seconds
3. Ad should appear

**Scenario 2: Session Test (6 minutes)**
1. Open app
2. Wait 5 seconds for first ad
3. Wait 30 seconds for second ad
4. Maximum 1 ad per 6-minute period

**Scenario 3: Navigation Test**
1. Navigate between tabs (Story, Games, Profile)
2. Session persists across navigation
3. Ad count continues

### 5. Troubleshooting

#### Ads Not Showing?
- Check browser console for errors
- Verify Monetag SDK is loaded
- Check ngrok dashboard for requests
- Wait for full 5-second initial delay

#### Ads Showing Too Often?
- Configuration limits to 1 ad per 6 minutes
- Check if new session started
- Verify `everyPage: 0` in config

#### Ads Not Working?
- Check Monetag zone ID is correct (10065186)
- Verify SDK script is loaded in layout.tsx
- Check for JavaScript errors in console

## Testing Checklist

- [ ] App loads successfully on ngrok
- [ ] No JavaScript errors in console
- [ ] First ad appears after 5 seconds
- [ ] Ad displays correctly (full-screen)
- [ ] Ad can be closed after watching
- [ ] Next ad appears after 30 seconds
- [ ] Maximum 1 ad per 6-minute session
- [ ] Session persists across page navigation

## Next Steps After Testing

1. **Adjust Configuration** (if needed):
   - More aggressive: `data-auto="3/0.25/60/10/0"`
   - Less aggressive: `data-auto="1/0.5/60/10/0"`

2. **Monitor Performance**:
   - Track ad impressions
   - Monitor revenue
   - Check user engagement

3. **Production Deployment**:
   - Remove debug code
   - Update bot web app URL
   - Monitor production ads

## Commands

```bash
# Check if server is running
curl http://localhost:3003

# Check ngrok status
curl http://localhost:4040/api/tunnels

# View ngrok dashboard
open http://localhost:4040

# Restart server (if needed)
cd webapp-nextjs && npm start

# Restart ngrok
ngrok http 3003
```

## Resources

- **Monetag Docs:** https://docs.monetag.com/docs/ad-integration/inapp-interstitial/
- **Ngrok URL:** https://dd9dea106121.ngrok-free.app
- **Ngrok Dashboard:** http://localhost:4040
