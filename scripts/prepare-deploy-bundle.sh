#!/bin/bash
# ABC-IO Production Deployment Bundle Preparation
# Creates a tar.gz package ready for SCP to VPS nodes

set -e

DEPLOY_TAG="${1:-$(git rev-parse --short HEAD)}"
BUNDLE_NAME="abc-io-deploy-${DEPLOY_TAG}.tar.gz"
BUNDLE_DIR="/tmp/abc-io-deploy-$$"

echo "================================================"
echo "ABC-IO Production Deployment Bundle"
echo "Tag: $DEPLOY_TAG"
echo "================================================"

mkdir -p "$BUNDLE_DIR/abc-io"

# Copy essential files
echo "[1/5] Copying source code..."
git archive HEAD | tar -x -C "$BUNDLE_DIR/abc-io"

# Copy APK (not in git)
echo "[2/5] Copying APK artifact..."
mkdir -p "$BUNDLE_DIR/abc-io/apk"
cp apk/redot2-operator.apk "$BUNDLE_DIR/abc-io/apk/" 2>/dev/null || echo "WARNING: APK not found"
cp apk/redot2-latest.apk "$BUNDLE_DIR/abc-io/apk/" 2>/dev/null || true

# Copy .env securely (warn user)
echo "[3/5] Preparing environment..."
echo ""
echo "⚠️  IMPORTANT: You must manually copy .env to the VPS."
echo "   Do NOT commit .env to git."
echo ""

# Create a .env.deploy template
cat > "$BUNDLE_DIR/abc-io/.env.deploy.template" << 'ENVEOF'
# Copy your local .env file to the VPS as /opt/abc-io/.env
# Then run: docker compose -f compose.prod.yml up -d
ENVEOF

# Create startup script
echo "[4/5] Creating startup script..."
cat > "$BUNDLE_DIR/abc-io/startup.sh" << 'STARTEOF'
#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "================================================"
echo "ABC-IO v2.0 Production Startup"
echo "================================================"

if [ ! -f .env ]; then
    echo "ERROR: .env file not found."
    echo "Copy your .env file to this directory and retry."
    exit 1
fi

echo "[1/3] Pulling images..."
docker compose -f compose.prod.yml pull

echo "[2/3] Starting services..."
docker compose -f compose.prod.yml up -d

echo "[3/3] Waiting for services..."
sleep 15

echo ""
echo "=== Service Status ==="
docker compose -f compose.prod.yml ps

echo ""
echo "=== Health Checks ==="
for port in 4000 8080 8500 5050 8090 5000 3005 7000 3006 8088 9091 14000 16686 8085; do
    if curl -sf "http://localhost:$port/health" >/dev/null 2>&1 || curl -sf "http://localhost:$port/" >/dev/null 2>&1; then
        echo "  Port $port: OK"
    else
        echo "  Port $port: CHECK"
    fi
done

echo ""
echo "================================================"
echo "ABC-IO is LIVE"
echo "================================================"
STARTEOF
chmod +x "$BUNDLE_DIR/abc-io/startup.sh"

# Create deploy instructions
cat > "$BUNDLE_DIR/abc-io/DEPLOY-README.txt" << 'READMEEOF'
================================================
ABC-IO v2.0 Production Deployment
================================================

1. SCP this bundle to your VPS:
   scp abc-io-deploy-*.tar.gz root@YOUR_VPS_IP:/opt/

2. Extract on the VPS:
   cd /opt && tar -xzf abc-io-deploy-*.tar.gz

3. Copy your .env file:
   scp .env root@YOUR_VPS_IP:/opt/abc-io/

4. Start the system:
   cd /opt/abc-io && bash startup.sh

5. Verify:
   curl http://YOUR_VPS_IP:8500/health
   curl http://YOUR_VPS_IP:4000/health

Node Roles:
- redot1 (162.254.32.142): Full stack
- ai1 (159.203.110.44): AI worker only
- ai2 (159.203.44.3): AI standby only

For AI nodes, after step 2, edit compose.prod.yml to only start:
  docker compose -f compose.prod.yml up -d kimi worker redis headscale

================================================
READMEEOF

# Package
echo "[5/5] Creating bundle..."
cd "$BUNDLE_DIR"
tar -czf "/c/Users/cplexmath/OneDrive/Documents/redot2/$BUNDLE_NAME" abc-io/

echo ""
echo "================================================"
echo "DEPLOY BUNDLE READY"
echo "File: $BUNDLE_NAME"
echo "Size: $(du -h /c/Users/cplexmath/OneDrive/Documents/redot2/$BUNDLE_NAME | cut -f1)"
echo ""
echo "Deploy to VPS:"
echo "  scp $BUNDLE_NAME root@162.254.32.142:/opt/"
echo "  ssh root@162.254.32.142 'cd /opt && tar -xzf $BUNDLE_NAME && cd abc-io && bash startup.sh'"
echo "================================================"

# Cleanup
rm -rf "$BUNDLE_DIR"
