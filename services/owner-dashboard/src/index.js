const express = require('express');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const app = express();
const port = Number(process.env.PORT || 8500);
const apkFile = process.env.APK_PATH || '/apk/redot2-latest.apk';

const ownerSigningKey = process.env.OWNER_SIGNING_KEY;
const ownerFingerprint = process.env.OWNER_SIGNING_FINGERPRINT;
const ownerAccountEmail = process.env.OWNER_ACCOUNT_EMAIL;
const ownerAccountPassword = process.env.OWNER_ACCOUNT_PASSWORD;
const ownerSessionToken = process.env.OWNER_SESSION_TOKEN;

// Validate required environment variables on startup
const requiredEnvVars = [
  { name: 'OWNER_SIGNING_KEY', value: ownerSigningKey },
  { name: 'OWNER_SIGNING_FINGERPRINT', value: ownerFingerprint },
  { name: 'OWNER_ACCOUNT_EMAIL', value: ownerAccountEmail },
  { name: 'OWNER_ACCOUNT_PASSWORD', value: ownerAccountPassword },
  { name: 'OWNER_SESSION_TOKEN', value: ownerSessionToken }
];

for (const envVar of requiredEnvVars) {
  if (!envVar.value) {
    console.error(`FATAL: Missing required environment variable: ${envVar.name}`);
    process.exit(1);
  }
}
const mobileGatewayUrl = process.env.MOBILE_GATEWAY_URL || 'http://mobile-gateway:5050';

// System services list
const systemServices = ['gateway', 'kimi', 'mobile-gateway', 'public-portal', 'operator-station', 'postgres', 'redis', 'prometheus', 'grafana', 'worker'];

// Active sessions
const activeSessions = new Map();

function signPayload(payload) {
  return crypto.createHmac('sha256', ownerSigningKey).update(JSON.stringify(payload)).digest('hex');
}

function verifyToken(req) {
  const token = req.headers['x-owner-token'] || req.body?.token;
  return token === ownerSessionToken;
}

app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== AUTHENTICATION ====================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'owner-dashboard', timestamp: new Date().toISOString() });
});

app.post('/api/auth', (req, res) => {
  const { email, password, biometricToken } = req.body;
  const biometricSecret = process.env.OWNER_BIOMETRIC_SECRET || ownerSigningKey;
  const expectedBiometricToken = crypto.createHmac('sha256', biometricSecret).update(email + password).digest('hex');
  if (email === ownerAccountEmail && password === ownerAccountPassword && biometricToken === expectedBiometricToken) {
    const sessionId = crypto.randomBytes(16).toString('hex');
    activeSessions.set(sessionId, { email, loginTime: new Date(), lastActivity: new Date() });
    return res.json({ 
      authenticated: true, 
      token: ownerSessionToken, 
      sessionId,
      message: 'Owner access granted - ABC-IO Operator Control Center' 
    });
  }
  res.status(401).json({ authenticated: false, message: 'Authentication failed.' });
});

app.post('/api/logout', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) activeSessions.delete(sessionId);
  res.json({ loggedOut: true });
});

// ==================== SYSTEM STATUS ====================
app.get('/api/status', (req, res) => {
  if (!verifyToken(req)) return res.status(403).json({ error: 'Unauthorized' });
  
  res.json({
    system: 'ABC-IO v2.0 - Operator Control Center',
    mode: 'INTEGRATED',
    uptime: process.uptime(),
    owner: ownerAccountEmail,
    timestamp: new Date().toISOString(),
    components: {
      desktop: 'OPERATIONAL',
      mobile: 'APK_READY',
      cloud: 'CONFIGURED',
      github: 'READY'
    }
  });
});

