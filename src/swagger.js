const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Free API Hub',
    version: '2.0.0',
    description: `
Production-ready API Gateway with AI-powered automation

## Features
- 🚀 20+ free API endpoints
- ⚡ Dragonfly cache (faster than Redis)
- 🤖 AI-powered 404 suggestions (Gemini)
- 🔒 Rate limiting per service
- 📊 Health monitoring
- 🎯 Uptime verification oracle

## Base URL
\`\`\`
http://localhost:3000
\`\`\`

## Rate Limits
Default: 100 requests/minute per IP (configurable per service)

## Caching
Responses cached with configurable TTL (default 5 minutes)
    `,
    contact: {
      name: 'George Pricop',
      url: 'https://github.com/Gzeu/free-api-hub',
      email: 'support@free-api-hub.dev'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server'
    },
    {
      url: 'https://free-api-hub.fly.dev',
      description: 'Production server (Fly.io)'
    }
  ],
  tags: [
    {
      name: 'Health',
      description: 'System health and monitoring endpoints'
    },
    {
      name: 'API Proxy',
      description: 'Proxied API services with caching and rate limiting'
    },
    {
      name: 'Metrics',
      description: 'Prometheus-compatible metrics'
    },
    {
      name: 'AI Services',
      description: 'AI-powered features (Gemini)'
    }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check endpoint',
        description: 'Returns system health status including Dragonfly connection and loaded API services',
        responses: {
          200: {
            description: 'System is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['healthy', 'degraded', 'unhealthy'],
                      example: 'healthy'
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time',
                      example: '2025-12-24T19:20:00.000Z'
                    },
                    services: {
                      type: 'object',
                      properties: {
                        dragonfly: {
                          type: 'string',
                          enum: ['connected', 'disconnected'],
                          example: 'connected'
                        },
                        apis: {
                          type: 'integer',
                          description: 'Number of loaded API services',
                          example: 20
                        }
                      }
                    }
                  }
                },
                example: {
                  status: 'healthy',
                  timestamp: '2025-12-24T19:20:00.000Z',
                  services: {
                    dragonfly: 'connected',
                    apis: 20
                  }
                }
              }
            }
          }
        }
      }
    },
    '/metrics': {
      get: {
        tags: ['Metrics'],
        summary: 'Prometheus metrics',
        description: 'Returns Prometheus-compatible metrics for monitoring (Dragonfly stats, cache hits, etc.)',
        responses: {
          200: {
            description: 'Metrics in Prometheus format',
            content: {
              'text/plain': {
                schema: {
                  type: 'string',
                  example: '# HELP dragonfly_connected_clients Number of client connections\n# TYPE dragonfly_connected_clients gauge\ndragonfly_connected_clients 5\n'
                }
              }
            }
          },
          500: {
            description: 'Failed to fetch metrics',
            content: {
              'text/plain': {
                schema: {
                  type: 'string',
                  example: '# Error fetching metrics'
                }
              }
            }
          }
        }
      }
    },
    '/api/{service}': {
      get: {
        tags: ['API Proxy'],
        summary: 'Proxy API request to service',
        description: `
Proxies requests to configured API services with automatic:
- Rate limiting per IP
- Response caching (Dragonfly)
- Uptime verification (3-check oracle)
- AI-powered 404 suggestions (Gemini)

**Example services:**
- \`weather\` - Weather API
- \`crypto\` - Cryptocurrency prices
- \`news\` - News aggregator
- \`github\` - GitHub API proxy
- \`joke\` - Random jokes
- \`quote\` - Inspirational quotes
        `,
        parameters: [
          {
            name: 'service',
            in: 'path',
            required: true,
            description: 'API service name (configured in config/apis.yaml)',
            schema: {
              type: 'string',
              example: 'weather'
            }
          }
        ],
        responses: {
          200: {
            description: 'Successful response from proxied service',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cached: {
                      type: 'boolean',
                      description: 'Whether response came from cache',
                      example: false
                    }
                  },
                  additionalProperties: true
                },
                example: {
                  data: 'Response from proxied API',
                  cached: false
                }
              }
            }
          },
          404: {
            description: 'Service not found (with AI suggestion)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'string',
                      example: 'Service not found'
                    },
                    suggestion: {
                      type: 'string',
                      description: 'AI-generated alternative suggestion',
                      example: 'Did you mean "weather"? It provides meteorological data similar to what you requested.'
                    },
                    available: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['weather', 'crypto', 'news']
                    }
                  }
                }
              }
            }
          },
          429: {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'string',
                      example: 'Rate limit exceeded'
                    },
                    limit: {
                      type: 'integer',
                      example: 100
                    },
                    window: {
                      type: 'string',
                      example: '60 seconds'
                    }
                  }
                }
              }
            }
          },
          502: {
            description: 'Bad gateway (upstream service error)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'string',
                      example: 'Bad gateway'
                    },
                    service: {
                      type: 'string',
                      example: 'weather'
                    },
                    message: {
                      type: 'string',
                      example: 'timeout of 5000ms exceeded'
                    }
                  }
                }
              }
            }
          },
          503: {
            description: 'Service temporarily unavailable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'string',
                      example: 'Service temporarily unavailable'
                    },
                    uptime: {
                      type: 'string',
                      example: '33.33%'
                    },
                    checks: {
                      type: 'integer',
                      example: 3
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/{service}/{action}': {
      get: {
        tags: ['API Proxy'],
        summary: 'Proxy API request with action',
        description: 'Proxies requests to specific service actions/endpoints',
        parameters: [
          {
            name: 'service',
            in: 'path',
            required: true,
            description: 'API service name',
            schema: {
              type: 'string',
              example: 'github'
            }
          },
          {
            name: 'action',
            in: 'path',
            required: true,
            description: 'Service action/endpoint',
            schema: {
              type: 'string',
              example: 'users/Gzeu'
            }
          }
        ],
        responses: {
          200: {
            description: 'Successful response from proxied service',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cached: {
                      type: 'boolean',
                      example: true
                    }
                  },
                  additionalProperties: true
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy']
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          },
          services: {
            type: 'object',
            properties: {
              dragonfly: {
                type: 'string',
                enum: ['connected', 'disconnected']
              },
              apis: {
                type: 'integer'
              }
            }
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'string'
          },
          message: {
            type: 'string'
          }
        }
      },
      RateLimitError: {
        type: 'object',
        properties: {
          error: {
            type: 'string'
          },
          limit: {
            type: 'integer'
          },
          window: {
            type: 'string'
          }
        }
      }
    }
  }
};

// Custom Swagger UI options
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #6366f1; }
    .swagger-ui .scheme-container { background: #f8fafc; }
  `,
  customSiteTitle: 'Free API Hub - Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai'
    }
  }
};

module.exports = {
  swaggerUi,
  swaggerDocument,
  swaggerOptions
};
