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
