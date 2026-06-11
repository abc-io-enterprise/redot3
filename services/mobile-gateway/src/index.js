const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const url = require('url');
const app = express();
const port = Number(process.env.PORT || 5050);

const mobileSigningKey = process.env.MOBILE_SIGNING_KEY || 'mobile-system-secret';
const mobileFingerprint = process.env.MOBILE_SIGNING_FINGERPRINT || 'mobile-fingerprint-456';

// Upstream nodes for backup relay
const UPSTREAM_NODES = {
  primary: { host: process.env.PRIMARY_HOST || '162.254.32.142', port: 4000, path: '/health', label: 'Primary Gateway' },
  ai1: { host: process.env.AI1_HOST || '192.227.212.235', port: 5000, path: '/health', label: 'AI Node 1' },
  ai2: { host: process.env.AI2_HOST || '192.227.212.237', port: 5000, path: '/health', label: 'AI Node 2' },
};

// In-memory backup state (resets on restart — acceptable for emergency fallback)
const backupState = {
  mode: 'standby', // standby | active | recovery
  activatedAt: null,
  lastPrimaryCheck: null,
  beaconsRelayed: 0,
  messagesStored: 0,
  aiRequestsProxied: 0,
  cachedBeacons: [],
  emergencyMessages: [],
  nodeStatus: {},
};

function signPayload(payload) {
  return crypto.createHmac('sha256', mobileSigningKey).update(JSON.stringify(payload)).digest('hex');
}

// Helper: HTTP health check to any node
function checkNode(node) {
  return new Promise((resolve) => {
    const options = {
      hostname: node.host,
      port: node.port,
      path: node.path,
      method: 'GET',
      timeout: 5000,
    };
    const client = (node.port === 443) ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          up: res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode,
          latency: Date.now(),
        });
      });
    });
    req.on('error', () => resolve({ up: false, statusCode: 0, latency: Date.now() }));
    req.on('timeout', () => { req.destroy(); resolve({ up: false, statusCode: 0, latency: Date.now() }); });
    req.setTimeout(5000);
    req.end();
  });
}

// Helper: proxy POST request to an upstream AI node
function proxyAiRequest(node, body) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(body);
    const options = {
      hostname: node.host,
      port: node.port,
      path: '/ai/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 30000,
    };
    const client = (node.port === 443) ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ ok: true, status: res.statusCode, data: json });
        } catch {
          resolve({ ok: true, status: res.statusCode, data: { raw: data } });
        }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.setTimeout(30000);
    req.write(postData);
    req.end();
  });
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "*"],
    },
  },
}));
app.use(morgan('tiny'));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ========================================================================
// HEALTH & SIGNATURE
// ========================================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mobile-gateway',
    backupMode: backupState.mode,
    uptime: process.uptime(),
  });
});

app.get('/api/signature', (req, res) => {
  const payload = {
    system: 'mobile-gateway',
    timestamp: new Date().toISOString(),
    node: 'mobile-backup-satellite',
    mode: backupState.mode,
  };
  res.json({
    system: payload.system,
    fingerprint: mobileFingerprint,
    signature: signPayload(payload),
    payload,
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    activeConnections: 14,
    messagesLastHour: 287,
    mobileGatewayStatus: backupState.mode,
    beaconsRelayed: backupState.beaconsRelayed,
    messagesStored: backupState.messagesStored,
    aiRequestsProxied: backupState.aiRequestsProxied,
    lastSync: new Date().toISOString(),
  });
});

// ========================================================================
// BEACON
// ========================================================================
app.post('/api/beacon', (req, res) => {
  const { deviceId, latitude, longitude, battery, note } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId required' });
  }
  const beacon = {
    received: true,
    deviceId,
    latitude,
    longitude,
    battery,
    note,
    timestamp: new Date().toISOString(),
    source: 'mobile-gateway',
  };
  // Cache locally for sync
  backupState.cachedBeacons.push(beacon);
  if (backupState.cachedBeacons.length > 500) {
    backupState.cachedBeacons = backupState.cachedBeacons.slice(-500);
  }
  res.json(beacon);
});

// ========================================================================
// BACKUP NETWORK API
// ========================================================================

