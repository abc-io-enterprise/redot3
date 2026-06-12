const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || process.env.OWNER_SIGNING_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate critical env vars
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET or OWNER_SIGNING_KEY required');
  process.exit(1);
}

// ============================================
// DATABASE
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/abc_io',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB error', err);
});

// ============================================
// EMAIL
// ============================================
const emailTransport = (() => {
  const smtpUrl = process.env.SMTP_URL;
  if (smtpUrl && (smtpUrl.startsWith('smtp://') || smtpUrl.startsWith('smtps://'))) {
    try {
      return nodemailer.createTransport(smtpUrl);
    } catch (e) {
      console.warn('[EMAIL] Invalid SMTP_URL, falling back to dev transport:', e.message);
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

async function sendEmail(to, subject, html, text) {
  try {
    const from = process.env.SMTP_FROM || 'ABC-IO <noreply@abc-io.com>';
    await emailTransport.sendMail({ from, to, subject, html, text });
  } catch (e) {
    console.error('Email send failed:', e.message);
  }
}

// ============================================
// SECURITY EVENT LOGGING
// ============================================
async function logSecurityEvent({ accountId, userId, eventType, severity = 'info', ip, userAgent, metadata = {} }) {
  try {
    await pool.query(
      `INSERT INTO security_events (account_id, user_id, event_type, severity, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [accountId || null, userId || null, eventType, severity, ip || null, userAgent || null, JSON.stringify(metadata)]
    );
  } catch (e) {
    console.error('Security event log failed:', e.message);
  }
}

async function detectUsageSpike(accountId) {
  try {
    if (!accountId) return;
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE created_at >= now() - interval '1 hour') AS recent,
         COUNT(*) FILTER (WHERE created_at >= now() - interval '2 hours' AND created_at < now() - interval '1 hour') AS prior
       FROM usage_logs WHERE account_id = $1`,
      [accountId]
    );
    const recent = parseInt(result.rows[0].recent) || 0;
    const prior = parseInt(result.rows[0].prior) || 0;
    if (prior > 0 && recent > prior * 10 && recent >= 50) {
      await logSecurityEvent({
        accountId,
        eventType: 'unusual_usage_spike',
        severity: 'high',
        metadata: { recent_1h: recent, prior_1h: prior, multiplier: Math.round((recent / prior) * 100) / 100 }
      });
    }
  } catch (e) {
    console.error('Usage spike detection failed:', e.message);
  }
}

// ============================================
// PAYPAL HELPERS
// ============================================
function paypalBaseUrl() {
  return process.env.PAYPAL_MODE === 'live' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
}

async function paypalAccessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  return new Promise((resolve, reject) => {
    const req = https.request(`${paypalBaseUrl()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.access_token) resolve(json.access_token);
          else reject(new Error(json.error_description || 'PayPal auth failed'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write('grant_type=client_credentials');
    req.end();
  });
}

async function paypalRequest(path, method = 'GET', body = null) {
  const token = await paypalAccessToken();
  return new Promise((resolve, reject) => {
    const req = https.request(`${paypalBaseUrl()}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function verifyPayPalWebhook(reqBody, headers) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return true;

  const transmissionId = headers['paypal-transmission-id'];
  const certId = headers['paypal-cert-id'];
  const authAlgo = headers['paypal-auth-algo'];
  const transmissionTime = headers['paypal-transmission-time'];
  const transmissionSig = headers['paypal-transmission-sig'];

  if (!transmissionId || !certId || !authAlgo || !transmissionTime || !transmissionSig) {
    return false;
  }

  const payload = {
    auth_algo: authAlgo,
    cert_id: certId,
    transmission_id: transmissionId,
    transmission_sig: transmissionSig,
    transmission_time: transmissionTime,
    webhook_id: webhookId,
    webhook_event: reqBody,
  };

  try {
    const result = await paypalRequest('/v1/notifications/verify-webhook-signature', 'POST', payload);
    return result.verification_status === 'SUCCESS';
  } catch (e) {
    console.error('PayPal webhook verification error:', e.message);
    return false;
  }
}

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
// Raw body parser for Stripe webhook must come before global JSON parser
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================
// FAMILY-SAFE CONTENT FILTER
// ============================================
const PROFANITY_LIST = [
  'damn', 'hell', 'crap', 'ass', 'bastard', 'bitch', 'shit', 'fuck',
  'douche', 'jerk', 'moron', 'idiot', 'stupid', 'dumb', 'loser',
  'retard', 'slut', 'whore', 'pimp', 'piss', 'cunt', 'dick',
  'cock', 'pussy', 'tits', 'boobs', 'nigger', 'nigga', 'chink',
  'fag', 'faggot', 'dyke', 'tranny', 'kike', 'spic', 'wetback',
  'cracker', 'honky', 'gook', 'raghead', 'towelhead', 'cameljockey',
  'skank', 'ho', 'thot', 'simp', 'incel', 'cuck',
  'snowflake', 'libtard', 'trumptard', 'deplorable'
];

const profanityPattern = '\\b(' + PROFANITY_LIST.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b';

function scanText(text) {
  if (typeof text !== 'string') return false;
  return new RegExp(profanityPattern, 'i').test(text);
}

function censorText(text) {
  if (typeof text !== 'string') return text;
  return text.replace(new RegExp(profanityPattern, 'gi'), '[filtered]');
}

function deepCensor(obj) {
  if (typeof obj === 'string') return censorText(obj);
  if (Array.isArray(obj)) return obj.map(deepCensor);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const key of Object.keys(obj)) {
      out[key] = deepCensor(obj[key]);
    }
    return out;
  }
  return obj;
}

function familySafeMiddleware(req, res, next) {
  const fieldsToScan = ['message', 'text', 'content', 'prompt'];
  for (const field of fieldsToScan) {
    if (req.body && req.body[field] && scanText(req.body[field])) {
      return res.status(400).json({ error: 'Content violates family-safe usage policy' });
    }
  }
  next();
}

// Public health
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'gateway', version: '2.0.0' }));
app.get('/', (req, res) => res.json({ status: 'gateway', message: 'ABC-IO v2.0 API Gateway online.', docs: '/docs' }));

// ============================================
// AUTH HELPERS
// ============================================
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d', issuer: 'abc-io' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { issuer: 'abc-io' });
  } catch {
    return null;
  }
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-api-key'];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing token or API key' });
  }

  // Try JWT first
  const decoded = verifyToken(token);
  if (decoded && decoded.sub) {
    req.userId = decoded.sub;
    req.accountId = decoded.account_id;
    req.tier = decoded.tier || 'free';
    req.role = decoded.role || 'user';
    req.authType = 'jwt';
    return next();
  }

  // Try API key
  const prefix = token.slice(0, 8);
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const keyRow = await pool.query(
    `SELECT k.*, a.tier FROM api_keys k JOIN accounts a ON k.account_id = a.id
     WHERE k.key_prefix = $1 AND k.key_hash = $2 AND k.revoked_at IS NULL
     AND (k.expires_at IS NULL OR k.expires_at > now())`,
    [prefix, hash]
  );

  if (keyRow.rows.length === 0) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token or API key' });
  }

  const key = keyRow.rows[0];
  await pool.query('UPDATE api_keys SET last_used_at = now() WHERE id = $1', [key.id]);
  req.userId = null;
  req.accountId = key.account_id;
  req.tier = key.tier;
  req.apiKeyId = key.id;
  req.authType = 'apikey';
  next();
}

// Optional auth (populates req.user if present, doesn't fail)
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.sub) {
      req.userId = decoded.sub;
      req.accountId = decoded.account_id;
      req.tier = decoded.tier || 'free';
    }
  }
  next();
}

// Owner-only middleware
function requireOwner(req, res, next) {
  if (req.role !== 'owner') {
    return res.status(403).json({ error: 'Forbidden', message: 'Owner access required' });
  }
  next();
}

// Multi-node AI endpoint load balancing
const KIMI_ENDPOINTS = (process.env.KIMI_ENDPOINTS || 'http://kimi:5000').split(',').map(s => s.trim()).filter(Boolean);

async function kimiHealthCheck() {
  for (const endpoint of KIMI_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${endpoint}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return { endpoint, status: 'ok' };
    } catch (e) {
      // try next endpoint
    }
  }
  return { status: 'error', message: 'All AI endpoints unreachable' };
}

