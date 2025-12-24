-- Free API Hub Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_hash VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  rate_limit INTEGER DEFAULT 1000,
  allowed_services TEXT[], -- Array of allowed service names
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- Request Logs Table (for persistent analytics)
CREATE TABLE IF NOT EXISTS request_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(500) NOT NULL,
  service VARCHAR(100),
  action VARCHAR(100),
  status_code INTEGER NOT NULL,
  response_time INTEGER NOT NULL, -- milliseconds
  ip_address INET,
  user_agent TEXT,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  cached BOOLEAN DEFAULT false,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_request_logs_timestamp ON request_logs(timestamp DESC);
CREATE INDEX idx_request_logs_service ON request_logs(service);
CREATE INDEX idx_request_logs_status ON request_logs(status_code);
CREATE INDEX idx_request_logs_api_key ON request_logs(api_key_id);

-- Service Configuration Table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  endpoint VARCHAR(500) NOT NULL,
  icon VARCHAR(50),
  category VARCHAR(50),
  rate_limit INTEGER DEFAULT 100,
  cache_ttl INTEGER DEFAULT 300, -- seconds
  timeout INTEGER DEFAULT 5000, -- milliseconds
  is_active BOOLEAN DEFAULT true,
  health_check_url VARCHAR(500),
  last_health_check TIMESTAMP,
  health_status VARCHAR(20) DEFAULT 'unknown', -- up, down, degraded, unknown
  headers JSONB DEFAULT '{}',
  auth_required BOOLEAN DEFAULT false,
  cost_per_request DECIMAL(10, 6) DEFAULT 0,
  total_requests BIGINT DEFAULT 0,
  total_errors BIGINT DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_services_active ON services(is_active) WHERE is_active = true;
CREATE INDEX idx_services_category ON services(category);

-- Users Table (for authentication)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(200),
  avatar_url VARCHAR(500),
  role VARCHAR(20) DEFAULT 'user', -- user, admin, superadmin
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(64),
  password_reset_token VARCHAR(64),
  password_reset_expires TIMESTAMP,
  last_login_at TIMESTAMP,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- User API Keys Relationship
CREATE TABLE IF NOT EXISTS user_api_keys (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, api_key_id)
);

-- Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  secret VARCHAR(64) NOT NULL,
  events TEXT[] NOT NULL, -- Array of event types
  is_active BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 3,
  timeout INTEGER DEFAULT 10000,
  last_triggered_at TIMESTAMP,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_webhooks_user ON webhooks(user_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;

-- Webhook Logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_time INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_timestamp ON webhook_logs(created_at DESC);

-- Rate Limit Tracking (backup to Redis)
CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  identifier VARCHAR(100) NOT NULL, -- IP or API key
  service VARCHAR(100),
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  request_count INTEGER DEFAULT 0,
  limit_exceeded BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start, window_end);

-- Analytics Aggregations (daily summaries)
CREATE TABLE IF NOT EXISTS analytics_daily (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  service VARCHAR(100),
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0,
  p50_response_time INTEGER DEFAULT 0,
  p95_response_time INTEGER DEFAULT 0,
  p99_response_time INTEGER DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  unique_ips INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  total_bytes_transferred BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, service)
);

CREATE INDEX idx_analytics_daily_date ON analytics_daily(date DESC);
CREATE INDEX idx_analytics_daily_service ON analytics_daily(service);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- info, warning, error, success
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Sessions Table (for user sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Functions

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Views

-- Service Statistics View
CREATE OR REPLACE VIEW service_stats AS
SELECT 
  s.id,
  s.name,
  s.display_name,
  s.is_active,
  s.health_status,
  COUNT(rl.id) as total_requests,
  COUNT(rl.id) FILTER (WHERE rl.status_code < 400) as successful_requests,
  COUNT(rl.id) FILTER (WHERE rl.status_code >= 400) as failed_requests,
  AVG(rl.response_time)::INTEGER as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY rl.response_time)::INTEGER as p95_response_time,
  COUNT(rl.id) FILTER (WHERE rl.cached = true) as cache_hits,
  COUNT(DISTINCT rl.ip_address) as unique_ips,
  MAX(rl.timestamp) as last_request_at
FROM services s
LEFT JOIN request_logs rl ON s.name = rl.service
  AND rl.timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY s.id, s.name, s.display_name, s.is_active, s.health_status;

-- User Activity View
CREATE OR REPLACE VIEW user_activity AS
SELECT 
  u.id,
  u.username,
  u.email,
  u.role,
  u.last_login_at,
  COUNT(DISTINCT uak.api_key_id) as api_key_count,
  COUNT(rl.id) as total_requests,
  MAX(rl.timestamp) as last_request_at
FROM users u
LEFT JOIN user_api_keys uak ON u.id = uak.user_id
LEFT JOIN api_keys ak ON uak.api_key_id = ak.id
LEFT JOIN request_logs rl ON ak.id = rl.api_key_id
  AND rl.timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY u.id, u.username, u.email, u.role, u.last_login_at;

-- Comments
COMMENT ON TABLE api_keys IS 'API authentication keys with rate limiting and permissions';
COMMENT ON TABLE request_logs IS 'Persistent log of all API requests for analytics and auditing';
COMMENT ON TABLE services IS 'Configuration and metadata for proxied API services';
COMMENT ON TABLE users IS 'User accounts with authentication and authorization';
COMMENT ON TABLE webhooks IS 'Outbound webhook configurations for event notifications';
COMMENT ON TABLE analytics_daily IS 'Daily aggregated analytics for performance optimization';
COMMENT ON TABLE notifications IS 'In-app notifications for users';
