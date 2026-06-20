#!/usr/bin/env bash
# dev-smoke-start.sh — BriefPilot local smoke environment
# Kullanım: ./scripts/dev-smoke-start.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
HEALTH_URL="http://localhost:8000/api/v4/health/"
HEALTH_TIMEOUT=60

# ── Docker binary ────────────────────────────────────────────────────────────
DOCKER=""
for candidate in \
  docker \
  "/Applications/Docker.app/Contents/Resources/bin/docker" \
  "/usr/local/bin/docker"; do
  if command -v "$candidate" &>/dev/null 2>&1; then
    DOCKER="$candidate"
    break
  fi
done

if [[ -z "$DOCKER" ]]; then
  echo ""
  echo "ERROR: Docker not found."
  echo "  Open Docker Desktop, wait for it to start, then run this script again."
  echo ""
  exit 1
fi

if ! "$DOCKER" info &>/dev/null 2>&1; then
  echo ""
  echo "ERROR: Docker daemon is not running."
  echo "  Open Docker Desktop and wait for the whale icon to be ready."
  echo ""
  exit 1
fi

echo "Docker: $("$DOCKER" --version | head -1)"

# ── Backend ──────────────────────────────────────────────────────────────────
echo ""
echo "Starting backend containers..."
cd "$BACKEND_DIR"
"$DOCKER" compose up -d

echo ""
echo "Waiting for backend health (max ${HEALTH_TIMEOUT}s)..."
elapsed=0
until curl -sf "$HEALTH_URL" &>/dev/null; do
  if [[ $elapsed -ge $HEALTH_TIMEOUT ]]; then
    echo ""
    echo "ERROR: Backend did not become healthy after ${HEALTH_TIMEOUT}s."
    echo ""
    echo "Container status:"
    "$DOCKER" compose ps
    echo ""
    echo "API logs (last 40 lines):"
    "$DOCKER" compose logs --tail=40 api
    echo ""
    echo "Worker OCR logs (last 20 lines):"
    "$DOCKER" compose logs --tail=20 worker-ocr
    exit 1
  fi
  sleep 2
  elapsed=$((elapsed + 2))
  printf "."
done
echo ""
echo "Backend: OK — $HEALTH_URL"

# ── LAN IP ───────────────────────────────────────────────────────────────────
LAN_IP=""
for iface in en0 en1 en2; do
  LAN_IP=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
  [[ -n "$LAN_IP" ]] && break
done

if [[ -z "$LAN_IP" ]]; then
  echo ""
  echo "WARNING: Could not detect LAN IP. Connect to Wi-Fi and try again."
  echo "  Fallback: set EXPO_PUBLIC_DEVICE_IP manually."
  LAN_IP="<LAN_IP>"
fi

# ── LAN IP required for Metro ────────────────────────────────────────────────
if [[ "$LAN_IP" == "<LAN_IP>" ]]; then
  echo ""
  echo "ERROR: Could not detect LAN IP. Metro will not be started."
  echo "  Connect to Wi-Fi or set EXPO_PUBLIC_DEVICE_IP manually."
  exit 1
fi

# ── Metro port guard ─────────────────────────────────────────────────────────
METRO_PID="$(lsof -ti tcp:8081 2>/dev/null || true)"
if [[ -n "$METRO_PID" ]]; then
  echo ""
  echo "ERROR: Metro port 8081 is already in use by PID(s): $METRO_PID"
  echo "  Stop the old Metro first:"
  echo "    kill $METRO_PID"
  echo ""
  echo "  Refusing to switch to 8082 — stale env/API_BASE bugs hide there."
  exit 1
fi

# ── Start Metro ──────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Backend : http://${LAN_IP}:8000/api/v4"
echo " Health  : OK"
echo " Metro   : starting on 8081"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Pixel: open Expo Go or dev-client, scan QR."
echo "App log should show:  [Config] API_BASE http://${LAN_IP}:8000/api/v4"
echo ""

cd "$REPO_ROOT"
EXPO_PUBLIC_DEVICE_IP="$LAN_IP" npx expo start --clear