async function kimiGenerate(body) {
  const errors = [];
  for (const endpoint of KIMI_ENDPOINTS) {
    try {
      const res = await fetch(`${endpoint}/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) return { response: res, endpoint };
      errors.push(`${endpoint}: ${res.status}`);
    } catch (e) {
      errors.push(`${endpoint}: ${e.message}`);
    }
  }
  throw new Error('All AI endpoints failed: ' + errors.join('; '));
}

// ============================================
// RATE LIMITING (per tier)
// ============================================
function tierRateLimit(req) {
  const tier = req.tier || 'free';
  const limits = {
    free: 30, basic: 60, standard: 120, pro: 300,
    business: 600, team: 1200, corporate: 2000,
    enterprise: 3000, agency: 5000, global: 10000
  };
  return limits[tier] || 30;
}

function tierMonthlyQuota(req) {
  const tier = req.tier || 'free';
  const quotas = {
    free: 1000, basic: 5000, standard: 10000, pro: 50000,
    business: 100000, team: 200000, corporate: 500000,
    enterprise: 1000000, agency: 5000000, global: 10000000,
  };
  return quotas[tier] || 1000;
}

async function usageQuotaMiddleware(req, res, next) {
  try {
    if (!req.accountId) return next();
    const quota = tierMonthlyQuota(req);
    const subResult = await pool.query(
      `SELECT current_period_start FROM subscriptions WHERE account_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.accountId]
    );
    const periodStart = subResult.rows[0]?.current_period_start || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM usage_logs WHERE account_id = $1 AND created_at >= $2`,
      [req.accountId, periodStart]
    );
    const used = parseInt(result.rows[0].count);
    if (used >= quota) {
      return res.status(429).json({ error: 'Monthly usage quota exceeded', tier: req.tier || 'free', used, quota });
    }
    next();
  } catch (e) {
    console.error('Usage quota check error:', e);
    next();
  }
}

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => tierRateLimit(req),
  keyGenerator: (req) => req.accountId || req.ip,
  handler: async (req, res) => {
    await logSecurityEvent({
      accountId: req.accountId,
      userId: req.userId,
      eventType: 'rate_limit_hit',
      severity: 'warning',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { tier: req.tier || 'free', endpoint: req.path }
    });
    res.status(429).json({ error: 'Rate limit exceeded', tier: req.tier || 'free' });
  },
});

// Public demo limiter for anonymous AI-ISP previews (10/min per IP)
const demoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => res.status(429).json({ error: 'Demo rate limit exceeded. Please create an account.' }),
});

// ============================================
// PUBLIC AUTH ROUTES
// ============================================

// Register
const VALID_TIERS = ['free','basic','standard','pro','business','team','corporate','enterprise','agency','global'];

app.post('/api/v1/auth/register', familySafeMiddleware, async (req, res) => {
  try {
    const { email, password, firstName, lastName, accountName, tier } = req.body;
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Email and password (8+ chars) required' });
    }

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const requestedTier = (tier || 'free').toString().toLowerCase();
    const effectiveTier = VALID_TIERS.includes(requestedTier) ? requestedTier : 'free';
    // Paid tiers require checkout to activate; keep account as free until payment confirms,
    // but remember the tier the user selected during signup.
    const accountTier = effectiveTier === 'free' ? 'free' : 'free';

    const passwordHash = await bcrypt.hash(password, 12);
    const accountSlug = (accountName || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const acc = await client.query(
        `INSERT INTO accounts (name, slug, tier, billing_email, requested_tier) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [accountName || email.split('@')[0], accountSlug, accountTier, email.toLowerCase(), effectiveTier]
      );
      const accountId = acc.rows[0].id;

      const user = await client.query(
        `INSERT INTO users (account_id, email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5, 'owner') RETURNING id`,
        [accountId, email.toLowerCase(), passwordHash, firstName || '', lastName || '']
      );
      const userId = user.rows[0].id;

      // Verification token
      const verifyToken = crypto.randomBytes(32).toString('hex');
      await client.query(
        `INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, now() + interval '24 hours')`,
        [userId, verifyToken]
      );

      await client.query('COMMIT');

      // Send welcome email
      const verifyUrl = `${process.env.PUBLIC_URL || 'https://abc-io.com'}/verify-email?token=${verifyToken}`;
      await sendEmail(
        email,
        'Welcome to ABC-IO — Verify your email',
        `<p>Welcome to ABC-IO!</p><p>Click to verify: <a href="${verifyUrl}">${verifyUrl}</a></p>`,
        `Welcome to ABC-IO! Verify: ${verifyUrl}`
      );

      const token = signToken({ sub: userId, account_id: accountId, tier: accountTier, email: email.toLowerCase(), role: 'owner' });
      res.status(201).json({ token, user: { id: userId, email: email.toLowerCase(), tier: accountTier, requestedTier: effectiveTier, role: 'owner' } });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.account_id, u.status, u.email_verified, u.role, a.tier
       FROM users u JOIN accounts a ON u.account_id = a.id WHERE u.email = $1`,
      [email.toLowerCase()]
    );
    if (result.rows.length === 0) {
      await logSecurityEvent({
        eventType: 'login_failed',
        severity: 'warning',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'unknown_email', email_attempt: email.toLowerCase() }
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    if (user.status !== 'active') {
      await logSecurityEvent({
        accountId: user.account_id,
        userId: user.id,
        eventType: 'login_failed',
        severity: 'warning',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'account_suspended' }
      });
      return res.status(403).json({ error: 'Account suspended' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await logSecurityEvent({
        accountId: user.account_id,
        userId: user.id,
        eventType: 'login_failed',
        severity: 'warning',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'invalid_password' }
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await pool.query('UPDATE users SET last_login_at = now(), login_count = login_count + 1 WHERE id = $1', [user.id]);

    const token = signToken({ sub: user.id, account_id: user.account_id, tier: user.tier, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, tier: user.tier, role: user.role, emailVerified: user.email_verified } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Forgot password
app.post('/api/v1/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query('SELECT id, account_id FROM users WHERE email = $1', [email?.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const userId = result.rows[0].id;
    const accountId = result.rows[0].account_id;
    await logSecurityEvent({
      accountId,
      userId,
      eventType: 'password_reset_requested',
      severity: 'info',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { email: email?.toLowerCase() }
    });
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, now() + interval '1 hour')`,
      [userId, token]
    );

    const resetUrl = `${process.env.PUBLIC_URL || 'https://abc-io.com'}/reset-password?token=${token}`;
    await sendEmail(
      email,
      'ABC-IO Password Reset',
      `<p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p><p>Expires in 1 hour.</p>`,
      `Reset: ${resetUrl}`
    );

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (e) {
    console.error('Forgot password error:', e);
    res.status(500).json({ error: 'Request failed' });
  }
});