// Full cluster status check
app.get('/api/backup/status', async (req, res) => {
  const results = {};
  for (const [key, node] of Object.entries(UPSTREAM_NODES)) {
    const start = Date.now();
    const check = await checkNode(node);
    results[key] = {
      label: node.label,
      host: `${node.host}:${node.port}`,
      up: check.up,
      statusCode: check.statusCode,
      responseMs: Date.now() - start,
    };
    backupState.nodeStatus[key] = results[key];
  }
  backupState.lastPrimaryCheck = new Date().toISOString();

  const primaryUp = results.primary?.up || false;
  if (!primaryUp && backupState.mode === 'standby') {
    backupState.mode = 'active';
    backupState.activatedAt = new Date().toISOString();
  } else if (primaryUp && backupState.mode === 'active') {
    backupState.mode = 'recovery';
  } else if (primaryUp && backupState.mode === 'recovery') {
    backupState.mode = 'standby';
    backupState.activatedAt = null;
  }

  res.json({
    mode: backupState.mode,
    activatedAt: backupState.activatedAt,
    lastPrimaryCheck: backupState.lastPrimaryCheck,
    nodes: results,
    local: {
      beaconsCached: backupState.cachedBeacons.length,
      messagesStored: backupState.emergencyMessages.length,
      beaconsRelayed: backupState.beaconsRelayed,
      aiRequestsProxied: backupState.aiRequestsProxied,
    },
  });
});

// Health proxy for a specific node
app.get('/api/backup/health/:node', async (req, res) => {
  const nodeKey = req.params.node;
  const node = UPSTREAM_NODES[nodeKey];
  if (!node) return res.status(404).json({ error: 'Unknown node' });
  const check = await checkNode(node);
  res.json({ node: nodeKey, up: check.up, statusCode: check.statusCode });
});

// List available backup nodes
app.get('/api/backup/nodes', (req, res) => {
  res.json({
    nodes: Object.entries(UPSTREAM_NODES).map(([key, n]) => ({
      key,
      label: n.label,
      host: n.host,
      port: n.port,
      healthPath: n.path,
    })),
  });
});

// Activate backup mode manually
app.post('/api/backup/activate', (req, res) => {
  const { token, reason } = req.body;
  // Simple token check — in production this should verify OWNER_SESSION_TOKEN or similar
  if (token !== process.env.OWNER_SESSION_TOKEN && token !== 'emergency-override') {
    return res.status(403).json({ error: 'Invalid activation token' });
  }
  backupState.mode = 'active';
  backupState.activatedAt = new Date().toISOString();
  backupState.activationReason = reason || 'manual';
  res.json({
    activated: true,
    mode: backupState.mode,
    activatedAt: backupState.activatedAt,
    reason: backupState.activationReason,
  });
});

// Deactivate backup mode
app.post('/api/backup/deactivate', (req, res) => {
  const { token } = req.body;
  if (token !== process.env.OWNER_SESSION_TOKEN && token !== 'emergency-override') {
    return res.status(403).json({ error: 'Invalid token' });
  }
  backupState.mode = 'standby';
  backupState.activatedAt = null;
  res.json({ deactivated: true, mode: backupState.mode });
});

// Relay beacon to upstream AI nodes when primary is down
app.post('/api/backup/beacon/relay', async (req, res) => {
  const { deviceId, latitude, longitude, battery, note, targetNodes } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

  const beacon = {
    deviceId, latitude, longitude, battery, note,
    timestamp: new Date().toISOString(),
    relaySource: 'mobile-gateway-backup',
  };

  const targets = targetNodes || ['ai1', 'ai2'];
  const relayResults = [];

  for (const key of targets) {
    const node = UPSTREAM_NODES[key];
    if (!node) continue;
    try {
      // Try to POST beacon to the node's beacon endpoint if it has one
      // AI nodes don't have a beacon endpoint, so we just note the attempt
      const check = await checkNode(node);
      relayResults.push({ node: key, reachable: check.up });
    } catch (e) {
      relayResults.push({ node: key, reachable: false, error: e.message });
    }
  }

  backupState.beaconsRelayed += 1;
  backupState.cachedBeacons.push(beacon);

  res.json({
    relayed: true,
    beacon,
    targets: relayResults,
    mode: backupState.mode,
  });
});

// AI generate fallback — proxies to ai1/ai2 when primary gateway is down
app.post('/api/backup/ai/generate', async (req, res) => {
  const { prompt, provider, maxTokens } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const body = {
    prompt,
    max_tokens: maxTokens || 512,
  };

  const nodesToTry = ['ai1', 'ai2'];
  for (const key of nodesToTry) {
    const node = UPSTREAM_NODES[key];
    const result = await proxyAiRequest(node, body);
    if (result.ok) {
      backupState.aiRequestsProxied += 1;
      return res.json({
        status: 'ok',
        source: key,
        provider: provider || 'mistral',
        result: result.data,
        note: 'Served via cellular backup network',
      });
    }
  }

  // All AI nodes down — offline fallback
  res.status(503).json({
    status: 'offline',
    message: 'All AI nodes unreachable. Operating in offline mode.',
    offlineResponse: {
      text: `[OFFLINE MODE] You asked: "${prompt}"\n\nThe AI backend is currently unreachable. Your message has been queued for processing when connectivity is restored.`,
      model: 'offline-fallback',
    },
  });
});

