# Monetag In-App Interstitial Ad Integration

## ✅ Implementation Complete

Successfully integrated Monetag In-App Interstitial ads that display automatically every 3 games.

## What Was Implemented

### 1. Monetag SDK Integration
**File:** `webapp-nextjs/src/app/layout.tsx`

Added the Monetag SDK script to the app layout:
```html
<script src="//libtl.com/sdk.js" data-zone="10065186" data-sdk="show_10065186" />
```

### 2. Game Counter Tracking
**File:** `webapp-nextjs/src/components/tabs/GameTab.tsx`

- Added `gamesPlayed` state to track completed games
- Increments counter on each correct game submission
- Triggers ad every 3 games (3rd, 6th, 9th, etc.)

### 3. Ad Trigger Function
Implemented `triggerAd()` function that:
- Calls Monetag SDK with In-App Interstitial configuration
- Uses proper TypeScript typing via window interface
- Tracks user ID with `ymid` parameter
- Handles success/failure with proper error logging

### 4. Ad Configuration
Based on Monetag documentation:
```typescript
{
  type: 'inApp',
  inAppSettings: {
    frequency: 1,    // Show 1 ad
    capping: 0.1,    // Within 0.1 hours (6 minutes)
    interval: 30,    // 30 second interval
    timeout: 5,      // 5 second delay before first ad
    everyPage: false // Session saved when navigating
  },
  ymid: user?.user_id // Track user ID
}
```

### 5. Debug Button
Added temporary test button "🎬 Test Ad (X games played)" to manually trigger ads for testing.

## How It Works

1. **User plays games** → Counter increments on each correct answer
2. **Every 3 games** → Ad automatically triggers
3. **Monetag shows ad** → Full-screen interstitial (15-30 seconds)
4. **Ad completes** → User continues playing

## User Flow Example

```
Game 1: Correct ✅ → Counter = 1
Game 2: Correct ✅ → Counter = 2
Game 3: Correct ✅ → Counter = 3 → 🎬 AD SHOWS
Game 4: Correct ✅ → Counter = 4
Game 5: Correct ✅ → Counter = 5
Game 6: Correct ✅ → Counter = 6 → 🎬 AD SHOWS
```

## Technical Details

### TypeScript Declarations
**File:** `webapp-nextjs/src/types/index.ts`

Added window interface for Monetag SDK:
```typescript
window.show_10065186?: (config?: {
  type?: 'inApp';
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

### Integration Points
- SDK loads via script tag in layout
- Ad triggers after every 3rd game completion
- Error handling for ad failures
- User tracking with ymid parameter

## Testing

1. Play 3 games and verify ad appears on 3rd game
2. Use debug button to manually trigger ads
3. Check console for ad triggering logs
4. Verify ads show properly in Telegram Mini App

## Next Steps

1. Remove debug button before production
2. Monitor ad performance and revenue
3. Adjust frequency if needed (currently every 3 games)
4. Test on different devices/browsers
5. Configure Monetag postbacks for analytics

## Documentation References

- [Monetag In-App Interstitial Docs](https://docs.monetag.com/docs/ad-integration/rewarded-interstitial/)
- Zone ID: 10065186
- SDK Name: show_10065186
