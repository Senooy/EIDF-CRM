#!/bin/bash
set -e

# Smoke tests for EIDF-CRM
# Usage: ./smoke-tests.sh [base_url]

BASE_URL=${1:-http://localhost:3000}
FAILED=0

echo "🧪 Running smoke tests against $BASE_URL"
echo "=================================="

# Function to test endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local expected_status=$3
  local description=$4
  
  echo -n "Testing $method $endpoint - $description... "
  
  response=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$BASE_URL$endpoint")
  
  if [ "$response" = "$expected_status" ]; then
    echo "✅ PASS ($response)"
  else
    echo "❌ FAIL (expected $expected_status, got $response)"
    FAILED=$((FAILED + 1))
  fi
}

# Function to test authenticated endpoint
test_auth_endpoint() {
  local method=$1
  local endpoint=$2
  local expected_status=$3
  local description=$4
  local token="demo-token"  # Use real token in production
  
  echo -n "Testing $method $endpoint - $description... "
  
  response=$(curl -s -o /dev/null -w "%{http_code}" -X $method \
    -H "Authorization: Bearer $token" \
    "$BASE_URL$endpoint")
  
  if [ "$response" = "$expected_status" ]; then
    echo "✅ PASS ($response)"
  else
    echo "❌ FAIL (expected $expected_status, got $response)"
    FAILED=$((FAILED + 1))
  fi
}

echo ""
echo "1️⃣ Testing health endpoints..."
test_endpoint "GET" "/health" "200" "Gateway health"
test_endpoint "GET" "/metrics" "200" "Prometheus metrics"

echo ""
echo "2️⃣ Testing public endpoints..."
test_endpoint "GET" "/api/plans" "200" "Billing plans"
test_endpoint "POST" "/api/auth/login" "400" "Login endpoint exists"

echo ""
echo "3️⃣ Testing authenticated endpoints..."
test_auth_endpoint "GET" "/api/my-organizations" "200" "Get organizations"
test_auth_endpoint "GET" "/api/analytics/summary" "400" "Analytics (needs org)"

echo ""
echo "4️⃣ Testing error handling..."
test_endpoint "GET" "/api/nonexistent" "404" "404 handling"
test_endpoint "POST" "/api/auth/login" "400" "Bad request handling"

echo ""
echo "5️⃣ Testing rate limiting..."
echo -n "Testing rate limiting... "
for i in {1..150}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/plans")
  if [ "$response" = "429" ]; then
    echo "✅ PASS (rate limit triggered after $i requests)"
    break
  fi
  if [ $i -eq 150 ]; then
    echo "❌ FAIL (rate limit not triggered)"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "=================================="
if [ $FAILED -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ $FAILED tests failed!"
  exit 1
fi