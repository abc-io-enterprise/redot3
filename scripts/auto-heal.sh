#!/bin/bash
# ABC-IO v2.0 - Auto-Healing System
# Monitors services and automatically restarts/recovers failed components
# Runs every 5 minutes via cron or systemd timer

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/abc-io-health.log"
STATE_FILE="/tmp/abc-io-health.state"

# Create log directory if needed
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Alert function
alert() {
  local severity=$1
  local message=$2
  log "[$severity] $message"
  # Could send to monitoring system, Slack, email, etc.
}

# Initialize state file
if [ ! -f "$STATE_FILE" ]; then
  echo "{}" > "$STATE_FILE"
fi

log "=== HEALTH CHECK START ==="

cd "$PROJECT_DIR"

# ============ PHASE 1: SERVICE AVAILABILITY ============
log "Phase 1: Checking service availability..."

HEALTHY_SERVICES=0
UNHEALTHY_SERVICES=0
SERVICES_ARRAY=("gateway" "kimi" "owner-dashboard" "mobile-gateway" "public-portal" "operator-station" "beacon-pwa" "account-pwa" "postgres" "redis" "prometheus" "grafana" "worker")

for SERVICE in "${SERVICES_ARRAY[@]}"; do
  if docker compose ps "$SERVICE" | grep -q "Up"; then
    HEALTHY_SERVICES=$((HEALTHY_SERVICES + 1))
    log "✓ $SERVICE is UP"
  else
    UNHEALTHY_SERVICES=$((UNHEALTHY_SERVICES + 1))
    log "✗ $SERVICE is DOWN - initiating recovery"
    alert "WARNING" "$SERVICE is down"
    
    # Attempt recovery: restart service
    log "  → Restarting $SERVICE..."
    if docker compose restart "$SERVICE" 2>&1 | tee -a "$LOG_FILE"; then
      log "  ✓ $SERVICE restart initiated"
      sleep 5
      
      # Verify restart
      if docker compose ps "$SERVICE" | grep -q "Up"; then
        log "  ✓ $SERVICE recovery successful"
        UNHEALTHY_SERVICES=$((UNHEALTHY_SERVICES - 1))
        HEALTHY_SERVICES=$((HEALTHY_SERVICES + 1))
      else
        log "  ✗ $SERVICE restart failed - may need manual intervention"
        alert "ERROR" "$SERVICE restart failed"
      fi
    else
      alert "ERROR" "Failed to restart $SERVICE"
    fi
  fi
done

# ============ PHASE 2: RESOURCE MONITORING ============
log "Phase 2: Checking resource usage..."

# Check disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
  alert "CRITICAL" "Disk usage at ${DISK_USAGE}% - exceeding threshold"
  log "  → Attempting cleanup (removing old logs)"
  docker compose exec -T logger sh -c "find /logs -mtime +7 -delete" 2>/dev/null || true
  docker system prune -f >> "$LOG_FILE" 2>&1 || true
else
  log "✓ Disk usage: ${DISK_USAGE}%"
fi

# Check memory via docker stats
if command -v docker &> /dev/null; then
  MEMORY_PERCENT=$(docker stats --no-stream --format "{{.MemPerc}}" --all 2>/dev/null | grep -oP '\d+(?=\.)' | awk '{sum+=$1} END {print sum}' || echo "0")
  if [ "$MEMORY_PERCENT" -gt 80 ]; then
    alert "WARNING" "Memory usage at ${MEMORY_PERCENT}% - high memory pressure"
    log "  → Clearing Redis cache to free memory"
    docker compose exec -T redis redis-cli FLUSHALL 2>/dev/null || true
  else
    log "✓ Memory usage: ${MEMORY_PERCENT}%"
  fi
fi

# ============ PHASE 3: DATABASE CONNECTIVITY ============
log "Phase 3: Checking database connectivity..."

if docker compose exec -T postgres psql -U postgres -c "SELECT 1" > /dev/null 2>&1; then
  log "✓ PostgreSQL is responsive"
else
  alert "CRITICAL" "PostgreSQL not responding"
  log "  → Restarting PostgreSQL..."
  docker compose restart postgres
  sleep 10
  if docker compose exec -T postgres psql -U postgres -c "SELECT 1" > /dev/null 2>&1; then
    log "  ✓ PostgreSQL recovered"
  else
    alert "ERROR" "PostgreSQL recovery failed - manual intervention needed"
  fi
fi

# ============ PHASE 4: CACHE CONNECTIVITY ============
log "Phase 4: Checking cache connectivity..."

if docker compose exec -T redis redis-cli PING | grep -q "PONG"; then
  log "✓ Redis is responsive"
else
  alert "WARNING" "Redis not responding"
  log "  → Restarting Redis..."
  docker compose restart redis
  sleep 5
fi

# ============ PHASE 5: API HEALTH ENDPOINTS ============
log "Phase 5: Checking API health endpoints..."

ENDPOINTS=(
  "owner-dashboard:8500:/health"
  "operator-station:8080:/health"
  "gateway:4000:/health"
  "kimi:5000:/health"
)

for ENDPOINT in "${ENDPOINTS[@]}"; do
  IFS=':' read -r SERVICE PORT ROUTE <<< "$ENDPOINT"
  if docker compose exec -T "$SERVICE" curl -s "http://localhost:$PORT$ROUTE" | grep -q "ok\|status"; then
    log "✓ $SERVICE health endpoint OK"
  else
    log "✗ $SERVICE health endpoint failed"
    alert "WARNING" "$SERVICE health check failed"
  fi
done

# ============ PHASE 6: NETWORK CONNECTIVITY ============
log "Phase 6: Checking network connectivity..."

if ping -c 1 -W 2 8.8.8.8 > /dev/null 2>&1; then
  log "✓ External connectivity OK"
else
  alert "WARNING" "No external network connectivity"
fi

# ============ PHASE 7: CLEANUP & SUMMARY ============
log "Phase 7: Cleanup and maintenance..."

# Remove stopped containers
STOPPED_COUNT=$(docker ps -a -f status=exited -q | wc -l)
if [ "$STOPPED_COUNT" -gt 0 ]; then
  log "Cleaning up $STOPPED_COUNT stopped containers"
  docker container prune -f >> "$LOG_FILE" 2>&1 || true
fi

# Remove dangling images
DANGLING_COUNT=$(docker images -f dangling=true -q | wc -l)
if [ "$DANGLING_COUNT" -gt 0 ]; then
  log "Cleaning up $DANGLING_COUNT dangling images"
  docker image prune -f >> "$LOG_FILE" 2>&1 || true
fi

# ============ FINAL REPORT ============
log "=== HEALTH CHECK SUMMARY ==="
log "Healthy services: $HEALTHY_SERVICES/${#SERVICES_ARRAY[@]}"
log "Recovered services: $(expr $UNHEALTHY_SERVICES \* 0 || echo 0)"
log "Status: $([ $UNHEALTHY_SERVICES -eq 0 ] && echo 'ALL SYSTEMS OPERATIONAL' || echo 'SOME ISSUES DETECTED')"

# Update state file with health status
cat > "$STATE_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "healthy_services": $HEALTHY_SERVICES,
  "unhealthy_services": $UNHEALTHY_SERVICES,
  "disk_usage": "${DISK_USAGE}%",
  "status": "$([ $UNHEALTHY_SERVICES -eq 0 ] && echo 'OK' || echo 'DEGRADED')"
}
EOF

log "Health check complete. Results logged to $LOG_FILE"
log "State saved to $STATE_FILE"

# Exit with error if any issues found
[ $UNHEALTHY_SERVICES -eq 0 ] && exit 0 || exit 1
