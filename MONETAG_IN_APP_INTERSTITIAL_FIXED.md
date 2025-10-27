# Monetag In-App Interstitial - Corrected Implementation

## ✅ Fixed Implementation Based on Official Documentation

**Reference:** [Monetag In-App Interstitial Docs](https://docs.monetag.com/docs/ad-integration/inapp-interstitial/)

## Key Understanding

**In-App Interstitial is PASSIVE and AUTOMATIC** - it does NOT require manual triggering!
- Ads appear automatically based on configured frequency
- Does not require explicit user actions
- Does not return a Promise or trigger postbacks
- Works silently in the background while the app is in use

## Implementation

### 1. SDK Configuration (Correct Way)

**File:** `webapp-nextjs/src/app/layout.tsx`

Using the `data-auto` attribute in the script tag:

```html
<script 
  src="//libtl.com/sdk.js" 
  data-zone="10065186" 
  data-sdk="show_10065186"
  data-auto="1/0.1/30/5/0"
/>
```

### 2. Configuration Parameters Explained

`data-auto="1/0.1/30/5/0"` means:
- **1**: Show 1 ad maximum
- **0.1**: Within 0.1 hours (6 minutes)
- **30**: 30 seconds interval between ads
- **5**: 5 second delay before first ad appears
- **0**: Session continues across page navigations (0 = false, 1 = true)

## How It Works Now

1. **SDK loads** → In-App Interstitial configuration is active
2. **User opens app** → Ads start automatically after 5 seconds
3. **App runs** → Ads show every 30 seconds (up to 1 ad per 6-minute session)
4. **No user interaction needed** → Fully automatic

## Key Changes Made

### ❌ Removed (Wrong Approach)
- Manual game counter
- Manual ad trigger function
- Manual call to `show_XXX()` with `type: 'inApp'`
- Manual button to test ads

### ✅ Added (Correct Approach)
- `data-auto` attribute in script tag
- Automatic ad display based on time intervals
- No manual triggers needed

## Configuration Options

### Current Setting (Conservative)
```html
data-auto="1/0.1/30/5/0"
```
- 1 ad every 6 minutes
- 30 second intervals
- 5 second initial delay
- Session persists across pages

### Alternative: More Aggressive
```html
data-auto="3/0.25/60/10/0"
```
- 3 ads every 15 minutes
- 60 second intervals
- 10 second initial delay
- Session persists across pages

### Alternative: Every Page Load
```html
data-auto="1/0.1/30/5/1"
```
- Same as current, but `everyPage: 1` (true)
- Session resets on each page navigation

## Best Practices (from documentation)

✅ **DO:**
- Use moderate frequency settings
- Place logic in persistent part of app
- Use delay after app opens
- Track user engagement to avoid ads during critical interactions
- Test in both light and dark modes

❌ **DON'T:**
- Call `show_XXX({ type: 'inApp' })` multiple times
- Use aggressive frequency (more than 1 ad/minute)
- Forget about proper SDK placement
- Use wrong zone ID

## TypeScript Declaration

**File:** `webapp-nextjs/src/types/index.ts`

```typescript
// Monetag SDK - In-App Interstitial (automatic, no manual trigger needed)
show_10065186?: (config?: {
  type?: 'inApp' | 'preload';
  inAppSettings?: {
    frequency?: number;
    capping?: number;
    interval?: number;
    timeout?: number;
    everyPage?: boolean;
  };
  ymid?: string;
}) => Promise<void>;
```

## Testing

1. **Start the app** → Wait 5 seconds
2. **Use the app normally** → Ads should appear automatically
3. **Check console** → Should see automatic ad triggers
4. **Navigate between pages** → Session should persist (everyPage: 0)

## Summary

The In-App Interstitial format is now correctly implemented as **passive and automatic**. The SDK handles all the timing and frequency logic internally. No manual triggers, buttons, or game counters needed!

