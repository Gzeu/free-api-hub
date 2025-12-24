const winston = require('winston');

// In-memory analytics store (can be replaced with Redis/PostgreSQL later)
const analytics = {
  requests: [],
  endpoints: new Map(),
  services: new Map(),
  errors: new Map(),
  responseTime: [],
  cacheHits: 0,
  cacheMisses: 0
};

// Analytics middleware
function analyticsMiddleware(req, res, next) {
  const start = Date.now();
  const originalJson = res.json.bind(res);
  
  // Track request
  const requestData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };
  
  // Override res.json to capture response
  res.json = function(data) {
    const duration = Date.now() - start;
    
    // Track response time
    analytics.responseTime.push(duration);
    if (analytics.responseTime.length > 1000) {
      analytics.responseTime.shift(); // Keep last 1000
    }
    
    // Track endpoint usage
    const endpoint = `${req.method} ${req.path}`;
    analytics.endpoints.set(
      endpoint,
      (analytics.endpoints.get(endpoint) || 0) + 1
    );
    
    // Track service usage (from /api/:service/* endpoints)
    if (req.params.service) {
      analytics.services.set(
        req.params.service,
        (analytics.services.get(req.params.service) || 0) + 1
      );
    }
    
    // Track errors
    if (res.statusCode >= 400) {
      const errorKey = `${res.statusCode}: ${req.path}`;
      analytics.errors.set(
        errorKey,
        (analytics.errors.get(errorKey) || 0) + 1
      );
    }
    
    // Track cache hits/misses
    if (data && typeof data === 'object') {
      if (data.cached === true) {
        analytics.cacheHits++;
      } else if (data.cached === false) {
        analytics.cacheMisses++;
      }
    }
    
    // Store request with response data
    analytics.requests.push({
      ...requestData,
      statusCode: res.statusCode,
      duration,
      cached: data?.cached || false
    });
    
    // Keep only last 1000 requests
    if (analytics.requests.length > 1000) {
      analytics.requests.shift();
    }
    
    return originalJson(data);
  };
  
  next();
}

// Get analytics summary
function getAnalyticsSummary() {
  const totalRequests = analytics.requests.length;
  const avgResponseTime = analytics.responseTime.length > 0
    ? analytics.responseTime.reduce((a, b) => a + b, 0) / analytics.responseTime.length
    : 0;
  
  const cacheHitRate = (analytics.cacheHits + analytics.cacheMisses) > 0
    ? (analytics.cacheHits / (analytics.cacheHits + analytics.cacheMisses) * 100)
    : 0;
  
  // Top endpoints
  const topEndpoints = Array.from(analytics.endpoints.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));
  
  // Top services
  const topServices = Array.from(analytics.services.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([service, count]) => ({ service, count }));
  
  // Recent errors
  const recentErrors = Array.from(analytics.errors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([error, count]) => ({ error, count }));
  
  // Response time percentiles
  const sortedTimes = [...analytics.responseTime].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
  
  // Requests per minute (last 60 requests)
  const recentRequests = analytics.requests.slice(-60);
  const timeSpan = recentRequests.length > 1
    ? (new Date(recentRequests[recentRequests.length - 1].timestamp) - new Date(recentRequests[0].timestamp)) / 1000 / 60
    : 1;
  const requestsPerMinute = recentRequests.length / (timeSpan || 1);
  
  return {
    overview: {
      totalRequests,
      requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100
    },
    responseTime: {
      avg: Math.round(avgResponseTime),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      min: Math.min(...sortedTimes) || 0,
      max: Math.max(...sortedTimes) || 0
    },
    cache: {
      hits: analytics.cacheHits,
      misses: analytics.cacheMisses,
      hitRate: Math.round(cacheHitRate * 100) / 100
    },
    topEndpoints,
    topServices,
    recentErrors,
    recentRequests: analytics.requests.slice(-20).reverse()
  };
}

// Reset analytics
function resetAnalytics() {
  analytics.requests = [];
  analytics.endpoints.clear();
  analytics.services.clear();
  analytics.errors.clear();
  analytics.responseTime = [];
  analytics.cacheHits = 0;
  analytics.cacheMisses = 0;
}

module.exports = {
  analyticsMiddleware,
  getAnalyticsSummary,
  resetAnalytics,
  analytics
};
