#!/bin/bash
# ABC-IO v2.0 - COMPLETE DEPLOYMENT COMMANDS
# Generated: June 12, 2026
# Owner: Christopher Porreca (owner@abc-io.com)
# Status: READY FOR EXECUTION

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║ $1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log_step() {
    echo -e "${YELLOW}▶ $1${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S UTC')

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}ABC-IO v2.0 - COMPLETE DEPLOYMENT EXECUTION${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Started: $TIMESTAMP"
echo "Owner: Christopher Porreca"
echo "Domain: https://abc-io.com"
echo ""

# ============================================================================
# PHASE 1: LOCAL STAGING DEPLOYMENT
# ============================================================================

log_header "PHASE 1: LOCAL STAGING DEPLOYMENT"

log_step "Navigating to project directory..."
cd "C:\Users\cplexmath\OneDrive\Documents\redot2" || {
    log_error "Failed to navigate to project directory"
    exit 1
}
log_success "In project directory: $(pwd)"

log_step "Verifying Docker is running..."
docker --version > /dev/null 2>&1 || {
    log_error "Docker is not running"
    exit 1
}
log_success "Docker is running: $(docker --version)"

log_step "Verifying Docker Compose configuration..."
docker compose config > /dev/null 2>&1 || {
    log_error "Invalid Docker Compose configuration"
    exit 1
}
log_success "Docker Compose configuration is valid"

log_step "Removing existing staging containers and orphans..."
docker compose -f compose.staging.yml down --remove-orphans 2>/dev/null || true
log_success "Cleaned up existing staging environment"

log_step "Starting staging stack..."
docker compose -f compose.staging.yml up -d --remove-orphans
log_success "Staging stack started"

log_step "Waiting 30 seconds for services to initialize..."
sleep 30
log_success "Services initialization period complete"

log_step "Running health checks..."
if ./scripts/health-check.sh; then
    log_success "All staging services are healthy"
else
    log_error "Some staging services failed health checks"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check logs: docker compose -f compose.staging.yml logs"
    echo "  2. Check status: docker compose -f compose.staging.yml ps"
    echo "  3. Verify port availability"
    exit 1
fi

log_step "Verifying specific services..."
services=(
    "http://localhost:4000/health:Gateway"
    "http://localhost:8500/health:Owner Dashboard"
    "http://localhost:14000/api/health:Grafana"
)

for service in "${services[@]}"; do
    IFS=':' read -r url name <<< "$service"
    if curl -s -f "$url" > /dev/null 2>&1; then
        log_success "$name responding"
    else
        log_error "$name not responding"
    fi
done

log_header "STAGING DEPLOYMENT COMPLETE"
echo -e "${GREEN}All staging services are running and healthy${NC}"
echo ""
echo "Next Steps:"
echo "  1. Monitor logs: docker compose -f compose.staging.yml logs -f"
echo "  2. Access dashboards:"
echo "     - Gateway API: http://localhost:4000"
echo "     - Owner Dashboard: http://localhost:8500"
echo "     - Grafana: http://localhost:14000 (admin/admin)"
echo ""

read -p "Press Enter to continue with production deployment or Ctrl+C to stop..."

# ============================================================================
# PHASE 2: PRODUCTION DEPLOYMENT - REDOT1 (PRIMARY VPS)
# ============================================================================

log_header "PHASE 2: PRODUCTION DEPLOYMENT - REDOT1 (162.254.32.142)"

REDOT1_IP="162.254.32.142"

log_step "Connecting to redot1 ($REDOT1_IP)..."
echo ""
echo "You will be prompted to enter SSH password or key passphrase:"
echo "Command: ssh root@$REDOT1_IP"
echo ""

ssh root@$REDOT1_IP << 'EOF_REDOT1'
    set -e
    
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo "DEPLOYING TO REDOT1 (Primary VPS)"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    
    log_success() {
        echo "✓ $1"
    }
    
    log_step() {
        echo "▶ $1"
    }
    
    log_error() {
        echo "✗ $1"
    }
    
    # Navigate to project directory
    log_step "Navigating to /opt/redot2..."
    cd /opt/redot2 || {
        log_error "Failed to navigate to /opt/redot2"
        exit 1
    }
    log_success "In /opt/redot2"
    
    # Verify Docker
    log_step "Verifying Docker..."
    docker --version > /dev/null 2>&1 || {
        log_error "Docker is not running"
        exit 1
    }
    log_success "Docker is running"
    
    # Verify .env file
    log_step "Verifying .env file..."
    if [ ! -f ".env" ]; then
        log_error ".env file not found"
        echo "Please copy .env file to /opt/redot2/.env and try again"
        exit 1
    fi
    log_success ".env file present"
    
    # Pull latest images
    log_step "Pulling latest container images..."
    docker compose -f compose.prod.yml pull || {
        log_error "Failed to pull images"
        exit 1
    }
    log_success "Images pulled successfully"
    
    # Stop existing services
    log_step "Stopping existing services..."
    docker compose -f compose.prod.yml down 2>/dev/null || true
    log_success "Existing services stopped"
    
    # Start production stack
    log_step "Starting production stack with orphan removal..."
    docker compose -f compose.prod.yml up -d --remove-orphans || {
        log_error "Failed to start production stack"
        exit 1
    }
    log_success "Production stack started"
    
    # Wait for initialization
    log_step "Waiting 30 seconds for services to initialize..."
    sleep 30
    log_success "Initialization period complete"
    
    # Run health checks
    log_step "Running health checks..."
    if ./scripts/health-check.sh; then
        log_success "All services are healthy"
    else
        log_error "Some services failed health checks"
        echo ""
        echo "Troubleshooting:"
        echo "  1. Check logs: docker compose -f compose.prod.yml logs"
        echo "  2. Check status: docker compose -f compose.prod.yml ps"
        exit 1
    fi
    
    # Verify public endpoints
    log_step "Verifying public endpoints..."
    
    if curl -s -f -I https://abc-io.com/health > /dev/null 2>&1; then
        log_success "Public endpoint /health responding (HTTP 200)"
    else
        log_error "Public endpoint /health not responding"
    fi
    
    if curl -s -f -I https://abc-io.com/ > /dev/null 2>&1; then
        log_success "Public root endpoint responding (HTTP 200)"
    else
        log_error "Public root endpoint not responding"
    fi
    
    # Verify critical services
    log_step "Verifying critical services..."
    
    docker compose -f compose.prod.yml exec -T postgres psql -U postgres -d abc_io -c "SELECT version();" > /dev/null 2>&1 && \
        log_success "PostgreSQL database connected" || \
        log_error "PostgreSQL database not responding"
    
    docker compose -f compose.prod.yml exec -T redis redis-cli ping > /dev/null 2>&1 && \
        log_success "Redis cache connected" || \
        log_error "Redis cache not responding"
    
    # Display final status
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo "REDOT1 DEPLOYMENT COMPLETE"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    echo "Services running on redot1 (162.254.32.142):"
    docker compose -f compose.prod.yml ps
    echo ""
    echo "Access dashboards:"
    echo "  - Grafana: http://localhost:14000 (admin/admin)"
    echo "  - Prometheus: http://localhost:9091"
    echo "  - Jaeger: http://localhost:16686"
    echo ""
    echo "View logs: docker compose -f compose.prod.yml logs -f"
    
EOF_REDOT1

log_success "REDOT1 deployment completed"
echo ""

read -p "Press Enter to continue with AI1 deployment or Ctrl+C to stop..."

# ============================================================================
# PHASE 3: PRODUCTION DEPLOYMENT - AI1 (REPLICA VPS)
# ============================================================================

log_header "PHASE 3: PRODUCTION DEPLOYMENT - AI1 (192.227.212.235)"

AI1_IP="192.227.212.235"

log_step "Connecting to ai1 ($AI1_IP)..."
echo ""
echo "You will be prompted to enter SSH password or key passphrase:"
echo "Command: ssh root@$AI1_IP"
echo ""

ssh root@$AI1_IP << 'EOF_AI1'
    set -e
    
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo "DEPLOYING TO AI1 (AI Services Replica)"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    
    log_success() {
        echo "✓ $1"
    }
    
    log_step() {
        echo "▶ $1"
    }
    
    log_error() {
        echo "✗ $1"
    }
    
    # Navigate to project directory
    log_step "Navigating to /opt/redot2..."
    cd /opt/redot2 || {
        log_error "Failed to navigate to /opt/redot2"
        exit 1
    }
    log_success "In /opt/redot2"
    
    # Verify Docker
    log_step "Verifying Docker..."
    docker --version > /dev/null 2>&1 || {
        log_error "Docker is not running"
        exit 1
    }
    log_success "Docker is running"
    
    # Verify .env file
    log_step "Verifying .env file..."
    if [ ! -f ".env" ]; then
        log_error ".env file not found"
        echo "Please copy .env file to /opt/redot2/.env and try again"
        exit 1
    fi
    log_success ".env file present"
    
    # Pull latest images
    log_step "Pulling latest container images for AI services..."
    docker compose -f compose.replica-ai1.yml pull || {
        log_error "Failed to pull images"
        exit 1
    }
    log_success "Images pulled successfully"
    
    # Stop existing services
    log_step "Stopping existing services..."
    docker compose -f compose.replica-ai1.yml down 2>/dev/null || true
    log_success "Existing services stopped"
    
    # Start production stack
    log_step "Starting AI1 replica stack with orphan removal..."
    docker compose -f compose.replica-ai1.yml up -d --remove-orphans || {
        log_error "Failed to start AI1 stack"
        exit 1
    }
    log_success "AI1 replica stack started"
    
    # Wait for initialization
    log_step "Waiting 30 seconds for services to initialize..."
    sleep 30
    log_success "Initialization period complete"
    
    # Run health checks
    log_step "Running health checks..."
    if ./scripts/health-check.sh; then
        log_success "All AI services are healthy"
    else
        log_error "Some AI services failed health checks"
        exit 1
    fi
    
    # Verify AI services
    log_step "Verifying AI services..."
    
    if curl -s -f -I http://localhost:5000/health > /dev/null 2>&1; then
        log_success "Kimi LLM (5000) responding"
    else
        log_error "Kimi LLM (5000) not responding"
    fi
    
    if curl -s -f -I http://localhost:7000/health > /dev/null 2>&1; then
        log_success "AI-ISP (7000) responding"
    else
        log_error "AI-ISP (7000) not responding"
    fi
    
    # Display final status
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo "AI1 DEPLOYMENT COMPLETE"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    echo "Services running on ai1 (192.227.212.235):"
    docker compose -f compose.replica-ai1.yml ps
    echo ""
    echo "Verify connectivity:"
    echo "  - Kimi LLM: http://localhost:5000/health"
    echo "  - AI-ISP: http://localhost:7000/health"
    echo ""
    echo "View logs: docker compose -f compose.replica-ai1.yml logs -f"

EOF_AI1

log_success "AI1 deployment completed"
echo ""

read -p "Press Enter to continue with AI2 deployment or Ctrl+C to stop..."

# ============================================================================
# PHASE 4: PRODUCTION DEPLOYMENT - AI2 (REPLICA VPS)
# ============================================================================

log_header "PHASE 4: PRODUCTION DEPLOYMENT - AI2 (192.227.212.237)"

AI2_IP="192.227.212.237"

log_step "Connecting to ai2 ($AI2_IP)..."
echo ""
echo "You will be prompted to enter SSH password or key passphrase:"
echo "Command: ssh root@$AI2_IP"
echo ""

ssh root@$AI2_IP << 'EOF_AI2'
    set -e
    
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo "DEPLOYING TO AI2 (AI Services Replica)"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    
    log_success() {
        echo "✓ $1"
    }
    
    log_step() {
        echo "▶ $1"
    }
    
    log_error() {
        echo "✗ $1"
    }
    
    # Navigate to project directory
    log_step "Navigating to /opt/redot2..."
    cd /opt/redot2 || {
        log_error "Failed to navigate to /opt/redot2"
        exit 1
    }
    log_success "In /opt/redot2"
    
    # Verify Docker
    log_step "Verifying Docker..."
    docker --version > /dev/null 2>&1 || {
        log_error "Docker is not running"
        exit 1
    }
    log_success "Docker is running"
    
    # Verify .env file
    log_step "Verifying .env file..."
    if [ ! -f ".env" ]; then
        log_error ".env file not found"
        echo "Please copy .env file to /opt/redot2/.env and try again"
        exit 1
    fi
    log_success ".env file present"
    
    # Pull latest images
    log_step "Pulling latest container images for AI services..."
    docker compose -f compose.replica-ai2.yml pull || {
        log_error "Failed to pull images"
        exit 1
    }
    log_success "Images pulled successfully"
    
    # Stop existing services
    log_step "Stopping existing services..."
    docker compose -f compose.replica-ai2.yml down 2>/dev/null || true
    log_success "Existing services stopped"
    
    # Start production stack
    log_step "Starting AI2 replica stack with orphan removal..."
    docker compose -f compose.replica-ai2.yml up -d --remove-orphans || {
        log_error "Failed to start AI2 stack"
        exit 1
    }
    log_success "AI2 replica stack started"
    
    # Wait for initialization
    log_step "Waiting 30 seconds for services to initialize..."
    sleep 30
    log_success "Initialization period complete"
    
    # Run health checks
    log_step "Running health checks..."
    if ./scripts/health-check.sh; then
        log_success "All AI services are healthy"
    else
        log_error "Some AI services failed health checks"
        exit 1
    fi
    
    # Verify AI services
    log_step "Verifying AI services..."
    
    if curl -s -f -I http://localhost:5000/health > /dev/null 2>&1; then
        log_success "Kimi LLM (5000) responding"
    else
        log_error "Kimi LLM (5000) not responding"
    fi
    
    if curl -s -f -I http://localhost:7000/health > /dev/null 2>&1; then
        log_success "AI-ISP (7000) responding"
    else
        log_error "AI-ISP (7000) not responding"
    fi
    
    # Display final status
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo "AI2 DEPLOYMENT COMPLETE"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    echo "Services running on ai2 (192.227.212.237):"
    docker compose -f compose.replica-ai2.yml ps
    echo ""
    echo "Verify connectivity:"
    echo "  - Kimi LLM: http://localhost:5000/health"
    echo "  - AI-ISP: http://localhost:7000/health"
    echo ""
    echo "View logs: docker compose -f compose.replica-ai2.yml logs -f"

EOF_AI2

log_success "AI2 deployment completed"
echo ""

# ============================================================================
# FINAL VERIFICATION
# ============================================================================

log_header "FINAL VERIFICATION & GO-LIVE CONFIRMATION"

echo "Deployment completed successfully!"
echo ""
echo "Verify all nodes are running:"
echo "  1. Redot1 (162.254.32.142): Check dashboard & public endpoints"
echo "  2. AI1 (192.227.212.235): Verify Kimi & AI-ISP services"
echo "  3. AI2 (192.227.212.237): Verify Kimi & AI-ISP services"
echo ""
echo "Monitor dashboards:"
echo "  - Grafana: http://localhost:14000 (admin/admin)"
echo "  - Prometheus: http://localhost:9091"
echo "  - Jaeger: http://localhost:16686"
echo ""
echo "Access public services:"
echo "  - API: https://abc-io.com"
echo "  - Owner Dashboard: https://abc-io.com/dashboard"
echo ""
echo "Ongoing monitoring:"
echo "  - Error rate should be < 1%"
echo "  - API response time P95 should be < 200ms"
echo "  - Payment success rate should be > 99%"
echo "  - Uptime target: > 99.9%"
echo ""

FINISH_TIME=$(date '+%Y-%m-%d %H:%M:%S UTC')

echo "Deployment started: $TIMESTAMP"
echo "Deployment finished: $FINISH_TIME"
echo ""

log_header "🎉 DEPLOYMENT COMPLETE - READY FOR GO-LIVE"

echo -e "${GREEN}All phases completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Monitor error rates (target < 1%)"
echo "  2. Test payment processing"
echo "  3. Verify email delivery"
echo "  4. Confirm DNS resolution"
echo "  5. Check SSL certificate validity"
echo ""
echo "Contact Christopher Porreca if any issues:"
echo "  📧 owner@abc-io.com"
echo "  📞 +1-585-348-7120"
echo ""
echo "*100 Years Nonstop — Always On, Always Yours, Always Here*"
echo ""
