# 📺 Monetag In-App Interstitial Ads Integration Guide

## 🎯 Overview
Monetag In-App Interstitial ads are passive full-screen ads that automatically display at set intervals while users interact with your Mini App. Perfect for background monetization without requiring direct user interaction or rewards.

**Key Benefits:**
- ✅ Automatic ad display based on frequency
- ✅ No user interaction required
- ✅ Works silently in the background
- ✅ Ideal for apps with long session durations
- ✅ Minimal implementation effort

---

## ⚠️ Important Prerequisites

### 1. Telegram WebApp SDK Required
For proper positioning of UI elements (close button, timer), **you MUST use the official Telegram WebApp SDK** (`Telegram.WebApp`).

**Why?**
- Monetag cannot detect safe visual areas without the Telegram SDK
- Interface elements might overlap with Telegram or system UI on some devices
- The SDK provides proper safe area detection

**Status:** ✅ Already integrated in `webapp-nextjs/src/app/layout.tsx`

---

## 📋 Implementation Steps

### Step 1: Get Your Monetag Zone ID

1. Go to [Monetag Dashboard](https://monetag.com)
2. Log in to your account
3. Create a new project or select existing one
4. Create a **Main Zone** (required for In-App Interstitial)
5. Copy your **Zone ID** (format: `12345678`)

### Step 2: Update the SDK Configuration

Edit `webapp-nextjs/src/app/layout.tsx`:

```tsx
{/* Monetag SDK - In-App Interstitial Ads */}
<script
  src="https://domain.com/sdk.js"  // Replace with actual Monetag SDK URL
  data-zone="YOUR_ZONE_ID"         // Replace with your Zone ID
  data-sdk="show_XXX"              // Replace XXX with your Zone ID
  data-auto="2/0.1/30/5/0"         // See configuration below
/>
```

**Configuration Parameters (`data-auto`):**
```
data-auto="frequency/capping/interval/timeout/everyPage"
```

| Parameter | Example | Description |
|-----------|---------|-------------|
| `frequency` | `2` | Maximum number of ads per session |
| `capping` | `0.1` | Session duration in hours (0.1 = 6 minutes) |
| `interval` | `30` | Time in seconds between ads |
| `timeout` | `5` | Delay before first ad appears (seconds) |
| `everyPage` | `0` | `0` = session continues across pages, `1` = resets on reload |

**Example Configurations:**

```bash
# Conservative: 2 ads per 6 minutes, 30s apart, 5s delay
data-auto="2/0.1/30/5/0"

# Moderate: 3 ads per hour, 1 minute apart, 10s delay
data-auto="3/1.0/60/10/0"

# Aggressive: 5 ads per 30 minutes, 20s apart, 3s delay
data-auto="5/0.5/20/3/0"
```

---

## 🔧 Alternative: Manual JavaScript Configuration

If you prefer programmatic control, use the SDK method:

### Option 1: Using the SDK Method

```typescript
// In your app initialization (e.g., TelegramProvider.tsx)
useEffect(() => {
  // Wait for Monetag SDK to load
  if (typeof window !== 'undefined' && (window as any).show_XXX) {
    (window as any).show_XXX({
      type: 'inApp',
      inAppSettings: {
        frequency: 2,      // Max 2 ads per session
        capping: 0.1,      // Session: 6 minutes
        interval: 30,      // 30 seconds between ads
        timeout: 5,        // 5s delay before first ad
        everyPage: false   // Continue session across pages
      }
    });
  }
}, []);
```

### Option 2: Using React SDK (NPM)

Install the NPM package:
```bash
npm install monetag-tg-sdk
```

```tsx
import createAdHandler from 'monetag-tg-sdk'

const adHandler = createAdHandler('YOUR_ZONE_ID')

// In your component
adHandler({
  type: 'inApp',
  inAppSettings: {
    frequency: 3,
    capping: 0.5,
    interval: 30,
    timeout: 10,
    everyPage: false
  }
})
```

---

## 🎨 Custom Timers with Fallback Logic

For complete control, implement custom logic:

```typescript
// Custom implementation with fallback
useEffect(() => {
  const showAdWithFallback = async () => {
    try {
      // Try to preload and show Monetag ad
      await (window as any).show_XXX({ type: 'preload' });
      (window as any).show_XXX();
    } catch (error) {
      console.log('Monetag inventory unavailable');
      // Show fallback ad or do nothing
      // showOtherAd();
    }
  };

  // Show ad every 5 minutes
  const interval = setInterval(showAdWithFallback, 1000 * 60 * 5);
  
  return () => clearInterval(interval);
}, []);
```

---

## 📊 Current Integration Status

✅ **Already Implemented:**
- Telegram WebApp SDK ✅
- Layout file with script tag ✅
- Configuration commented out ✅

🔧 **What You Need to Do:**
1. Sign up at [Monetag](https://monetag.com)
2. Get your Zone ID from dashboard
3. Replace placeholders in `layout.tsx`:
   - `YOUR_ZONE_ID` → Your actual zone ID
   - `show_XXX` → Your function name (e.g., `show_12345678`)
   - Update SDK URL if provided by Monetag
4. Uncomment the Monetag script block
5. Adjust `data-auto` parameters as needed

---

## 🎯 Best Practices

### 1. Frequency Settings
- **Moderate**: 2-3 ads per hour max
- **Good interval**: 30-60 seconds between ads
- **Don't be aggressive**: More than 1 ad per minute annoys users

### 2. Timing
- ✅ Use a delay (5-10 seconds) before first ad
- ✅ Place logic in persistent part of app (not tied to one screen)
- ✅ Avoid triggering during critical user interactions

### 3. User Experience
- ✅ Test in both light and dark modes
- ✅ Track user engagement to avoid showing during key actions
- ✅ Use the Telegram SDK for proper safe areas

---

## ❌ Common Mistakes to Avoid

1. ❌ **Don't call `show_XXX({ type: 'inApp' })` multiple times** - This resets internal logic and interrupts the ad flow

2. ❌ **Don't forget to preload** - If using manual timers, always preload before showing

3. ❌ **Don't be too aggressive** - More than 1 ad per minute will frustrate users

4. ❌ **Don't use wrong zone ID** - Must be the main zone, not a sub-zone

5. ❌ **Don't misplace the SDK script** - Must be in the `<head>` section

---

## 🧪 Testing

### 1. Check SDK Loading
```javascript
// In browser console
console.log(typeof window.show_XXX); // Should be 'function'
```

### 2. Manual Trigger (Testing)
```javascript
// Manually trigger an ad for testing
window.show_XXX({ type: 'inApp' });
```

### 3. Monitor Ad Display
- Use browser DevTools Network tab to see SDK requests
- Check Console for any errors
- Verify ad appears at configured intervals

---

## 📈 Expected Results

After proper integration, you should see:
- ✅ Ads appearing automatically based on your configuration
- ✅ Proper safe area positioning (thanks to Telegram SDK)
- ✅ No console errors
- ✅ Revenue appearing in Monetag dashboard

---

## 🔗 Resources

- [Monetag Official Docs](https://docs.monetag.com)
- [In-App Interstitial Guide](https://docs.monetag.com/docs/ad-integration/inapp-interstitial/)
- [Telegram WebApp SDK Docs](https://core.telegram.org/bots/webapps)

---

## ✅ Checklist

- [ ] Signed up for Monetag account
- [ ] Created Main Zone in dashboard
- [ ] Copied Zone ID
- [ ] Updated `layout.tsx` with correct zone ID
- [ ] Uncommented Monetag script block
- [ ] Configured `data-auto` parameters
- [ ] Tested in Telegram Mini App
- [ ] Verified ads display correctly
- [ ] Checked Monetag dashboard for revenue

---

**Last Updated:** Based on Monetag In-App Interstitial Documentation
**Integration Date:** TBD (Waiting for Monetag account setup)
