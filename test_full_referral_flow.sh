#!/bin/bash

# Full Referral Flow Test
# Simulates: User clicks referral link → Signs up → Referral recorded → Shows in app

BASE_URL="http://localhost:3003"
REFERRER_ID=800092886
TEST_USER_ID=$((800092886 + $(date +%s) % 1000000))  # Generate unique test user ID

echo "=========================================="
echo "FULL REFERRAL FLOW TEST"
echo "=========================================="
echo ""
echo "Referrer ID: $REFERRER_ID"
echo "Test User ID: $TEST_USER_ID"
echo "Referral Link: https://t.me/CollectibleKITbot?start=ref_$REFERRER_ID"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

test_step() {
    local step_num=$1
    local description=$2
    local command=$3
    local expected_contains=$4
    
    echo -e "${BLUE}STEP $step_num: $description${NC}"
    echo "Command: $command"
    echo ""
    
    response=$(eval "$command")
    http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2 || echo "")
    body=$(echo "$response" | sed '/HTTP_CODE/d')
    
    if [ -n "$http_code" ]; then
        echo "HTTP Code: $http_code"
    fi
    echo "Response: $body"
    echo ""
    
    if [ -n "$expected_contains" ]; then
        if echo "$body" | grep -q "$expected_contains"; then
            echo -e "${GREEN}✅ PASSED${NC}"
            ((PASSED++))
            return 0
        else
            echo -e "${RED}❌ FAILED (Expected: $expected_contains)${NC}"
            ((FAILED++))
            return 1
        fi
    elif [ "$http_code" = "200" ] || [ -z "$http_code" ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

echo "=========================================="
echo "STEP 1: Simulate User Clicking Referral Link"
echo "=========================================="
echo "User clicks: https://t.me/CollectibleKITbot?start=ref_$REFERRER_ID"
echo "Telegram passes start_param='ref_$REFERRER_ID' to the app"
echo ""

echo "=========================================="
echo "STEP 2: User Initialization with Referral"
echo "=========================================="
echo "Calling /api/user/init with start_param='ref_$REFERRER_ID'"
echo ""

INIT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/user/init" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": $TEST_USER_ID,
    \"username\": \"testuser_$(date +%s)\",
    \"first_name\": \"Test\",
    \"last_name\": \"User\",
    \"language_code\": \"en\",
    \"is_premium\": false,
    \"photo_url\": \"\",
    \"start_param\": \"ref_$REFERRER_ID\"
  }")

HTTP_CODE=$(echo "$INIT_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$INIT_RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Code: $HTTP_CODE"
echo "Response: $BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ User initialization successful${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ User initialization failed${NC}"
    ((FAILED++))
fi

echo ""
echo "=========================================="
echo "STEP 3: Check Server Logs for Referral Processing"
echo "=========================================="
echo "Checking /tmp/nextjs.log for referral processing messages..."
echo ""

LOG_CHECK=$(tail -100 /tmp/nextjs.log 2>/dev/null | grep -i "referral\|start_param" | tail -10)

if [ -n "$LOG_CHECK" ]; then
    echo "$LOG_CHECK"
    echo ""
    if echo "$LOG_CHECK" | grep -qi "processing referral\|referral processed successfully"; then
        echo -e "${GREEN}✅ Referral processing found in logs${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️ Referral processing not clearly visible in logs${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ No referral logs found (logs might be in different location)${NC}"
fi

echo ""
echo "=========================================="
echo "STEP 4: Verify Referral in Database (via API)"
echo "=========================================="

sleep 2  # Give database time to process

echo "4a. Check if referral was added..."
INVITED_RESPONSE=$(curl -s "$BASE_URL/api/referral?referrer_id=$REFERRER_ID")
echo "Response: $INVITED_RESPONSE"
echo ""

if echo "$INVITED_RESPONSE" | grep -q "\"invited_id\":$TEST_USER_ID"; then
    echo -e "${GREEN}✅ Referral found in database!${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Referral NOT found in database${NC}"
    echo "Expected invited_id: $TEST_USER_ID"
    ((FAILED++))
fi

echo ""
echo "4b. Check referral stats..."
STATS_RESPONSE=$(curl -s "$BASE_URL/api/referral/stats?referrer_id=$REFERRER_ID")
echo "Response: $STATS_RESPONSE"
echo ""

TOTAL_COUNT=$(echo "$STATS_RESPONSE" | grep -o '"totalReferrals":[0-9]*' | cut -d: -f2)
if [ -n "$TOTAL_COUNT" ] && [ "$TOTAL_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Stats show $TOTAL_COUNT total referrals${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Stats not showing referrals${NC}"
    ((FAILED++))
fi

echo ""
echo "=========================================="
echo "STEP 5: Verify Referral Data Structure"
echo "=========================================="

INVITED_DATA=$(echo "$INVITED_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps([u for u in data.get('invited', []) if u.get('invited_id') == $TEST_USER_ID], indent=2))" 2>/dev/null)

if [ -n "$INVITED_DATA" ] && [ "$INVITED_DATA" != "[]" ]; then
    echo "Referral data for test user:"
    echo "$INVITED_DATA"
    echo ""
    
    # Check required fields
    if echo "$INVITED_DATA" | grep -q "invited_id" && \
       echo "$INVITED_DATA" | grep -q "invited_name" && \
       echo "$INVITED_DATA" | grep -q "created_at"; then
        echo -e "${GREEN}✅ All required fields present${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ Missing required fields${NC}"
        ((FAILED++))
    fi
else
    echo -e "${RED}❌ Test user not found in invited list${NC}"
    ((FAILED++))
fi

echo ""
echo "=========================================="
echo "STEP 6: Frontend Display Check"
echo "=========================================="
echo "The referral should now appear in:"
echo "  - Profile → Referral → Invited Friends"
echo ""
echo "To verify:"
echo "  1. Open https://collectablekit.01studio.xyz"
echo "  2. Go to Profile tab → Referral section"
echo "  3. Check 'Invited Friends' list"
echo "  4. You should see 'Test User' (or User $TEST_USER_ID)"
echo ""

echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total Steps: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo "The referral flow is working correctly:"
    echo "  1. ✅ User initialization with start_param"
    echo "  2. ✅ Referral processed and saved to database"
    echo "  3. ✅ Referral visible via API"
    echo "  4. ✅ Referral will show in frontend"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Check the errors above to identify the issue."
    exit 1
fi

