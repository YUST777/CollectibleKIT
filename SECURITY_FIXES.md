# 🚨 CRITICAL SECURITY FIXES REQUIRED

## Immediate Actions Required:

### 1. **Add Authentication to Withdrawal API**
```typescript
// webapp-nextjs/src/app/api/withdraw-rewards/route.ts
export async function POST(request: NextRequest) {
  try {
    // ✅ ADD AUTHENTICATION CHECK
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, walletAddress } = body; // Remove userId from body
    
    // ✅ Use authenticated user ID
    const userIdNum = user.id;
    
    // Rest of the code...
  }
}
```

### 2. **Remove Fallback Authentication**
```typescript
// webapp-nextjs/src/lib/telegram.ts
export async function getUserFromTelegram(request: Request) {
  try {
    // ... authentication logic ...
    
    // ❌ REMOVE THIS FALLBACK
    // console.log('⚠️ Using fallback user data');
    // return { id: 7152782013, ... };
    
    // ✅ Return null if authentication fails
    return null;
  } catch (error) {
    console.error('Error getting user from Telegram:', error);
    return null;
  }
}
```

### 3. **Add Rate Limiting**
```typescript
// Add rate limiting middleware
const rateLimit = new Map();

export async function POST(request: NextRequest) {
  const user = await getUserFromTelegram(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // ✅ Rate limiting
  const now = Date.now();
  const userRequests = rateLimit.get(user.id) || [];
  const recentRequests = userRequests.filter(time => now - time < 60000); // 1 minute
  
  if (recentRequests.length >= 5) { // Max 5 requests per minute
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  recentRequests.push(now);
  rateLimit.set(user.id, recentRequests);
  
  // Rest of the code...
}
```

### 4. **Fix Daily Limit Bypass**
```typescript
// webapp-nextjs/src/app/api/withdraw-rewards/route.ts
} catch (error) {
  console.error('Error checking daily limits:', error);
  // ✅ DON'T continue if limit check fails
  return NextResponse.json(
    { success: false, error: 'Daily limit check failed' },
    { status: 500 }
  );
}
```

### 5. **Sanitize Input Parameters**
```typescript
// Validate and sanitize wallet address
const sanitizedWalletAddress = walletAddress.replace(/[^A-Za-z0-9_-]/g, '');
if (sanitizedWalletAddress !== walletAddress) {
  return NextResponse.json(
    { success: false, error: 'Invalid wallet address format' },
    { status: 400 }
  );
}
```

### 6. **Add Request Logging**
```typescript
// Log all withdrawal attempts
console.log('Withdrawal attempt:', {
  userId: userIdNum,
  amount: amountNum,
  walletAddress: walletAddress,
  timestamp: new Date().toISOString(),
  ip: request.headers.get('x-forwarded-for') || 'unknown'
});
```

## Additional Security Measures:

### 7. **Environment Variables Security**
- Ensure `TON_WALLET_MNEMONIC` is properly secured
- Use environment-specific configurations
- Never log sensitive data

### 8. **Database Security**
- Add database connection limits
- Implement query timeouts
- Add database access logging

### 9. **Monitoring & Alerting**
- Set up alerts for suspicious withdrawal patterns
- Monitor failed authentication attempts
- Track unusual API usage patterns

## Testing Security Fixes:

1. **Test Authentication**: Try accessing withdrawal API without proper Telegram auth
2. **Test Rate Limiting**: Make multiple rapid requests
3. **Test Input Validation**: Try malicious wallet addresses
4. **Test Daily Limits**: Verify limits are enforced even when checks fail

## Priority: 🔴 CRITICAL - Fix immediately before production use!
