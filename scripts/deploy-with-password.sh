#!/bin/bash
# ABC-IO VPS Deployment with Password Authentication
# Usage: ./deploy-with-password.sh
# Requires: sshpass (install with apt-get install sshpass)

set -e

DEPLOY_TAG="${1:-$(git rev-parse --short HEAD)}"
BUNDLE="abc-io-deploy-${DEPLOY_TAG}.tar.gz"
REPO_URL="https://github.com/ccplexmath/redot2complete.git"

REDOT1_IP="${REDOT1_IP:-162.254.32.142}"
AI1_IP="${AI1_IP:-192.227.212.235}"
AI2_IP="${AI2_IP:-192.227.212.237}"

# Load passwords from environment or prompt
REDOT1_PASS="${REDOT1_ROOT_PASSWORD:-}"
AI1_PASS="${AI1_ROOT_PASSWORD:-}"
AI2_PASS="${AI2_ROOT_PASSWORD:-}"

echo "================================================"
echo "ABC-IO v2.0 — Password-Based VPS Deployment"
echo "================================================"

if ! command -v sshpass >/dev/null 2>&1; then
    echo "ERROR: sshpass is not installed."
    echo "Install it: apt-get install sshpass  (Debian/Ubuntu)"
    echo "           brew install sshpass        (macOS)"
    exit 1
fi

# Check if bundle exists
if [ ! -f "$BUNDLE" ]; then
    echo "Deploy bundle not found. Creating..."
    bash scripts/prepare-deploy-bundle.sh "$DEPLOY_TAG"
fi

deploy_node() {
    local name="$1"
    local ip="$2"
    local pass="$3"
    local services="$4"

    echo ""
    echo "[$name] Deploying to $ip..."

    if [ -z "$pass" ]; then
        echo "  ERROR: No password for $name. Set ${name}_ROOT_PASSWORD env var."
        return 1
    fi

    # Pre-deploy: check disk space on target
    echo "  Checking disk space..."
    disk_usage=$(sshpass -p "$pass" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "root@$ip" "df / | tail -1 | awk '{print \$5}' | sed 's/%//'" 2>/dev/null || echo "99")
    if [ "$disk_usage" -gt 85 ]; then
        echo "  WARNING: Disk usage is ${disk_usage}%. Pruning Docker..."
        sshpass -p "$pass" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "root@$ip" "docker system prune -af --volumes" 2>/dev/null || true
    fi

    # Copy bundle
    echo "  Uploading bundle..."
    sshpass -p "$pass" scp -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$BUNDLE" "root@$ip:/opt/" || {
        echo "  ERROR: Failed to upload to $ip"
        return 1
    }

    # Extract and start
    echo "  Extracting and starting..."
    sshpass -p "$pass" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "root@$ip" << EOF
        set -e
        cd /opt
        rm -rf abc-io
        tar -xzf $BUNDLE
        cd abc-io
        echo "  Pruning old Docker images to stay under 10GB..."
        docker system prune -af --volumes >/dev/null 2>&1 || true
        if [ -n "$services" ]; then
            docker compose -f compose.prod.yml up -d $services
        else
            bash startup.sh
        fi
        sleep 10
        docker compose -f compose.prod.yml ps
        echo ""
        echo "  Disk usage after deploy:"
        df -h / | tail -1
EOF

    echo "  [$name] Deployment complete."
}

# Node 1: redot1 — Full stack
deploy_node "redot1" "$REDOT1_IP" "$REDOT1_PASS" ""

# Node 2: ai1 — AI worker only
deploy_node "ai1" "$AI1_IP" "$AI1_PASS" "kimi worker redis headscale"

# Node 3: ai2 — AI standby only
deploy_node "ai2" "$AI2_IP" "$AI2_PASS" "kimi worker redis headscale"

echo ""
echo "================================================"
echo "All nodes deployed."
echo ""
echo "Verify:"
echo "  redot1: curl http://$REDOT1_IP:4000/health"
echo "  ai1:    curl http://$AI1_IP:5000/health"
echo "  ai2:    curl http://$AI2_IP:5000/health"
echo "================================================"
