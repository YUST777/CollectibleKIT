# Testing Referral System Without Fresh Accounts

## Method 1: Direct API Testing (Recommended)

### Step 1: Test Adding a Referral Manually

```bash
# Add a test referral (replace 999999999 with a test user ID)
curl -X POST http://localhost:3003/api/referral \
  -H "Content-Type: application/json" \
  -d '{
    "referrerId": 800092886,
    "invitedId": 999999999,
    "invitedName": "Test User",
    "invitedPhoto": "https://example.com/photo.jpg"
  }'
```

**Expected Response:**
```json
{"success":true}
```

### Step 2: Verify Referral Was Added

```bash
# Check your referrals
curl "http://localhost:3003/api/referral?referrer_id=800092886"
```

**Expected Response:**
```json
{
  "invited": [
    {
      "invited_id": 999999999,
      "invited_name": "Test User",
      "invited_photo": "https://example.com/photo.jpg",
      "created_at": 1763937682591
    }
  ]
}
```

### Step 3: Check Referral Stats

```bash
curl "http://localhost:3003/api/referral/stats?referrer_id=800092886"
```

**Expected Response:**
```json
{
  "stats": {
    "totalReferrals": 1,
    "recentReferrals": 1
  }
}
```

### Step 4: Check in Frontend

1. Open your app: https://collectablekit.01studio.xyz
2. Go to Profile tab → Referral section
3. You should see:
   - **Total Referrals:** 1
   - **This Week:** 1
   - **Invited Friends:** Test User listed

---

## Method 2: Database Direct Testing

### Step 1: Check Current Referrals in Database

```bash
cd /root/01studio/CollectibleKIT/webapp-nextjs
sqlite3 data/database.db "SELECT * FROM referrals WHERE referrer_id = 800092886;"
```

### Step 2: Add Test Referral Directly to Database

```bash
cd /root/01studio/CollectibleKIT/webapp-nextjs
sqlite3 data/database.db <<EOF
INSERT OR IGNORE INTO referrals (referrer_id, invited_id, invited_name, invited_photo, created_at)
VALUES (800092886, 111111111, 'Test User 1', '', $(date +%s)000);
INSERT OR IGNORE INTO referrals (referrer_id, invited_id, invited_name, invited_photo, created_at)
VALUES (800092886, 222222222, 'Test User 2', '', $(date +%s)000);
INSERT OR IGNORE INTO referrals (referrer_id, invited_id, invited_name, invited_photo, created_at)
VALUES (800092886, 333333333, 'Test User 3', '', $(date +%s)000);
EOF
```

### Step 3: Verify in Database

```bash
sqlite3 data/database.db "SELECT referrer_id, invited_id, invited_name, datetime(created_at/1000, 'unixepoch') as created_at FROM referrals WHERE referrer_id = 800092886;"
```

### Step 4: Refresh Frontend

1. Hard refresh the app (Ctrl+Shift+R)
2. Go to Profile → Referral
3. You should see all 3 test users

---

## Method 3: Test Full Flow with Script

### Create Test Script

```bash
cat > /root/01studio/CollectibleKIT/test_referral_flow.sh << 'EOF'
#!/bin/bash

BASE_URL="http://localhost:3003"
REFERRER_ID=800092886

echo "🧪 Testing Referral System Flow"
echo "================================"
echo ""

# Add multiple test referrals
echo "1️⃣ Adding test referrals..."
for i in {1..5}; do
  INVITED_ID=$((100000000 + i))
  curl -s -X POST "$BASE_URL/api/referral" \
    -H "Content-Type: application/json" \
    -d "{
      \"referrerId\": $REFERRER_ID,
      \"invitedId\": $INVITED_ID,
      \"invitedName\": \"Test User $i\",
      \"invitedPhoto\": \"\"
    }" > /dev/null
  echo "  ✅ Added referral for Test User $i (ID: $INVITED_ID)"
done

echo ""
echo "2️⃣ Checking referral stats..."
STATS=$(curl -s "$BASE_URL/api/referral/stats?referrer_id=$REFERRER_ID")
echo "$STATS" | python3 -m json.tool

echo ""
echo "3️⃣ Checking invited users list..."
INVITED=$(curl -s "$BASE_URL/api/referral?referrer_id=$REFERRER_ID")
echo "$INVITED" | python3 -m json.tool

echo ""
echo "✅ Test complete! Check your profile to see the referrals."
EOF

chmod +x /root/01studio/CollectibleKIT/test_referral_flow.sh
```

