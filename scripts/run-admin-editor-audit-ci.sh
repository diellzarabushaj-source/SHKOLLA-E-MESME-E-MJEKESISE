#!/usr/bin/env bash
set -euo pipefail
npm run build
npm run start > full-audit-server.log 2>&1 &
APP_PID=$!
trap 'kill "$APP_PID" 2>/dev/null || true' EXIT
for attempt in $(seq 1 60); do
  if curl --fail --silent http://127.0.0.1:3000/ > /dev/null; then
    break
  fi
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    cat full-audit-server.log
    exit 1
  fi
  sleep 1
done
node scripts/e2e-live-full-user-audit-local.mjs 2>&1 | tee full-user-audit.log
node scripts/e2e-admin-editor.mjs 2>&1 | tee admin-editor-e2e.log