app.get('/api/system-health', async (req, res) => {
  if (!verifyToken(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const services = {};
    for (const service of systemServices) {
      try {
        const result = execSync(`docker compose ps ${service} --format json`, { encoding: 'utf8', timeout: 5000 });
        const data = JSON.parse(result || '[]')[0];
        services[service] = data ? 'UP' : 'DOWN';
      } catch (e) {
        services[service] = 'DOWN';
      }
    }
    
    const healthyServices = Object.values(services).filter(s => s === 'UP').length;
    const totalServices = Object.keys(services).length;
    
    res.json({
      timestamp: new Date().toISOString(),
      overall: healthyServices === totalServices ? 'HEALTHY' : 'DEGRADED',
      servicesUp: healthyServices,
      servicesTotal: totalServices,
      services
    });
  } catch (error) {
    res.status(500).json({ error: 'Health check failed', details: error.message });
  }
});

// ==================== SERVICE CONTROL ====================
app.post('/api/service/restart', (req, res) => {
  if (!verifyToken(req)) return res.status(403).json({ error: 'Unauthorized' });
  
  const { service } = req.body;
  if (!systemServices.includes(service)) {
    return res.status(400).json({ error: 'Invalid service', validServices: systemServices });
  }

  try {
    execSync(`docker compose restart ${service}`, { timeout: 30000 });
    res.json({ 
      action: 'restart',
      service,
      status: 'INITIATED',
      timestamp: new Date().toISOString(),
      message: `Restarting ${service}... will be ready in ~5 seconds`
    });
  } catch (error) {
    res.status(500).json({ error: 'Restart failed', service, details: error.message });
  }
});

app.post('/api/service/stop', (req, res) => {
  if (!verifyToken(req)) return res.status(403).json({ error: 'Unauthorized' });
  
  const { service } = req.body;
  if (!systemServices.includes(service)) {
    return res.status(400).json({ error: 'Invalid service', validServices: systemServices });
  }

  try {
    execSync(`docker compose stop ${service}`, { timeout: 15000 });
    res.json({ action: 'stop', service, status: 'STOPPED', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Stop failed', service, details: error.message });
  }
});

app.post('/api/service/start', (req, res) => {
  if (!verifyToken(req)) return res.status(403).json({ error: 'Unauthorized' });
  
  const { service } = req.body;
  if (!systemServices.includes(service)) {
    return res.status(400).json({ error: 'Invalid service', validServices: systemServices });
  }

  try {
    execSync(`docker compose start ${service}`, { timeout: 15000 });
    res.json({ action: 'start', service, status: 'STARTED', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Start failed', service, details: error.message });
  }
});

// ==================== AUTO-HEALING ====================
app.post('/api/heal/all', (req, res) => {
  if (!verifyToken(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const healLog = {
      timestamp: new Date().toISOString(),
      action: 'FULL_SYSTEM_HEAL',
      steps: []
    };

    // Step 1: Restart all services
    healLog.steps.push({ step: 1, action: 'Restarting all services', status: 'IN_PROGRESS' });
    execSync('docker compose restart', { timeout: 60000 });
    healLog.steps[healLog.steps.length - 1].status = 'COMPLETE';

    // Step 2: Wait for services to stabilize
    healLog.steps.push({ step: 2, action: 'Waiting for stabilization', status: 'IN_PROGRESS', duration: '10s' });
    require('child_process').execSync('sleep 10');
    healLog.steps[healLog.steps.length - 1].status = 'COMPLETE';

    // Step 3: Verify health
    healLog.steps.push({ step: 3, action: 'Verifying health', status: 'IN_PROGRESS' });
    const services = {};
    for (const service of systemServices) {
      try {
        const result = execSync(`docker compose ps ${service} --format json`, { encoding: 'utf8', timeout: 5000 });
        const data = JSON.parse(result || '[]')[0];
        services[service] = data ? 'UP' : 'DOWN';
      } catch (e) {
        services[service] = 'DOWN';
      }
    }
    healLog.steps[healLog.steps.length - 1].status = 'COMPLETE';
    healLog.services = services;

    res.json({
      ...healLog,
      result: 'HEALING_COMPLETE',
      message: 'System auto-healing completed. All services restarted and verified.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Healing failed', details: error.message });
  }
});

// ==================== DEPLOYMENT ====================
app.post('/api/deploy/update', (req, res) => {
  if (!verifyToken(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const deployLog = {
      timestamp: new Date().toISOString(),
      action: 'DEPLOYMENT_UPDATE',
      steps: []
    };

    // Step 1: Git pull
    deployLog.steps.push({ step: 1, action: 'Git pull from origin', status: 'IN_PROGRESS' });
    const defaultBranch = process.env.GIT_DEFAULT_BRANCH || 'main';
    execSync(`git pull origin ${defaultBranch}`, { cwd: '/app', timeout: 30000 });
    deployLog.steps[deployLog.steps.length - 1].status = 'COMPLETE';

    // Step 2: Docker compose pull
    deployLog.steps.push({ step: 2, action: 'Docker image pull', status: 'IN_PROGRESS' });
    execSync('docker compose pull', { cwd: '/app', timeout: 120000 });
    deployLog.steps[deployLog.steps.length - 1].status = 'COMPLETE';

    // Step 3: Restart services
    deployLog.steps.push({ step: 3, action: 'Restarting services', status: 'IN_PROGRESS' });
    execSync('docker compose up -d', { cwd: '/app', timeout: 60000 });
    deployLog.steps[deployLog.steps.length - 1].status = 'COMPLETE';

    res.json({
      ...deployLog,
      result: 'DEPLOYMENT_COMPLETE',
      message: 'Deployment update completed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Deployment failed', details: error.message });
  }
});

// ==================== GITHUB INTEGRATION ====================
app.get('/api/github/status', (req, res) => {
  if (!verifyToken(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const logOutput = execSync('git log --oneline -5', { encoding: 'utf8', cwd: '/app', timeout: 5000 });
    const commits = logOutput.trim().split('\n').map(line => {
      const [hash, ...msg] = line.split(' ');
      return { hash: hash.substring(0, 7), message: msg.join(' ') };
    });

    res.json({
      repository: 'abc-io-enterprises/redot2',
      status: 'CONNECTED',
      lastCommits: commits,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'GitHub check failed', details: error.message });
  }
});

app.post('/api/github/push', (req, res) => {
  if (!verifyToken(req)) return res.status(403).json({ error: 'Unauthorized' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Commit message required' });
  if (typeof message !== 'string' || message.length > 200) {
    return res.status(400).json({ error: 'Commit message must be a string <= 200 chars' });
  }
  // Reject any characters that could break shell quoting
  if (/["$&|;<>()`\\]/.test(message)) {
    return res.status(400).json({ error: 'Commit message contains invalid characters' });
  }

  try {
    execSync(`git add -A && git commit -m "${message}"`, { cwd: '/app', timeout: 15000 });
    const defaultBranch = process.env.GIT_DEFAULT_BRANCH || 'main';
    execSync(`git push origin ${defaultBranch}`, { cwd: '/app', timeout: 30000 });
    
    res.json({
      action: 'push',
      status: 'COMPLETE',
      message: `Pushed: ${message}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.message.includes('nothing to commit')) {
      return res.json({ message: 'No changes to commit', status: 'UPTODATE' });
    }
    res.status(500).json({ error: 'Push failed', details: error.message });
  }
});

// ==================== MOBILE APK ====================
app.get('/api/backup-status', (req, res) => {
  const fileExists = fs.existsSync(apkFile);
  res.json({
    localBackupAvailable: fileExists,
    localBackupPath: fileExists ? '/download/apk' : null,
    offlineAdminReady: true,
    apkSize: fileExists ? fs.statSync(apkFile).size : 0,
    message: fileExists ? 'APK backup is available for mobile deployment.' : 'APK not found - build using scripts/build-mobile-apk.ps1'
  });
});

app.get('/download/apk', (req, res) => {
  if (!fs.existsSync(apkFile)) {
    return res.status(404).json({ error: 'APK not found. Build it with scripts/build-mobile-apk.ps1' });
  }
  res.download(apkFile, 'redot2-operator.apk');
});

// ==================== SIGNATURE & SECURITY ====================
app.get('/api/signature', (req, res) => {
  const payload = {
    system: 'owner-dashboard',
    timestamp: new Date().toISOString(),
    node: 'operator-control-center',
    mode: 'INTEGRATED'
  };
  res.json({
    system: payload.system,
    fingerprint: ownerFingerprint,
    signature: signPayload(payload),
    payload
  });
});

// ==================== HEALTH PROXY ROUTES ====================
app.get('/api/health/kimi', async (req, res) => {
  try {
    const response = await fetch('http://kimi:5000/health');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(502).json({ status: 'error', message: String(error) });
  }
});

app.get('/api/health/headscale', async (req, res) => {
  try {
    const response = await fetch('http://headscale:8080/health');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(502).json({ status: 'error', message: String(error) });
  }
});

app.post('/api/beacon-relay', async (req, res) => {
  const { token, deviceId, latitude, longitude, battery } = req.body;
  if (token !== ownerSessionToken) {
    return res.status(403).json({ error: 'Unauthorized beacon relay' });
  }

  try {
    const response = await fetch(`${mobileGatewayUrl}/api/beacon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, latitude, longitude, battery, timestamp: new Date().toISOString() })
    });
    const body = await response.json();
    return res.json({ relayed: true, response: body, timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(502).json({ error: 'Beacon relay failed', details: String(error) });
  }
});

app.listen(port, () => {
  console.log(`✅ ABC-IO Operator Control Center listening on port ${port}`);
  console.log(`📊 Dashboard: http://localhost:${port}`);
  console.log(`🔐 Owner: ${ownerAccountEmail}`);
  console.log(`🚀 Status: INTEGRATED SYSTEM OPERATIONAL`);
});
