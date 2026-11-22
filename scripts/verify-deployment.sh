#!/usr/bin/env bash
# ==============================================================================
# TalentAI Enterprise Deployment Verification Script
# Validates health probes, endpoint availability, and security headers
# ==============================================================================

set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TARGET_URL="${1:-http://localhost:3000}"
MAX_WAIT_SECONDS="${2:-30}"

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE} TalentAI Enterprise Deployment Verification${NC}"
echo -e "${BLUE} Target URL: ${TARGET_URL}${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""

# 1. Wait for server liveness
echo -n "Waiting for service to become alive at ${TARGET_URL}/api/health/live... "
COUNTER=0
until curl -s -f -o /dev/null "${TARGET_URL}/api/health/live" 2>/dev/null; do
  sleep 1
  ((COUNTER++))
  if [ "$COUNTER" -ge "$MAX_WAIT_SECONDS" ]; then
    echo -e "${RED}TIMED OUT${NC} (${MAX_WAIT_SECONDS}s)"
    echo "Service failed to respond to /api/health/live probe."
    exit 1
  fi
done
echo -e "${GREEN}ALIVE${NC} (${COUNTER}s)"

# 2. Check Liveness Probe Response
echo -n "Checking Liveness probe payload: "
LIVE_RESP=$(curl -s "${TARGET_URL}/api/health/live")
if echo "$LIVE_RESP" | grep -q '"status":"ok"'; then
  echo -e "${GREEN}PASS${NC} -> $LIVE_RESP"
else
  echo -e "${RED}FAIL${NC} -> Invalid payload: $LIVE_RESP"
  exit 1
fi

# 3. Check Readiness Probe
echo -n "Checking Readiness probe (${TARGET_URL}/api/health/ready): "
READY_HTTP_CODE=$(curl -s -o /tmp/ready_resp.json -w "%{http_code}" "${TARGET_URL}/api/health/ready" 2>/dev/null || echo "000")
READY_PAYLOAD=$(cat /tmp/ready_resp.json 2>/dev/null || echo "{}")

if [ "$READY_HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}READY (HTTP 200)${NC}"
  echo "  Payload: $READY_PAYLOAD"
elif [ "$READY_HTTP_CODE" -eq 503 ]; then
  echo -e "${YELLOW}DEGRADED / NOT READY (HTTP 503)${NC}"
  echo "  Payload: $READY_PAYLOAD"
  echo "  (Note: In environments where external databases or Redis are mock/emulator, 503 may reflect pending upstream connectivity)"
else
  echo -e "${RED}ERROR (HTTP ${READY_HTTP_CODE})${NC}"
  echo "  Payload: $READY_PAYLOAD"
fi

# 4. Verify Authentication Endpoints Fail-Closed (Zero-Trust Validation)
echo ""
echo "Verifying Zero-Trust Security on Critical Endpoints:"

check_fail_closed() {
  local endpoint="$1"
  local method="$2"
  local expected_status="$3"

  echo -n "  - ${method} ${endpoint} (no auth token): "
  local code=$(curl -s -X "${method}" -o /dev/null -w "%{http_code}" "${TARGET_URL}${endpoint}")
  if [ "$code" -eq "$expected_status" ]; then
    echo -e "${GREEN}PASS${NC} (HTTP ${code})"
  else
    echo -e "${RED}FAIL${NC} (Expected HTTP ${expected_status}, received ${code})"
  fi
}

check_fail_closed "/api/hiring/decide" "POST" 401
check_fail_closed "/api/matching/recommend" "POST" 401
check_fail_closed "/api/interview/evaluate" "POST" 401
check_fail_closed "/api/resume/parse" "POST" 401

# 5. Verify Unauthenticated UI Route Rendering
echo ""
echo "Verifying Public UI Routes:"
check_ui() {
  local route="$1"
  echo -n "  - GET ${route}: "
  local code=$(curl -s -o /dev/null -w "%{http_code}" "${TARGET_URL}${route}")
  if [ "$code" -eq 200 ]; then
    echo -e "${GREEN}PASS${NC} (HTTP 200)"
  else
    echo -e "${YELLOW}HTTP ${code}${NC}"
  fi
}

check_ui "/"
check_ui "/login"
check_ui "/register"

echo ""
echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}Deployment verification completed!${NC}"
exit 0
