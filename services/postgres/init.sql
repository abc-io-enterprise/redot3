-- ABC-IO v2.0 Production Database Schema
-- Users, billing, API keys, audit logging

-- ============================================
-- CORE USER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'standard', 'pro', 'business', 'team', 'corporate', 'enterprise', 'agency', 'global')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  billing_email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_account ON users(account_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- AUTH & SECURITY TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_verifications_token ON email_verifications(token);

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_password_resets_token ON password_resets(token);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);

-- ============================================
-- API KEYS
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(8) NOT NULL,
  scopes JSONB DEFAULT '["read"]',
  rate_limit INTEGER DEFAULT 100,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_api_keys_account ON api_keys(account_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- ============================================
-- SUBSCRIPTIONS & BILLING
-- ============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),
  tier VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'active', 'past_due', 'cancelled', 'paused')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_account ON subscriptions(account_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  amount_due INTEGER, -- in cents
  amount_paid INTEGER,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50),
  pdf_url TEXT,
  invoice_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_account ON invoices(account_id);

CREATE TABLE IF NOT EXISTS paypal_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  paypal_order_id VARCHAR(255) NOT NULL,
  paypal_payer_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  tier VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_paypal_transactions_account ON paypal_transactions(account_id);
CREATE INDEX idx_paypal_transactions_order ON paypal_transactions(paypal_order_id);

-- ============================================
-- USAGE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usage_account ON usage_logs(account_id);
CREATE INDEX idx_usage_created ON usage_logs(created_at);

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  payload JSONB,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_account ON audit_logs(account_id);
CREATE INDEX idx_audit_type ON audit_logs(event_type);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================
-- INTERVENTION QUEUE (8AM-8PM EST Human Escalation)
-- ============================================

CREATE TABLE IF NOT EXISTS intervention_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id VARCHAR(255) NOT NULL,
  user_message TEXT,
  status VARCHAR(100) DEFAULT 'Pending Human Operator Escalation',
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_intervention_status ON intervention_queue(status);
CREATE INDEX idx_intervention_created ON intervention_queue(created_at);

-- ============================================
-- BEACON PERSISTENCE (Public Safety)
-- ============================================

CREATE TABLE IF NOT EXISTS beacons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beacon_id VARCHAR(255) UNIQUE NOT NULL,
  beacon_type VARCHAR(50) NOT NULL CHECK (beacon_type IN ('emergency', 'transit', 'sos')),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  altitude DECIMAL(10, 2),
  accuracy DECIMAL(10, 2),
  device_type VARCHAR(100),
  message TEXT,
  battery INTEGER,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'expired')),
  estimated_response_time VARCHAR(50),
  resolved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_beacons_status ON beacons(status);
CREATE INDEX idx_beacons_created ON beacons(created_at);
CREATE INDEX idx_beacons_location ON beacons USING gist (point(longitude, latitude));

CREATE TABLE IF NOT EXISTS beacon_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beacon_id VARCHAR(255) NOT NULL REFERENCES beacons(beacon_id) ON DELETE CASCADE,
  responder_type VARCHAR(50) NOT NULL CHECK (responder_type IN ('police', 'medical', 'fire', 'civilian')),
  responder_name VARCHAR(255),
  responder_contact VARCHAR(255),
  eta_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_beacon_ack_beacon ON beacon_acknowledgments(beacon_id);

CREATE TABLE IF NOT EXISTS beacon_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beacon_id VARCHAR(255) NOT NULL REFERENCES beacons(beacon_id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'webhook')),
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  body TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_beacon_notif_beacon ON beacon_notifications(beacon_id);

-- ============================================
-- HELP & ONBOARDING SYSTEM (2-Year Public Education)
-- ============================================

CREATE TABLE IF NOT EXISTS help_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES help_categories(id) ON DELETE SET NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  tags TEXT[],
  published BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_help_articles_slug ON help_articles(slug);
