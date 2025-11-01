# Monetag Rewarded Interstitial Integration Plan

## Overview
Based on the [Monetag SDK documentation](https://docs.monetag.com/docs/ad-integration/rewarded-interstitial/), this plan outlines how to integrate rewarded ads into the CollectibleKIT earning system.

## Key Concepts

### What is Rewarded Interstitial?
- Full-screen ad that users watch to completion to earn rewards
- Grants rewards (TON, credits) after watching the ad
- Shows for 15-30 seconds typically
- User cannot skip until the ad finishes

### How It Works in Our Context
1. User clicks "Watch Ad to Earn Credits" button
2. Monetag SDK shows a full-screen video ad
3. User watches the complete ad (15-30 seconds)
4. User is rewarded with credits/TON
5. Rewards are recorded in database

## Integration Architecture

### SDK Installation Options

#### Option 1: Script Tag (Recommended for Quick Setup)
```html
<!-- In webapp-nextjs/src/app/layout.tsx <head> section -->
<script src="https://sdk.monetag.com/?tag=YOUR_MAIN_ZONE_ID"></script>
```

#### Option 2: NPM Package (React)
```bash
npm install monetag-tg-sdk
```

```typescript
import createAdHandler from 'monetag-tg-sdk'

const adHandler = createAdHandler(REWARDED_INTERSTITIAL_ZONE_ID)
```

### Integration Points

#### 1. Watch Ad Button in Profile/Earn Tab
**Location**: `webapp-nextjs/src/components/tabs/ProfileTab.tsx` → EarnTabContent

**UI Flow**:
```
Current:
- Tasks Tab → Earn credits by completing tasks
- Games Tab → Play games to earn credits
- [NEW] Watch Ad Tab → Earn credits by watching ads

Button:
"Watch Ad (+2 Credits)" with video icon
```

#### 2. Ad Display Flow
```typescript
const handleWatchAd = async () => {
  try {
    // Preload ad
    await show_XXX({ type: 'preload', ymid: user.id });
    
    // Show ad
    await show_XXX({ ymid: user.id });
    
    // Reward user with 2 credits
    await fetch('/api/rewards/watch-ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id })
    });
    
    // Show success message
    toast.success('You earned 2 credits!');
    
  } catch (error) {
    // Ad skipped or failed
    console.error('Ad failed:', error);
  }
};
```

#### 3. Backend API Endpoint
**File**: `webapp-nextjs/src/app/api/rewards/watch-ad/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const user = await getUserFromTelegram(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user watched ad today (prevent abuse)
  const today = new Date().toISOString().split('T')[0];
  const adLog = await db.getAdWatchLog(user.id, today);
  
  if (adLog && adLog.watches_today >= 10) {
    return NextResponse.json({ 
      error: 'Daily ad watch limit reached (10 ads/day)' 
    }, { status: 400 });
  }

  // Reward 2 credits per ad
  await db.addCredits(user.id, 2);
  
  // Log the ad watch
  await db.logAdWatch(user.id, today);
  
  // Record feed event
  await db.recordFeedEvent(user.id, 'ad_watch', { credits: 2 });
  
  return NextResponse.json({ 
    success: true, 
    creditsEarned: 2 
  });
}
```

### Database Schema Updates

#### New Table: `ad_watches`
```sql
CREATE TABLE IF NOT EXISTS ad_watches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    watch_date TEXT NOT NULL,
    watches_count INTEGER DEFAULT 1,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_watches_user_date 
ON ad_watches(user_id, watch_date);
```

#### New Methods in `DatabaseService`
```typescript
// Log an ad watch
async logAdWatch(userId: number, date: string): Promise<void> {
  await this.dbRun(`
    INSERT INTO ad_watches (user_id, watch_date, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, watch_date) 
    DO UPDATE SET watches_count = watches_count + 1, updated_at = ?
  `, [userId, date, Date.now(), Date.now()]);
}

// Get today's ad watch count
async getAdWatchLog(userId: number, date: string): Promise<any> {
  return await this.dbGet(
    'SELECT * FROM ad_watches WHERE user_id = ? AND watch_date = ?',
    [userId, date]
  );
}
```

## Best Practices from Documentation

### ✅ DO:
- Preload ads before showing them (reduces delay)
- Use `ymid` parameter to track which user watched
- Handle `.catch()` for failed/skipped ads
- Limit daily watches (prevent abuse)
- Show loading state during ad load
- Give user feedback after watching ad

### ❌ DON'T:
- Call `show_XXX()` without `.catch()` handler
- Use sub-zone ID instead of main zone ID
- Trigger ads before SDK has loaded
- Skip preloading (causes noticeable delay)
- Forget to pass `ymid` for tracking

## Monetization Strategy

### Earning Rates
```
Task Completion: 1-3 credits per task
Game Win: 1 credit + 0.1 TON (first win only)
Ad Watch: 2 credits per ad (10 ads/day max)
Daily Streak: 3 credits on 7th day
Premium Conversion: 50 credits → 0.5 TON
```

### Daily Limits
```
Free Users:
- Tasks: Unlimited
- Games: 5 wins/day
- Ads: 10 ads/day = 20 credits/day

Premium Users:
- Tasks: Unlimited  
- Games: 10 wins/day
- Ads: 20 ads/day = 40 credits/day
```

### User Journey
1. User opens app → sees "Earn TON" tab
2. Completes tasks → earns 3-5 credits
3. Plays game → earns 1 credit per win
4. Watches ads → earns 2 credits per ad (quickest method)
5. Converts credits to TON → 50 credits = 0.5 TON
6. Withdraws TON to wallet

## UI/UX Design

### Button Design
```
┌─────────────────────────────┐
│  🎬 Watch Ad (+2 Credits)   │
│  Free • 10 ads available    │
└─────────────────────────────┘

After watching:
┌─────────────────────────────┐
│  ✅ You earned 2 credits!   │
│  Continue watching?         │
│  ┌─────────┐  ┌──────────┐  │
│  │ Watch   │  │  Done    │  │
│  └─────────┘  └──────────┘  │
└─────────────────────────────┘
```

## Tracking & Analytics

### Postback Events
Monetag sends postbacks with `ymid` parameter, allowing us to:
- Track which users watch ads
- Prevent fake ad watches
- Analyze ad engagement
- A/B test different rewards

### Feed Integration
Ad watches appear in the Feed tab:
```
"You watched an ad and earned 2 credits"
```

## Testing Strategy

1. **Development Testing**
   - Use Monetag test zone
   - Verify rewards are given correctly
   - Test daily limits
   - Test error handling

2. **Production Testing**
   - Start with small user group
   - Monitor conversion rates
   - Track ad completion rates
   - Monitor reward distribution

## Next Steps

1. ✅ Study Monetag documentation (COMPLETE)
2. ⏳ Get Monetag account and main zone ID
3. ⏳ Add SDK script tag to layout.tsx
4. ⏳ Create ad_watches database table
5. ⏳ Implement Watch Ad UI component
6. ⏳ Create backend API endpoint
7. ⏳ Test integration with test ads
8. ⏳ Deploy to production

## Resources
- [Monetag SDK Documentation](https://docs.monetag.com/docs/ad-integration/rewarded-interstitial/)
- [SDK Reference](https://docs.monetag.com/docs/sdk-reference/)
- [Postback Configuration](https://docs.monetag.com/docs/postbacks/types-of-postback-events/)
