const express = require('express');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = Number(process.env.PORT || 8090);

const publicSigningKey = process.env.PUBLIC_SIGNING_KEY;
const publicFingerprint = process.env.PUBLIC_SIGNING_FINGERPRINT;

if (!publicSigningKey || !publicFingerprint) {
  console.error('FATAL: PUBLIC_SIGNING_KEY and PUBLIC_SIGNING_FINGERPRINT are required');
  process.exit(1);
}

function signPayload(payload) {
  return crypto.createHmac('sha256', publicSigningKey).update(JSON.stringify(payload)).digest('hex');
}

app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'public-portal' });
});

app.get('/api/signature', (req, res) => {
  const payload = {
    system: 'public-portal',
    timestamp: new Date().toISOString(),
    hosted: 'public'
  };
  res.json({
    system: payload.system,
    fingerprint: publicFingerprint,
    signature: signPayload(payload),
    payload
  });
});

app.listen(port, () => {
  console.log(`Public Portal listening on port ${port}`);
});
