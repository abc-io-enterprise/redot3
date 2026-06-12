const express = require('express');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 8090);

const publicSigningKey = process.env.PUBLIC_SIGNING_KEY;
const publicFingerprint = process.env.PUBLIC_SIGNING_FINGERPRINT;
const jwtSecret = process.env.JWT_SECRET || process.env.OWNER_SIGNING_KEY;

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

// ============================================
// JWT VERIFICATION (HS256, issuer 'abc-io')
// ============================================
function base64urlDecode(str) {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
}

function verifyJwt(token) {
  if (!jwtSecret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = base64urlDecode(parts[0]);
    if (header.alg !== 'HS256') return null;
    const payload = base64urlDecode(parts[1]);
    if (payload.iss && payload.iss !== 'abc-io') return null;
    const signature = crypto.createHmac('sha256', jwtSecret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (signature !== parts[2]) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const decoded = verifyJwt(token);
  if (!decoded || !decoded.sub) return res.status(401).json({ error: 'Invalid or expired token' });
  req.userId = decoded.sub;
  req.accountId = decoded.account_id;
  req.tier = decoded.tier || 'free';
  next();
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

// ============================================
// HELP ARTICLES
// ============================================
const articleSelectCols = `ha.id, ha.slug, ha.title, ha.excerpt, ha.tags, ha.view_count,
        ha.track_progress, ha.onboarding_week, ha.estimated_minutes, ha.difficulty,
        ha.created_at, ha.updated_at,
        hc.id as category_id, hc.slug as category_slug, hc.name as category_name`;

app.get('/api/v1/help/articles', async (req, res) => {
  try {
    const articlesResult = await pool.query(
      `SELECT ${articleSelectCols}
       FROM help_articles ha
       LEFT JOIN help_categories hc ON ha.category_id = hc.id
       WHERE ha.published = true
       ORDER BY hc.sort_order ASC, ha.onboarding_week ASC NULLS LAST, ha.created_at DESC`
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
      `SELECT ${articleSelectCols}
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

// ============================================
// HELP PROGRESS & RECOMMENDATIONS
// ============================================
app.get('/api/v1/help/progress', authMiddleware, async (req, res) => {
  try {
    const totalResult = await pool.query(
      `SELECT COUNT(*)::int as total FROM help_articles WHERE published = true AND track_progress = true`
    );
    const total = totalResult.rows[0].total || 0;

    const progressResult = await pool.query(
      `SELECT article_slug, completed, progress_percent, completed_at
       FROM user_progress WHERE user_id = $1`,
      [req.userId]
    );
    const progressMap = {};
    progressResult.rows.forEach(r => { progressMap[r.article_slug] = r; });

    const completed = progressResult.rows.filter(r => r.completed).length;
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Next recommended = lowest onboarding_week trackable article not completed
    const articlesResult = await pool.query(
      `SELECT slug, title, onboarding_week, estimated_minutes, difficulty, excerpt
       FROM help_articles WHERE published = true AND track_progress = true
       ORDER BY onboarding_week ASC NULLS LAST, created_at ASC`
    );
    let nextArticle = null;
    for (const a of articlesResult.rows) {
      const p = progressMap[a.slug];
      if (!p || !p.completed) {
        nextArticle = a;
        break;
      }
    }

    res.json({
      total,
      completed,
      percent_complete: percentComplete,
      next_article: nextArticle,
      progress: progressMap
    });
  } catch (e) {
    console.error('Help progress error:', e.message);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

app.post('/api/v1/help/progress/:slug', authMiddleware, async (req, res) => {
  const { slug } = req.params;
  let percent = Number(req.body.percent);
  if (Number.isNaN(percent)) percent = 0;
  percent = Math.max(0, Math.min(100, Math.round(percent)));
  const completed = percent >= 100;

  try {
    const articleResult = await pool.query(
      `SELECT slug FROM help_articles WHERE slug = $1 AND published = true`,
      [slug]
    );
    if (articleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const result = await pool.query(
      `INSERT INTO user_progress (user_id, article_slug, completed, completed_at, progress_percent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, article_slug)
       DO UPDATE SET completed = EXCLUDED.completed,
                     completed_at = EXCLUDED.completed_at,
                     progress_percent = EXCLUDED.progress_percent,
                     created_at = now()
       RETURNING *`,
      [req.userId, slug, completed, completed ? new Date() : null, percent]
    );
    res.json({ progress: result.rows[0] });
  } catch (e) {
    console.error('Help progress update error:', e.message);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

app.get('/api/v1/help/recommendations', authMiddleware, async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT created_at FROM users WHERE id = $1`,
      [req.userId]
    );
    const signupAt = userResult.rows[0] ? new Date(userResult.rows[0].created_at) : new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const currentWeek = Math.max(1, Math.floor((Date.now() - signupAt.getTime()) / msPerWeek) + 1);

    const progressResult = await pool.query(
      `SELECT article_slug FROM user_progress WHERE user_id = $1 AND completed = true`,
      [req.userId]
    );
    const completedSlugs = new Set(progressResult.rows.map(r => r.article_slug));

    // Recommend the next 3 incomplete curriculum articles around the user's current week.
    // Look ahead up to 8 weeks and include anything earlier that was missed.
    const recsResult = await pool.query(
      `SELECT slug, title, excerpt, onboarding_week, estimated_minutes, difficulty
       FROM help_articles
       WHERE published = true AND track_progress = true
         AND onboarding_week IS NOT NULL
         AND onboarding_week <= $1
       ORDER BY onboarding_week ASC
       LIMIT 10`,
      [currentWeek + 8]
    );

    const tierOrder = { free: 0, basic: 1, standard: 2, pro: 3, business: 4, team: 5, corporate: 6, enterprise: 7, agency: 8, global: 9 };
    const tierRank = tierOrder[req.tier] || 0;

    const recommendations = recsResult.rows
      .filter(a => !completedSlugs.has(a.slug))
      .map(a => ({ ...a, priority: Math.abs((a.onboarding_week || 1) - currentWeek) }))
      .sort((a, b) => {
        // Prefer articles near current week; for higher tiers, allow advanced content sooner
        const aAdvanced = a.difficulty === 'advanced' ? 1 : 0;
        const bAdvanced = b.difficulty === 'advanced' ? 1 : 0;
        if (tierRank >= 5) {
          // corporate+ users: slightly prefer advanced content at the same week
          if (aAdvanced !== bAdvanced) return bAdvanced - aAdvanced;
        }
        return a.priority - b.priority;
      })
      .slice(0, 3);

    res.json({
      current_week: currentWeek,
      tier: req.tier,
      recommendations
    });
  } catch (e) {
    console.error('Help recommendations error:', e.message);
    res.status(500).json({ error: 'Failed to load recommendations' });
  }
});

app.listen(port, () => {
  console.log(`Public Portal listening on port ${port}`);
});
