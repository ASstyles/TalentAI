#!/usr/bin/env bash
# ==============================================================================
# TalentAI Enterprise Environment Verification Script
# Validates runtime environment, Node.js version, and required credentials
# ==============================================================================

set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE} TalentAI Enterprise Environment Pre-Flight Verification${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""

# 1. Node.js Version Check (Requires Node >= 22.0.0 for Firebase Admin v14 & modern crypto)
echo -n "Checking Node.js version... "
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 22 ]; then
    echo -e "${GREEN}PASS${NC} (v${NODE_VER})"
  elif [ "$NODE_MAJOR" -ge 20 ]; then
    echo -e "${YELLOW}WARN${NC} (v${NODE_VER} detected. Production recommends Node >= 22.x)"
    ((WARNINGS++))
  else
    echo -e "${RED}FAIL${NC} (v${NODE_VER} detected. Minimum required: Node >= 22.x)"
    ((ERRORS++))
  fi
else
  echo -e "${RED}FAIL${NC} (Node.js is not installed or not on PATH)"
  ((ERRORS++))
fi

# 2. Check npm / package manager
echo -n "Checking package manager (npm)... "
if command -v npm >/dev/null 2>&1; then
  NPM_VER=$(npm -v)
  echo -e "${GREEN}PASS${NC} (v${NPM_VER})"
else
  echo -e "${RED}FAIL${NC} (npm not found)"
  ((ERRORS++))
fi

# 3. Check Core Environment Variables
echo ""
echo "Verifying Environment Configuration:"

check_var() {
  local var_name="$1"
  local required="$2"
  local val="${!var_name}"

  echo -n "  - $var_name: "
  if [ -n "$val" ]; then
    # Mask value
    local len=${#val}
    if [ "$len" -gt 8 ]; then
      local masked="${val:0:4}...${val: -4}"
    else
      local masked="***"
    fi
    echo -e "${GREEN}PRESENT${NC} ($masked)"
  else
    if [ "$required" = "true" ]; then
      echo -e "${RED}MISSING (REQUIRED)${NC}"
      ((ERRORS++))
    else
      echo -e "${YELLOW}NOT SET (OPTIONAL)${NC}"
      ((WARNINGS++))
    fi
  fi
}

# Client Firebase Variables
check_var "NEXT_PUBLIC_FIREBASE_PROJECT_ID" "true"
check_var "NEXT_PUBLIC_FIREBASE_API_KEY" "true"
check_var "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" "true"
check_var "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" "false"

# Admin Firebase Variables
check_var "FIREBASE_PROJECT_ID" "false"
check_var "FIREBASE_CLIENT_EMAIL" "false"
check_var "FIREBASE_PRIVATE_KEY" "false"

# Gemini AI Variables
check_var "GEMINI_API_KEY" "true"

# Redis Cache & Rate Limiting
check_var "REDIS_URL" "false"

# Sandbox Execution Environment
check_var "SANDBOX_EXECUTION_ENABLED" "false"

echo ""
# 4. Standalone & Build Prerequisites Check
echo -n "Checking package-lock.json consistency... "
if [ -f "package-lock.json" ]; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC} (package-lock.json missing)"
  ((ERRORS++))
fi

echo -n "Checking next.config.ts standalone mode... "
if grep -q "output: 'standalone'" next.config.ts 2>/dev/null; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${YELLOW}WARN${NC} (output: 'standalone' not detected in next.config.ts)"
  ((WARNINGS++))
fi

echo ""
echo -e "${BLUE}======================================================${NC}"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}Pre-flight verification completed successfully!${NC}"
  echo -e "Warnings: ${WARNINGS}"
  exit 0
else
  echo -e "${RED}Pre-flight verification failed with ${ERRORS} error(s) and ${WARNINGS} warning(s).${NC}"
  echo "Please review the missing configuration values above."
  exit 1
fi
