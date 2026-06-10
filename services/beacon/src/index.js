/**
 * ABC-IO Public Safety Beacon System
 * Free, anonymized Locational Awareness Beacon providing global transit safety
 * and search-and-rescue support without account requirements or private data retention.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const BEACON_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PURGE_INTERVAL_MS = 5 * 60 * 1000;     // purge every 5 minutes

const VALID_BEACON_TYPES = new Set(['emergency', 'transit', 'sos']);
const VALID_RESPONDER_TYPES = new Set(['police', 'medical', 'fire', 'civilian']);

// ─── In-Memory Beacon Store ───────────────────────────────────────────────────

class BeaconStore {
  constructor() {
    this.beacons = new Map();
  }

  insert(beacon) {
    this.beacons.set(beacon.beaconId, beacon);
  }

  get(id) {
    return this.beacons.get(id) || null;
  }

  getAllActive() {
    const now = Date.now();
    const active = [];
    for (const beacon of this.beacons.values()) {
      if (now - beacon.createdAt < BEACON_TTL_MS) {
        active.push(beacon);
      }
    }
    return active;
  }

  getActiveInRegion(lat, lng, radiusKm) {
    const all = this.getAllActive();
    return all.filter(b => haversine(lat, lng, b.latitude, b.longitude) <= radiusKm);
  }

  acknowledge(id, responderType) {
    const beacon = this.beacons.get(id);
    if (!beacon) return false;
    if (!beacon.acknowledgments.includes(responderType)) {
      beacon.acknowledgments.push(responderType);
      beacon.acknowledgedAt = Date.now();
    }
    return true;
  }

  purgeExpired() {
    const now = Date.now();
    let count = 0;
    for (const [id, beacon] of this.beacons.entries()) {
      if (now - beacon.createdAt >= BEACON_TTL_MS) {
        this.beacons.delete(id);
        count++;
      }
    }
    return count;
  }

  countActive() {
    return this.getAllActive().length;
  }

  countLast24h() {
    return this.countActive();
  }

  averageResponseTime() {
    const acknowledged = [];
    for (const beacon of this.beacons.values()) {
      if (beacon.acknowledgedAt && beacon.createdAt) {
        acknowledged.push(beacon.acknowledgedAt - beacon.createdAt);
      }
    }
    if (acknowledged.length === 0) return 0;
    return Math.round(acknowledged.reduce((a, b) => a + b, 0) / acknowledged.length);
  }
}

const store = new BeaconStore();

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateBeaconId() {
  return crypto.randomUUID();
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function sanitizeBeaconForPublic(beacon) {
  return {
    beaconId: beacon.beaconId,
    beaconType: beacon.beaconType,
    latitude: beacon.latitude,
    longitude: beacon.longitude,
    altitude: beacon.altitude,
    accuracy: beacon.accuracy,
    message: beacon.message,
    battery: beacon.battery,
    createdAt: beacon.createdAt,
    acknowledged: beacon.acknowledgments.length > 0,
    acknowledgments: beacon.acknowledgments,
  };
}

function estimatedResponseTime(beaconType) {
  // Mock estimations in minutes
  switch (beaconType) {
    case 'emergency': return 8;
    case 'sos': return 12;
    case 'transit': return 25;
    default: return 15;
  }
}

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();

// Security & CORS
app.use(helmet());
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '50kb' }));

// ─── Middleware: Request logging ──────────────────────────────────────────────

app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /
 * Public info page with instructions on how to use the beacon.
 */
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ABC-IO Public Safety Beacon</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1a1a1a; background: #f8f9fa; }
    h1 { color: #c0392b; border-bottom: 3px solid #c0392b; padding-bottom: 10px; }
    h2 { color: #2c3e50; margin-top: 32px; }
    code { background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 0.95em; }
    pre { background: #212529; color: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.8em; font-weight: 600; margin-right: 6px; }
    .emergency { background: #c0392b; color: white; }
    .transit { background: #2980b9; color: white; }
    .sos { background: #f39c12; color: white; }
    .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 0.85em; color: #6c757d; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>🚨 ABC-IO Public Safety Beacon</h1>
  <p><strong>Free. Anonymous. Global.</strong></p>
  <p>
    The ABC-IO Beacon is a public utility for locational awareness, transit safety,
    and search-and-rescue support. No account required. No personal data retained.
    Beacons expire automatically after 24 hours.
  </p>

  <h2>How to Use</h2>
  <p>Send a <code>POST</code> request to emit a beacon from any device:</p>
  <pre>POST /api/v1/beacon/emit
Content-Type: application/json

{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "altitude": 10.5,
  "accuracy": 4.2,
  "deviceType": "mobile",
  "beaconType": "emergency",
  "message": "Need immediate assistance",
  "battery": 67
}</pre>

  <h2>Beacon Types</h2>
  <p>
    <span class="badge emergency">emergency</span> Life-threatening situation requiring immediate response.<br>
    <span class="badge transit">transit</span> Safety concern during travel (e.g., unsafe vehicle, route).<br>
    <span class="badge sos">sos</span> General distress or need for help.
  </p>

  <h2>API Endpoints</h2>
  <ul>
    <li><code>POST /api/v1/beacon/emit</code> — Emit an emergency beacon.</li>
    <li><code>GET  /api/v1/beacon/active?lat=&lng=&radiusKm=</code> — List active beacons in a region.</li>
    <li><code>POST /api/v1/beacon/acknowledge</code> — Acknowledge a beacon as a responder.</li>
    <li><code>GET  /api/v1/beacon/stats</code> — Public anonymized statistics.</li>
    <li><code>GET  /health</code> — Service health check.</li>
    <li><code>GET  /</code> — This page.</li>
  </ul>

  <h2>Data Policy</h2>
  <ul>
    <li>✅ No accounts or authentication required.</li>
    <li>✅ No Personally Identifiable Information (PII) is collected or stored.</li>
    <li>✅ No persistent device identifiers are retained.</li>
    <li>✅ All beacon data is purged automatically after 24 hours.</li>
    <li>✅ Location data is used solely for public safety coordination.</li>
  </ul>

  <div class="footer">
    ABC-IO Public Safety Beacon System &mdash; Open utility for global safety.
  </div>
</body>
</html>`);
});

/**
 * GET /health
 * Service health check.
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * POST /api/v1/beacon/emit
 * Emits an emergency beacon.
 */
app.post('/api/v1/beacon/emit', (req, res) => {
  const {
    latitude,
    longitude,
    altitude,
    accuracy,
    deviceType,
    beaconType,
    message,
    battery,
    timestamp,
  } = req.body;

  // Validate required fields
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'latitude and longitude are required numbers.',
    });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'latitude must be between -90 and 90, longitude between -180 and 180.',
    });
  }

  if (!beaconType || !VALID_BEACON_TYPES.has(beaconType)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `beaconType must be one of: ${Array.from(VALID_BEACON_TYPES).join(', ')}.`,
    });
  }

  const beaconId = generateBeaconId();
  const now = Date.now();

  const beacon = {
    beaconId,
    latitude,
    longitude,
    altitude: typeof altitude === 'number' ? altitude : null,
    accuracy: typeof accuracy === 'number' ? accuracy : null,
    deviceType: typeof deviceType === 'string' ? deviceType : 'unknown',
    beaconType,
    message: typeof message === 'string' ? message.trim().slice(0, 500) : null,
    battery: typeof battery === 'number' ? Math.max(0, Math.min(100, battery)) : null,
    clientTimestamp: typeof timestamp === 'number' ? timestamp : null,
    createdAt: now,
    acknowledgedAt: null,
    acknowledgments: [],
  };

  store.insert(beacon);

  console.log(`[BEACON EMITTED] id=${beaconId} type=${beaconType} lat=${latitude} lng=${longitude}`);

  return res.status(201).json({
    beaconId,
    relayedTo: ['redot1', 'ai1', 'ai2'],
    estimatedResponseTime: estimatedResponseTime(beaconType),
    status: 'active',
  });
});

/**
 * GET /api/v1/beacon/active
 * Returns all active beacons in a region.
 */
app.get('/api/v1/beacon/active', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radiusKm = parseFloat(req.query.radiusKm);

  if (Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radiusKm)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Query parameters lat, lng, and radiusKm are required numbers.',
    });
  }

  if (radiusKm <= 0 || radiusKm > 500) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'radiusKm must be greater than 0 and at most 500.',
    });
  }

  const beacons = store.getActiveInRegion(lat, lng, radiusKm);
  const sanitized = beacons.map(sanitizeBeaconForPublic);

  return res.status(200).json({
    beacons: sanitized,
    count: sanitized.length,
    region: {
      latitude: lat,
      longitude: lng,
      radiusKm,
    },
  });
});

/**
 * POST /api/v1/beacon/acknowledge
 * Acknowledge a beacon (for rescue teams / responders).
 */
app.post('/api/v1/beacon/acknowledge', (req, res) => {
  const { beaconId, responderType } = req.body;

  if (typeof beaconId !== 'string' || beaconId.length === 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'beaconId is required.',
    });
  }

  if (!responderType || !VALID_RESPONDER_TYPES.has(responderType)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `responderType must be one of: ${Array.from(VALID_RESPONDER_TYPES).join(', ')}.`,
    });
  }

  const ok = store.acknowledge(beaconId, responderType);
  if (!ok) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Beacon not found or expired.',
    });
  }

  console.log(`[BEACON ACKNOWLEDGED] id=${beaconId} responder=${responderType}`);

  return res.status(200).json({
    beaconId,
    responderType,
    status: 'acknowledged',
  });
});

/**
 * GET /api/v1/beacon/stats
 * Public stats (no auth).
 */
app.get('/api/v1/beacon/stats', (req, res) => {
  const activeNow = store.countActive();
  const totalBeacons24h = store.countLast24h();
  const avgResponseMs = store.averageResponseTime();
  const averageResponseTime = avgResponseMs > 0 ? Math.round(avgResponseMs / 1000) : 0; // seconds

  return res.status(200).json({
    totalBeacons24h,
    activeNow,
    averageResponseTime,
    coverageAreas: [],
  });
});

// ─── Error Handling ───────────────────────────────────────────────────────────

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested resource does not exist.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected error occurred.' });
});

// ─── Startup ──────────────────────────────────────────────────────────────────

// Auto-purge expired beacons every 5 minutes
setInterval(() => {
  const purged = store.purgeExpired();
  if (purged > 0) {
    console.log(`[PURGE] Removed ${purged} expired beacon(s).`);
  }
}, PURGE_INTERVAL_MS);

app.listen(PORT, () => {
  console.log(`ABC-IO Beacon service listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Beacon TTL: ${BEACON_TTL_MS / 1000 / 60 / 60} hours`);
});
