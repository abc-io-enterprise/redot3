#!/bin/sh
set -e

# Primary VPS provisioning script
apk add --no-cache docker docker-compose
service docker start
mkdir -p /opt/abc-io
cd /opt/abc-io
# Copy repository files into /opt/abc-io before running this script
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
