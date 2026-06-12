#!/bin/bash
# Global triple-node health check for ABC-IO v5.0.0

set -e

REDOT1="162.254.32.142"
AI1="192.227.212.235"
AI2="192.227.212.237"

CHECKS=(
  "redot1:gateway:$REDOT1:4000:/health"
  "redot1:portal:$REDOT1:8090:/health"
  "redot1:kimi:$REDOT1:5000:/health"
  "redot1:mobile:$REDOT1:5050:/health"
  "ai1:gateway:$AI1:4000:/health"
  "ai1:kimi:$AI1:5000:/health"
  "ai1:mobile:$AI1:5050:/health"
  "ai2:gateway:$AI2:4000:/health"
  "ai2:kimi:$AI2:5000:/health"
  "ai2:mobile:$AI2:5050:/health"
)

FAILED=0
for check in "${CHECKS[@]}"; do
  IFS=':' read -r node service host port path <<< "$check"
  url="http://$host:$port$path"
  status=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
  if [ "$status" = "200" ]; then
    echo "[OK]   $node/$service ($url)"
  else
    echo "[FAIL] $node/$service ($url) -> HTTP $status"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "[SUCCESS] All cluster health checks passed."
  exit 0
else
  echo "[ERROR] $FAILED cluster health check(s) failed."
  exit 1
fi
