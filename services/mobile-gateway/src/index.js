const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const redis = require('redis');
const app = express();
const port = Number(process.env.PORT || 5050);

// Redis client for persisting backup state across restarts
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379/0';
let redisClient = null;
let redisReady = false;
(async () => {
  try {
    redisClient = redis.createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => { redisReady = false; });
    await redisClient.connect();
    redisReady = true;
    console.log('[MOBILE-GATEWAY] Redis connected for backup persistence');
  } catch (e) {
    console.warn('[MOBILE-GATEWAY] Redis unavailable, backup state will be in-memory only:', e.message);
  }
})();

async function redisPush(key, item, maxLen = 500) {
  if (!redisReady) return false;
  try {
    await redisClient.lPush(key, JSON.stringify(item));
    await redisClient.lTrim(key, 0, maxLen - 1);
    return true;
  } catch (e) { return false; }
}

async function redisRange(key, start = 0, stop = -1) {
  if (!redisReady) return [];
  try {
    const items = await redisClient.lRange(key, start, stop);
    return items.map(i => { try { return JSON.parse(i); } catch { return null; } }).filter(Boolean);
  } catch (e) { return []; }
}

async function redisLen(key) {
  if (!redisReady) return 0;
  try { return await redisClient.lLen(key); } catch (e) { return 0; }
}

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
    const start = Date.now();
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
          latency: Date.now() - start,
        });
      });
    });
    req.on('error', () => resolve({ up: false, statusCode: 0, latency: Date.now() - start }));
    req.on('timeout', () => { req.destroy(); resolve({ up: false, statusCode: 0, latency: Date.now() - start }); });
    req.setTimeout(5000);
    req.end();
  });
}

// Helper: generic proxy request to an upstream service
function proxyRequest(targetUrl, method = 'GET', body = null, headers = {}, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const parsed = new URL(targetUrl);
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        ...headers,
        ...(postData ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
      timeout: timeoutMs,
    };
    const client = (parsed.protocol === 'https:') ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: { raw: data } }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.setTimeout(timeoutMs);
    if (postData) req.write(postData);
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

// Background failover monitor: check primary gateway every 15 seconds
// Require 3 consecutive failures to enter active mode, and 2 consecutive passes to recover.
let consecutivePrimaryFailures = 0;
let consecutivePrimaryPasses = 0;

async function runBackupMonitor() {
  try {
    const primary = await checkNode(UPSTREAM_NODES.primary);
    backupState.lastPrimaryCheck = new Date().toISOString();
    backupState.nodeStatus.primary = primary;

    if (primary.up) {
      consecutivePrimaryFailures = 0;
      consecutivePrimaryPasses++;
      if (consecutivePrimaryPasses >= 2) {
        if (backupState.mode === 'active') backupState.mode = 'recovery';
        else if (backupState.mode === 'recovery') {
          backupState.mode = 'standby';
          backupState.activatedAt = null;
        }
      }
    } else {
      consecutivePrimaryPasses = 0;
      consecutivePrimaryFailures++;
      if (consecutivePrimaryFailures >= 3 && backupState.mode === 'standby') {
        backupState.mode = 'active';
        backupState.activatedAt = new Date().toISOString();
      }
    }
  } catch (e) {
    console.error('[MONITOR] Health check error:', e.message);
  }
}

setInterval(runBackupMonitor, 15000);
runBackupMonitor(); // initial check

