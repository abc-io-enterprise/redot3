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
-- DEFAULT ACCOUNT (system)
-- ============================================

INSERT INTO accounts (id, name, slug, tier, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'System', 'system', 'enterprise', 'active')
ON CONFLICT DO NOTHING;
