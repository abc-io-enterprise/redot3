#!/bin/sh
set -e

echo 'Running ABC-IO self-heal validation...'

check_service() {
  name=$1
  url=$2
  if curl --fail "$url" >/dev/null 2>&1; then
    echo "$name OK"
  else
    echo "$name failed"
    exit 1
  fi
}

check_service 'Gateway' 'http://localhost:4000/health'
check_service 'Operator Station' 'http://localhost:8080/health'
check_service 'Public Portal' 'http://localhost:8090/health'
check_service 'Mobile Gateway' 'http://localhost:5050/health'
check_service 'Owner Dashboard' 'http://localhost:8500/health'
check_service 'Kimi' 'http://localhost:5000/health'

if docker compose ps | grep -q 'Exit'; then
  echo 'Detected failed containers, restarting stack.'
  docker compose restart
else
  echo 'No failed containers detected.'
fi

echo 'Self-heal complete.'
