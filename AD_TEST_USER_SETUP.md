# Ad Testing User Setup

## ✅ User ID Configured for Ad Testing

**User ID:** `7660176383`

## What Changed

### 1. Added to User Service
**File:** `webapp-nextjs/src/lib/userService.ts`

```typescript
// AD TESTING USER - This ID will see ads (for Monetag testing)
const AD_TEST_USER_ID = 7660176383;
```

### 2. Special User Type Logic
This user ID is **forced to be a normal user** regardless of database status:

```typescript
// Special case: Ad testing user - force to normal user to see ads
if (userId === AD_TEST_USER_ID) {
  userType = 'normal';
  canProcess = true;
  watermark = true;
  creditsRemaining = 0;
  freeRemaining = 10; // Give free uses for testing
  console.log('🎬 AD TEST USER detected - Will see ads');
}
```

## What This Means

### For User ID 7660176383:
- ✅ **User Type:** `'normal'` (forced, not VIP/premium)
- ✅ **Will See Ads:** Monetag SDK will load
- ✅ **Ads Frequency:** After every 3 games played
- ✅ **Free Uses:** 10 free uses for testing
- ✅ **Watermarks:** Yes (normal user behavior)
- ✅ **Credits:** 0 (normal user)

### Console Logs You'll See:
```
🎬 AD TEST USER detected: 7660176383 - Will see ads
✅ Monetag SDK loaded for rewarded interstitial
👤 User: 7660176383, Type: normal, Load ads: true
```

## Testing Flow

1. **Login with ID 7660176383**
   - Should login normally
   - Should see user type as "normal"
   - Monetag SDK should load

2. **Play First Game**
   - Win game 1 → Counter = 1
   - No ad yet

3. **Play Second Game**
   - Win game 2 → Counter = 2
   - No ad yet

4. **Play Third Game**
   - Win game 3 → Counter = 3
   - **🎬 AD SHOWS** (Rewarded Interstitial)
   - Console: "🎮 Showing ad after 3 games"
   - Console: "✅ Rewarded ad completed"

5. **Continue Playing**
   - After every 3rd game, ad shows again

## Revert to VIP (No Ads)

To remove this user from ad testing and make them VIP again:

1. Remove the special case logic
2. Add `7660176383` to VIP_USERS set
3. Restart server

Or simply remove/comment out the AD_TEST_USER_ID logic.

## Summary

✅ **User 7660176383 is now configured to see Monetag ads**
✅ **Ads will appear after every 3 games played**
✅ **User is treated as a normal user (not VIP/premium)**
✅ **Ready for testing Monetag Rewarded Interstitial ads**
