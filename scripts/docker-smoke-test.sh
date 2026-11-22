#!/usr/bin/env bash
# ==============================================================================
# TalentAI Docker Smoke Test Script
# Verifies container health, user privilege dropping, and module resolution
# ==============================================================================
set -euo pipefail

echo "=========================================================="
echo "TalentAI Enterprise Docker Smoke Test Suite"
echo "=========================================================="

# 1. Check Docker & Compose CLI
if ! command -v docker &> /dev/null; then
    echo "[-] Error: docker CLI is not installed or not in PATH."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "[-] Error: docker compose plugin is not available."
    exit 1
fi

echo "[+] Docker & Docker Compose CLI detected."

# 2. Validate Compose configuration syntax
echo "[*] Validating compose.yaml configuration syntax..."
docker compose config > /dev/null
echo "[+] compose.yaml syntax valid."

# 3. Build & launch stack in detached mode
echo "[*] Building and starting services with healthchecks..."
docker compose up -d --build --wait

# 4. Verify running containers
echo "[*] Checking container statuses..."
docker compose ps

# 5. Check Non-Root user execution in app container
echo "[*] Verifying non-root execution inside talentai-app..."
APP_USER=$(docker compose exec app id -un)
APP_UID=$(docker compose exec app id -u)

if [ "$APP_UID" -eq 0 ] || [ "$APP_USER" = "root" ]; then
    echo "[-] CRITICAL SECURITY FAILURE: Application running as root!"
    docker compose down
    exit 1
fi
echo "[+] Confirmed application running as non-root user: ${APP_USER} (UID: ${APP_UID})"

# 6. Verify Health Endpoints
echo "[*] Probing Liveness Endpoint (/api/health/live)..."
HTTP_LIVE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health/live)
if [ "$HTTP_LIVE" -ne 200 ]; then
    echo "[-] Liveness endpoint probe failed with HTTP ${HTTP_LIVE}"
    docker compose logs --tail=50 app
    docker compose down
    exit 1
fi
echo "[+] Liveness endpoint responded: HTTP 200 OK"

echo "[*] Probing Readiness Endpoint (/api/health/ready)..."
HTTP_READY=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health/ready)
echo "[+] Readiness endpoint responded: HTTP ${HTTP_READY}"

# 7. Check critical package resolution inside container
echo "[*] Verifying runtime package resolution inside container..."
docker compose exec app node -e "require.resolve('firebase-admin/app'); console.log('firebase-admin/app: OK')"
docker compose exec app node -e "require.resolve('firebase-admin/firestore'); console.log('firebase-admin/firestore: OK')"
docker compose exec app node -e "require.resolve('@google-cloud/firestore'); console.log('@google-cloud/firestore: OK')"
docker compose exec app node -e "require.resolve('ioredis'); console.log('ioredis: OK')"

echo "=========================================================="
echo "[+] All Docker Smoke Tests Passed Successfully!"
echo "=========================================================="
