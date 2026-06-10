const express = require('express');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = Number(process.env.PORT || 8500);

const ownerSigningKey = process.env.OWNER_SIGNING_KEY || 'owner-system-secret';
const ownerFingerprint = process.env.OWNER_SIGNING_FINGERPRINT || 'owner-fingerprint-123';
const ownerAccountEmail = process.env.OWNER_ACCOUNT_EMAIL || 'cporreca@abc-io.com';
const ownerAccountPassword = process.env.OWNER_ACCOUNT_PASSWORD || 'secure-owner-password';
const ownerSessionToken = process.env.OWNER_SESSION_TOKEN || 'owner-session-token';
const mobileGatewayUrl = process.env.MOBILE_GATEWAY_URL || 'http://mobile-gateway:5050';

function signPayload(payload) {
  return crypto.createHmac('sha256', ownerSigningKey).update(JSON.stringify(payload)).digest('hex');
}

app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'owner-dashboard' });
});

app.get('/api/status', (req, res) => {
  res.json({
    system: 'ABC-IO v2.0',
    uptime: process.uptime(),
    owner: ownerAccountEmail,
    mode: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/signature', (req, res) => {
  const payload = {
    system: 'owner-dashboard',
    timestamp: new Date().toISOString(),
    node: 'owner-command-center'
  };
  res.json({
    system: payload.system,
    fingerprint: ownerFingerprint,
    signature: signPayload(payload),
    payload
  });
});

app.post('/api/auth', (req, res) => {
  const { email, password, biometricToken } = req.body;
  if (email === ownerAccountEmail && password === ownerAccountPassword && biometricToken === 'BIO-VALID') {
    return res.json({ authenticated: true, token: ownerSessionToken, message: 'Owner access granted.' });
  }
  res.status(401).json({ authenticated: false, message: 'Authentication failed.' });
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
      body: JSON.stringify({ deviceId, latitude, longitude, battery })
    });
    const body = await response.json();
    return res.json({ relayed: true, response: body });
  } catch (error) {
    return res.status(502).json({ error: 'Beacon relay failed', details: String(error) });
  }
});

app.listen(port, () => {
  console.log(`Owner Dashboard listening on port ${port}`);
});
