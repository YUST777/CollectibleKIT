# Telegram Analytics Integration Guide

## 🎯 Overview
The **Telegram Analytics SDK** has been integrated into your Mini App to track user engagement, app launches, TON Connect interactions, and other GDPR-compliant events. This data helps:
- Rank your app in the Telegram Mini Apps catalog
- Understand user behavior
- Track "Streaks" (consecutive daily usage)
- Optimize user engagement

**Privacy**: The SDK does NOT collect private user data. All tracking is anonymous and GDPR-compliant.

---

## ✅ What's Been Done

### 1. SDK Installed
- Added Telegram Analytics SDK via CDN: `https://tganalytics.xyz/index.js`
- Initialization function `initTelegramAnalytics()` added to `webapp/index.html`
- SDK loads asynchronously and doesn't block page rendering

### 2. Integration Location
```html
<!-- In <head> -->
<script 
    async 
    src="https://tganalytics.xyz/index.js" 
    onload="initTelegramAnalytics()" 
    type="text/javascript"
></script>

<!-- Before </body> -->
<script>
    function initTelegramAnalytics() {
        if (window.telegramAnalytics) {
            window.telegramAnalytics.init({
                token: 'YOUR_TOKEN_FROM_TON_BUILDERS',
                appName: 'story-canvas-cutter',
            });
            console.log('✅ Telegram Analytics initialized');
        }
    }
</script>
```

### 3. Automatic Event Tracking
Once initialized, **99% of events are tracked automatically**, including:
- ✅ App launches
- ✅ User sessions
- ✅ TON Connect wallet connections
- ✅ TON Connect transactions
- ✅ Page navigation (if multi-page app)
- ✅ User engagement metrics

---

## 🔧 What You Need To Do

### Step 1: Register on TON Builders
1. Go to **[https://builders.ton.org](https://builders.ton.org)**
2. Create an account or sign in
3. Create a new project or select your existing Mini App project

### Step 2: Generate Analytics Token
1. In your project dashboard, navigate to the **"Analytics"** tab
2. Enter your **Telegram Bot URL**: `https://t.me/YOUR_BOT_USERNAME`
   - Replace with your actual bot username (e.g., `https://t.me/CanvasStorybot`)
3. Enter your **Mini App domain**: Your ngrok URL or production domain
   - For development: `https://ed0dcebbf091.ngrok-free.app`
   - For production: Your actual domain (e.g., `https://storycanvas.app`)
4. Click **"Generate Token"**
5. Copy the following:
   - **Token** (API Auth Token) - a long string like `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Analytics Identifier** (appName) - usually lowercase with dashes (e.g., `story-canvas-cutter`)

### Step 3: Update Your Code
Open `webapp/index.html` and replace the placeholder values:

```javascript
// Find this section (around line 163-165)
window.telegramAnalytics.init({
    token: 'YOUR_TOKEN_FROM_TON_BUILDERS', // ⬅️ Replace this
    appName: 'story-canvas-cutter',         // ⬅️ Replace this if different
});
```

**Replace with:**
```javascript
window.telegramAnalytics.init({
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // Your actual token
    appName: 'story-canvas-cutter', // Your actual appName from TON Builders
});
```

### Step 4: Test the Integration
1. **Refresh your Mini App** in Telegram
2. Open the browser console (if testing in browser):
   - You should see: `✅ Telegram Analytics initialized`
3. Use the app normally (upload images, share stories, connect TON wallet)
4. Check the TON Builders dashboard **Analytics** tab for metrics
   - Data may take a few minutes to appear
   - Check for user sessions, app launches, and TON Connect events

---

## 📊 Viewing Analytics

### TON Builders Dashboard
1. Go to [https://builders.ton.org](https://builders.ton.org)
2. Select your project
3. Navigate to **"Analytics"** tab
4. View metrics:
   - **Active Users** (DAU, WAU, MAU)
   - **App Launches**
   - **TON Connect Interactions** (wallet connections, transactions)
   - **User Streaks** (consecutive daily usage)
   - **Engagement Rankings** (vs other Mini Apps)

### Custom Events (Optional)
If you want to track custom events beyond the automatic tracking, refer to the [official documentation](https://docs.tganalytics.xyz/).

Example:
```javascript
window.telegramAnalytics.track('custom_event_name', {
    property1: 'value1',
    property2: 123
});
```

---

## 🔒 Privacy & GDPR Compliance

**What's Tracked (Anonymous):**
- App launch events
- Session duration
- TON Connect interactions (wallet connection, transaction events)
- General engagement metrics

**What's NOT Tracked:**
- Personal user data (names, phone numbers, emails)
- Private messages or content
- User-uploaded images or stories
- Payment amounts or wallet balances

**User Consent:**
- Telegram Mini Apps analytics tracking is covered by Telegram's Terms of Service
- No additional user consent prompt is required for anonymous analytics
- Users can opt out by not using the Mini App

---

## 🚨 Troubleshooting

### Analytics Not Loading
- **Check console**: Look for `✅ Telegram Analytics initialized` message
- **Verify token**: Ensure token from TON Builders is correctly copied (no extra spaces)
- **Check network**: Ensure `https://tganalytics.xyz/index.js` can be loaded (no CORS errors)
- **CDN availability**: If CDN is down, analytics won't work (app functionality continues normally)

### No Data in Dashboard
- **Wait 5-10 minutes**: Analytics data may be delayed
- **Verify bot URL**: Ensure Bot URL in TON Builders matches your actual bot
- **Check appName**: Ensure appName matches exactly (case-sensitive)
- **Test with multiple users**: Some metrics require multiple sessions

### Token Expiration
- Tokens from TON Builders don't expire unless you revoke them
- You can regenerate tokens in the Analytics tab if needed
- Old tokens are automatically invalidated when you generate new ones

---

## 📚 Additional Resources

- **Official Docs**: [https://docs.tganalytics.xyz/](https://docs.tganalytics.xyz/)
- **GitHub Repository**: [https://github.com/telegram-mini-apps-dev/analytics](https://github.com/telegram-mini-apps-dev/analytics)
- **Example Demo App**: [https://github.com/Dimitreee/demo-dapp-with-analytics](https://github.com/Dimitreee/demo-dapp-with-analytics)
- **TON Builders Portal**: [https://builders.ton.org](https://builders.ton.org)
- **Support**: Contact [@DataChief_bot](https://t.me/DataChief_bot) on Telegram for analytics support

---

## ✅ Integration Status

| Task | Status |
|------|--------|
| SDK Added to HTML | ✅ Done |
| Initialization Function Created | ✅ Done |
| Token Placeholder Added | ✅ Done |
| Auto-tracking Enabled | ✅ Done (after token is added) |
| Documentation Created | ✅ Done |
| **Get Token from TON Builders** | ⏳ **TODO: You need to do this** |
| **Update token in index.html** | ⏳ **TODO: After getting token** |
| **Verify in Dashboard** | ⏳ **TODO: After token update** |

---

## 🎯 Next Steps

1. ✅ **Register on TON Builders** → [https://builders.ton.org](https://builders.ton.org)
2. ✅ **Generate analytics token** (Analytics tab)
3. ✅ **Update `webapp/index.html`** with your token
4. ✅ **Restart the Mini App** or refresh in Telegram
5. ✅ **Check console** for initialization message
6. ✅ **Monitor dashboard** for analytics data

---

**Current Files Modified:**
- `webapp/index.html`: Added Telegram Analytics SDK and initialization
- `TELEGRAM_ANALYTICS_GUIDE.md`: This guide (created)

**No Code Changes Required After Token Update:**
The analytics SDK will automatically track events. You just need to add the token!




