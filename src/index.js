const express = require('express');
const { createClient } = require('redis');
const axios = require('axios');
const yaml = require('yaml');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const winston = require('winston');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(express.json());

// Redis/Dragonfly client
const redis = createClient({ 
  url: process.env.DRAGONFLY_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
  }
});

redis.on('error', err => logger.error('Redis Client Error', err));
redis.on('connect', () => logger.info('Connected to Dragonfly cache'));

// Load API configuration
let yamlConfig = {};
try {
  yamlConfig = yaml.parse(fs.readFileSync('./config/apis.yaml', 'utf8'));
  logger.info(`Loaded ${Object.keys(yamlConfig).length} API services`);
} catch (error) {
  logger.error('Failed to load API config:', error);
  process.exit(1);
}

// Gemini AI (Free tier: 60 requests/minute)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Rate limiting with Dragonfly
async function rateLimit(service, userId) {
  const key = `rl:${service}:${userId}`;
  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, 60);
    
    const limit = yamlConfig[service]?.rateLimit || 100;
    return current > limit;
  } catch (error) {
    logger.error('Rate limit check failed:', error);
    return false; // Fail open
  }
}

// Free uptime oracle - verifies API health
async function verifyUptime(serviceUrl, checks = 3) {
  const results = await Promise.allSettled(
    Array(checks).fill(0).map(() => 
      axios.get(serviceUrl, { 
        timeout: 3000,
        validateStatus: (status) => status < 500 
      })
      .then(() => true)
      .catch(() => false)
    )
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const uptimePercent = (successful / checks) * 100;
  
  return {
    up: uptimePercent >= 66, // 2/3 success = healthy
    uptimePercent,
    checks: results.length
  };
}

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      dragonfly: await redis.ping().then(() => 'connected').catch(() => 'disconnected'),
      apis: Object.keys(yamlConfig).length
    }
  };
  res.json(health);
});

// API proxy with caching
app.get('/api/:service/:action?', async (req, res) => {
  const { service, action } = req.params;
  const userId = req.ip;
  
  const api = yamlConfig[service];
  
  // AI-powered 404 handling
  if (!api) {
    try {
      const prompt = `API service "${service}" not found. Available services: ${Object.keys(yamlConfig).join(', ')}. Suggest the most relevant alternative service and explain why in 1-2 sentences.`;
      const result = await model.generateContent(prompt);
      return res.status(404).json({ 
        error: 'Service not found',
        suggestion: result.response.text(),
        available: Object.keys(yamlConfig)
      });
    } catch (aiError) {
      return res.status(404).json({ 
        error: 'Service not found',
        available: Object.keys(yamlConfig)
      });
    }
  }
  
  // Rate limiting
  if (await rateLimit(service, userId)) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      limit: api.rateLimit || 100,
      window: '60 seconds'
    });
  }
  
  // Cache check
  const cacheKey = `cache:${service}:${action || 'default'}:${JSON.stringify(req.query)}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info(`Cache HIT: ${cacheKey}`);
      return res.json({ ...JSON.parse(cached), cached: true });
    }
  } catch (cacheError) {
    logger.warn('Cache read failed:', cacheError);
  }
  
  // Uptime verification
  const uptime = await verifyUptime(api.endpoint);
  if (!uptime.up) {
    return res.status(503).json({ 
      error: 'Service temporarily unavailable',
      uptime: uptime.uptimePercent + '%',
      checks: uptime.checks
    });
  }
  
  // Proxy request
  try {
    const targetUrl = `${api.endpoint}${action ? '/' + action : ''}`;
    const response = await axios.get(targetUrl, {
      params: req.query,
      timeout: api.timeout || 5000,
      headers: api.headers || {}
    });
    
    // Cache response
    const ttl = api.cacheTTL || 300;
    await redis.setEx(cacheKey, ttl, JSON.stringify(response.data)).catch(err => 
      logger.warn('Cache write failed:', err)
    );
    
    logger.info(`Proxied: ${service}/${action} -> ${targetUrl}`);
    res.json({ ...response.data, cached: false });
    
  } catch (error) {
    logger.error(`Proxy error: ${service}/${action}`, error.message);
    res.status(502).json({ 
      error: 'Bad gateway',
      service,
      message: error.message
    });
  }
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    const info = await redis.info();
    res.set('Content-Type', 'text/plain');
    res.send(`# HELP dragonfly_connected_clients Number of client connections\n# TYPE dragonfly_connected_clients gauge\ndragonfly_connected_clients ${info.match(/connected_clients:(\d+)/)?.[1] || 0}\n`);
  } catch (error) {
    res.status(500).send('# Error fetching metrics');
  }
});

// Start server
async function start() {
  try {
    await redis.connect();
    app.listen(PORT, () => {
      logger.info(`🚀 Free API Hub running on port ${PORT}`);
      logger.info(`📊 Health: http://localhost:${PORT}/health`);
      logger.info(`🎯 API Proxy: http://localhost:${PORT}/api/:service/:action`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redis.quit();
  process.exit(0);
});