CREATE INDEX idx_help_articles_category ON help_articles(category_id);
CREATE INDEX idx_help_articles_published ON help_articles(published);

-- ============================================
-- OPERATIONS CHAT & TEAM INTERFACE
-- ============================================

CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  room_type VARCHAR(50) DEFAULT 'operations' CHECK (room_type IN ('operations', 'support', 'alert', 'intervention')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_name VARCHAR(255) NOT NULL,
  sender_role VARCHAR(50) DEFAULT 'operator' CHECK (sender_role IN ('owner', 'operator', 'system', 'guest')),
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- ============================================
-- INTERVENTION QUEUE MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS intervention_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id VARCHAR(255) NOT NULL,
  sender VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_intervention_msg_ticket ON intervention_messages(ticket_id);

-- ============================================
-- DEFAULT ACCOUNT (system)
-- ============================================

INSERT INTO accounts (id, name, slug, tier, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'System', 'system', 'enterprise', 'active')
ON CONFLICT DO NOTHING;

-- Seed default help categories
INSERT INTO help_categories (slug, name, description, sort_order) VALUES
  ('getting-started', 'Getting Started', 'New user onboarding and first steps', 1),
  ('accounts-billing', 'Accounts & Billing', 'Subscription, payments, and account management', 2),
  ('api-integration', 'API Integration', 'Developer guides and API reference', 3),
  ('ai-isp', 'AI-ISP Translation', 'Cross-sensory translation and interfacing', 4),
  ('beacon-safety', 'Beacon & Safety', 'Public safety beacon and location services', 5),
  ('security-privacy', 'Security & Privacy', 'Data protection, auth, and compliance', 6),
  ('troubleshooting', 'Troubleshooting', 'Common issues and solutions', 7),
  ('education', 'Education & Training', 'Free courses and learning materials', 8)
ON CONFLICT DO NOTHING;

-- Seed default help articles
INSERT INTO help_articles (slug, title, content, excerpt, category_id, published, tags) VALUES
('welcome-to-abc-io', 'Welcome to ABC-IO', '<p>Welcome to <strong>ABC-IO v2.0</strong>, the all-in-one platform for AI-powered translation, public safety beacons, and seamless API integration. This guide will help you get oriented with the dashboard, create your first project, and understand the core services available to you.</p><h3>What is ABC-IO?</h3><p>ABC-IO is a containerized multi-service system designed for local development, production deployment, and release packaging. It provides AI translation, beacon safety systems, billing, and comprehensive API management.</p><h3>Quick Start</h3><ol><li>Register an account at <code>/api/v1/auth/register</code></li><li>Verify your email address</li><li>Generate an API key from the dashboard</li><li>Make your first request to the AI generation endpoint</li></ol>', 'Get started with ABC-IO v2.0 and learn the basics of the platform.', (SELECT id FROM help_categories WHERE slug = 'getting-started'), true, ARRAY['getting started', 'overview', 'quick start']),
('setting-up-your-first-project', 'Setting Up Your First Project', '<p>After creating your account, it is time to set up your first project. Projects in ABC-IO are organized around <strong>accounts</strong>, which group users, API keys, and billing information together.</p><h3>Steps</h3><ol><li>Log in to your account</li><li>Navigate to the API Keys section</li><li>Create a new key with the scopes you need</li><li>Configure your client to use the gateway at <code>https://api.abc-io.com</code></li></ol><p>Each account starts on the <strong>free tier</strong> with 1,000 requests per month.</p>', 'Learn how to create API keys and configure your first project.', (SELECT id FROM help_categories WHERE slug = 'getting-started'), true, ARRAY['project', 'api keys', 'setup']),
('how-to-use-the-ai-translation-api', 'How to Use the AI Translation API', '<p>The AI Translation API enables cross-sensory translation between text, Braille, Morse code, haptic signals, and more. It is powered by the <code>ai-isp</code> service.</p><h3>Making a Request</h3><pre>POST /api/v1/translate/:modality
Content-Type: application/json

{
  "text": "Hello world",
  "target": "braille"
}</pre><h3>Supported Modalities</h3><ul><li><code>text-to-braille</code></li><li><code>text-to-morse</code></li><li><code>text-to-haptic</code></li><li><code>speech-to-text</code></li></ul><p>Authentication is required via Bearer token or API key.</p>', 'A developer guide to integrating the AI Translation API.', (SELECT id FROM help_categories WHERE slug = 'api-integration'), true, ARRAY['api', 'translation', 'developer', 'integration']),
('beacon-safety-system-guide', 'Beacon Safety System Guide', '<p>The ABC-IO Beacon system is a public safety platform for emitting, tracking, and responding to emergency, transit, and SOS signals.</p><h3>Emitting a Beacon</h3><pre>POST /api/v1/beacon/emit
{
  "beacon_type": "emergency",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "message": "Medical emergency at Central Park"
}</pre><h3>Responder Types</h3><ul><li>Police</li><li>Medical</li><li>Fire</li><li>Civilian</li></ul><p>Beacons expire after 24 hours and can be acknowledged by authorized responders.</p>', 'Learn how to use the public safety beacon system.', (SELECT id FROM help_categories WHERE slug = 'beacon-safety'), true, ARRAY['beacon', 'safety', 'emergency', 'public safety']),
('account-setup-and-billing', 'Account Setup and Billing', '<p>ABC-IO offers flexible billing through Stripe and PayPal. This article covers account creation, subscription management, and payment methods.</p><h3>Subscription Tiers</h3><ul><li>Free — 1,000 requests/month</li><li>Basic — 5,000 requests/month</li><li>Pro — 50,000 requests/month</li><li>Enterprise — 1,000,000 requests/month</li></ul><h3>Managing Payments</h3><p>Use the billing portal to update cards, view invoices, and change plans. Access it via <code>POST /api/v1/billing/portal</code>.</p>', 'Everything you need to know about accounts, subscriptions, and billing.', (SELECT id FROM help_categories WHERE slug = 'accounts-billing'), true, ARRAY['billing', 'subscription', 'payment', 'stripe']),
('api-key-management', 'API Key Management', '<p>API keys are the primary way to authenticate programmatic requests to ABC-IO. Each key has a prefix, scopes, and optional expiration.</p><h3>Creating a Key</h3><pre>POST /api/v1/keys
{
  "name": "Production Key",
  "scopes": ["read", "write"]
}</pre><h3>Security Tips</h3><ul><li>Never commit keys to source control</li><li>Rotate keys every 90 days</li><li>Use separate keys for development and production</li></ul><p>Revoked keys are invalidated immediately.</p>', 'Best practices for creating, using, and securing API keys.', (SELECT id FROM help_categories WHERE slug = 'api-integration'), true, ARRAY['api keys', 'security', 'authentication']),
('understanding-rate-limits', 'Understanding Rate Limits', '<p>Rate limits are enforced per account tier to ensure fair usage and platform stability. Limits are calculated per minute.</p><h3>Tier Limits</h3><table><tr><th>Tier</th><th>Requests/Min</th></tr><tr><td>Free</td><td>30</td></tr><tr><td>Pro</td><td>300</td></tr><tr><td>Enterprise</td><td>3,000</td></tr></table><p>If you exceed your limit, the API returns <code>429 Too Many Requests</code>. Upgrade your plan or wait for the next window.</p>', 'Learn how rate limits work and how to avoid hitting them.', (SELECT id FROM help_categories WHERE slug = 'api-integration'), true, ARRAY['rate limits', 'api', 'throttling', 'quota']),
('security-best-practices', 'Security Best Practices', '<p>Protecting your ABC-IO account and data is critical. Follow these guidelines to maintain a secure environment.</p><h3>Recommendations</h3><ul><li>Enable two-factor authentication where available</li><li>Use strong, unique passwords</li><li>Regularly rotate API keys and secrets</li><li>Monitor audit logs for suspicious activity</li><li>Restrict CORS origins in production</li></ul><p>Report security incidents to <code>security@abc-io.com</code>.</p>', 'Essential security guidelines for ABC-IO users and developers.', (SELECT id FROM help_categories WHERE slug = 'security-privacy'), true, ARRAY['security', 'authentication', 'best practices']),
('troubleshooting-common-issues', 'Troubleshooting Common Issues', '<p>This article covers frequent problems and their solutions.</p><h3>502 Bad Gateway</h3><p>Usually means a downstream service (kimi, ai-isp, beacon) is unavailable. Check the system health endpoint: <code>GET /api/v1/system/health</code>.</p><h3>401 Unauthorized</h3><p>Verify your Bearer token or API key. Tokens expire after 7 days.</p><h3>429 Rate Limit Exceeded</h3><p>You have hit your tier limit. Wait one minute or upgrade your plan.</p><h3>Database Connection Errors</h3><p>Contact support if persistent. Our auto-heal system usually resolves this within 60 seconds.</p>', 'Solutions to the most common errors and issues.', (SELECT id FROM help_categories WHERE slug = 'troubleshooting'), true, ARRAY['troubleshooting', 'errors', 'support', 'faq']),
('how-to-upgrade-your-plan', 'How to Upgrade Your Plan', '<p>Upgrading your plan unlocks higher rate limits, more monthly requests, and priority support.</p><h3>Steps</h3><ol><li>Go to the billing dashboard</li><li>Select a new tier</li><li>Complete checkout via Stripe or PayPal</li><li>Your new limits apply immediately</li></ol><h3>Changing Plans</h3><p>Use <code>POST /api/v1/billing/change-plan</code> to switch between active subscriptions. Proration is handled automatically.</p>', 'Step-by-step guide to upgrading your ABC-IO subscription.', (SELECT id FROM help_categories WHERE slug = 'accounts-billing'), true, ARRAY['upgrade', 'billing', 'subscription', 'plan']),
('contacting-support', 'Contacting Support', '<p>Need help? Our support team is available through multiple channels.</p><h3>Support Channels</h3><ul><li><strong>Intervention Tickets:</strong> <code>POST /api/v1/intervention</code></li><li><strong>Email:</strong> support@abc-io.com</li><li><strong>Chat:</strong> Join the Support Queue room</li></ul><p>For business hours (8AM–8PM EST), tickets are escalated to human operators. Outside those hours, autonomous mitigation handles urgent issues.</p>', 'How to reach the ABC-IO support team and get help.', (SELECT id FROM help_categories WHERE slug = 'troubleshooting'), true, ARRAY['support', 'contact', 'help', 'ticket']),
('ai-isp-cross-sensory-overview', 'AI-ISP Cross-Sensory Overview', '<p>The AI-ISP service provides cross-sensory translation for accessibility and interfacing. It supports Braille, Morse code, haptic feedback, speech-to-text, and sign language stubs.</p><h3>Use Cases</h3><ul><li>Accessibility apps for visually impaired users</li><li>Emergency communication via Morse</li><li>Haptic navigation systems</li></ul><h3>Endpoint</h3><p><code>POST /api/v1/translate/:modality</code></p><p>Replace <code>:modality</code> with the desired translation target.</p>', 'An overview of the AI-ISP cross-sensory translation capabilities.', (SELECT id FROM help_categories WHERE slug = 'ai-isp'), true, ARRAY['ai-isp', 'translation', 'accessibility', 'braille', 'morse'])
ON CONFLICT DO NOTHING;

-- Seed default operations chat room
INSERT INTO chat_rooms (name, room_type, status) VALUES
  ('Operations Command', 'operations', 'active'),
  ('Support Queue', 'support', 'active'),
  ('Alert Channel', 'alert', 'active')
ON CONFLICT DO NOTHING;
