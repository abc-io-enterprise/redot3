#!/bin/bash
# ABC-IO 3-Node VPS Cluster Deployment
# Usage: ./deploy-vps-cluster.sh [tag|branch]

set -e

DEPLOY_TAG="${1:-main}"
REPO_URL="https://github.com/ccplexmath/redot2complete.git"

REDOT1_IP="${REDOT1_IP:-162.254.32.142}"
AI1_IP="${AI1_IP:-159.203.110.44}"
AI2_IP="${AI2_IP:-159.203.44.3}"

echo "================================================"
echo "ABC-IO v2.0 — 3-Node VPS Cluster Deployment"
echo "================================================"
echo "Target Tag/Branch: $DEPLOY_TAG"
echo "redot1 (Gateway):  $REDOT1_IP"
echo "ai1   (Primary AI): $AI1_IP"
echo "ai2   (Standby AI): $AI2_IP"
echo "================================================"

# Node 1: redot1 — Full stack (all services)
deploy_redot1() {
    echo "[NODE 1] Deploying redot1 (Full Stack)..."
    ssh -o StrictHostKeyChecking=no root@$REDOT1_IP << EOF
        set -e
        apt-get update && apt-get install -y docker.io docker-compose git curl
        systemctl enable docker && systemctl start docker
        mkdir -p /opt/abc-io && cd /opt/abc-io
        if [ -d .git ]; then git fetch origin && git checkout $DEPLOY_TAG && git pull origin $DEPLOY_TAG; else git clone $REPO_URL . && git checkout $DEPLOY_TAG; fi
        cp .env.example .env
        docker compose -f compose.prod.yml pull
        docker compose -f compose.prod.yml up -d
        sleep 30
        docker compose -f compose.prod.yml ps
EOF
    echo "[NODE 1] redot1 deployment complete."
}

# Node 2: ai1 — AI worker only (kimi + worker + redis + headscale)
deploy_ai1() {
    echo "[NODE 2] Deploying ai1 (AI Worker)..."
    ssh -o StrictHostKeyChecking=no root@$AI1_IP << EOF
        set -e
        apt-get update && apt-get install -y docker.io docker-compose git curl
        systemctl enable docker && systemctl start docker
        mkdir -p /opt/abc-io && cd /opt/abc-io
        if [ -d .git ]; then git fetch origin && git checkout $DEPLOY_TAG && git pull origin $DEPLOY_TAG; else git clone $REPO_URL . && git checkout $DEPLOY_TAG; fi
        cp .env.example .env
        # Override to run only AI services
        docker compose -f compose.prod.yml up -d kimi worker redis headscale
        sleep 15
        docker compose -f compose.prod.yml ps
EOF
    echo "[NODE 2] ai1 deployment complete."
}

# Node 3: ai2 — AI worker standby (kimi + worker + redis + headscale)
deploy_ai2() {
    echo "[NODE 3] Deploying ai2 (AI Worker Standby)..."
    ssh -o StrictHostKeyChecking=no root@$AI2_IP << EOF
        set -e
        apt-get update && apt-get install -y docker.io docker-compose git curl
        systemctl enable docker && systemctl start docker
        mkdir -p /opt/abc-io && cd /opt/abc-io
        if [ -d .git ]; then git fetch origin && git checkout $DEPLOY_TAG && git pull origin $DEPLOY_TAG; else git clone $REPO_URL . && git checkout $DEPLOY_TAG; fi
        cp .env.example .env
        docker compose -f compose.prod.yml up -d kimi worker redis headscale
        sleep 15
        docker compose -f compose.prod.yml ps
EOF
    echo "[NODE 3] ai2 deployment complete."
}

# Headscale mesh join on all nodes
setup_headscale_mesh() {
    echo "[MESH] Configuring Headscale WireGuard mesh..."
    for NODE in "$REDOT1_IP" "$AI1_IP" "$AI2_IP"; do
        ssh -o StrictHostKeyChecking=no root@$NODE << EOF
            apt-get install -y curl
            curl -fsSL https://tailscale.com/install.sh | sh
            tailscale up --login-server https://headscale.abc-io.com:8085 --authkey $(docker compose -f compose.prod.yml exec headscale headscale preauthkeys create -u abc-io 2>/dev/null || echo "preauth-key-placeholder")
EOF
    done
    echo "[MESH] Headscale mesh configured."
}

# Main execution
echo "Starting cluster deployment..."
deploy_redot1 &
PID1=$!
deploy_ai1 &
PID2=$!
deploy_ai2 &
PID3=$!

wait $PID1 || echo "ERROR: redot1 deployment failed"
wait $PID2 || echo "ERROR: ai1 deployment failed"
wait $PID3 || echo "ERROR: ai2 deployment failed"

setup_headscale_mesh

echo "================================================"
echo "Cluster deployment finished."
echo "Verify health:"
echo "  redot1: http://$REDOT1_IP:4000/health"
echo "  ai1:    http://$AI1_IP:5000/health"
echo "  ai2:    http://$AI2_IP:5000/health"
echo "================================================"
