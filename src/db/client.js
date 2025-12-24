const { Pool } = require('pg');
const winston = require('winston');

class DatabaseClient {
  constructor(config, logger) {
    this.config = {
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || process.env.DB_PORT || 5432,
      database: config.database || process.env.DB_NAME || 'free_api_hub',
      user: config.user || process.env.DB_USER || 'postgres',
      password: config.password || process.env.DB_PASSWORD,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
    };

    this.logger = logger || winston.createLogger({ silent: true });
    this.pool = new Pool(this.config);
    this.setupHandlers();
  }

  setupHandlers() {
    this.pool.on('connect', () => {
      this.logger.info('New database client connected');
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected database error:', err);
    });

    this.pool.on('remove', () => {
      this.logger.info('Database client removed from pool');
    });
  }

  async query(text, params = []) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      this.logger.debug(`Query executed in ${duration}ms`, { text, duration });
      return result;
    } catch (error) {
      this.logger.error('Database query error:', { text, error: error.message });
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Transaction error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // API Keys Methods
  async createApiKey(data) {
    const query = `
      INSERT INTO api_keys (key_hash, name, description, rate_limit, allowed_services, expires_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await this.query(query, [
      data.keyHash,
      data.name,
      data.description || null,
      data.rateLimit || 1000,
      data.allowedServices || null,
      data.expiresAt || null,
      data.metadata || {}
    ]);
    return result.rows[0];
  }

  async getApiKey(keyHash) {
    const query = 'SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = true';
    const result = await this.query(query, [keyHash]);
    return result.rows[0];
  }

  async updateApiKeyUsage(keyHash) {
    const query = `
      UPDATE api_keys 
      SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP
      WHERE key_hash = $1
      RETURNING usage_count
    `;
    const result = await this.query(query, [keyHash]);
    return result.rows[0];
  }

  async deactivateApiKey(keyHash) {
    const query = 'UPDATE api_keys SET is_active = false WHERE key_hash = $1';
    await this.query(query, [keyHash]);
  }

  // Request Logs Methods
  async logRequest(data) {
    const query = `
      INSERT INTO request_logs 
        (method, path, service, action, status_code, response_time, ip_address, 
         user_agent, api_key_id, cached, error_message, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;
    const result = await this.query(query, [
      data.method,
      data.path,
      data.service || null,
      data.action || null,
      data.statusCode,
      data.responseTime,
      data.ipAddress || null,
      data.userAgent || null,
      data.apiKeyId || null,
      data.cached || false,
      data.errorMessage || null,
      data.metadata || {}
    ]);
    return result.rows[0].id;
  }

  async getRequestLogs(options = {}) {
    const {
      limit = 100,
      offset = 0,
      service = null,
      startDate = null,
      endDate = null,
      statusCode = null
    } = options;

    let query = 'SELECT * FROM request_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (service) {
      query += ` AND service = $${paramIndex++}`;
      params.push(service);
    }

    if (startDate) {
      query += ` AND timestamp >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND timestamp <= $${paramIndex++}`;
      params.push(endDate);
    }

    if (statusCode) {
      query += ` AND status_code = $${paramIndex++}`;
      params.push(statusCode);
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.query(query, params);
    return result.rows;
  }

  // Services Methods
  async createService(data) {
    const query = `
      INSERT INTO services 
        (name, display_name, description, endpoint, icon, category, rate_limit, 
         cache_ttl, timeout, headers, auth_required, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const result = await this.query(query, [
      data.name,
      data.displayName,
      data.description || null,
      data.endpoint,
      data.icon || null,
      data.category || null,
      data.rateLimit || 100,
      data.cacheTtl || 300,
      data.timeout || 5000,
      data.headers || {},
      data.authRequired || false,
      data.metadata || {}
    ]);
    return result.rows[0];
  }

  async getService(name) {
    const query = 'SELECT * FROM services WHERE name = $1 AND is_active = true';
    const result = await this.query(query, [name]);
    return result.rows[0];
  }

  async getAllServices() {
    const query = 'SELECT * FROM services WHERE is_active = true ORDER BY name';
    const result = await this.query(query);
    return result.rows;
  }

  async updateServiceStats(name, stats) {
    const query = `
      UPDATE services 
      SET total_requests = total_requests + $2,
          total_errors = total_errors + $3,
          avg_response_time = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE name = $1
    `;
    await this.query(query, [
      name,
      stats.requests || 0,
      stats.errors || 0,
      stats.avgResponseTime || 0
    ]);
  }

  async updateServiceHealth(name, status) {
    const query = `
      UPDATE services 
      SET health_status = $2, last_health_check = CURRENT_TIMESTAMP
      WHERE name = $1
    `;
    await this.query(query, [name, status]);
  }

  // Users Methods
  async createUser(data) {
    const query = `
      INSERT INTO users (email, username, password_hash, full_name, role, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, username, full_name, role, created_at
    `;
    const result = await this.query(query, [
      data.email,
      data.username,
      data.passwordHash,
      data.fullName || null,
      data.role || 'user',
      data.metadata || {}
    ]);
    return result.rows[0];
  }

  async getUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
    const result = await this.query(query, [email]);
    return result.rows[0];
  }

  async getUserByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
    const result = await this.query(query, [username]);
    return result.rows[0];
  }

  async updateUserLogin(userId) {
    const query = `
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP, login_count = login_count + 1
      WHERE id = $1
    `;
    await this.query(query, [userId]);
  }

  // Analytics Methods
  async getAnalyticsSummary(days = 7) {
    const query = `
      SELECT 
        date,
        SUM(total_requests) as total_requests,
        SUM(successful_requests) as successful_requests,
        SUM(failed_requests) as failed_requests,
        AVG(avg_response_time)::INTEGER as avg_response_time,
        SUM(cache_hits) as cache_hits,
        SUM(cache_misses) as cache_misses
      FROM analytics_daily
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY date
      ORDER BY date DESC
    `;
    const result = await this.query(query);
    return result.rows;
  }

  async getServiceStats(serviceName = null) {
    let query = 'SELECT * FROM service_stats';
    const params = [];
    
    if (serviceName) {
      query += ' WHERE name = $1';
      params.push(serviceName);
    }
    
    query += ' ORDER BY total_requests DESC';
    const result = await this.query(query, params);
    return result.rows;
  }

  // Webhooks Methods
  async createWebhook(data) {
    const query = `
      INSERT INTO webhooks (user_id, name, url, secret, events, retry_count, timeout, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await this.query(query, [
      data.userId,
      data.name,
      data.url,
      data.secret,
      data.events,
      data.retryCount || 3,
      data.timeout || 10000,
      data.metadata || {}
    ]);
    return result.rows[0];
  }

  async getActiveWebhooks(eventType) {
    const query = `
      SELECT * FROM webhooks 
      WHERE is_active = true AND $1 = ANY(events)
    `;
    const result = await this.query(query, [eventType]);
    return result.rows;
  }

  async logWebhook(data) {
    const query = `
      INSERT INTO webhook_logs (webhook_id, event_type, payload, status_code, response_time, error_message)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await this.query(query, [
      data.webhookId,
      data.eventType,
      data.payload,
      data.statusCode || null,
      data.responseTime || null,
      data.errorMessage || null
    ]);
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as time');
      return {
        healthy: true,
        timestamp: result.rows[0].time,
        poolSize: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  async close() {
    await this.pool.end();
    this.logger.info('Database connection pool closed');
  }
}

module.exports = DatabaseClient;
