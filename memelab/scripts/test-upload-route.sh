#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use 20.19.4 >/dev/null

PORT="${PORT:-3012}"
LOG_FILE="/tmp/next-upload-test.log"
PID_FILE="/tmp/next-upload-test.pid"
RESP_HEADERS="/tmp/upload-test.headers"
RESP_BODY="/tmp/upload-test.body"

rm -f "$LOG_FILE" "$PID_FILE" "$RESP_HEADERS" "$RESP_BODY"

npm run dev -- -p "$PORT" >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"

cleanup() {
  if [[ -f "$PID_FILE" ]]; then
    kill "$(cat "$PID_FILE")" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# Wait for server
for _ in $(seq 1 90); do
  if curl -s -o /dev/null "http://localhost:${PORT}"; then
    break
  fi
  sleep 1
done

# Hit upload route
curl -sS -X POST "http://localhost:${PORT}/api/upload" \
  -F "file=@public/placeholder.png;type=image/png" \
  -F "name=TestToken" \
  -F "symbol=TEST" \
  -F "description=hello" \
  -D "$RESP_HEADERS" \
  -o "$RESP_BODY"

echo "--- status ---"
head -n 1 "$RESP_HEADERS" || true

echo "--- content-type ---"
grep -i "content-type" "$RESP_HEADERS" || true

echo "--- body ---"
cat "$RESP_BODY" || true

echo "--- last server logs ---"
tail -n 120 "$LOG_FILE" || true
