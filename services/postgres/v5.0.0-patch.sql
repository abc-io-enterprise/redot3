-- ABC-IO v5.0.0 Database Migration Patch
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- Apply this to existing databases that were initialized before v5.0.0.

-- ============================================
-- ACCOUNTS
-- ============================================
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS requested_tier VARCHAR(50) DEFAULT 'free'
    CHECK (requested_tier IN ('free', 'basic', 'standard', 'pro', 'business', 'team', 'corporate', 'enterprise', 'agency', 'global'));

-- ============================================
-- FAMILY PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS family_preferences (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  content_filter_strictness VARCHAR(50) DEFAULT 'moderate' CHECK (content_filter_strictness IN ('strict', 'moderate', 'relaxed')),
  notification_email VARCHAR(255),
  family_account_pin_hash VARCHAR(255),
  allowed_feature_categories JSONB DEFAULT '["ai-isp", "chat", "beacon", "creative", "safety"]',
  profanity_filter BOOLEAN DEFAULT TRUE,
  block_unsafe_links BOOLEAN DEFAULT TRUE,
  human_review BOOLEAN DEFAULT TRUE,
  daily_summary_emails BOOLEAN DEFAULT FALSE,
  require_ai_approval BOOLEAN DEFAULT FALSE,
  restrict_safe_zones BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_preferences_account ON family_preferences(account_id);

-- ============================================
-- SECURITY EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'high', 'critical')),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  acknowledged BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_created ON security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_account ON security_events(account_id);

-- ============================================
-- HELP ARTICLE ONBOARDING COLUMNS
-- ============================================
ALTER TABLE help_articles
  ADD COLUMN IF NOT EXISTS track_progress BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_week INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'));

CREATE INDEX IF NOT EXISTS idx_help_articles_onboarding_week ON help_articles(onboarding_week);

-- ============================================
-- USER HELP PROGRESS
-- ============================================
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  article_slug TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  progress_percent INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, article_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_article ON user_progress(article_slug);

-- ============================================
-- PRODUCTS & ADD-ONS (v5.0.0 Phase 1)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  product_type VARCHAR(50) DEFAULT 'addon' CHECK (product_type IN ('tier', 'addon', 'feature')),
  min_tier VARCHAR(50) DEFAULT 'free' CHECK (min_tier IN ('free', 'basic', 'standard', 'pro', 'business', 'team', 'corporate', 'enterprise', 'agency', 'global')),
  stripe_price_id VARCHAR(255),
  price_cents INTEGER,
  currency VARCHAR(3) DEFAULT 'usd',
  billing_interval VARCHAR(50) DEFAULT 'month' CHECK (billing_interval IN ('once', 'month', 'year')),
  features JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_public ON products(is_public, sort_order);

CREATE TABLE IF NOT EXISTS account_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  stripe_subscription_id VARCHAR(255),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_account_products_account ON account_products(account_id);
CREATE INDEX IF NOT EXISTS idx_account_products_product ON account_products(product_id);

-- ============================================
-- ACCOUNT-SCOPED DIRECT MESSAGING (v5.0.0 Phase 1)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title VARCHAR(255),
  conversation_type VARCHAR(50) DEFAULT 'group' CHECK (conversation_type IN ('direct', 'group', 'support')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_account ON conversations(account_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'translation', 'beacon', 'system')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created ON direct_messages(created_at DESC);

-- Seed default products (safe to re-run)
INSERT INTO products (slug, name, description, product_type, min_tier, price_cents, billing_interval, features, is_public, sort_order) VALUES
  ('global-sensory-interface-communications', 'Global Sensory Interface Communications Provider', 'Multi-sensory, interface-to-interface communication across mobile, desktop, and wearable devices. Includes account-scoped messaging, cross-sensory translation relay, and cellular/satellite failover awareness.', 'feature', 'free', 0, 'month', '["account-scoped messaging","cross-sensory translation relay","cellular/satellite failover awareness","multi-device sync"]', true, 1),
  ('mobile-cellular-node', 'Mobile Cellular Node License', 'Enable a mobile device as a full cellular backup node on the ABC-IO mesh. Includes priority routing, beacon relay, and emergency message caching.', 'addon', 'basic', 4999, 'month', '["cellular backup node","priority routing","beacon relay","emergency message cache"]', true, 2),
  ('ai-isp-premium', 'AI-ISP Premium Translation Pack', 'Unlock higher-rate cross-sensory translation with priority queueing and additional modalities.', 'addon', 'pro', 1999, 'month', '["priority translation queue","expanded modalities","higher rate limits"]', true, 3),
  ('enterprise-support', 'Enterprise 24/7 Support', '24/7 human escalation, dedicated operator channel, and quarterly business reviews.', 'addon', 'enterprise', 49900, 'month', '["24/7 human escalation","dedicated operator channel","quarterly review"]', true, 4)
ON CONFLICT DO NOTHING;

-- ============================================
-- CROSS-SENSORY INTERFACE SESSIONS (v5.0.0 Phase 2)
-- ============================================
CREATE TABLE IF NOT EXISTS interface_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255),
  session_type VARCHAR(50) DEFAULT 'shared' CHECK (session_type IN ('single', 'shared', 'organization')),
  input_modes TEXT[] DEFAULT '{"text","audio","visual"}',
  output_modes TEXT[] DEFAULT '{"text","audio","visual","haptic"}',
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interface_sessions_account ON interface_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_interface_sessions_slug ON interface_sessions(slug);

CREATE TABLE IF NOT EXISTS interface_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interface_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(255),
  input_mode VARCHAR(50) DEFAULT 'text',
  output_mode VARCHAR(50) DEFAULT 'text',
  device_profile JSONB,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_interface_participants_session ON interface_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_interface_participants_user ON interface_participants(user_id);

CREATE TABLE IF NOT EXISTS interface_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('microphone','speaker','camera','haptic','display','scent','taste','generic')),
  capabilities TEXT[],
  config JSONB,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','inactive','error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interface_devices_account ON interface_devices(account_id);
CREATE INDEX IF NOT EXISTS idx_interface_devices_user ON interface_devices(user_id);

CREATE TABLE IF NOT EXISTS cross_sensory_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interface_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_mode VARCHAR(50) NOT NULL,
  target_mode VARCHAR(50) NOT NULL,
  raw_payload TEXT,
  translated_payload TEXT,
  intermediate_translations JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cross_sensory_messages_session ON cross_sensory_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_cross_sensory_messages_created ON cross_sensory_messages(created_at DESC);
