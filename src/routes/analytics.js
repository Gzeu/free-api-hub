const express = require('express');
const { getAnalyticsSummary, resetAnalytics } = require('../middleware/analytics');

const router = express.Router();

/**
 * GET /analytics
 * Returns comprehensive analytics summary
 */
router.get('/', (req, res) => {
  try {
    const summary = getAnalyticsSummary();
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve analytics',
      error: error.message
    });
  }
});

/**
 * GET /analytics/overview
 * Returns quick overview metrics
 */
router.get('/overview', (req, res) => {
  try {
    const summary = getAnalyticsSummary();
    res.json({
      status: 'success',
      data: summary.overview
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve overview',
      error: error.message
    });
  }
});

/**
 * GET /analytics/response-time
 * Returns response time statistics
 */
router.get('/response-time', (req, res) => {
  try {
    const summary = getAnalyticsSummary();
    res.json({
      status: 'success',
      data: summary.responseTime
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve response time data',
      error: error.message
    });
  }
});

/**
 * GET /analytics/cache
 * Returns cache performance metrics
 */
router.get('/cache', (req, res) => {
  try {
    const summary = getAnalyticsSummary();
    res.json({
      status: 'success',
      data: summary.cache
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve cache metrics',
      error: error.message
    });
  }
});

/**
 * GET /analytics/services
 * Returns service usage statistics
 */
router.get('/services', (req, res) => {
  try {
    const summary = getAnalyticsSummary();
    res.json({
      status: 'success',
      data: {
        topServices: summary.topServices,
        totalServices: summary.topServices.reduce((sum, s) => sum + s.count, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve service statistics',
      error: error.message
    });
  }
});

/**
 * GET /analytics/errors
 * Returns error statistics
 */
router.get('/errors', (req, res) => {
  try {
    const summary = getAnalyticsSummary();
    res.json({
      status: 'success',
      data: {
        recentErrors: summary.recentErrors,
        totalErrors: summary.recentErrors.reduce((sum, e) => sum + e.count, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve error statistics',
      error: error.message
    });
  }
});

/**
 * POST /analytics/reset
 * Resets all analytics data (admin only)
 */
router.post('/reset', (req, res) => {
  try {
    // TODO: Add authentication/authorization check
    resetAnalytics();
    res.json({
      status: 'success',
      message: 'Analytics data reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset analytics',
      error: error.message
    });
  }
});

/**
 * GET /analytics/live
 * Server-Sent Events stream for real-time analytics
 */
router.get('/live', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send analytics update every 2 seconds
  const interval = setInterval(() => {
    try {
      const summary = getAnalyticsSummary();
      res.write(`data: ${JSON.stringify(summary.overview)}\n\n`);
    } catch (error) {
      console.error('Error sending live analytics:', error);
    }
  }, 2000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

module.exports = router;
