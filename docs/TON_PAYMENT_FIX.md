# TON Payment Validation Error Fix

## Problem
When trying to pay 1 TON for premium subscription, users encountered:
```
Validation Failed: Payload in Message at Index 0
```

## Root Cause
The transaction was including a `payload` field with a simple base64-encoded JSON string:
```javascript
payload: btoa(JSON.stringify({
    type: 'premium_subscription',
    user_id: currentUser?.id,
    duration: 'monthly'
}))
```

**Issue**: TON blockchain expects the `payload` to be a **base64-encoded BOC (Bag of Cells)** format, not just any base64 string. The wallet (Tonkeeper, TON Wallet, etc.) validates the payload structure and rejects invalid BOC data.

## Solution
For **simple TON transfers** (just sending coins without smart contract calls), **remove the `payload` field entirely**.

### Fixed Transaction Code
```javascript
const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 600, // Valid for 10 minutes
    messages: [
        {
            address: PREMIUM_WALLET_ADDRESS,    // UQCFRqB2vZnGZRh3ZoZAItNidk8zpkN0uRHlhzrnwweU3mos
            amount: PREMIUM_PRICE_TON           // '1000000000' (1 TON in nanoTON)
            // No payload needed for simple transfer
        }
    ]
};
```

## Payment Tracking
Since we removed the payload (which previously contained user_id), the backend now tracks payments using:
1. **User ID**: From `currentUser.id` sent in the verification request
2. **Transaction Result**: The BOC hash returned by TON Connect after successful payment
3. **Wallet Address**: From the connected wallet

### Backend Verification
```javascript
// Frontend sends:
{
    user_id: currentUser?.id,
    transaction: transactionResult,
    wallet_address: tonConnectUI.wallet?.account?.address
}

// Backend grants 300 credits (30 days × 10 stories/day)
db.add_credits(user_id, 300)
```

## When Would You Need a Payload?

Only use `payload` for:
- **Jetton transfers** (tokens like USDT on TON)
- **Smart contract interactions** (calling contract methods)
- **Adding comments** to transactions (requires proper BOC encoding)

### Example: Adding a Comment (Proper Way)
```javascript
// This requires @ton/core library
import { beginCell } from '@ton/core';

const commentCell = beginCell()
    .storeUint(0, 32)  // Op code for text comment
    .storeStringTail('Premium subscription')
    .endCell();

const payload = commentCell.toBoc().toString('base64');

// Now payload is a valid BOC
```

## Testing
1. **Refresh the Mini App** in Telegram
2. Click "💎 Upgrade to Premium"
3. Connect your TON wallet
4. Click "💎 Pay 1 TON - Subscribe Now"
5. Approve the transaction in your wallet
6. ✅ Payment should go through without validation errors

## Payment Flow
```
User clicks Pay
    ↓
TON Connect sends 1 TON to wallet
    ↓
Transaction approved in wallet
    ↓
Frontend receives transaction result
    ↓
Backend verifies and grants 300 credits
    ↓
User gets Premium status
```

## Wallet Address
All payments go to: `UQCFRqB2vZnGZRh3ZoZAItNidk8zpkN0uRHlhzrnwweU3mos`

Amount: **1 TON** (1,000,000,000 nanoTON)

## Files Modified
- `webapp/app.js`: Removed payload from transaction, added debug logging
- No backend changes needed (verification logic already handles payment tracking)

---

**Status**: ✅ Fixed - Transaction validation error resolved by removing invalid payload.




