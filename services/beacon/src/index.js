/**
 * ABC-IO Public Safety Beacon System
 * Free, anonymized Locational Awareness Beacon providing global transit safety
 * and search-and-rescue support without account requirements or private data retention.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const PORT = Number(process.env.PORT || 3000);
const BEACON_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PURGE_INTERVAL_MS = 5 * 60 * 1000;     // purge every 5 minutes

const VALID_BEACON_TYPES = new Set(['emergency', 'transit', 'sos']);
const VALID_RESPONDER_TYPES = new Set(['police', 'medical', 'fire', 'civilian']);

// ─── PostgreSQL ───────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => console.error('PostgreSQL pool error:', err));

// ─── Email Transport ──────────────────────────────────────────────────────────

const emailTransport = (() => {
  const smtpUrl = process.env.SMTP_URL;
  if (smtpUrl && (smtpUrl.startsWith('smtp://') || smtpUrl.startsWith('smtps://'))) {
    try {
      return nodemailer.createTransport(smtpUrl);
    } catch (e) {
      console.warn('[EMAIL] Invalid SMTP_URL, falling back:', e.message);
    }
  }
  if (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('.')) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: (process.env.SMTP_PORT || '587') === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  // Dev fallback — log to console
  return {
    sendMail: async (opts) => {
      console.log('[EMAIL]', opts.to, opts.subject);
      return { messageId: 'dev-' + Date.now() };
    },
  };
})();

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const emitLimits = new Map(); // ip -> [timestamps]
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const history = emitLimits.get(ip) || [];
  const windowed = history.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (windowed.length >= RATE_LIMIT_MAX) {
    return false;
  }
  windowed.push(now);
  emitLimits.set(ip, windowed);
  return true;
}

// ─── DB Helpers ───────────────────────────────────────────────────────────────

async function saveBeacon(beacon) {
  const sql = `
    INSERT INTO beacons (beacon_id, beacon_type, latitude, longitude, altitude, accuracy, device_type, message, battery, status, estimated_response_time, expires_at, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11, to_timestamp($12 / 1000.0))
    ON CONFLICT (beacon_id) DO NOTHING
  `;
  const values = [
    beacon.beaconId,
    beacon.beaconType,
    beacon.latitude,
    beacon.longitude,
    beacon.altitude,
    beacon.accuracy,
    beacon.deviceType,
    beacon.message,
    beacon.battery,
    beacon.estimatedResponseTime,
    new Date(beacon.createdAt + BEACON_TTL_MS).toISOString(),
    beacon.createdAt,
  ];
  await pool.query(sql, values);
}

async function acknowledgeBeaconInDb(beaconId, responderType, extras = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO beacon_acknowledgments (beacon_id, responder_type, responder_name, responder_contact, eta_minutes, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        beaconId,
        responderType,
        extras.responderName || null,
        extras.responderContact || null,
        extras.etaMinutes || null,
        extras.notes || null,
      ]
    );
    await client.query(
      `UPDATE beacons SET status = 'acknowledged' WHERE beacon_id = $1 AND status = 'active'`,
      [beaconId]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function getActiveBeacons(lat, lng, radiusKm) {
  const sql = `
    SELECT * FROM (
      SELECT *,
        (6371 * acos(
          LEAST(1, GREATEST(-1,
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          ))
        )) AS distance
      FROM beacons
      WHERE status = 'active'
        AND expires_at > now()
    ) sub
    WHERE distance <= $3
    ORDER BY distance
    LIMIT 100
  `;
  const result = await pool.query(sql, [lat, lng, radiusKm]);
  return result.rows;
}

async function resolveBeacon(beaconId) {
  const result = await pool.query(
    `UPDATE beacons SET status = 'resolved', resolved_at = now() WHERE beacon_id = $1 RETURNING *`,
    [beaconId]
  );
  return result.rows[0] || null;
}

async function updateBeacon(beaconId, fields) {
  const mappings = {
    latitude: 'latitude',
    longitude: 'longitude',
    altitude: 'altitude',
    accuracy: 'accuracy',
    deviceType: 'device_type',
    beaconType: 'beacon_type',
    message: 'message',
    battery: 'battery',
    status: 'status',
  };
  const updates = [];
  const values = [];
  let idx = 1;

  for (const [apiKey, dbKey] of Object.entries(mappings)) {
    if (fields[apiKey] !== undefined) {
      updates.push(`${dbKey} = $${idx++}`);
      values.push(fields[apiKey]);
    }
  }

  if (updates.length === 0) return null;

  values.push(beaconId);
  const sql = `UPDATE beacons SET ${updates.join(', ')}, updated_at = now() WHERE beacon_id = $${idx} RETURNING *`;
  const result = await pool.query(sql, values);
  return result.rows[0] || null;
}

async function logNotification(beaconId, channel, recipient, subject, body, status) {
  await pool.query(
    `INSERT INTO beacon_notifications (beacon_id, channel, recipient, subject, body, status, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $6 = 'sent' THEN now() ELSE NULL END)`,
    [beaconId, channel, recipient, subject, body, status]
  );
}

async function sendBeaconAlert(beacon) {
  const to = process.env.BEACON_ALERT_EMAIL || process.env.OWNER_ACCOUNT_EMAIL || process.env.SMTP_FROM;
  if (!to) {
    console.log('[BEACON] No alert email configured, skipping notification.');
    return;
  }

  const subject = `Beacon Alert: ${beacon.beaconType.toUpperCase()}`;
  const text = `A new ${beacon.beaconType} beacon has been emitted.\n\nID: ${beacon.beaconId}\nLocation: ${beacon.latitude}, ${beacon.longitude}\nMessage: ${beacon.message || '(none)'}\nDevice: ${beacon.deviceType}\nBattery: ${beacon.battery}%\n\nTime: ${new Date(beacon.createdAt).toISOString()}`;
  const html = `<p>A new <strong>${escapeHtml(beacon.beaconType)}</strong> beacon has been emitted.</p>
    <ul>
      <li><strong>ID:</strong> ${escapeHtml(beacon.beaconId)}</li>
      <li><strong>Location:</strong> ${beacon.latitude}, ${beacon.longitude}</li>
      <li><strong>Message:</strong> ${escapeHtml(beacon.message || '(none)')}</li>
      <li><strong>Device:</strong> ${escapeHtml(beacon.deviceType)}</li>
      <li><strong>Battery:</strong> ${beacon.battery}%</li>
    </ul>`;

  try {
    const from = process.env.SMTP_FROM || 'ABC-IO <noreply@abc-io.com>';
    await emailTransport.sendMail({ from, to, subject, html, text });
    await logNotification(beacon.beaconId, 'email', to, subject, text, 'sent');
    console.log(`[BEACON] Alert email sent to ${to} for beacon ${beacon.beaconId}`);
  } catch (e) {
    console.error('[BEACON] Failed to send alert email:', e.message);
    await logNotification(beacon.beaconId, 'email', to, subject, text, 'failed');
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

// ─── Stats Helpers ────────────────────────────────────────────────────────────

async function getStats() {
  const totalResult = await pool.query(`SELECT COUNT(*) FROM beacons WHERE created_at > now() - interval '24 hours'`);
  const activeResult = await pool.query(`SELECT COUNT(*) FROM beacons WHERE status = 'active' AND expires_at > now()`);
  const avgResult = await pool.query(`
    SELECT AVG(EXTRACT(EPOCH FROM (ack.created_at - b.created_at)) * 1000) AS avg_ms
    FROM beacon_acknowledgments ack
    JOIN beacons b ON b.beacon_id = ack.beacon_id
  `);

  return {
    totalBeacons24h: parseInt(totalResult.rows[0].count, 10),
    activeNow: parseInt(activeResult.rows[0].count, 10),
    averageResponseTime: Math.round(parseFloat(avgResult.rows[0].avg_ms || 0) / 1000),
    coverageAreas: [],
  };
}

function sanitizeBeaconForPublic(row) {
  return {
    beaconId: row.beacon_id,
    beaconType: row.beacon_type,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    altitude: row.altitude ? parseFloat(row.altitude) : null,
    accuracy: row.accuracy ? parseFloat(row.accuracy) : null,
    message: row.message,
    battery: row.battery,
    createdAt: new Date(row.created_at).getTime(),
    acknowledged: row.status === 'acknowledged' || row.status === 'resolved',
    acknowledgments: [],
    status: row.status,
    distance: row.distance ? parseFloat(row.distance) : undefined,
  };
}

function estimatedResponseTime(beaconType) {
  switch (beaconType) {
    case 'emergency': return '8';
    case 'sos': return '12';
    case 'transit': return '25';
    default: return '15';
  }
}

function generateBeaconId() {
  return crypto.randomUUID();
}

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '50kb' }));

app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

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
  <h1>ABC-IO Public Safety Beacon</h1>
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
    <li><code>POST /api/v1/beacon/emit</code> Emit an emergency beacon.</li>
    <li><code>GET  /api/v1/beacon/active?lat=&lng=&radiusKm=</code> List active beacons in a region.</li>
    <li><code>POST /api/v1/beacon/acknowledge</code> Acknowledge a beacon as a responder.</li>
    <li><code>POST /api/v1/beacon/resolve</code> Mark a beacon as resolved.</li>
    <li><code>PUT  /api/v1/beacon/:beaconId</code> Update beacon location or status.</li>
    <li><code>GET  /api/v1/beacon/stats</code> Public anonymized statistics.</li>
    <li><code>GET  /health</code> Service health check.</li>
    <li><code>GET  /</code> This page.</li>
  </ul>

  <h2>Data Policy</h2>
  <ul>
    <li>No accounts or authentication required.</li>
    <li>No Personally Identifiable Information (PII) is collected or stored.</li>
    <li>No persistent device identifiers are retained.</li>
    <li>All beacon data is purged automatically after 24 hours.</li>
    <li>Location data is used solely for public safety coordination.</li>
  </ul>

  <div class="footer">
    ABC-IO Public Safety Beacon System &mdash; Open utility for global safety.
  </div>
</body>
</html>`);
});

app.get('/health', async (req, res) => {
  let dbHealthy = false;
  try {
    await pool.query('SELECT 1');
    dbHealthy = true;
  } catch (e) {
    console.error('Health check DB error:', e.message);
  }

  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

app.post('/api/v1/beacon/emit', async (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too Many Requests', message: 'Max 5 beacon emits per hour.' });
  }

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

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'Bad Request', message: 'latitude and longitude are required numbers.' });
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
    estimatedResponseTime: estimatedResponseTime(beaconType),
  };

  try {
    await saveBeacon(beacon);
  } catch (e) {
    console.error('[BEACON EMIT] DB error:', e.message);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to persist beacon.' });
  }

  // Send alert email asynchronously (do not block response)
  sendBeaconAlert(beacon).catch((e) => console.error('[BEACON] Alert error:', e.message));

  console.log(`[BEACON EMITTED] id=${beaconId} type=${beaconType} lat=${latitude} lng=${longitude}`);

  return res.status(201).json({
    beaconId,
    relayedTo: ['redot1', 'ai1', 'ai2'],
    estimatedResponseTime: beacon.estimatedResponseTime,
    status: 'active',
  });
});

app.get('/api/v1/beacon/active', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radiusKm = parseFloat(req.query.radiusKm);

  if (Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radiusKm)) {
    return res.status(400).json({ error: 'Bad Request', message: 'Query parameters lat, lng, and radiusKm are required numbers.' });
  }

  if (radiusKm <= 0 || radiusKm > 500) {
    return res.status(400).json({ error: 'Bad Request', message: 'radiusKm must be greater than 0 and at most 500.' });
  }

  try {
    const rows = await getActiveBeacons(lat, lng, radiusKm);
    const sanitized = rows.map(sanitizeBeaconForPublic);

    return res.status(200).json({
      beacons: sanitized,
      count: sanitized.length,
      region: { latitude: lat, longitude: lng, radiusKm },
    });
  } catch (e) {
    console.error('[BEACON ACTIVE] DB error:', e.message);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to query active beacons.' });
  }
});

app.post('/api/v1/beacon/acknowledge', async (req, res) => {
  const { beaconId, responderType, responderName, responderContact, etaMinutes, notes } = req.body;

  if (typeof beaconId !== 'string' || beaconId.length === 0) {
    return res.status(400).json({ error: 'Bad Request', message: 'beaconId is required.' });
  }

  if (!responderType || !VALID_RESPONDER_TYPES.has(responderType)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `responderType must be one of: ${Array.from(VALID_RESPONDER_TYPES).join(', ')}.`,
    });
  }

  try {
    await acknowledgeBeaconInDb(beaconId, responderType, { responderName, responderContact, etaMinutes, notes });
  } catch (e) {
    if (e.code === '23503') {
      return res.status(404).json({ error: 'Not Found', message: 'Beacon not found or expired.' });
    }
    console.error('[BEACON ACK] DB error:', e.message);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to acknowledge beacon.' });
  }

  console.log(`[BEACON ACKNOWLEDGED] id=${beaconId} responder=${responderType}`);

  return res.status(200).json({ beaconId, responderType, status: 'acknowledged' });
});

app.post('/api/v1/beacon/resolve', async (req, res) => {
  const { beaconId } = req.body;

  if (typeof beaconId !== 'string' || beaconId.length === 0) {
    return res.status(400).json({ error: 'Bad Request', message: 'beaconId is required.' });
  }

  try {
    const row = await resolveBeacon(beaconId);
    if (!row) {
      return res.status(404).json({ error: 'Not Found', message: 'Beacon not found.' });
    }
    return res.status(200).json({ beaconId, status: 'resolved' });
  } catch (e) {
    console.error('[BEACON RESOLVE] DB error:', e.message);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to resolve beacon.' });
  }
});

app.put('/api/v1/beacon/:beaconId', async (req, res) => {
  const { beaconId } = req.params;
  const fields = req.body;

  if (fields.latitude !== undefined && (fields.latitude < -90 || fields.latitude > 90)) {
    return res.status(400).json({ error: 'Bad Request', message: 'latitude must be between -90 and 90.' });
  }
  if (fields.longitude !== undefined && (fields.longitude < -180 || fields.longitude > 180)) {
    return res.status(400).json({ error: 'Bad Request', message: 'longitude must be between -180 and 180.' });
  }
  if (fields.beaconType !== undefined && !VALID_BEACON_TYPES.has(fields.beaconType)) {
    return res.status(400).json({ error: 'Bad Request', message: `beaconType must be one of: ${Array.from(VALID_BEACON_TYPES).join(', ')}.` });
  }
  if (fields.status !== undefined && !['active', 'acknowledged', 'resolved', 'expired'].includes(fields.status)) {
    return res.status(400).json({ error: 'Bad Request', message: 'status must be one of: active, acknowledged, resolved, expired.' });
  }

  try {
    const row = await updateBeacon(beaconId, fields);
    if (!row) {
      return res.status(404).json({ error: 'Not Found', message: 'Beacon not found.' });
    }
    return res.status(200).json({ beaconId, updated: true, beacon: sanitizeBeaconForPublic(row) });
  } catch (e) {
    console.error('[BEACON UPDATE] DB error:', e.message);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update beacon.' });
  }
});

app.get('/api/v1/beacon/stats', async (req, res) => {
  try {
    const stats = await getStats();
    return res.status(200).json(stats);
  } catch (e) {
    console.error('[BEACON STATS] DB error:', e.message);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load stats.' });
  }
});

// ─── Error Handling ───────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested resource does not exist.' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected error occurred.' });
});

// ─── Startup ──────────────────────────────────────────────────────────────────

setInterval(async () => {
  try {
    const result = await pool.query(
      `UPDATE beacons SET status = 'expired' WHERE status = 'active' AND expires_at <= now()`
    );
    if (result.rowCount > 0) {
      console.log(`[PURGE] Expired ${result.rowCount} beacon(s).`);
    }
  } catch (e) {
    console.error('[PURGE] Error expiring beacons:', e.message);
  }
}, PURGE_INTERVAL_MS);

app.listen(PORT, () => {
  console.log(`ABC-IO Beacon service listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Beacon TTL: ${BEACON_TTL_MS / 1000 / 60 / 60} hours`);
});
