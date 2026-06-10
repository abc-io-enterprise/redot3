#!/bin/sh
set -e

# AI worker node bootstrap
apk add --no-cache docker docker-compose
service docker start
mkdir -p /opt/abc-io
cd /opt/abc-io
# Copy AI worker service sources before running
docker compose -f compose.prod.yml up -d kimi
