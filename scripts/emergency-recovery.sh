#!/bin/bash
# ABC-IO v2.0 - Emergency Recovery Script
# Performs full system recovery when auto-heal fails
# Use only as last resort before manual intervention

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/abc-io-recovery.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== EMERGENCY RECOVERY STARTED ==="
log "WARNING: This is an aggressive recovery procedure"

cd "$PROJECT_DIR"

# Step 1: Stop all services
log "Step 1: Stopping all services..."
docker compose stop 2>&1 | tee -a "$LOG_FILE" || true
sleep 10

# Step 2: Remove containers
log "Step 2: Removing containers..."
docker compose rm -f 2>&1 | tee -a "$LOG_FILE" || true
sleep 5

# Step 3: Prune volumes (optional - risky)
log "Step 3: Pruning Docker system..."
docker system prune -f 2>&1 | tee -a "$LOG_FILE" || true

# Step 4: Restart all services
log "Step 4: Starting all services..."
docker compose up -d 2>&1 | tee -a "$LOG_FILE"

# Step 5: Wait for stabilization
log "Step 5: Waiting for services to stabilize (30 seconds)..."
sleep 30

# Step 6: Verify recovery
log "Step 6: Verifying recovery..."
RUNNING=$(docker compose ps --services --filter "status=running" | wc -l)
TOTAL=$(docker compose ps --services | wc -l)

log "Services running: $RUNNING/$TOTAL"

if [ $RUNNING -eq $TOTAL ]; then
  log "✓ RECOVERY SUCCESSFUL - All services online"
  log "=== RECOVERY COMPLETE ===" 
  exit 0
else
  log "✗ RECOVERY INCOMPLETE - Some services still down"
  log "Manually verify: docker compose ps"
  exit 1
fi