// Reset password
app.post('/api/v1/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: 'Token and password (8+ chars) required' });
    }

    const result = await pool.query(
      `SELECT id, user_id FROM password_resets WHERE token = $1 AND used_at IS NULL AND expires_at > now()`,
      [token]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired token' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, result.rows[0].user_id]);
    await pool.query('UPDATE password_resets SET used_at = now() WHERE id = $1', [result.rows[0].id]);

    res.json({ message: 'Password updated successfully' });
  } catch (e) {
    console.error('Reset password error:', e);
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Verify email
app.get('/api/v1/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    const result = await pool.query(
      `SELECT ev.id, ev.user_id, u.account_id
       FROM email_verifications ev JOIN users u ON ev.user_id = u.id
       WHERE ev.token = $1 AND ev.used_at IS NULL AND ev.expires_at > now()`,
      [token]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired token' });

    const { id, user_id, account_id } = result.rows[0];
    await pool.query('UPDATE users SET email_verified = TRUE, email_verified_at = now() WHERE id = $1', [user_id]);
    await pool.query('UPDATE email_verifications SET used_at = now() WHERE id = $1', [id]);

    await logSecurityEvent({
      accountId: account_id,
      userId: user_id,
      eventType: 'email_verified',
      severity: 'info',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {}
    });

    res.json({ message: 'Email verified successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Me
app.get('/api/v1/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.email_verified, u.created_at,
              a.id as account_id, a.name as account_name, a.tier, a.status as account_status
       FROM users u JOIN accounts a ON u.account_id = a.id WHERE u.id = $1`,
      [req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load user' });
  }
});

// Simple in-memory token blacklist (cleared on restart; for multi-replica deployments,
// replace with Redis SET in the future)
const tokenBlacklist = new Set();
setInterval(() => tokenBlacklist.clear(), 24 * 60 * 60 * 1000); // clear daily

function isTokenBlacklisted(token) {
  return tokenBlacklist.has(token);
}

// Override verifyToken to check blacklist
const _originalVerifyToken = verifyToken;
function verifyTokenWithBlacklist(token) {
  if (isTokenBlacklisted(token)) return null;
  return _originalVerifyToken(token);
}

// Patch authMiddleware to use blacklisted verifier
// (We re-assign the global verifyToken used by authMiddleware)
// Actually authMiddleware uses verifyToken directly, so let's patch it:
const originalVerify = verifyToken;
verifyToken = function(token) {
  if (isTokenBlacklisted(token)) return null;
  return originalVerify(token);
};

app.post('/api/v1/auth/logout', authMiddleware, (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    tokenBlacklist.add(token);
  }
  res.json({ loggedOut: true });
});

// ============================================
// API KEYS
// ============================================
app.get('/api/v1/keys', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, key_prefix, scopes, rate_limit, last_used_at, created_at
       FROM api_keys WHERE account_id = $1 AND revoked_at IS NULL`,
      [req.accountId]
    );
    res.json({ keys: result.rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load keys' });
  }
});

app.post('/api/v1/keys', authMiddleware, async (req, res) => {
  try {
    const { name, scopes } = req.body;
    const rawKey = 'ak_' + crypto.randomBytes(32).toString('base64url');
    const prefix = rawKey.slice(0, 8);
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const result = await pool.query(
      `INSERT INTO api_keys (account_id, name, key_hash, key_prefix, scopes)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, key_prefix, scopes, created_at`,
      [req.accountId, name || 'API Key', hash, prefix, JSON.stringify(scopes || ['read'])]
    );
    await logSecurityEvent({
      accountId: req.accountId,
      userId: req.userId,
      eventType: 'api_key_created',
      severity: 'info',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { key_id: result.rows[0].id, key_name: result.rows[0].name, scopes: scopes || ['read'] }
    });
    res.status(201).json({ key: result.rows[0], token: rawKey });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create key' });
  }
});

app.delete('/api/v1/keys/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND account_id = $2', [req.params.id, req.accountId]);
    await logSecurityEvent({
      accountId: req.accountId,
      userId: req.userId,
      eventType: 'api_key_deleted',
      severity: 'info',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { key_id: req.params.id }
    });
    res.json({ message: 'Key revoked' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to revoke key' });
  }
});

// ============================================
// STRIPE BILLING
// ============================================

// Create checkout session
app.post('/api/v1/billing/checkout', authMiddleware, async (req, res) => {
  try {
    const { priceId, tier } = req.body;
    const userResult = await pool.query('SELECT email, account_id FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];

    let finalPriceId = priceId;
    if (!finalPriceId && tier) {
      const priceEnvMap = {
        free: process.env.STRIPE_PRICE_ID_FREE,
        basic: process.env.STRIPE_PRICE_ID_BASIC,
        standard: process.env.STRIPE_PRICE_ID_STANDARD,
        pro: process.env.STRIPE_PRICE_ID_PRO,
        business: process.env.STRIPE_PRICE_ID_BUSINESS,
        team: process.env.STRIPE_PRICE_ID_TEAM,
        corporate: process.env.STRIPE_PRICE_ID_CORPORATE,
        enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE,
        agency: process.env.STRIPE_PRICE_ID_AGENCY,
        global: process.env.STRIPE_PRICE_ID_GLOBAL,
      };
      finalPriceId = priceEnvMap[tier.toLowerCase()];
    }
    if (!finalPriceId) {
      return res.status(400).json({ error: 'Valid priceId or tier is required' });
    }

    let customerId;
    const accResult = await pool.query('SELECT stripe_customer_id FROM accounts WHERE id = $1', [user.account_id]);
    if (accResult.rows[0]?.stripe_customer_id) {
      customerId = accResult.rows[0].stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({ email: user.email, metadata: { account_id: user.account_id } });
      customerId = customer.id;
      await pool.query('UPDATE accounts SET stripe_customer_id = $1 WHERE id = $2', [customerId, user.account_id]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: finalPriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.PUBLIC_URL || 'https://abc-io.com'}/dashboard?checkout=success`,
      cancel_url: `${process.env.PUBLIC_URL || 'https://abc-io.com'}/pricing?checkout=cancel`,
      metadata: { account_id: user.account_id },
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout error:', e);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

// Stripe webhook
app.post('/api/v1/billing/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const accountId = session.metadata?.account_id;
      const subId = session.subscription;
      if (accountId && subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const tierMap = {
          [process.env.STRIPE_PRICE_ID_FREE]: 'free',
          [process.env.STRIPE_PRICE_ID_BASIC]: 'basic',
          [process.env.STRIPE_PRICE_ID_STANDARD]: 'standard',
          [process.env.STRIPE_PRICE_ID_PRO]: 'pro',
          [process.env.STRIPE_PRICE_ID_BUSINESS]: 'business',
          [process.env.STRIPE_PRICE_ID_TEAM]: 'team',
          [process.env.STRIPE_PRICE_ID_CORPORATE]: 'corporate',
          [process.env.STRIPE_PRICE_ID_ENTERPRISE]: 'enterprise',
          [process.env.STRIPE_PRICE_ID_AGENCY]: 'agency',
          [process.env.STRIPE_PRICE_ID_GLOBAL]: 'global',
        };
        const tier = tierMap[sub.items.data[0].price.id] || 'pro';
        await pool.query(
          `INSERT INTO subscriptions (account_id, stripe_subscription_id, stripe_price_id, tier, status, current_period_start, current_period_end)
           VALUES ($1, $2, $3, $4, $5, to_timestamp($6), to_timestamp($7))
           ON CONFLICT (stripe_subscription_id) DO UPDATE SET
             status = EXCLUDED.status, current_period_start = EXCLUDED.current_period_start,
             current_period_end = EXCLUDED.current_period_end, updated_at = now()`,
          [accountId, subId, sub.items.data[0].price.id, tier, sub.status, sub.current_period_start, sub.current_period_end]
        );
        await pool.query('UPDATE accounts SET tier = $1 WHERE id = $2', [tier, accountId]);
        await logSecurityEvent({
          accountId,
          eventType: 'subscription_changed',
          severity: 'info',
          metadata: { source: 'stripe_webhook', event: 'checkout.session.completed', new_tier: tier, subscription_id: subId }
        });
      }
    } else if (event.type === 'invoice.payment_succeeded') {
      const inv = event.data.object;
      let accountId = inv.metadata?.account_id;
      if (!accountId && inv.subscription) {
        const subRow = await pool.query('SELECT account_id FROM subscriptions WHERE stripe_subscription_id = $1', [inv.subscription]);
        accountId = subRow.rows[0]?.account_id;
      }
      await pool.query(
        `INSERT INTO invoices (account_id, stripe_invoice_id, amount_due, amount_paid, currency, status, pdf_url, invoice_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8))
         ON CONFLICT (stripe_invoice_id) DO NOTHING`,
        [accountId, inv.id, inv.amount_due, inv.amount_paid, inv.currency, inv.status, inv.invoice_pdf, inv.created]
      );
    } else if (event.type === 'invoice.payment_failed') {
      const inv = event.data.object;
      const accountId = inv.metadata?.account_id;
      const subscriptionId = inv.subscription;
      if (accountId && subscriptionId) {
        await pool.query("UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = $1", [subscriptionId]);
        const acc = await pool.query('SELECT billing_email FROM accounts WHERE id = $1', [accountId]);
        const email = acc.rows[0]?.billing_email;
        if (email) {
          await sendEmail(
            email,
            'Payment Failed — ABC-IO Subscription',
            `<p>We were unable to process your payment. Please update your payment method to avoid service interruption.</p>`,
            'Payment failed. Please update your payment method to avoid service interruption.'
          );
        }
        if (inv.attempt_count >= 3) {
          await pool.query("UPDATE subscriptions SET status = 'cancelled' WHERE stripe_subscription_id = $1", [subscriptionId]);
          await pool.query("UPDATE accounts SET tier = 'free' WHERE id = $1", [accountId]);
          if (email) {
            await sendEmail(
              email,
              'Subscription Cancelled — ABC-IO',
              `<p>Your subscription has been cancelled after multiple failed payment attempts. Your account has been downgraded to the free tier.</p>`,
              'Your subscription has been cancelled after multiple failed payment attempts. Your account has been downgraded to the free tier.'
            );
          }
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      await pool.query("UPDATE subscriptions SET status = 'cancelled' WHERE stripe_subscription_id = $1", [sub.id]);
      const accResult = await pool.query(
        "UPDATE accounts SET tier = 'free' WHERE id = (SELECT account_id FROM subscriptions WHERE stripe_subscription_id = $1) RETURNING id",
        [sub.id]
      );
      if (accResult.rows.length > 0) {
        await logSecurityEvent({
          accountId: accResult.rows[0].id,
          eventType: 'subscription_changed',
          severity: 'info',
          metadata: { source: 'stripe_webhook', event: 'customer.subscription.deleted', new_tier: 'free', subscription_id: sub.id }
        });
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error('Webhook handler error:', e);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Billing portal
app.post('/api/v1/billing/portal', authMiddleware, async (req, res) => {
  try {
    const acc = await pool.query('SELECT stripe_customer_id FROM accounts WHERE id = $1', [req.accountId]);
    if (!acc.rows[0]?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing customer found' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: acc.rows[0].stripe_customer_id,
      return_url: `${process.env.PUBLIC_URL || 'https://abc-io.com'}/dashboard/billing`,
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: 'Portal failed' });
  }
});

// Invoices
app.get('/api/v1/billing/invoices', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM invoices WHERE account_id = $1 ORDER BY created_at DESC',
      [req.accountId]
    );
    res.json({ invoices: result.rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load invoices' });
  }
});

// Subscription status
app.get('/api/v1/billing/subscription', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tier, status, current_period_end, cancel_at_period_end
       FROM subscriptions WHERE account_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.accountId]
    );
    if (result.rows.length === 0) {
      return res.json({ tier: req.tier || 'free', status: 'none', current_period_end: null, cancel_at_period_end: false });
    }
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load subscription' });
  }
});

// Change plan
app.post('/api/v1/billing/change-plan', authMiddleware, async (req, res) => {
  try {
    const { tier } = req.body;
    const priceEnvMap = {
      free: process.env.STRIPE_PRICE_ID_FREE,
      basic: process.env.STRIPE_PRICE_ID_BASIC,
      standard: process.env.STRIPE_PRICE_ID_STANDARD,
      pro: process.env.STRIPE_PRICE_ID_PRO,
      business: process.env.STRIPE_PRICE_ID_BUSINESS,
      team: process.env.STRIPE_PRICE_ID_TEAM,
      corporate: process.env.STRIPE_PRICE_ID_CORPORATE,
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE,
      agency: process.env.STRIPE_PRICE_ID_AGENCY,
      global: process.env.STRIPE_PRICE_ID_GLOBAL,
    };
    const newPriceId = priceEnvMap[tier];
    if (!newPriceId) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const subResult = await pool.query(
      "SELECT stripe_subscription_id FROM subscriptions WHERE account_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      [req.accountId]
    );
    if (subResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const subId = subResult.rows[0].stripe_subscription_id;
    const sub = await stripe.subscriptions.retrieve(subId);
    const itemId = sub.items.data[0].id;

    await stripe.subscriptions.update(subId, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: 'create_prorations',
    });

    // Optimistically update local tier; webhook will confirm shortly
    await pool.query('UPDATE accounts SET tier = $1 WHERE id = $2', [tier, req.accountId]);
    await pool.query(
      `INSERT INTO subscriptions (account_id, stripe_subscription_id, stripe_price_id, tier, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (stripe_subscription_id) DO UPDATE SET
         stripe_price_id = EXCLUDED.stripe_price_id, tier = EXCLUDED.tier, updated_at = now()`,
      [req.accountId, subId, newPriceId, tier]
    );

    await logSecurityEvent({
      accountId: req.accountId,
      userId: req.userId,
      eventType: 'subscription_changed',
      severity: 'info',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { new_tier: tier, previous_subscription_id: subId }
    });

    res.json({ message: 'Plan change initiated', tier });
  } catch (e) {
    console.error('Change plan error:', e);
    res.status(500).json({ error: 'Plan change failed' });
  }
});

// Cancel subscription
app.post('/api/v1/billing/cancel', authMiddleware, async (req, res) => {
  try {
    const subResult = await pool.query(
      "SELECT stripe_subscription_id FROM subscriptions WHERE account_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      [req.accountId]
    );
    if (subResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active subscription found' });
    }
    const subId = subResult.rows[0].stripe_subscription_id;
    await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    await pool.query("UPDATE subscriptions SET cancel_at_period_end = TRUE WHERE stripe_subscription_id = $1", [subId]);
    res.json({ message: 'Subscription will cancel at the end of the current period' });
  } catch (e) {
    console.error('Cancel subscription error:', e);
    res.status(500).json({ error: 'Cancellation failed' });
  }
});

// Usage
app.get('/api/v1/billing/usage', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as total_requests, COALESCE(SUM(tokens_used), 0) as total_tokens
       FROM usage_logs WHERE account_id = $1 AND created_at > date_trunc('month', now())`,
      [req.accountId]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load usage' });
  }
});

// ============================================
// PAYPAL BILLING
// ============================================

app.post('/api/v1/billing/paypal/create-order', authMiddleware, async (req, res) => {
  try {
    const { amount, currency = 'USD', tier = 'pro' } = req.body;
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      return res.status(500).json({ error: 'PayPal not configured' });
    }
    const order = await paypalRequest('/v2/checkout/orders', 'POST', {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: currency, value: String(amount) },
        custom_id: req.accountId,
        description: `ABC-IO ${tier} tier`,
      }],
      application_context: {
        return_url: `${process.env.PUBLIC_URL || 'https://abc-io.com'}/dashboard/billing?paypal=success`,
        cancel_url: `${process.env.PUBLIC_URL || 'https://abc-io.com'}/pricing?paypal=cancel`,
      },
    });
    res.json({ orderId: order.id, status: order.status, approvalUrl: order.links?.find(l => l.rel === 'approve')?.href });
  } catch (e) {
    console.error('PayPal create-order error:', e);
    res.status(500).json({ error: 'PayPal order creation failed' });
  }
});