### Run Test Script

```bash
/root/01studio/CollectibleKIT/test_referral_flow.sh
```

---

## Method 4: Test Edge Cases

### Test 1: Duplicate Referral Prevention

```bash
# Try to add same referral twice
curl -X POST http://localhost:3003/api/referral \
  -H "Content-Type: application/json" \
  -d '{
    "referrerId": 800092886,
    "invitedId": 999999999,
    "invitedName": "Test User",
    "invitedPhoto": ""
  }'

# Should return success but not create duplicate
```

### Test 2: Self-Referral Prevention

```bash
# Try to refer yourself
curl -X POST http://localhost:3003/api/referral \
  -H "Content-Type: application/json" \
  -d '{
    "referrerId": 800092886,
    "invitedId": 800092886,
    "invitedName": "Yourself",
    "invitedPhoto": ""
  }'

# Should return: {"error":"Cannot refer yourself"}
```

### Test 3: Missing Parameters

```bash
# Missing invitedId
curl -X POST http://localhost:3003/api/referral \
  -H "Content-Type: application/json" \
  -d '{
    "referrerId": 800092886
  }'

# Should return: {"error":"Missing referrerId or invitedId"}
```

---

## Method 5: Simulate User Initialization with Referral

### Test the /api/user/init endpoint with start_param

```bash
# Simulate a new user signing up with your referral link
curl -X POST http://localhost:3003/api/user/init \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 888888888,
    "username": "testuser",
    "first_name": "Test",
    "last_name": "User",
    "language_code": "en",
    "is_premium": false,
    "photo_url": "",
    "start_param": "ref_800092886"
  }'
```

**Check server logs:**
```bash
tail -50 /tmp/nextjs.log | grep -i "referral\|start_param"
```

You should see:
- `📋 start_param received: "ref_800092886"`
- `🔗 Processing referral: 888888888 referred by 800092886`
- `✅ Referral processed successfully`

---

## Method 6: Clean Up Test Data

### Remove Test Referrals

```bash
cd /root/01studio/CollectibleKIT/webapp-nextjs
sqlite3 data/database.db "DELETE FROM referrals WHERE referrer_id = 800092886 AND invited_id >= 100000000;"
```

Or via API (if you have delete endpoint):
```bash
# Note: There's no DELETE endpoint, so use database directly
```

---

## Quick Test Checklist

- [ ] **API Test:** Add referral via POST /api/referral
- [ ] **API Test:** Get referrals via GET /api/referral?referrer_id=X
- [ ] **API Test:** Get stats via GET /api/referral/stats?referrer_id=X
- [ ] **Frontend Test:** Check Profile → Referral section shows data
- [ ] **Database Test:** Verify data in database
- [ ] **Edge Cases:** Test duplicates, self-referral, missing params
- [ ] **Full Flow:** Test /api/user/init with start_param

---

## Expected Results

### In Frontend (Profile → Referral):
- ✅ **Total Referrals:** Shows correct count
- ✅ **This Week:** Shows recent referrals (last 7 days)
- ✅ **Invited Friends:** Lists all invited users with names and dates

### In API:
- ✅ POST returns `{"success":true}`
- ✅ GET returns array of invited users
- ✅ Stats returns `{totalReferrals: X, recentReferrals: Y}`

### In Database:
- ✅ Records in `referrals` table
- ✅ Correct `referrer_id` and `invited_id`
- ✅ Timestamps are correct

---

## Troubleshooting

### If referrals don't show in frontend:
1. Hard refresh (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify API returns data: `curl "http://localhost:3003/api/referral?referrer_id=800092886"`
4. Check network tab in browser dev tools

### If API returns empty:
1. Check database: `sqlite3 data/database.db "SELECT * FROM referrals;"`
2. Verify user_id is correct
3. Check server logs: `tail -100 /tmp/nextjs.log`

---

## Summary

You can test the entire referral system without fresh accounts by:
1. **Manually adding referrals via API** (Method 1)
2. **Adding test data directly to database** (Method 2)
3. **Using the test script** (Method 3)
4. **Simulating user initialization** (Method 5)

All methods will show the referrals in your profile once you refresh!

