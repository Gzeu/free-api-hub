# 🚀 Free API Hub v2.0

<div align="center">

**Production-Ready API Gateway with AI-Powered Automation & Real-Time Analytics**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-v1.0-purple)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://www.docker.com/)

100% free & open-source API Gateway featuring **Apache APISIX**, **Dragonfly Cache**, **Live Analytics Dashboard**, **Swagger UI**, and complete automation.

[Features](#-features) • [Quick Start](#-quick-start) • [Dashboard](#-live-dashboard) • [Documentation](#-documentation)

</div>

---

## ✨ Features

### 🎯 NEW in v2.0
- **📊 Live Analytics Dashboard** - Real-time metrics with Server-Sent Events
- **📚 Interactive Swagger UI** - Complete OpenAPI 3.0 documentation
- **📈 Advanced Monitoring** - Response time percentiles, cache analytics, service usage
- **🔔 Error Tracking** - Automatic error detection and reporting
- **⚡ Performance Insights** - P50/P95/P99 latency tracking

### 🏗️ Core Infrastructure
- **🌐 Apache APISIX** - High-performance API gateway with 20+ pre-configured endpoints
- **⚡ Dragonfly** - Redis-compatible in-memory cache (faster than Redis)
- **📊 Prometheus + Grafana** - Production-grade monitoring
- **🐳 Docker & Kubernetes** - k3s optimized containers
- **☁️ Fly.io Ready** - One-command deployment

### 🤖 AI-Powered Features
- **🧠 Gemini AI Integration** - Smart 404 suggestions
- **🔗 GitHub Automation** - MCP-powered workflows
- **📝 Auto-Documentation** - Notion sync
- **💬 Slack Notifications** - Real-time alerts

### 🛡️ Production Features
- **🔒 Security** - Rate limiting, CORS, CSP headers
- **🔍 Observability** - Structured logging (Winston)
- **🎯 Uptime Oracle** - 3-check health verification
- **⚙️ Auto-Scaling** - Kubernetes HPA
- **🧪 Testing** - Jest integration

---

## 🚀 Quick Start

### Installation

```bash
# 1. Clone repository
git clone https://github.com/Gzeu/free-api-hub.git
cd free-api-hub

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 4. Start services
docker-compose up -d

# 5. Start API Hub
npm start
```

### Access Points

```bash
# Live Analytics Dashboard
http://localhost:3000/

# Interactive API Documentation
http://localhost:3000/docs

# Analytics API
http://localhost:3000/analytics

# Health Check
http://localhost:3000/health

# API Proxy
http://localhost:3000/api/{service}/{action}
```

---

## 📊 Live Dashboard

**Real-time analytics powered by Server-Sent Events:**

- ⚡ **Total Requests** - Track all API calls
- 📈 **Requests/Minute** - Live throughput monitoring
- ⏱️ **Avg Response Time** - Performance tracking
- 💾 **Cache Hit Rate** - Dragonfly efficiency
- 🎯 **Top Services** - Most used endpoints
- ⚠️ **Error Tracking** - Real-time error monitoring

**Features:**
- Auto-refresh every 2 seconds
- Beautiful gradient UI
- Responsive design
- No external dependencies

---

## 📚 Interactive API Documentation

**Swagger UI with OpenAPI 3.0:**

- 🎨 Beautiful interface with custom styling
- 🧪 "Try it out" functionality
- 📖 Complete endpoint documentation
- 🔍 Searchable/filterable
- 📊 Request/response examples
- ⚡ Display request duration
- 📋 Copy curl commands

---

## 📈 Analytics API

### Endpoints

```bash
# Complete analytics summary
GET /analytics

# Quick overview
GET /analytics/overview

# Response time statistics (P50, P95, P99)
GET /analytics/response-time

# Cache performance
GET /analytics/cache

# Service usage stats
GET /analytics/services

# Error tracking
GET /analytics/errors

# Live SSE stream (real-time updates)
GET /analytics/live

# Reset analytics (admin)
POST /analytics/reset
```

### Example Response

```json
{
  "status": "success",
  "timestamp": "2025-12-24T20:00:00.000Z",
  "data": {
    "overview": {
      "totalRequests": 1543,
      "requestsPerMinute": 12.5,
      "avgResponseTime": 87,
      "cacheHitRate": 73.2
    },
    "responseTime": {
      "avg": 87,
      "p50": 65,
      "p95": 120,
      "p99": 180,
      "min": 12,
      "max": 250
    },
    "cache": {
      "hits": 1129,
      "misses": 414,
      "hitRate": 73.2
    },
    "topServices": [
      { "service": "weather", "count": 453 },
      { "service": "crypto", "count": 321 }
    ]
  }
}
```

---

## 🛠️ API Proxy Features

### Smart 404 Handling

```bash
GET /api/wheather  # Typo!
```

**AI-Powered Response:**
```json
{
  "error": "Service not found",
  "suggestion": "Did you mean 'weather'? It provides meteorological data similar to what you requested.",
  "available": ["weather", "crypto", "news"]
}
```

### Rate Limiting

- Per-service limits (configurable)
- IP-based tracking
- 60-second windows
- Automatic reset

### Caching

- Dragonfly-powered (faster than Redis)
- Configurable TTL per service
- Automatic cache invalidation
- Cache hit/miss tracking

### Uptime Oracle

- 3-check verification system
- 66% threshold (2/3 success = healthy)
- Automatic failover
- Real-time health monitoring

---

## 📊 System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Free API Hub v2.0                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────┐   ┌────────────┐   ┌──────────────────────┐   │
│  │  Express   │──▶│ Analytics  │──▶│  Live Dashboard      │   │
│  │  Gateway   │   │ Middleware │   │  (SSE Stream)        │   │
│  └─────┬──────┘   └────────────┘   └──────────────────────┘   │
│        │                                                         │
│        ▼                                                         │
│  ┌────────────────────────────────────────────────────────┐   │
│  │   APISIX + Dragonfly + MCP + Gemini AI + Swagger       │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐   │
│  │    Prometheus • Grafana • Winston • Health Checks      │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Use Cases

### For Developers
- ✅ **Live Analytics** - Monitor API usage in real-time
- ✅ **Interactive Docs** - Test APIs directly in browser
- ✅ **Smart Suggestions** - AI-powered error handling
- ✅ **Performance Tracking** - Response time percentiles

### For DevOps
- ✅ **Real-time Monitoring** - Live dashboard with SSE
- ✅ **Health Checks** - Automated uptime verification
- ✅ **Error Tracking** - Automatic error detection
- ✅ **Metrics Export** - Prometheus-compatible

### For AI Integration
- ✅ **Gemini AI** - Smart 404 suggestions
- ✅ **MCP Protocol** - Claude Desktop compatible
- ✅ **GitHub Automation** - Auto-commit workflows
- ✅ **Slack Integration** - Real-time notifications

---

## 💰 Cost Breakdown

| Service | Tier | Cost |
|---------|------|------|
| **Fly.io** | Free (256MB) | $0/mo |
| **GitHub Actions** | Free (2,000 min/mo) | $0/mo |
| **Gemini AI** | Free (60 req/min) | $0/mo |
| **Dragonfly** | Self-hosted | $0/mo |
| **Total** | | **$0/month** |

---

## 📚 Documentation

- [📖 Setup Guide](docs/SETUP-MCP.md)
- [🛠️ MCP Tools Registry](docs/MCP-TOOLS-REGISTRY.md)
- [⚙️ Configuration](docs/CONFIGURATION.md)
- [🚀 Deployment Guide](docs/DEPLOYMENT.md)
- [🏗️ Architecture](docs/ARCHITECTURE.md)
- [🔒 Security](docs/SECURITY.md)

---

## 🎨 Tech Stack

- **Backend**: Node.js + Express
- **Cache**: Dragonfly (Redis-compatible)
- **Gateway**: Apache APISIX
- **AI**: Google Gemini Pro
- **Docs**: Swagger UI + OpenAPI 3.0
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston
- **Security**: Helmet + Rate Limiting
- **Deployment**: Docker + Kubernetes + Fly.io

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 👤 Author

**George Pricop**
- GitHub: [@Gzeu](https://github.com/Gzeu)
- Location: București, Romania
- Role: Full-Stack Developer & Blockchain Specialist

---

## 🌟 Star History

If you find this project useful, please consider giving it a ⭐!

---

<div align="center">

**Built with ❤️ by [George Pricop](https://github.com/Gzeu)**

[⬆ Back to Top](#-free-api-hub-v20)

</div>
