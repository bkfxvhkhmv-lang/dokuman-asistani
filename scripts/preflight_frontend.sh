#!/bin/bash
# BriefPilot Frontend Preflight
# Usage: bash scripts/preflight_frontend.sh
# Exit 0 = PASS, Exit 1 = FAIL

cd "$(dirname "$0")/.." || exit 1

echo "BriefPilot Frontend Preflight"
echo "────────────────────────────────────────"

FAIL=0

# ── TypeScript check ──────────────────────────────────────────────────────────
echo "Checking TypeScript..."
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  echo "  ✗ FAIL  TypeScript errors found"
  npx tsc --noEmit 2>&1 | grep "error TS" | head -10 | while IFS= read -r l; do echo "    $l"; done
  FAIL=1
else
  echo "  ✓ TypeScript clean"
fi

# ── Bad string checks ─────────────────────────────────────────────────────────
echo ""
echo "Checking bad strings in source..."

check_string() {
  local pattern="$1"
  local label="$2"
  local allowed_file="${3:-}"

  if [ -n "$allowed_file" ]; then
    HITS=$(grep -rn "$pattern" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "$allowed_file" || true)
  else
    HITS=$(grep -rn "$pattern" src --include="*.ts" --include="*.tsx" 2>/dev/null || true)
  fi

  if [ -n "$HITS" ]; then
    echo "  ✗ Found '$label':"
    echo "$HITS" | head -5 | while IFS= read -r l; do echo "    $l"; done
    return 1
  else
    echo "  ✓ No '$label'"
    return 0
  fi
}

check_string "OCR upload hatası" "OCR upload hatası (Türkisch, fix: Analyse-Fehler)" || FAIL=1
check_string "hatası [0-9]" "raw Turkish 'hatası' with status code" || FAIL=1
check_string "niedrig Risiko" "niedrig Risiko (bad German, fix: Niedriges Risiko)" || FAIL=1
check_string "hauptsächlich wegen" "hauptsächlich wegen (bad German)" || FAIL=1
check_string "Einige Angaben kurz prüfen" "generic review prompt (check not on Home)" || true  # warn only
check_string "TODO.*release\|FIXME.*release\|HACK.*release" "release-blocking TODO/FIXME" || true  # warn only

# ── Backend URL reachability (if backend host set) ────────────────────────────
DEVICE_IP=$(grep "EXPO_PUBLIC_DEVICE_IP" .env.local 2>/dev/null | cut -d= -f2 | tr -d ' ')
if [ -n "$DEVICE_IP" ]; then
  echo ""
  echo "Checking backend reachability ($DEVICE_IP:8000)..."
  if curl -s --max-time 3 "http://$DEVICE_IP:8000/health" | grep -q '"status"'; then
    echo "  ✓ Backend reachable at $DEVICE_IP:8000"
  else
    echo "  ⚠ Backend not reachable at $DEVICE_IP:8000 — OCR scans will fail"
  fi
fi

echo ""
echo "────────────────────────────────────────"
if [ "$FAIL" -eq 0 ]; then
  echo "✓ PASS  Frontend preflight clean"
  exit 0
else
  echo "✗ FAIL  Frontend preflight has errors — fix before mobile testing"
  exit 1
fi
