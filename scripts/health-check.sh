#!/bin/sh
set -e

HEALTH_URLS="
gateway|http://localhost:4000/health
operator-station|http://localhost:8080/health
public-portal|http://localhost:8090/health
redot3-portal|http://localhost:8088/portal/health
mobile-gateway|http://localhost:5050/health
owner-dashboard|http://localhost:8500/health
kimi|http://localhost:5000/health
beacon|http://localhost:3006/health
beacon-pwa|http://localhost:3005/health
account-pwa|http://localhost:8100/health
interface-pwa|http://localhost:8110/health
ai-isp|http://localhost:7000/health
nginx|http://localhost:8088/health
prometheus|http://localhost:9091/-/healthy
grafana|http://localhost:14000/api/health
tracer|http://localhost:16686/
headscale|http://localhost:8085/health
"

FAIL_COUNT=0

for entry in $HEALTH_URLS; do
  name=$(echo "$entry" | cut -d'|' -f1)
  url=$(echo "$entry" | cut -d'|' -f2)
  printf "Checking %s..." "$name"
  if curl --fail --max-time 5 "$url" >/dev/null 2>&1; then
    printf " ok\n"
  else
    printf " FAIL\n"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

# TCP checks for stateful services
printf "Checking postgres..."
if nc -z localhost 5432 2>/dev/null; then
  printf " ok\n"
else
  printf " FAIL\n"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

printf "Checking redis..."
if nc -z localhost 6379 2>/dev/null; then
  printf " ok\n"
else
  printf " FAIL\n"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "ERROR: $FAIL_COUNT service(s) failed health check."
  exit 1
fi

echo 'All health checks passed.'
