const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = Number(process.env.PORT || 5050);

const mobileSigningKey = process.env.MOBILE_SIGNING_KEY || 'mobile-system-secret';
const mobileFingerprint = process.env.MOBILE_SIGNING_FINGERPRINT || 'mobile-fingerprint-456';

function signPayload(payload) {
  return crypto.createHmac('sha256', mobileSigningKey).update(JSON.stringify(payload)).digest('hex');
}

app.use(helmet());
app.use(morgan('tiny'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mobile-gateway' });
});

app.get('/api/signature', (req, res) => {
  const payload = {
    system: 'mobile-gateway',
    timestamp: new Date().toISOString(),
    node: 'mobile-backup-satellite'
  };
  res.json({
    system: payload.system,
    fingerprint: mobileFingerprint,
    signature: signPayload(payload),
    payload
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    activeConnections: 14,
    messagesLastHour: 287,
    mobileGatewayStatus: 'standby',
    lastSync: new Date().toISOString()
  });
});

app.post('/api/beacon', (req, res) => {
  const { deviceId, latitude, longitude, battery } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId required' });
  }
  res.json({ received: true, deviceId, latitude, longitude, battery, timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Mobile Gateway listening on port ${port}`);
});