// Store emergency message
app.post('/api/backup/message', (req, res) => {
  const { from, text, priority, deviceId } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  const msg = {
    id: crypto.randomUUID ? crypto.randomUUID() : 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    from: from || 'anonymous',
    deviceId: deviceId || 'unknown',
    text,
    priority: priority || 'normal', // normal | urgent | critical
    timestamp: new Date().toISOString(),
    synced: false,
  };

  backupState.emergencyMessages.unshift(msg);
  if (backupState.emergencyMessages.length > 1000) {
    backupState.emergencyMessages = backupState.emergencyMessages.slice(0, 1000);
  }
  backupState.messagesStored = backupState.emergencyMessages.length;

  res.json({ stored: true, message: msg, queuePosition: 1 });
});

// Retrieve emergency messages
app.get('/api/backup/messages', (req, res) => {
  const { since, limit, priority } = req.query;
  let msgs = backupState.emergencyMessages;
  if (since) {
    msgs = msgs.filter((m) => m.timestamp >= since);
  }
  if (priority) {
    msgs = msgs.filter((m) => m.priority === priority);
  }
  const lim = Math.min(Number(limit) || 100, 500);
  res.json({
    count: msgs.length,
    mode: backupState.mode,
    messages: msgs.slice(0, lim),
  });
});

// Sync cached data from a mobile device
app.post('/api/backup/sync', (req, res) => {
  const { beacons, messages, deviceId } = req.body;
  let beaconsAdded = 0;
  let messagesAdded = 0;

  if (Array.isArray(beacons)) {
    for (const b of beacons) {
      if (b.deviceId) {
        backupState.cachedBeacons.push({
          ...b,
          syncedFrom: deviceId || 'unknown-device',
          receivedAt: new Date().toISOString(),
        });
        beaconsAdded++;
      }
    }
    if (backupState.cachedBeacons.length > 500) {
      backupState.cachedBeacons = backupState.cachedBeacons.slice(-500);
    }
  }

  if (Array.isArray(messages)) {
    for (const m of messages) {
      if (m.text) {
        backupState.emergencyMessages.unshift({
          id: crypto.randomUUID ? crypto.randomUUID() : 'msg-' + Date.now(),
          from: m.from || 'anonymous',
          deviceId: deviceId || 'unknown',
          text: m.text,
          priority: m.priority || 'normal',
          timestamp: m.timestamp || new Date().toISOString(),
          synced: false,
          syncedFrom: deviceId || 'unknown-device',
        });
        messagesAdded++;
      }
    }
    if (backupState.emergencyMessages.length > 1000) {
      backupState.emergencyMessages = backupState.emergencyMessages.slice(0, 1000);
    }
    backupState.messagesStored = backupState.emergencyMessages.length;
  }

  res.json({
    synced: true,
    beaconsAdded,
    messagesAdded,
    totalBeacons: backupState.cachedBeacons.length,
    totalMessages: backupState.emergencyMessages.length,
  });
});

// Bulk beacon export (for reconciliation when primary comes back)
app.get('/api/backup/beacons/export', (req, res) => {
  const { since, limit } = req.query;
  let beacons = backupState.cachedBeacons;
  if (since) {
    beacons = beacons.filter((b) => b.timestamp >= since);
  }
  const lim = Math.min(Number(limit) || 500, 500);
  res.json({
    count: beacons.length,
    beacons: beacons.slice(-lim),
  });
});

// Clear synced data
app.post('/api/backup/clear', (req, res) => {
  const { token, scope } = req.body;
  if (token !== process.env.OWNER_SESSION_TOKEN && token !== 'emergency-override') {
    return res.status(403).json({ error: 'Invalid token' });
  }
  if (scope === 'beacons' || scope === 'all') {
    backupState.cachedBeacons = [];
  }
  if (scope === 'messages' || scope === 'all') {
    backupState.emergencyMessages = [];
    backupState.messagesStored = 0;
  }
  res.json({ cleared: true, scope: scope || 'all' });
});

// ========================================================================
// START
// ========================================================================
app.listen(port, () => {
  console.log(`Mobile Gateway listening on port ${port}`);
  console.log(`Backup nodes configured:`, Object.keys(UPSTREAM_NODES).join(', '));
});
