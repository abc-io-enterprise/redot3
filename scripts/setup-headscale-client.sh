#!/bin/bash
# ABC-IO Headscale Client Setup
# Run on each node (desktop, VPS, phone via Termux) to join the mesh

set -e

HEADSCALE_SERVER="${HEADSCALE_SERVER_URL:-https://headscale.abc-io.com:8085}"
NODE_NAME="${1:-$(hostname)}"

echo "================================================"
echo "ABC-IO Headscale Mesh Client Setup"
echo "================================================"
echo "Server: $HEADSCALE_SERVER"
echo "Node:   $NODE_NAME"
echo "================================================"

# Install Tailscale if not present
if ! command -v tailscale &> /dev/null; then
    echo "[INSTALL] Tailscale not found. Installing..."
    if command -v apt-get &> /dev/null; then
        apt-get update && apt-get install -y curl
        curl -fsSL https://tailscale.com/install.sh | sh
    elif command -v apk &> /dev/null; then
        apk add --no-cache curl
        curl -fsSL https://tailscale.com/install.sh | sh
    elif command -v pkg &> /dev/null; then
        # Termux on Android
        pkg install -y curl
        curl -fsSL https://tailscale.com/install.sh | sh
    else
        echo "ERROR: Unsupported package manager. Install Tailscale manually."
        exit 1
    fi
fi

# Start tailscaled
if command -v systemctl &> /dev/null; then
    systemctl enable tailscaled || true
    systemctl start tailscaled || true
elif command -v rc-update &> /dev/null; then
    rc-update add tailscaled default || true
    rc-service tailscaled start || true
fi

# Generate auth key (run this on the headscale server first to get a key)
echo ""
echo "[SETUP] To join the mesh, run this on the Headscale server first:"
echo "  docker compose exec headscale headscale users create abc-io"
echo "  docker compose exec headscale headscale preauthkeys create -u abc-io -e 24h"
echo ""
echo "Then use the generated pre-auth key to join:"
echo "  tailscale up --login-server $HEADSCALE_SERVER --authkey <PREAUTH_KEY> --hostname $NODE_NAME"
echo ""
echo "[STATUS] Tailscale installed. Waiting for auth key..."
