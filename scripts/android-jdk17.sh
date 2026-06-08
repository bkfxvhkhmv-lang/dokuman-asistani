#!/usr/bin/env bash

set -euo pipefail

if [[ "${OSTYPE:-}" != darwin* ]]; then
  echo "[android:jdk17] This helper currently targets macOS because it relies on /usr/libexec/java_home." >&2
  exit 1
fi

export JAVA_HOME
JAVA_HOME="$(
  /usr/libexec/java_home -v 17
)"
export PATH="$JAVA_HOME/bin:$PATH"

echo "[android:jdk17] JAVA_HOME=$JAVA_HOME"
java -version

npx expo run:android "$@"
