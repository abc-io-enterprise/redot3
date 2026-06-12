const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3010;
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://gateway:4000';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", GATEWAY_URL, "http://localhost:4000", "https://abc-io.com", "https://*.abc-io.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'"],
      manifestSrc: ["'self'"],
    },
  },
}));
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'interface-pwa', gateway: GATEWAY_URL });
});

app.get('/api/config', (req, res) => {
  res.json({ gatewayUrl: GATEWAY_URL });
});

app.use('/', express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ABC-IO Interface PWA listening on port ${PORT}`);
});