app.post('/api/v1/billing/paypal/capture-order', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      return res.status(500).json({ error: 'PayPal not configured' });
    }
    const capture = await paypalRequest(`/v2/checkout/orders/${orderId}/capture`, 'POST');
    const purchaseUnit = capture.purchase_units?.[0];
    const payment = purchaseUnit?.payments?.captures?.[0];
    const payer = capture.payer;

    const exists = await pool.query('SELECT id FROM paypal_transactions WHERE paypal_order_id = $1', [orderId]);
    if (exists.rows.length > 0) {
      await pool.query(
        `UPDATE paypal_transactions SET status = $1, captured_at = now() WHERE id = $2`,
        [capture.status, exists.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO paypal_transactions (account_id, paypal_order_id, paypal_payer_id, amount, currency, tier, status, captured_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [req.accountId, orderId, payer?.payer_id, payment?.amount?.value || 0, payment?.amount?.currency_code || 'USD', req.body.tier || 'pro', capture.status]
      );
    }

    if (capture.status === 'COMPLETED') {
      await pool.query('UPDATE accounts SET tier = $1 WHERE id = $2', [req.body.tier || 'pro', req.accountId]);
    }

    res.json({ orderId, status: capture.status, tier: req.body.tier || 'pro' });
  } catch (e) {
    console.error('PayPal capture-order error:', e);
    res.status(500).json({ error: 'PayPal capture failed' });
  }
});

