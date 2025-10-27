# Monetag Ad Filtering for VIP/Premium Users

## ✅ Implementation Complete

Successfully implemented conditional ad loading that **excludes VIP, Premium, and Test users**.

## How It Works

### 1. MonetagSDK Component
**File:** `webapp-nextjs/src/components/MonetagSDK.tsx`

A new client component that:
- Checks user type from the app store
- Only loads Monetag SDK for **normal users**
- Removes/prevents SDK loading for VIP, Premium, and Test users

### 2. Conditional Loading Logic

```typescript
// Only load for normal users
const shouldLoadAds = user && user.user_type === 'normal';

if (shouldLoadAds) {
  // Load Monetag SDK
} else {
  // Remove SDK if loaded (for VIP/premium users)
}
```

### 3. User Types

#### ✅ **Ads Will Show:**
- **Normal Users**: Users with no credits, free trial users
- **User Type**: `'normal'`

#### 🚫 **Ads Will NOT Show:**
- **VIP Users**: Hardcoded VIP list (IDs: 7416916695, 6386563662, etc.)
- **Premium Users**: Users with credits > 0
- **Test Users**: Development/testing users
- **User Types**: `'vip'`, `'premium'`, `'test'`

## Changes Made

### 1. Removed Static SDK from Layout
**File:** `webapp-nextjs/src/app/layout.tsx`

**Before:**
```html
<script 
  src="//libtl.com/sdk.js" 
  data-zone="10065186" 
  data-sdk="show_10065186"
  data-auto="1/0.1/30/5/0"
/>
```

**After:**
```html
<!-- Monetag SDK will be loaded conditionally based on user type -->
```

### 2. Added MonetagSDK Component
- New file: `webapp-nextjs/src/components/MonetagSDK.tsx`
- Dynamically loads SDK based on user type
- Removes SDK if user changes from normal to VIP/premium

### 3. Integrated Component into Layout
```typescript
<TelegramProvider>
  <MonetagSDK />
  <div className="min-h-screen bg-bg-main text-text-idle">
    {children}
  </div>
</TelegramProvider>
```

## Testing

### Test with Different User Types

#### Normal User (Ads Should Show)
```javascript
// User has no credits, user_type: 'normal'
// Console log: "✅ Monetag SDK loaded for normal user"
```

#### VIP User (Ads Should NOT Show)
```javascript
// User ID in VIP_USERS list, user_type: 'vip'
// Console log: "🚫 Monetag SDK removed for vip user"
```

#### Premium User (Ads Should NOT Show)
```javascript
// User has credits > 0, user_type: 'premium'
// Console log: "🚫 Monetag SDK removed for premium user"
```

## Benefits

1. ✅ **Better User Experience**: VIP/Premium users get ad-free experience
2. ✅ **Fair Monetization**: Only show ads to free/normal users
3. ✅ **Dynamic Control**: Can change user type and ads adjust automatically
4. ✅ **Clean Implementation**: No manual ad removal needed

## Console Logs

When testing, you'll see:

**For Normal Users:**
```
✅ Monetag SDK loaded for normal user
```

**For VIP/Premium Users:**
```
🚫 Monetag SDK removed for vip user
```
or
```
🚫 Monetag SDK removed for premium user
```

## Summary

**Question:** "Do ads show for VIP or premium users?"

**Answer:** **NO** - Ads only show for normal users. VIP, Premium, and Test users have ads disabled.