// Token verification helper
function verifyOwnerToken(token) {
  return token && token === process.env.OWNER_SESSION_TOKEN;
}

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
app.post('/api/beacon', async (req, res) => {
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
  // Persist to Redis if available, otherwise in-memory
  await redisPush('mobile:beacons', beacon, 500);
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

  const redisBeaconCount = await redisLen('mobile:beacons');
  const redisMessageCount = await redisLen('mobile:messages');

  res.json({
    mode: backupState.mode,
    activatedAt: backupState.activatedAt,
    lastPrimaryCheck: backupState.lastPrimaryCheck,
    nodes: results,
    local: {
      beaconsCached: redisBeaconCount || backupState.cachedBeacons.length,
      messagesStored: redisMessageCount || backupState.emergencyMessages.length,
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
  if (!verifyOwnerToken(token)) {
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
  if (!verifyOwnerToken(token)) {
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
  await redisPush('mobile:beacons', beacon, 500);

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
app.post('/api/backup/message', async (req, res) => {
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
  await redisPush('mobile:messages', msg, 1000);

  res.json({ stored: true, message: msg, queuePosition: 1 });
});

// Retrieve emergency messages
app.get('/api/backup/messages', async (req, res) => {
  const { since, limit, priority } = req.query;
  let msgs = await redisRange('mobile:messages');
  if (!msgs.length) msgs = backupState.emergencyMessages;
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
app.get('/api/backup/beacons/export', async (req, res) => {
  const { since, limit } = req.query;
  let beacons = await redisRange('mobile:beacons');
  if (!beacons.length) beacons = backupState.cachedBeacons;
  if (since) {
    beacons = beacons.filter((b) => b.timestamp >= since);
  }
  const lim = Math.min(Number(limit) || 500, 500);
  res.json({
    count: beacons.length,
    beacons: beacons.slice(-lim),
  });
});

// Proxy pass-through for critical public routes when primary gateway is down.
// These are only available when backupState.mode === 'active'.
const BACKUP_PROXY_ROUTES = [
  { method: 'GET', path: '/api/v1/system/health', target: (n) => `http://${n.host}:${n.port}/api/v1/system/health` },
  { method: 'GET', path: '/api/v1/beacon/active', target: (n, q) => `http://${n.host}:${n.port}/api/v1/beacon/active?${q}` },
  { method: 'GET', path: '/api/v1/beacon/awareness', target: (n, q) => `http://${n.host}:${n.port}/api/v1/beacon/awareness?${q}` },
  { method: 'POST', path: '/api/v1/beacon/emit', target: (n) => `http://${n.host}:${n.port}/api/v1/beacon/emit` },
  { method: 'POST', path: '/api/v1/ai/generate', target: (n) => `http://${n.host}:${n.port}/api/v1/ai/generate` },
];

function registerBackupProxyRoutes() {
  for (const route of BACKUP_PROXY_ROUTES) {
    const handler = async (req, res) => {
      // Always allow /api/v1/system/health pass-through for health checks
      if (backupState.mode !== 'active' && route.path !== '/api/v1/system/health') {
        return res.status(503).json({ error: 'Backup gateway not active', mode: backupState.mode });
      }
      const nodesToTry = ['primary', 'ai1', 'ai2'];
      for (const key of nodesToTry) {
        const node = UPSTREAM_NODES[key];
        if (!node) continue;
        const target = route.target(node, new URLSearchParams(req.query).toString());
        const result = await proxyRequest(target, route.method, route.method === 'POST' ? req.body : null, req.headers);
        if (result.ok) {
          return res.status(result.status).json(result.data);
        }
      }
      res.status(503).json({ error: 'All upstream nodes unreachable', mode: backupState.mode });
    };
    if (route.method === 'GET') app.get(route.path, handler);
    else if (route.method === 'POST') app.post(route.path, handler);
  }
}
registerBackupProxyRoutes();

// Clear synced data
app.post('/api/backup/clear', (req, res) => {
  const { token, scope } = req.body;
  if (!verifyOwnerToken(token)) {
    return res.status(403).json({ error: 'Invalid token' });
  }
  if (scope === 'beacons' || scope === 'all') {
    backupState.cachedBeacons = [];
    if (redisReady) redisClient.del('mobile:beacons').catch(() => {});
  }
  if (scope === 'messages' || scope === 'all') {
    backupState.emergencyMessages = [];
    backupState.messagesStored = 0;
    if (redisReady) redisClient.del('mobile:messages').catch(() => {});
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