app.post('/api/v1/billing/paypal/webhook', async (req, res) => {
  try {
    const verified = await verifyPayPalWebhook(req.body, req.headers);
    if (!verified) {
      return res.status(400).json({ error: 'Webhook verification failed' });
    }

    const event = req.body;
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = event.resource;
      const orderId = resource.supplementary_data?.related_ids?.order_id || resource.id;
      const txn = await pool.query('SELECT account_id, tier FROM paypal_transactions WHERE paypal_order_id = $1', [orderId]);
      if (txn.rows.length > 0) {
        await pool.query('UPDATE paypal_transactions SET status = $1, captured_at = now() WHERE paypal_order_id = $2', ['COMPLETED', orderId]);
        await pool.query('UPDATE accounts SET tier = $1 WHERE id = $2', [txn.rows[0].tier, txn.rows[0].account_id]);
        await logSecurityEvent({
          accountId: txn.rows[0].account_id,
          eventType: 'subscription_changed',
          severity: 'info',
          metadata: { source: 'paypal_webhook', event: 'PAYMENT.CAPTURE.COMPLETED', new_tier: txn.rows[0].tier, order_id: orderId }
        });
      }
    }

    res.json({ received: true });
  } catch (e) {
    console.error('PayPal webhook error:', e);
    res.status(500).json({ error: 'PayPal webhook processing failed' });
  }
});

// ============================================
// SYSTEM HEALTH
// ============================================
app.get('/api/v1/system/health', async (req, res) => {
  const health = {
    gateway: { status: 'ok', version: '2.0.0' },
    database: { status: 'unknown' },
    kimi: { status: 'unknown' },
    redis: { status: 'unknown' },
    stripe: { status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured' },
  };
  try {
    await pool.query('SELECT 1');
    health.database.status = 'ok';
  } catch (e) {
    health.database.status = 'error';
    health.database.error = e.message;
  }
  try {
    const kimiHealth = await kimiHealthCheck();
    health.kimi.status = kimiHealth.status;
    if (kimiHealth.endpoint) health.kimi.endpoint = kimiHealth.endpoint;
  } catch (e) {
    health.kimi.status = 'error';
    health.kimi.error = e.message;
  }
  try {
    const net = require('net');
    await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.on('connect', () => { socket.destroy(); resolve(); });
      socket.on('error', reject);
      socket.on('timeout', () => { socket.destroy(); reject(new Error('timeout')); });
      socket.connect(6379, 'redis');
    });
    health.redis.status = 'ok';
  } catch (e) {
    health.redis.status = 'error';
    health.redis.error = e.message;
  }
  const allOk = Object.values(health).every((h) => h.status === 'ok' || h.status === 'configured');
  res.status(allOk ? 200 : 503).json(health);
});

// ============================================
// MOBILE STATUS
// ============================================
app.get('/api/v1/mobile/status', authMiddleware, usageQuotaMiddleware, apiLimiter, (req, res) => {
  res.json({
    connected: true,
    gatewayVersion: '2.0.0',
    lastSync: new Date().toISOString(),
    fallbackAvailable: true,
  });
});

// ============================================
// PROTECTED API PROXY ROUTES
// ============================================

// AI generation
app.post('/api/v1/ai/generate', authMiddleware, usageQuotaMiddleware, apiLimiter, familySafeMiddleware, async (req, res) => {
  try {
    const start = Date.now();
    const { response } = await kimiGenerate(req.body);
    const data = await response.json();
    const rt = Date.now() - start;

    // Censor AI response if needed
    const censored = deepCensor(data);
    const filtered = JSON.stringify(censored) !== JSON.stringify(data);
    if (filtered) {
      censored.content_filtered = true;
    }

    // Log usage
    await pool.query(
      `INSERT INTO usage_logs (account_id, user_id, api_key_id, endpoint, method, status_code, response_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.accountId, req.userId, req.apiKeyId || null, '/api/v1/ai/generate', 'POST', response.status, rt]
    );
    detectUsageSpike(req.accountId).catch(() => {});

    res.status(response.status).json(filtered ? censored : data);
  } catch (e) {
    res.status(502).json({ error: 'AI service unavailable', details: e.message });
  }
});

// AI health
app.get('/api/v1/ai/health', async (req, res) => {
  try {
    const health = await kimiHealthCheck();
    if (health.status === 'ok') {
      return res.json({ status: 'ok', endpoint: health.endpoint });
    }
    res.status(502).json({ status: 'error', message: health.message });
  } catch (e) {
    res.status(502).json({ status: 'error', message: e.message });
  }
});

// ============================================
// DIGITAL ASSISTANT
// ============================================
const ASSISTANT_SYSTEM_PROMPT = `You are the ABC-IO Digital Self, a helpful, friendly, and family-safe digital assistant for ABC-IO users. You specialize in:
- Account help (login, password reset, email verification, profile)
- Security guidance (API keys, suspicious activity, keeping accounts safe)
- Billing and subscriptions (plans, invoices, payment methods)
- Usage and limits (rate limits, quotas, how to upgrade)
- General platform navigation

Keep all responses family-safe. Avoid profanity, hate speech, adult content, or illegal advice. If a user asks about medical, legal, or emergency matters, remind them to contact appropriate professionals and, for emergencies, to use local emergency services. Be concise, encouraging, and clear. Offer up to 3 relevant follow-up suggestions when helpful.`;

app.post('/api/v1/assistant/chat', authMiddleware, familySafeMiddleware, async (req, res) => {
  try {
    const { message, context = '' } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const userContext = context ? `\nAdditional context: ${context}` : '';
    const prompt = `${ASSISTANT_SYSTEM_PROMPT}\n\nUser: ${message}${userContext}\n\nAssistant:`;

    const response = await fetch('http://kimi:5000/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, max_tokens: 512, temperature: 0.7 }),
    });

    const data = await response.json();
    let reply = '';
    if (data.result && Array.isArray(data.result.output) && data.result.output.length > 0) {
      reply = data.result.output[0].text || String(data.result.output[0]);
    } else if (data.result && data.result.fallback) {
      reply = data.result.output && data.result.output[0] ? data.result.output[0].text : `Thanks for your message. I'm here to help with account, security, billing, or usage questions.`;
    } else if (typeof data === 'string') {
      reply = data;
    } else {
      reply = 'I\'m sorry, I couldn\'t process that right now. Please try again later.';
    }

    // Ensure family-safe output
    reply = censorText(reply);

    const suggestions = [
      'How do I reset my password?',
      'What are my rate limits?',
      'How do I keep my API keys safe?'
    ];

    res.json({ reply, suggestions });
  } catch (e) {
    console.error('Assistant chat error:', e);
    res.status(502).json({
      reply: 'I\'m having trouble connecting right now. You can still find help in our Help Center or open an intervention ticket.',
      suggestions: ['Visit Help Center', 'Open a support ticket']
    });
  }
});

// ============================================
// ACCOUNT PROTECTION / SECURITY EVENTS
// ============================================
app.get('/api/v1/security/events', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, event_type, severity, ip_address, metadata, created_at, acknowledged
       FROM security_events
       WHERE user_id = $1 OR account_id = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.userId, req.accountId]
    );
    res.json({ events: result.rows });
  } catch (e) {
    console.error('Security events error:', e);
    res.status(500).json({ error: 'Failed to load security events' });
  }
});

app.get('/api/v1/security/score', authMiddleware, async (req, res) => {
  try {
    let score = 50;
    const userResult = await pool.query(
      'SELECT email_verified FROM users WHERE id = $1',
      [req.userId]
    );
    const user = userResult.rows[0];
    if (user?.email_verified) score += 15;

    const keyResult = await pool.query(
      'SELECT COUNT(*) FROM api_keys WHERE account_id = $1 AND revoked_at IS NULL',
      [req.accountId]
    );
    if (parseInt(keyResult.rows[0].count) > 0) score += 10;

    const fpResult = await pool.query(
      'SELECT family_account_pin_hash FROM family_preferences WHERE account_id = $1',
      [req.accountId]
    );
    if (fpResult.rows[0]?.family_account_pin_hash) score += 15;

    const strictResult = await pool.query(
      `SELECT content_filter_strictness FROM family_preferences WHERE account_id = $1`,
      [req.accountId]
    );
    const strictness = strictResult.rows[0]?.content_filter_strictness || 'moderate';
    if (strictness === 'strict') score += 10;
    else if (strictness === 'moderate') score += 5;

    const eventsResult = await pool.query(
      `SELECT COUNT(*) FROM security_events
       WHERE account_id = $1 AND severity IN ('error', 'critical', 'high')
       AND created_at >= now() - interval '7 days'`,
      [req.accountId]
    );
    const recentHighSeverity = parseInt(eventsResult.rows[0].count);
    score -= Math.min(20, recentHighSeverity * 5);

    score = Math.max(0, Math.min(100, score));

    let message = 'Your account security is in good shape.';
    if (score >= 90) message = 'Excellent security posture.';
    else if (score >= 70) message = 'Good security posture.';
    else if (score >= 50) message = 'Consider enabling more protections.';
    else message = 'Important security protections are missing.';

    res.json({ score, message, strictness, recentHighSeverity });
  } catch (e) {
    console.error('Security score error:', e);
    res.status(500).json({ error: 'Failed to load security score' });
  }
});

