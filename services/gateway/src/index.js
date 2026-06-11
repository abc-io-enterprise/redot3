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
  if (smtpUrl) {
    return nodemailer.createTransport(smtpUrl);
  }
  if (process.env.SMTP_HOST) {
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
// MIDDLEWARE
// ============================================
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
// Raw body parser for Stripe webhook must come before global JSON parser
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

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

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => tierRateLimit(req),
  keyGenerator: (req) => req.accountId || req.ip,
  handler: (req, res) => res.status(429).json({ error: 'Rate limit exceeded', tier: req.tier || 'free' }),
});

// ============================================
// PUBLIC AUTH ROUTES
// ============================================

// Register
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, accountName } = req.body;
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Email and password (8+ chars) required' });
    }

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const accountSlug = (accountName || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const acc = await client.query(
        `INSERT INTO accounts (name, slug, tier, billing_email) VALUES ($1, $2, 'free', $3) RETURNING id`,
        [accountName || email.split('@')[0], accountSlug, email.toLowerCase()]
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

      const token = signToken({ sub: userId, account_id: accountId, tier: 'free', email: email.toLowerCase() });
      res.status(201).json({ token, user: { id: userId, email: email.toLowerCase(), tier: 'free' } });
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
      `SELECT u.id, u.email, u.password_hash, u.account_id, u.status, u.email_verified, a.tier
       FROM users u JOIN accounts a ON u.account_id = a.id WHERE u.email = $1`,
      [email.toLowerCase()]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    if (user.status !== 'active') return res.status(403).json({ error: 'Account suspended' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await pool.query('UPDATE users SET last_login_at = now(), login_count = login_count + 1 WHERE id = $1', [user.id]);

    const token = signToken({ sub: user.id, account_id: user.account_id, tier: user.tier, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email, tier: user.tier, emailVerified: user.email_verified } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Forgot password
app.post('/api/v1/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email?.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const userId = result.rows[0].id;
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
      `SELECT id, user_id FROM email_verifications WHERE token = $1 AND used_at IS NULL AND expires_at > now()`,
      [token]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired token' });

    await pool.query('UPDATE users SET email_verified = TRUE, email_verified_at = now() WHERE id = $1', [result.rows[0].user_id]);
    await pool.query('UPDATE email_verifications SET used_at = now() WHERE id = $1', [result.rows[0].id]);

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
    res.status(201).json({ key: result.rows[0], token: rawKey });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create key' });
  }
});

app.delete('/api/v1/keys/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND account_id = $2', [req.params.id, req.accountId]);
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
    const { priceId } = req.body;
    const userResult = await pool.query('SELECT email, account_id FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];

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
      line_items: [{ price: priceId, quantity: 1 }],
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
      }
    } else if (event.type === 'invoice.payment_succeeded') {
      const inv = event.data.object;
      await pool.query(
        `INSERT INTO invoices (account_id, stripe_invoice_id, amount_due, amount_paid, currency, status, pdf_url, invoice_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8))
         ON CONFLICT (stripe_invoice_id) DO NOTHING`,
        [inv.metadata?.account_id, inv.id, inv.amount_due, inv.amount_paid, inv.currency, inv.status, inv.invoice_pdf, inv.created]
      );
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      await pool.query("UPDATE subscriptions SET status = 'cancelled' WHERE stripe_subscription_id = $1", [sub.id]);
      await pool.query(
        "UPDATE accounts SET tier = 'free' WHERE id = (SELECT account_id FROM subscriptions WHERE stripe_subscription_id = $1)",
        [sub.id]
      );
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

// ============================================
// PAYPAL BILLING (Skeleton)
// ============================================
// NOTE: Real PayPal SDK integration goes here using PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET

app.post('/api/v1/billing/paypal/create-order', authMiddleware, async (req, res) => {
  try {
    const { amount, currency = 'USD', tier } = req.body;
    // TODO: Integrate PayPal Orders v2 API
    const orderId = 'mock-paypal-order-' + Date.now();
    res.json({ orderId, status: 'CREATED', approvalUrl: '/dashboard/billing' });
  } catch (e) {
    console.error('PayPal create-order error:', e);
    res.status(500).json({ error: 'PayPal order creation failed' });
  }
});

app.post('/api/v1/billing/paypal/capture-order', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;
    // TODO: Integrate PayPal capture API
    res.json({ orderId, status: 'COMPLETED', tier: req.body.tier || 'pro' });
  } catch (e) {
    console.error('PayPal capture-order error:', e);
    res.status(500).json({ error: 'PayPal capture failed' });
  }
});

app.post('/api/v1/billing/paypal/webhook', async (req, res) => {
  try {
    // TODO: Verify PayPal webhook signature using PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET
    console.log('PayPal webhook received:', req.body);
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
    const kimiRes = await fetch('http://kimi:5000/health');
    health.kimi.status = kimiRes.ok ? 'ok' : 'error';
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
app.get('/api/v1/mobile/status', authMiddleware, apiLimiter, (req, res) => {
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
app.post('/api/v1/ai/generate', authMiddleware, apiLimiter, async (req, res) => {
  try {
    const start = Date.now();
    const response = await fetch('http://kimi:5000/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    const rt = Date.now() - start;

    // Log usage
    await pool.query(
      `INSERT INTO usage_logs (account_id, user_id, api_key_id, endpoint, method, status_code, response_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.accountId, req.userId, req.apiKeyId || null, '/api/v1/ai/generate', 'POST', response.status, rt]
    );

    res.status(response.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'AI service unavailable', details: e.message });
  }
});

// AI health
app.get('/api/v1/ai/health', async (req, res) => {
  try {
    const response = await fetch('http://kimi:5000/health');
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(502).json({ status: 'error', message: e.message });
  }
});

// Cross-sensory translation
app.post('/api/v1/translate/:modality', authMiddleware, apiLimiter, async (req, res) => {
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
    res.status(response.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'Translation service unavailable', details: e.message });
  }
});

// Beacon
app.post('/api/v1/beacon/emit', async (req, res) => {
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

// ============================================
// ADMIN / OWNER ROUTES
// ============================================
app.get('/api/v1/admin/stats', authMiddleware, async (req, res) => {
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
