#!/usr/bin/env bash
# Standard Android physical-device dev/smoke bootstrap.
# Run at the start of each session before device smoke or OCR testing.
#
# Requires: USB device attached, Metro on :8081, OCR backend on host :8000 (optional).

set -euo pipefail

DEVICE="${ANDROID_SERIAL:-}"
ADB=(adb)
if [[ -n "$DEVICE" ]]; then
  ADB=(adb -s "$DEVICE")
fi

PKG="${BRIEFPILOT_PACKAGE:-com.briefpilot.app}"

echo "[android:dev-bootstrap] Setting adb reverse tunnels (Metro + OCR)..."
"${ADB[@]}" reverse tcp:8081 tcp:8081
"${ADB[@]}" reverse tcp:8000 tcp:8000

echo "[android:dev-bootstrap] Active reverse mappings:"
"${ADB[@]}" reverse --list

echo "[android:dev-bootstrap] Restarting app ($PKG)..."
"${ADB[@]}" shell am force-stop "$PKG"
"${ADB[@]}" shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null

echo "[android:dev-bootstrap] Done. Confirm Metro is running (expo start) and OCR backend on :8000 if testing analyse flows."