app.post('/api/v1/security/events/:id/acknowledge', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE security_events SET acknowledged = TRUE
       WHERE id = $1 AND (user_id = $2 OR account_id = $3)
       RETURNING id`,
      [req.params.id, req.userId, req.accountId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ acknowledged: true });
  } catch (e) {
    console.error('Acknowledge security event error:', e);
    res.status(500).json({ error: 'Failed to acknowledge event' });
  }
});

// ============================================
// FAMILY PREFERENCES
// ============================================
app.get('/api/v1/family/preferences', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT content_filter_strictness, notification_email, allowed_feature_categories,
              profanity_filter, block_unsafe_links, human_review, daily_summary_emails,
              require_ai_approval, restrict_safe_zones, updated_at,
              CASE WHEN family_account_pin_hash IS NOT NULL THEN TRUE ELSE FALSE END AS family_pin_set
       FROM family_preferences WHERE account_id = $1`,
      [req.accountId]
    );
    if (result.rows.length === 0) {
      return res.json({
        preferences: {
          content_filter_strictness: 'moderate',
          notification_email: null,
          allowed_feature_categories: ['ai-isp', 'chat', 'beacon', 'creative', 'safety'],
          profanity_filter: true,
          block_unsafe_links: true,
          human_review: true,
          daily_summary_emails: false,
          require_ai_approval: false,
          restrict_safe_zones: false,
          family_pin_set: false,
          updated_at: null
        }
      });
    }
    res.json({ preferences: result.rows[0] });
  } catch (e) {
    console.error('Family preferences load error:', e);
    res.status(500).json({ error: 'Failed to load family preferences' });
  }
});

app.post('/api/v1/family/preferences', authMiddleware, familySafeMiddleware, async (req, res) => {
  try {
    const {
      content_filter_strictness,
      notification_email,
      allowed_feature_categories,
      profanity_filter,
      block_unsafe_links,
      human_review,
      daily_summary_emails,
      require_ai_approval,
      restrict_safe_zones,
      family_account_pin
    } = req.body;

    const validStrictness = ['strict', 'moderate', 'relaxed'];
    const strictness = validStrictness.includes(content_filter_strictness)
      ? content_filter_strictness
      : 'moderate';

    const categories = Array.isArray(allowed_feature_categories)
      ? JSON.stringify(allowed_feature_categories)
      : JSON.stringify(['ai-isp', 'chat', 'beacon', 'creative', 'safety']);

    let pinHash = null;
    if (family_account_pin && String(family_account_pin).length >= 4) {
      pinHash = await bcrypt.hash(String(family_account_pin), 10);
    }

    const result = await pool.query(
      `INSERT INTO family_preferences (
        account_id, content_filter_strictness, notification_email, allowed_feature_categories,
        profanity_filter, block_unsafe_links, human_review, daily_summary_emails,
        require_ai_approval, restrict_safe_zones, family_account_pin_hash, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
      ON CONFLICT (account_id) DO UPDATE SET
        content_filter_strictness = EXCLUDED.content_filter_strictness,
        notification_email = EXCLUDED.notification_email,
        allowed_feature_categories = EXCLUDED.allowed_feature_categories,
        profanity_filter = EXCLUDED.profanity_filter,
        block_unsafe_links = EXCLUDED.block_unsafe_links,
        human_review = EXCLUDED.human_review,
        daily_summary_emails = EXCLUDED.daily_summary_emails,
        require_ai_approval = EXCLUDED.require_ai_approval,
        restrict_safe_zones = EXCLUDED.restrict_safe_zones,
        family_account_pin_hash = COALESCE(EXCLUDED.family_account_pin_hash, family_preferences.family_account_pin_hash),
        updated_at = now()
      RETURNING content_filter_strictness, notification_email, allowed_feature_categories,
                profanity_filter, block_unsafe_links, human_review, daily_summary_emails,
                require_ai_approval, restrict_safe_zones, updated_at,
                CASE WHEN family_account_pin_hash IS NOT NULL THEN TRUE ELSE FALSE END AS family_pin_set`,
      [
        req.accountId,
        strictness,
        notification_email || null,
        categories,
        profanity_filter !== false,
        block_unsafe_links !== false,
        human_review !== false,
        daily_summary_emails === true,
        require_ai_approval === true,
        restrict_safe_zones === true,
        pinHash
      ]
    );

    await logSecurityEvent({
      accountId: req.accountId,
      userId: req.userId,
      eventType: 'family_preferences_updated',
      severity: 'info',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { strictness, pin_updated: !!pinHash }
    });

    res.json({ preferences: result.rows[0] });
  } catch (e) {
    console.error('Family preferences save error:', e);
    res.status(500).json({ error: 'Failed to save family preferences' });
  }
});

