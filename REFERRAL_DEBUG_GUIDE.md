# Referral System Debug Guide

## Issue
User invited "code" but referral data is not showing in profile.

## Current Status
- ✅ API endpoints are working (tested successfully)
- ✅ Database schema is correct
- ⚠️ Referral not processed when "code" signed up

## Enhanced Debugging Added

### 1. Frontend Logging (MainApp.tsx)
Added detailed logging to check where `start_param` comes from:
```typescript
console.log('🔗 start_param check:', {
  from_initDataUnsafe: (webApp.initDataUnsafe as any).start_param,
  from_webApp_startParam: (webApp as any).startParam,
  from_webApp_start_param: (webApp as any).start_param,
  final: startParam,
  initDataUnsafe_keys: Object.keys(webApp.initDataUnsafe || {})
});
```

### 2. Backend Logging (user/init route)
Enhanced logging for referral processing:
- Logs when start_param is received
- Logs parsed referrerId
- Logs referral processing steps
- Logs errors with full details

## How to Debug

### Step 1: Check Browser Console
When a new user signs up with your referral link, check the browser console for:
- `🔗 start_param check:` - Shows where start_param is coming from
- `📋 start_param received:` - Shows what the API received
- `🔗 Processing referral:` - Shows referral is being processed
- `✅ Referral processed successfully:` - Confirms success

### Step 2: Check Server Logs
Check `/tmp/nextjs.log` for:
- `🚀 User initialization request`
- `📋 start_param received: "ref_800092886"`
- `🔍 Parsed referrerId from start_param: 800092886`
- `✅ Referral added to database`

### Step 3: Test Referral Link
Your referral link: `https://t.me/CollectibleKITbot?start=ref_800092886`

**Important:** The user must:
1. Click the link (not copy/paste)
2. Start the bot for the first time
3. The `start_param` is only passed on FIRST launch

## Common Issues

### Issue 1: start_param Not Available
**Symptom:** `start_param check` shows empty string
**Cause:** User didn't use referral link, or already started bot before
**Solution:** User must use referral link on first bot launch

### Issue 2: Referral Link Format Wrong
**Symptom:** start_param doesn't start with "ref_"
**Cause:** Link format incorrect
**Solution:** Ensure link is: `https://t.me/CollectibleKITbot?start=ref_800092886`

### Issue 3: Same User ID
**Symptom:** "Invalid referral: referrerId=800092886, user_id=800092886"
**Cause:** User trying to refer themselves
**Solution:** This is expected - prevents self-referral

## Manual Referral Addition (If Needed)

If a referral was missed, you can manually add it via API:

```bash
curl -X POST http://localhost:3003/api/referral \
  -H "Content-Type: application/json" \
  -d '{
    "referrerId": 800092886,
    "invitedId": <code_user_id>,
    "invitedName": "code",
    "invitedPhoto": ""
  }'
```

Replace `<code_user_id>` with the actual user ID of "code".

## Testing Checklist

- [ ] User clicks referral link: `https://t.me/CollectibleKITbot?start=ref_800092886`
- [ ] Browser console shows `🔗 start_param check` with `ref_800092886`
- [ ] Server logs show `📋 start_param received: "ref_800092886"`
- [ ] Server logs show `✅ Referral processed successfully`
- [ ] API `/api/referral?referrer_id=800092886` returns the new user
- [ ] API `/api/referral/stats?referrer_id=800092886` shows count > 0
- [ ] Profile shows referral in "Invited Friends" section

## Next Steps

1. **Have "code" sign up again** using your referral link
2. **Check browser console** for start_param logs
3. **Check server logs** for referral processing
4. **Verify in database** if referral was added
5. **If still not working**, check if "code" already started the bot before (start_param only works on first launch)

