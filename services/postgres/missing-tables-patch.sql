-- ABC-IO v2.0 Database Patch
-- Applies missing tables for beacons, help center, chat, and intervention messages.
-- Safe to re-run: uses IF NOT EXISTS and ON CONFLICT DO NOTHING.

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

CREATE INDEX IF NOT EXISTS idx_beacons_status ON beacons(status);
CREATE INDEX IF NOT EXISTS idx_beacons_created ON beacons(created_at);
CREATE INDEX IF NOT EXISTS idx_beacons_location ON beacons USING gist (point(longitude, latitude));

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

CREATE INDEX IF NOT EXISTS idx_beacon_ack_beacon ON beacon_acknowledgments(beacon_id);

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

CREATE INDEX IF NOT EXISTS idx_beacon_notif_beacon ON beacon_notifications(beacon_id);

-- ============================================
-- HELP & ONBOARDING SYSTEM
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

CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_published ON help_articles(published);

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

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

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

CREATE INDEX IF NOT EXISTS idx_intervention_msg_ticket ON intervention_messages(ticket_id);

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO accounts (id, name, slug, tier, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'System', 'system', 'enterprise', 'active')
ON CONFLICT DO NOTHING;

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

INSERT INTO help_articles (slug, title, content, excerpt, category_id, published, tags) VALUES
('welcome-to-abc-io', 'Welcome to ABC-IO', '<p>Welcome to <strong>ABC-IO v2.0</strong>, the all-in-one platform for AI-powered translation, public safety beacons, and seamless API integration.</p><h3>Quick Start</h3><ol><li>Register an account at <code>/api/v1/auth/register</code></li><li>Verify your email address</li><li>Generate an API key from the dashboard</li><li>Make your first request to the AI generation endpoint</li></ol>', 'Get started with ABC-IO v2.0 and learn the basics of the platform.', (SELECT id FROM help_categories WHERE slug = 'getting-started'), true, ARRAY['getting started', 'overview', 'quick start']),
('beacon-safety-system-guide', 'Beacon Safety System Guide', '<p>The ABC-IO Beacon system is a public safety platform for emitting, tracking, and responding to emergency, transit, and SOS signals.</p><h3>Emitting a Beacon</h3><pre>POST /api/v1/beacon/emit
{
  "beacon_type": "emergency",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "message": "Medical emergency at Central Park"
}</pre><h3>Responder Types</h3><ul><li>Police</li><li>Medical</li><li>Fire</li><li>Civilian</li></ul><p>Beacons expire after 24 hours and can be acknowledged by authorized responders.</p>', 'Learn how to use the public safety beacon system.', (SELECT id FROM help_categories WHERE slug = 'beacon-safety'), true, ARRAY['beacon', 'safety', 'emergency', 'public safety']),
('security-best-practices', 'Security Best Practices', '<p>Protecting your ABC-IO account and data is critical. Follow these guidelines to maintain a secure environment.</p><h3>Recommendations</h3><ul><li>Use strong, unique passwords</li><li>Regularly rotate API keys and secrets</li><li>Monitor audit logs for suspicious activity</li><li>Restrict CORS origins in production</li></ul>', 'Essential security guidelines for ABC-IO users and developers.', (SELECT id FROM help_categories WHERE slug = 'security-privacy'), true, ARRAY['security', 'authentication', 'best practices']),
('troubleshooting-common-issues', 'Troubleshooting Common Issues', '<p>This article covers frequent problems and their solutions.</p><h3>502 Bad Gateway</h3><p>Usually means a downstream service is unavailable. Check the system health endpoint.</p><h3>401 Unauthorized</h3><p>Verify your Bearer token or API key.</p><h3>429 Rate Limit Exceeded</h3><p>You have hit your tier limit. Wait one minute or upgrade.</p>', 'Solutions to the most common errors and issues.', (SELECT id FROM help_categories WHERE slug = 'troubleshooting'), true, ARRAY['troubleshooting', 'errors', 'support', 'faq'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_rooms (name, room_type, status) VALUES
  ('Operations Command', 'operations', 'active'),
  ('Support Queue', 'support', 'active'),
  ('Alert Channel', 'alert', 'active')
ON CONFLICT DO NOTHING;