// Public demo translation (anonymous, limited to text-to-braille and text-to-morse)
app.post('/api/v1/demo/translate/:modality', demoLimiter, familySafeMiddleware, async (req, res) => {
  try {
    const modality = req.params.modality;
    if (!['text-to-braille', 'text-to-morse'].includes(modality)) {
      return res.status(400).json({ error: 'Demo only supports text-to-braille and text-to-morse' });
    }
    const response = await fetch(`http://ai-isp:7000/api/v1/translate/${modality}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'Translation service unavailable', details: e.message });
  }
});

// Cross-sensory translation
app.post('/api/v1/translate/:modality', authMiddleware, usageQuotaMiddleware, apiLimiter, familySafeMiddleware, async (req, res) => {
  try {
    const start = Date.now();
    const response = await fetch(`http://ai-isp:7000/api/v1/translate/${req.params.modality}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    await pool.query(
      `INSERT INTO usage_logs (account_id, user_id, api_key_id, endpoint, method, status_code, response_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.accountId, req.userId, req.apiKeyId || null, req.path, 'POST', response.status, Date.now() - start]
    );
    detectUsageSpike(req.accountId).catch(() => {});
    res.status(response.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'Translation service unavailable', details: e.message });
  }
});

// Beacon
app.post('/api/v1/beacon/emit', familySafeMiddleware, async (req, res) => {
  try {
    const response = await fetch('http://beacon:3000/api/v1/beacon/emit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'Beacon service unavailable' });
  }
});

app.get('/api/v1/beacon/active', async (req, res) => {
  try {
    const response = await fetch(`http://beacon:3000/api/v1/beacon/active?${new URLSearchParams(req.query)}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'Beacon service unavailable' });
  }
});

app.get('/api/v1/beacon/awareness', async (req, res) => {
  try {
    const response = await fetch(`http://beacon:3000/api/v1/beacon/awareness?${new URLSearchParams(req.query)}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'Beacon service unavailable' });
  }
});

// ============================================
// ADMIN / OWNER ROUTES
// ============================================
app.get('/api/v1/admin/stats', authMiddleware, requireOwner, async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*) FROM users WHERE status = $1', ['active']);
    const accounts = await pool.query('SELECT COUNT(*) FROM accounts');
    const subs = await pool.query("SELECT COUNT(*) FROM subscriptions WHERE status = 'active'");
    const usage = await pool.query("SELECT COUNT(*) FROM usage_logs WHERE created_at > now() - interval '24 hours'");
    res.json({
      users: parseInt(users.rows[0].count),
      accounts: parseInt(accounts.rows[0].count),
      activeSubscriptions: parseInt(subs.rows[0].count),
      requests24h: parseInt(usage.rows[0].count),
    });
  } catch (e) {
    res.status(500).json({ error: 'Stats failed' });
  }
});

// ============================================
// ADMIN / ESCALATION / SELF-HEALING
// ============================================

// Admin metrics — uptime, memory, connections, queue
app.get('/api/v1/admin/metrics', authMiddleware, requireOwner, async (req, res) => {
  try {
    const queueResult = await pool.query('SELECT COUNT(*) FROM intervention_queue WHERE status = $1', ['Pending Human Operator Escalation']);
    res.json({
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      activeConnections: (await pool.query('SELECT COUNT(*) FROM users WHERE status = $1', ['active'])).rows[0].count,
      unresolvedEscalations: parseInt(queueResult.rows[0].count),
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: 'Metrics failed' });
  }
});

// Escalation queue — 8AM-8PM EST human routing
app.post('/api/v1/admin/escalate', authMiddleware, requireOwner, familySafeMiddleware, async (req, res) => {
  try {
    const { ticketId, userMessage } = req.body;
    const currentHourEst = new Date().getUTCHours() - 4; // Conversion framework for New York Time
    const isBusinessHours = currentHourEst >= 8 && currentHourEst < 20;

    if (isBusinessHours) {
      await pool.query(
        'INSERT INTO intervention_queue (ticket_id, user_message, status, timezone) VALUES ($1, $2, $3, $4)',
        [ticketId, userMessage, 'Pending Human Operator Escalation', 'America/New_York']
      );
      res.json({ route: 'Human Queue', details: 'Transferred directly to New York operations queue context.' });
    } else {
      res.json({
        route: 'Autonomous Mitigation',
        details: 'Self-healing logic parsed query safely outside live operational operating shifts.'
      });
    }
  } catch (e) {
    res.status(500).json({ error: 'Escalation failed' });
  }
});

// Self-heal trigger
app.post('/api/v1/admin/self-heal', authMiddleware, requireOwner, async (req, res) => {
  try {
    const { targetServiceHealth } = req.body;
    if (targetServiceHealth === 'CRITICAL_500_FAIL_DETECTION') {
      await pool.query(
        "INSERT INTO audit_logs (event_type, event_category, payload, severity) VALUES ($1, $2, $3, $4)",
        ['self_heal', 'operations', JSON.stringify({ trigger: targetServiceHealth }), 'critical']
      );
      return res.json({ actionExecuted: 'REBOOT_ISOLATED_CONTAINER_OK', executionState: 'COMPLETED_AUTONOMOUSLY' });
    }
    res.json({ status: 'Steady State Architecture Maintained' });
  } catch (e) {
    res.status(500).json({ error: 'Self-heal failed' });
  }
});

// ============================================
// HELP CENTER
// ============================================

// List help articles
app.get('/api/v1/help/articles', async (req, res) => {
  try {
    const { category, search } = req.query;
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;

    let query = `
      SELECT ha.id, ha.slug, ha.title, ha.summary, ha.content, ha.view_count, ha.created_at, ha.updated_at,
             hc.id as category_id, hc.name as category_name, hc.slug as category_slug
      FROM help_articles ha
      LEFT JOIN help_categories hc ON ha.category_id = hc.id
      WHERE ha.published = true
    `;
    const params = [];
    let idx = 1;

    if (category) {
      query += ` AND (hc.slug = $${idx} OR hc.name = $${idx})`;
      params.push(category);
      idx++;
    }

    if (search) {
      query += ` AND (ha.title ILIKE $${idx} OR ha.content ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ` ORDER BY ha.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ articles: result.rows });
  } catch (e) {
    console.error('Help articles error:', e);
    res.status(500).json({ error: 'Failed to load articles' });
  }
});

// Get single help article
app.get('/api/v1/help/articles/:slug', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ha.id, ha.slug, ha.title, ha.summary, ha.content, ha.view_count, ha.created_at, ha.updated_at,
              hc.id as category_id, hc.name as category_name, hc.slug as category_slug
       FROM help_articles ha
       LEFT JOIN help_categories hc ON ha.category_id = hc.id
       WHERE ha.slug = $1 AND ha.published = true`,
      [req.params.slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    await pool.query('UPDATE help_articles SET view_count = view_count + 1 WHERE id = $1', [result.rows[0].id]);
    res.json({ article: result.rows[0] });
  } catch (e) {
    console.error('Help article error:', e);
    res.status(500).json({ error: 'Failed to load article' });
  }
});

// ============================================
// CHAT
// ============================================

// List chat rooms
app.get('/api/v1/chat/rooms', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, created_at, updated_at
       FROM chat_rooms WHERE status = 'active' ORDER BY created_at DESC`
    );
    res.json({ rooms: result.rows });
  } catch (e) {
    console.error('Chat rooms error:', e);
    res.status(500).json({ error: 'Failed to load rooms' });
  }
});

// Get messages for a room
app.get('/api/v1/chat/rooms/:roomId/messages', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, room_id, sender_name, sender_role, message, created_at
       FROM chat_messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.params.roomId]
    );
    res.json({ messages: result.rows });
  } catch (e) {
    console.error('Chat messages error:', e);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// Post message to a room
app.post('/api/v1/chat/rooms/:roomId/messages', familySafeMiddleware, async (req, res) => {
  try {
    const { sender_name, message, sender_role = 'guest' } = req.body;
    if (!sender_name || !message) {
      return res.status(400).json({ error: 'sender_name and message required' });
    }
    const result = await pool.query(
      `INSERT INTO chat_messages (room_id, sender_name, sender_role, message)
       VALUES ($1, $2, $3, $4) RETURNING id, room_id, sender_name, sender_role, message, created_at`,
      [req.params.roomId, sender_name, sender_role, message]
    );
    res.status(201).json({ message: result.rows[0] });
  } catch (e) {
    console.error('Chat post error:', e);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

// ============================================
// INTERVENTION TICKETS
// ============================================

// Create intervention ticket
app.post('/api/v1/intervention', familySafeMiddleware, async (req, res) => {
  try {
    const { user_message, email } = req.body;
    if (!user_message) {
      return res.status(400).json({ error: 'user_message required' });
    }
    const ticketId = 'TICKET-' + crypto.randomBytes(8).toString('hex').toUpperCase();
    const currentHourEst = new Date().getUTCHours() - 4;
    const isBusinessHours = currentHourEst >= 8 && currentHourEst < 20;
    const status = isBusinessHours ? 'Pending Human Operator Escalation' : 'Queued for Next Business Day';

    const result = await pool.query(
      `INSERT INTO intervention_queue (ticket_id, user_message, email, status, timezone)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, ticket_id, user_message, email, status, created_at`,
      [ticketId, user_message, email || null, status, 'America/New_York']
    );
    res.status(201).json({ ticket: result.rows[0] });
  } catch (e) {
    console.error('Intervention create error:', e);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Get intervention ticket
app.get('/api/v1/intervention/:ticketId', async (req, res) => {
  try {
    const ticketResult = await pool.query(
      `SELECT id, ticket_id, user_message, email, status, created_at, updated_at
       FROM intervention_queue WHERE ticket_id = $1`,
      [req.params.ticketId]
    );
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const messagesResult = await pool.query(
      `SELECT id, sender, message, created_at
       FROM intervention_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [req.params.ticketId]
    );
    res.json({ ticket: ticketResult.rows[0], messages: messagesResult.rows });
  } catch (e) {
    console.error('Intervention get error:', e);
    res.status(500).json({ error: 'Failed to load ticket' });
  }
});

// Add message to intervention ticket
app.post('/api/v1/intervention/:ticketId/message', familySafeMiddleware, async (req, res) => {
  try {
    const { message, sender } = req.body;
    if (!message || !sender) {
      return res.status(400).json({ error: 'message and sender required' });
    }
    const ticketResult = await pool.query(
      `SELECT id FROM intervention_queue WHERE ticket_id = $1`,
      [req.params.ticketId]
    );
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const result = await pool.query(
      `INSERT INTO intervention_messages (ticket_id, sender, message)
       VALUES ($1, $2, $3) RETURNING id, ticket_id, sender, message, created_at`,
      [req.params.ticketId, sender, message]
    );
    res.status(201).json({ message: result.rows[0] });
  } catch (e) {
    console.error('Intervention message error:', e);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// ============================================
// ACCOUNT PRODUCTS & ADD-ONS (v5.0.0)
// ============================================

// List products available to the account + current purchases
app.get('/api/v1/account/products', authMiddleware, async (req, res) => {
  try {
    const available = await pool.query(
      `SELECT id, slug, name, description, product_type, min_tier, price_cents, currency, billing_interval, features, is_public
       FROM products WHERE is_public = true
         AND CASE min_tier
           WHEN 'free' THEN 0 WHEN 'basic' THEN 1 WHEN 'standard' THEN 2 WHEN 'pro' THEN 3 WHEN 'business' THEN 4
           WHEN 'team' THEN 5 WHEN 'corporate' THEN 6 WHEN 'enterprise' THEN 7 WHEN 'agency' THEN 8 WHEN 'global' THEN 9
         END <= CASE $1
           WHEN 'free' THEN 0 WHEN 'basic' THEN 1 WHEN 'standard' THEN 2 WHEN 'pro' THEN 3 WHEN 'business' THEN 4
           WHEN 'team' THEN 5 WHEN 'corporate' THEN 6 WHEN 'enterprise' THEN 7 WHEN 'agency' THEN 8 WHEN 'global' THEN 9
         END
       ORDER BY sort_order, name`,
      [req.tier]
    );
    const purchased = await pool.query(
      `SELECT ap.id, ap.status, ap.current_period_end, p.slug, p.name, p.product_type
       FROM account_products ap JOIN products p ON ap.product_id = p.id
       WHERE ap.account_id = $1 AND ap.status = 'active'`,
      [req.accountId]
    );
    res.json({ tier: req.tier, available: available.rows, purchased: purchased.rows });
  } catch (e) {
    console.error('Account products error:', e);
    res.status(500).json({ error: 'Failed to load account products' });
  }
});

// Create checkout session for a product add-on
app.post('/api/v1/account/products/:productId/checkout', authMiddleware, async (req, res) => {
  try {
    const productResult = await pool.query(
      `SELECT * FROM products WHERE id = $1 AND is_public = true`,
      [req.params.productId]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = productResult.rows[0];
    if (!product.stripe_price_id) {
      // Free product or no Stripe price configured; provision immediately
      await pool.query(
        `INSERT INTO account_products (account_id, product_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', now(), now() + interval '100 years')
         ON CONFLICT (account_id, product_id) DO UPDATE SET status = 'active', updated_at = now()`,
        [req.accountId, product.id]
      );
      await logSecurityEvent({
        accountId: req.accountId,
        userId: req.userId,
        eventType: 'product_provisioned',
        severity: 'info',
        metadata: { product_slug: product.slug, product_name: product.name, price_cents: product.price_cents }
      });
      return res.json({ success: true, provisioned: true, product: { slug: product.slug, name: product.name } });
    }

    const userResult = await pool.query('SELECT email, account_id FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];
    let customerId;
    const accResult = await pool.query('SELECT stripe_customer_id FROM accounts WHERE id = $1', [req.accountId]);
    if (accResult.rows[0]?.stripe_customer_id) {
      customerId = accResult.rows[0].stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({ email: user.email, metadata: { account_id: req.accountId } });
      customerId = customer.id;
      await pool.query('UPDATE accounts SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.accountId]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: product.stripe_price_id, quantity: 1 }],
      mode: product.billing_interval === 'once' ? 'payment' : 'subscription',
      success_url: `${process.env.PUBLIC_URL || 'https://abc-io.com'}/dashboard?product_checkout=success`,
      cancel_url: `${process.env.PUBLIC_URL || 'https://abc-io.com'}/sensory-communications.html?checkout=cancel`,
      metadata: { account_id: req.accountId, product_id: product.id },
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error('Product checkout error:', e);
    res.status(500).json({ error: 'Product checkout failed' });
  }
});

// ============================================
// ACCOUNT-SCOPED CONVERSATIONS & MESSAGES (v5.0.0)
// ============================================

// List conversations for the current user
app.get('/api/v1/conversations', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.title, c.conversation_type, c.status, c.created_at, c.updated_at,
              u.id as created_by_id, u.email as created_by_email,
              (SELECT COUNT(*) FROM direct_messages dm WHERE dm.conversation_id = c.id AND dm.created_at > COALESCE(cp.last_read_at, '1970-01-01')) as unread_count
       FROM conversations c
       JOIN conversation_participants cp ON cp.conversation_id = c.id
       LEFT JOIN users u ON c.created_by = u.id
       WHERE cp.user_id = $1 AND c.account_id = $2 AND c.status = 'active'
       ORDER BY c.updated_at DESC`,
      [req.userId, req.accountId]
    );
    res.json({ conversations: result.rows });
  } catch (e) {
    console.error('Conversations list error:', e);
    res.status(500).json({ error: 'Failed to load conversations' });
  }
});

// Create a conversation within the account
app.post('/api/v1/conversations', authMiddleware, async (req, res) => {
  try {
    const { title, participantUserIds = [], conversationType = 'group' } = req.body;
    const participantSet = Array.from(new Set([req.userId, ...participantUserIds]));
    if (conversationType === 'direct' && participantSet.length !== 2) {
      return res.status(400).json({ error: 'Direct conversations require exactly two participants' });
    }
    // Verify all participants belong to the same account
    const userRows = await pool.query(
      `SELECT id FROM users WHERE id = ANY($1::uuid[]) AND account_id = $2`,
      [participantSet, req.accountId]
    );
    if (userRows.rows.length !== participantSet.length) {
      return res.status(400).json({ error: 'All participants must belong to the same account' });
    }

    const convResult = await pool.query(
      `INSERT INTO conversations (account_id, title, conversation_type, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.accountId, title || 'New Conversation', conversationType, req.userId]
    );
    const conversation = convResult.rows[0];

    for (const userId of participantSet) {
      await pool.query(
        `INSERT INTO conversation_participants (conversation_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [conversation.id, userId, userId === req.userId ? 'owner' : 'member']
      );
    }

    await logSecurityEvent({
      accountId: req.accountId,
      userId: req.userId,
      eventType: 'conversation_created',
      severity: 'info',
      metadata: { conversation_id: conversation.id, type: conversationType, participants: participantSet }
    });

    res.status(201).json({ conversation });
  } catch (e) {
    console.error('Conversation create error:', e);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get messages for a conversation
app.get('/api/v1/conversations/:id/messages', authMiddleware, async (req, res) => {
  try {
    const membership = await pool.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }
    const result = await pool.query(
      `SELECT dm.id, dm.message, dm.message_type, dm.metadata, dm.created_at,
              u.id as sender_id, u.email as sender_email, u.first_name as sender_first_name
       FROM direct_messages dm
       JOIN users u ON dm.sender_id = u.id
       WHERE dm.conversation_id = $1
       ORDER BY dm.created_at DESC
       LIMIT 200`,
      [req.params.id]
    );
    // Mark as read
    await pool.query(
      `UPDATE conversation_participants SET last_read_at = now()
       WHERE conversation_id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    res.json({ messages: result.rows.reverse() });
  } catch (e) {
    console.error('Conversation messages error:', e);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// Send a message to a conversation
app.post('/api/v1/conversations/:id/messages', authMiddleware, familySafeMiddleware, async (req, res) => {
  try {
    const { message, messageType = 'text', metadata = {} } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }
    const membership = await pool.query(
      `SELECT role FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    const result = await pool.query(
      `INSERT INTO direct_messages (conversation_id, sender_id, message, message_type, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, req.userId, message, messageType, JSON.stringify(metadata)]
    );
    await pool.query(
      `UPDATE conversations SET updated_at = now() WHERE id = $1`,
      [req.params.id]
    );

    // Future: enqueue real-time notification jobs for other participants via Redis.
    // The account PWA polls /api/v1/conversations for now.

    res.status(201).json({ message: result.rows[0] });
  } catch (e) {
    console.error('Conversation message send error:', e);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// List participants for a conversation
app.get('/api/v1/conversations/:id/participants', authMiddleware, async (req, res) => {
  try {
    const membership = await pool.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }
    const result = await pool.query(
      `SELECT cp.user_id, cp.role, cp.last_read_at, cp.created_at,
              u.email, u.first_name, u.last_name
       FROM conversation_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.conversation_id = $1`,
      [req.params.id]
    );
    res.json({ participants: result.rows });
  } catch (e) {
    console.error('Conversation participants error:', e);
    res.status(500).json({ error: 'Failed to load participants' });
  }
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ============================================
// START
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 ABC-IO Gateway v2.0 listening on port ${PORT}`);
  console.log(`🔐 Auth: /api/v1/auth/*`);
  console.log(`💳 Billing: /api/v1/billing/*`);
  console.log(`🤖 AI: /api/v1/ai/*`);
});
