const express = require('express');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

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

// ============================================
// DATABASE (optional — help endpoints only)
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/abc_io',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB error', err);
});

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

// ============================================
// HELP ARTICLES
// ============================================
app.get('/api/v1/help/articles', async (req, res) => {
  try {
    const articlesResult = await pool.query(
      `SELECT ha.id, ha.slug, ha.title, ha.excerpt, ha.tags, ha.view_count, ha.created_at, ha.updated_at,
              hc.id as category_id, hc.slug as category_slug, hc.name as category_name
       FROM help_articles ha
       LEFT JOIN help_categories hc ON ha.category_id = hc.id
       WHERE ha.published = true
       ORDER BY hc.sort_order ASC, ha.created_at DESC`
    );
    const categoriesResult = await pool.query(
      `SELECT id, slug, name, description, sort_order FROM help_categories ORDER BY sort_order ASC`
    );
    res.json({
      articles: articlesResult.rows,
      categories: categoriesResult.rows
    });
  } catch (e) {
    console.error('Help articles error:', e.message);
    res.status(500).json({ error: 'Failed to load help articles' });
  }
});

app.get('/api/v1/help/articles/:slug', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ha.id, ha.slug, ha.title, ha.content, ha.excerpt, ha.tags, ha.view_count, ha.created_at, ha.updated_at,
              hc.id as category_id, hc.slug as category_slug, hc.name as category_name
       FROM help_articles ha
       LEFT JOIN help_categories hc ON ha.category_id = hc.id
       WHERE ha.slug = $1 AND ha.published = true
       LIMIT 1`,
      [req.params.slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    // increment view count best-effort
    pool.query('UPDATE help_articles SET view_count = view_count + 1 WHERE slug = $1', [req.params.slug]).catch(() => {});
    res.json({ article: result.rows[0] });
  } catch (e) {
    console.error('Help article error:', e.message);
    res.status(500).json({ error: 'Failed to load article' });
  }
});

app.listen(port, () => {
  console.log(`Public Portal listening on port ${port}`);
});
