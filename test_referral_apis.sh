#!/bin/bash

# Referral System API Test Script
# Tests all referral-related endpoints

BASE_URL="http://localhost:3003"
TEST_REFERRER_ID=123456789
TEST_INVITED_ID=987654321
TEST_INVITED_NAME="Test User"
TEST_INVITED_PHOTO="https://example.com/photo.jpg"

echo "=========================================="
echo "REFERRAL SYSTEM API TEST"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    local expected_code=${5:-200}  # Default to 200, can override for error cases
    
    echo -e "${YELLOW}Testing: ${description}${NC}"
    echo "  Endpoint: ${method} ${endpoint}"
    echo "  Expected Code: ${expected_code}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${BASE_URL}${endpoint}")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X ${method} \
            -H "Content-Type: application/json" \
            -d "${data}" \
            "${BASE_URL}${endpoint}")
    fi
    
    http_code=$(echo "$response" | grep "HTTP_CODE" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE/d')
    
    echo "  Response Code: ${http_code}"
    echo "  Response Body: ${body}"
    echo ""
    
    if [ "$http_code" = "$expected_code" ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED (Expected ${expected_code}, got ${http_code})${NC}"
        ((FAILED++))
        return 1
    fi
}

echo "=========================================="
echo "TEST 1: POST /api/referral - Add Referral"
echo "=========================================="
test_endpoint "POST" "/api/referral" \
    "{\"referrerId\":${TEST_REFERRER_ID},\"invitedId\":${TEST_INVITED_ID},\"invitedName\":\"${TEST_INVITED_NAME}\",\"invitedPhoto\":\"${TEST_INVITED_PHOTO}\"}" \
    "Add a new referral"

echo ""
echo "=========================================="
echo "TEST 2: POST /api/referral - Duplicate Referral (Should be ignored)"
echo "=========================================="
test_endpoint "POST" "/api/referral" \
    "{\"referrerId\":${TEST_REFERRER_ID},\"invitedId\":${TEST_INVITED_ID},\"invitedName\":\"${TEST_INVITED_NAME}\",\"invitedPhoto\":\"${TEST_INVITED_PHOTO}\"}" \
    "Try to add duplicate referral (should succeed but not create duplicate)"

echo ""
echo "=========================================="
echo "TEST 3: POST /api/referral - Self Referral (Should Fail)"
echo "=========================================="
test_endpoint "POST" "/api/referral" \
    "{\"referrerId\":${TEST_REFERRER_ID},\"invitedId\":${TEST_REFERRER_ID},\"invitedName\":\"Self\",\"invitedPhoto\":\"\"}" \
    "Try to refer yourself (should return 400)" \
    "400"

echo ""
echo "=========================================="
echo "TEST 4: POST /api/referral - Missing Parameters (Should Fail)"
echo "=========================================="
test_endpoint "POST" "/api/referral" \
    "{\"referrerId\":${TEST_REFERRER_ID}}" \
    "Missing invitedId (should return 400)" \
    "400"

echo ""
echo "=========================================="
echo "TEST 5: GET /api/referral?referrer_id=X - Get Invited Users"
echo "=========================================="
test_endpoint "GET" "/api/referral?referrer_id=${TEST_REFERRER_ID}" \
    "" \
    "Get list of users invited by referrer" \
    "200"

echo ""
echo "=========================================="
echo "TEST 6: GET /api/referral/stats?referrer_id=X - Get Referral Stats"
echo "=========================================="
test_endpoint "GET" "/api/referral/stats?referrer_id=${TEST_REFERRER_ID}" \
    "" \
    "Get referral statistics for referrer" \
    "200"

echo ""
echo "=========================================="
echo "TEST 7: GET /api/referral - Missing referrer_id (Should Fail)"
echo "=========================================="
test_endpoint "GET" "/api/referral" \
    "" \
    "Missing referrer_id parameter (should return 400)" \
    "400"

echo ""
echo "=========================================="
echo "TEST 8: GET /api/referral/stats - Missing referrer_id (Should Fail)"
echo "=========================================="
test_endpoint "GET" "/api/referral/stats" \
    "" \
    "Missing referrer_id parameter (should return 400)" \
    "400"

echo ""
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    exit 1
fi

