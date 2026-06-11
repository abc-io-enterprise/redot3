#!/bin/bash
# ABC-IO v2.0 - Auto-Rollback Script
# Rolls the production stack back to the previous stable Git tag or commit.
# Intended to be invoked by CI/CD when smoke tests fail after deploy.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/abc-io-rollback.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

alert() {
  local severity=$1
  local message=$2
  log "[$severity] $message"
}

cd "$PROJECT_DIR"

CURRENT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "")
CURRENT_COMMIT=$(git rev-parse HEAD)

# Determine rollback target: previous tag, or previous commit
if [ -n "$CURRENT_TAG" ]; then
  ROLLBACK_TARGET=$(git tag --sort=-creatordate | grep -v "$CURRENT_TAG" | head -n 1)
fi

if [ -z "${ROLLBACK_TARGET:-}" ]; then
  ROLLBACK_TARGET=$(git rev-parse HEAD~1)
fi

log "=== ROLLBACK INITIATED ==="
log "Current: $CURRENT_COMMIT (${CURRENT_TAG:-untagged})"
log "Rollback target: $ROLLBACK_TARGET"

# Create emergency backup of current state
BACKUP_DIR="/opt/abc-io-backups/rollback-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -a .env "$BACKUP_DIR/" 2>/dev/null || true
cp -a compose.prod.yml "$BACKUP_DIR/" 2>/dev/null || true
log "Backup saved to $BACKUP_DIR"

# Checkout rollback target
git checkout "$ROLLBACK_TARGET" || {
  alert "CRITICAL" "Git checkout failed"
  exit 1
}

# Rebuild and restart production stack
docker compose -f compose.prod.yml down --remove-orphans || true
docker compose -f compose.prod.yml up -d --build

# Wait for stabilization
sleep 20

# Smoke test
SMOKES=(
  "gateway|http://localhost:4000/health"
  "public-portal|http://localhost:8090/health"
  "nginx|http://localhost:80/health"
)

SMOKE_FAIL=0
for entry in "${SMOKES[@]}"; do
  IFS='|' read -r name url <<< "$entry"
  if curl --fail --max-time 10 "$url" >/dev/null 2>&1; then
    log "✓ Smoke test passed: $name"
  else
    log "✗ Smoke test FAILED: $name"
    SMOKE_FAIL=$((SMOKE_FAIL + 1))
  fi
done

if [ "$SMOKE_FAIL" -gt 0 ]; then
  alert "CRITICAL" "Rollback smoke tests failed. Manual intervention required."
  exit 1
fi

log "=== ROLLBACK COMPLETE ==="
log "System is running at $ROLLBACK_TARGET"
