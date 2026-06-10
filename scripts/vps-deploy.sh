#!/usr/bin/env bash
set -euo pipefail

# Usage: sudo ./vps-deploy.sh <git_repo_url> <release_tag>
REPO=${1:-}
TAG=${2:-main}
APP_DIR=/opt/redot2

if [ -z "$REPO" ]; then
  echo "Usage: $0 <git_repo_url> [tag]"
  exit 2
fi

git clone "$REPO" "$APP_DIR" || (cd "$APP_DIR" && git fetch --all && git reset --hard)
cd "$APP_DIR"
git fetch --all --tags
git checkout "$TAG"

echo "Create production .env at $APP_DIR/.env (securely)."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Please edit .env with production secrets and rerun this script." && exit 0
fi

# Ensure docker-compose runs with correct permissions
docker compose pull || true
docker compose up -d --remove-orphans

echo "Deployment complete. Verify services with 'docker compose ps' and health checks."

exit 0
