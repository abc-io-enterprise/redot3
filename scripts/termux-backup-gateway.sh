#!/bin/bash
# ABC-IO Termux Backup Gateway for Android
# Install on Android via Termux to create a cellular backup gateway

set -e

PRIMARY_IP="${PRIMARY_IP:-162.254.32.142}"
AI1_IP="${AI1_IP:-192.227.212.235}"
AI2_IP="${AI2_IP:-192.227.212.237}"
GATEWAY_PORT="${GATEWAY_PORT:-5050}"

echo "================================================"
echo "ABC-IO Termux Backup Gateway Setup"
echo "================================================"
echo "Primary: $PRIMARY_IP"
echo "AI1:     $AI1_IP"
echo "AI2:     $AI2_IP"
echo "================================================"

# Install dependencies
pkg update -y
pkg install -y nodejs git curl termux-api

# Create gateway directory
mkdir -p ~/abc-io-backup-gateway
cd ~/abc-io-backup-gateway

# Create mini Express server for backup gateway
cat > server.js << 'EOF'
const http = require('http');
const port = process.env.PORT || 5050;

let primaryDown = false;
let backupActive = false;

function checkPrimary() {
  return new Promise(resolve => {
    const req = http.get(`http://${process.env.PRIMARY_IP || '162.254.32.142'}:4000/health`, res => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
    req.setTimeout(5000, () => { req.abort(); resolve(false); });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      service: 'termux-backup-gateway',
      backup_active: backupActive,
      primary_down: primaryDown,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (req.url === '/api/beacon' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const beacon = JSON.parse(body || '{}');
      console.log('[BEACON]', beacon);
      res.writeHead(200);
      res.end(JSON.stringify({ received: true, backup: true, timestamp: new Date().toISOString() }));
    });
    return;
  }

  if (req.url === '/status') {
    res.writeHead(200);
    res.end(JSON.stringify({
      primary: process.env.PRIMARY_IP,
      ai1: process.env.AI1_IP,
      ai2: process.env.AI2_IP,
      backup_active: backupActive,
      uptime: process.uptime()
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found' }));
});

// Health monitor loop
setInterval(async () => {
  const up = await checkPrimary();
  if (!up && !backupActive) {
    console.log('[ALERT] Primary gateway DOWN. Activating cellular backup.');
    primaryDown = true;
    backupActive = true;
  } else if (up && backupActive) {
    console.log('[RECOVERY] Primary gateway UP. Standing down backup.');
    primaryDown = false;
    backupActive = false;
  }
}, 10000);

server.listen(port, '0.0.0.0', () => {
  console.log(`Termux Backup Gateway on port ${port}`);
  console.log('Monitoring primary every 10s...');
});
EOF

# Create start script
cat > start.sh << EOF
#!/bin/bash
export PRIMARY_IP=$PRIMARY_IP
export AI1_IP=$AI1_IP
export AI2_IP=$AI2_IP
export PORT=$GATEWAY_PORT
cd ~/abc-io-backup-gateway
node server.js &
echo "Backup Gateway started on port $GATEWAY_PORT"
EOF
chmod +x start.sh

# Create stop script
cat > stop.sh << 'EOF'
#!/bin/bash
pkill -f "node server.js" || true
echo "Backup Gateway stopped"
EOF
chmod +x stop.sh

echo ""
echo "================================================"
echo "Installation complete!"
echo ""
echo "To start backup gateway:"
echo "  ~/abc-io-backup-gateway/start.sh"
echo ""
echo "To stop backup gateway:"
echo "  ~/abc-io-backup-gateway/stop.sh"
echo ""
echo "The gateway will:"
echo "  - Monitor primary gateway every 10s"
echo "  - Auto-activate cellular backup on failure"
echo "  - Accept beacon relays from other devices"
echo ""
echo "Access: http://$(ifconfig 2>/dev/null | grep 'inet ' | head -1 | awk '{print $2}' || echo 'localhost'):5050/health"
echo "================================================"
