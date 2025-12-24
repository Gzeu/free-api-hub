const express = require('express');
const http = require('http');
const { createClient } = require('redis');
const axios = require('axios');
const yaml = require('yaml');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const winston = require('winston');
const helmet = require('helmet');
const compression = require('compression');
const { swaggerUi, swaggerDocument, swaggerOptions } = require('./swagger');
const { analyticsMiddleware, getAnalyticsSummary } = require('./middleware/analytics');
const analyticsRoutes = require('./routes/analytics');
const WebSocketServer = require('./websocket/server');
const CacheStrategies = require('./cache/strategies');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "validator.swagger.io"],
      "script-src": ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      "connect-src": ["'self'", "ws:", "wss:"],
    },
  },
}));
app.use(compression());
app.use(express.json());
app.use(analyticsMiddleware);

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Swagger UI
app.use('/docs', swaggerUi.serve);
app.get('/docs', swaggerUi.setup(swaggerDocument, swaggerOptions));

// Analytics routes
app.use('/analytics', analyticsRoutes);

// Redis/Dragonfly client
const redis = createClient({ 
  url: process.env.DRAGONFLY_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
  }
});

redis.on('error', err => logger.error('Redis Client Error', err));
redis.on('connect', () => logger.info('Connected to Dragonfly cache'));

// Initialize cache strategies
let cacheStrategies;

// WebSocket server
let wsServer;

// Load API configuration
let yamlConfig = {};
try {
  yamlConfig = yaml.parse(fs.readFileSync('./config/apis.yaml', 'utf8'));
  logger.info(`Loaded ${Object.keys(yamlConfig).length} API services`);
} catch (error) {
  logger.error('Failed to load API config:', error);
  process.exit(1);
}

// Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'demo');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Rate limiting
async function rateLimit(service, userId) {
  const key = `rl:${service}:${userId}`;
  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, 60);
    
    const limit = yamlConfig[service]?.rateLimit || 100;
    return current > limit;
  } catch (error) {
    logger.error('Rate limit check failed:', error);
    return false;
  }
}

// Uptime oracle
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
    up: uptimePercent >= 66,
    uptimePercent,
    checks: results.length
  };
}

// Routes
app.get('/', (req, res) => {
  res.redirect('/advanced-dashboard.html');
});

app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      dragonfly: await redis.ping().then(() => 'connected').catch(() => 'disconnected'),
      websocket: wsServer ? 'active' : 'inactive',
      apis: Object.keys(yamlConfig).length
    },
    stats: wsServer ? wsServer.getStats() : null
  };
  res.json(health);
});

// WebSocket stats endpoint
app.get('/ws/stats', (req, res) => {
  if (!wsServer) {
    return res.status(503).json({ error: 'WebSocket server not initialized' });
  }
  res.json({
    stats: wsServer.getStats(),
    clients: wsServer.getClients(),
    rooms: wsServer.getRooms()
  });
});

// Cache stats endpoint
app.get('/cache/stats', async (req, res) => {
  try {
    const stats = await cacheStrategies.getStats();
    res.json({ status: 'success', data: stats });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// API proxy with advanced caching
app.get('/api/:service/:action?', async (req, res) => {
  const { service, action } = req.params;
  const userId = req.ip;
  
  const api = yamlConfig[service];
  
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
  
  if (await rateLimit(service, userId)) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      limit: api.rateLimit || 100,
      window: '60 seconds'
    });
  }
  
  const cacheKey = `cache:${service}:${action || 'default'}:${JSON.stringify(req.query)}`;
  
  try {
    const result = await cacheStrategies.cacheAside(
      cacheKey,
      async () => {
        const uptime = await verifyUptime(api.endpoint);
        if (!uptime.up) {
          throw new Error('Service temporarily unavailable');
        }
        
        const targetUrl = `${api.endpoint}${action ? '/' + action : ''}`;
        const response = await axios.get(targetUrl, {
          params: req.query,
          timeout: api.timeout || 5000,
          headers: api.headers || {}
        });
        
        logger.info(`Proxied: ${service}/${action} -> ${targetUrl}`);
        return response.data;
      },
      api.cacheTTL || 300
    );
    
    res.json(result);
  } catch (error) {
    logger.error(`Proxy error: ${service}/${action}`, error.message);
    res.status(502).json({ 
      error: 'Bad gateway',
      service,
      message: error.message
    });
  }
});

// Metrics endpoint
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
    
    // Initialize cache strategies
    cacheStrategies = new CacheStrategies(redis, logger);
    logger.info('Cache strategies initialized');
    
    // Initialize WebSocket server
    wsServer = new WebSocketServer(server);
    logger.info('WebSocket server initialized on /ws');
    
    // Broadcast analytics updates via WebSocket
    setInterval(() => {
      const analytics = getAnalyticsSummary();
      wsServer.publishToChannel('analytics', {
        type: 'analytics_update',
        data: analytics.overview
      });
    }, 2000);
    
    server.listen(PORT, () => {
      logger.info(`🚀 Free API Hub v2.1 running on port ${PORT}`);
      logger.info(`📊 Dashboard: http://localhost:${PORT}/advanced-dashboard.html`);
      logger.info(`📚 Swagger UI: http://localhost:${PORT}/docs`);
      logger.info(`📈 Analytics: http://localhost:${PORT}/analytics`);
      logger.info(`⚡ WebSocket: ws://localhost:${PORT}/ws`);
      logger.info(`💚 Health: http://localhost:${PORT}/health`);
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
  if (wsServer) wsServer.close();
  await redis.quit();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
