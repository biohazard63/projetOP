#!/usr/bin/env bash
# M6 — production build in an isolated copy, so that the workspace .next and any local server are never touched.
# Usage (from cardgame/): scripts/game/isolated-build.sh <copy-dir>
# The copy keeps its node_modules between runs; `npm ci` runs only when package-lock.json changed since the last install
# (its sha256 is kept in <copy-dir>/.lock.sha256). No .env file is copied. Nothing is deleted in the workspace.
set -euo pipefail
DEST="${1:?usage: isolated-build.sh <copy-dir>}"
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
mkdir -p "$DEST"
rsync -a --delete --exclude node_modules --exclude .next --exclude '.env' --exclude '.env.*' --exclude .lock.sha256 "$SRC/" "$DEST/"
LOCK="$(shasum -a 256 "$DEST/package-lock.json" | cut -d' ' -f1)"
if [ ! -d "$DEST/node_modules" ] || [ "$(cat "$DEST/.lock.sha256" 2>/dev/null)" != "$LOCK" ]; then
  (cd "$DEST" && npm ci)
  echo "$LOCK" > "$DEST/.lock.sha256"
else
  echo "node_modules reused (package-lock.json unchanged)"
fi
(cd "$DEST" && npm run build)
