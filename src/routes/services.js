const express = require('express');
const router = express.Router();

/**
 * GET /api/services
 * List all available API services with metadata
 */
function setupServicesRoute(yamlConfig, logger) {
  router.get('/services', (req, res) => {
    try {
      const services = Object.entries(yamlConfig).map(([name, config]) => ({
        name,
        endpoint: config.endpoint,
        description: config.description,
        rateLimit: config.rateLimit || 100,
        cacheTTL: config.cacheTTL || 300,
        timeout: config.timeout || 5000,
        examples: generateExamples(name, config)
      }));

      res.json({
        total: services.length,
        services: services.sort((a, b) => a.name.localeCompare(b.name))
      });
    } catch (error) {
      logger.error('Failed to list services:', error);
      res.status(500).json({ error: 'Failed to list services' });
    }
  });

  return router;
}

/**
 * Generate usage examples for each service
 */
function generateExamples(serviceName, config) {
  const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
  
  const exampleMap = {
    crypto: [
      `${baseUrl}/api/crypto/ping`,
      `${baseUrl}/api/crypto/simple/price?ids=bitcoin&vs_currencies=usd`
    ],
    binance: [
      `${baseUrl}/api/binance/ticker/price?symbol=BTCUSDT`
    ],
    weather: [
      `${baseUrl}/api/weather/Bucharest?format=j1`
    ],
    github: [
      `${baseUrl}/api/github/users/Gzeu`,
      `${baseUrl}/api/github/repos/Gzeu/free-api-hub`
    ],
    npm: [
      `${baseUrl}/api/npm/express`
    ],
    joke: [
      `${baseUrl}/api/joke/random_joke`
    ],
    quote: [
      `${baseUrl}/api/quote/random`
    ],
    advice: [
      `${baseUrl}/api/advice/advice`
    ],
    hackernews: [
      `${baseUrl}/api/hackernews/topstories.json`,
      `${baseUrl}/api/hackernews/item/8863.json`
    ],
    reddit: [
      `${baseUrl}/api/reddit/r/programming.json`
    ],
    ip: [
      `${baseUrl}/api/ip/json`
    ],
    uuid: [
      `${baseUrl}/api/uuid/version4`
    ],
    qr: [
      `${baseUrl}/api/qr/create-qr-code/?data=HelloWorld&size=200x200`
    ],
    catfacts: [
      `${baseUrl}/api/catfacts/fact`
    ],
    dogapi: [
      `${baseUrl}/api/dogapi/breeds/image/random`
    ],
    useless: [
      `${baseUrl}/api/useless/random.json?language=en`
    ],
    etherscan: [
      `${baseUrl}/api/etherscan?module=stats&action=ethprice`
    ],
    bscscan: [
      `${baseUrl}/api/bscscan?module=stats&action=bnbprice`
    ]
  };

  return exampleMap[serviceName] || [`${baseUrl}/api/${serviceName}`];
}

module.exports = setupServicesRoute;
