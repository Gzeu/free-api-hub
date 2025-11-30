# 🚀 Free API Hub

<div align="center">

**Production-Ready API Gateway with AI-Powered Automation**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-v1.0-purple)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-326CE5)](https://kubernetes.io/)

100% free & open-source API Gateway featuring **Apache APISIX**, **Dragonfly Cache**, **Model Context Protocol (MCP)**, and complete GitHub automation.

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [MCP Tools](#-mcp-tools) • [Deployment](#-deployment)

</div>

---

## ✨ Features

### 🏗️ Core Infrastructure
- **🌐 Apache APISIX** - High-performance API gateway with 20+ pre-configured endpoints
- **⚡ Dragonfly** - Redis-compatible in-memory cache (faster than Redis)
- **📊 Prometheus + Grafana** - Real-time metrics and monitoring dashboards
- **🐳 Docker & Kubernetes** - Production-ready containerization (k3s optimized)
- **☁️ Fly.io Ready** - One-command cloud deployment

### 🤖 AI-Powered Automation (MCP v1.0)
- **🔗 GitHub Integration** - Auto-commit, PRs, issues, repository management
- **📝 Notion Sync** - Documentation auto-sync every 6 hours
- **💬 Slack Notifications** - Real-time alerts for deployments, errors, metrics
- **📧 Email Alerts** - Critical error notifications
- **🔄 GitHub Actions** - Complete CI/CD pipeline automation

### 🛡️ Production Features
- **🔒 Security** - Rate limiting, CORS, CSP headers, API key rotation
- **🔍 Observability** - Structured logging (Winston + Pino), health checks
- **⚙️ Auto-Scaling** - Kubernetes HPA policies
- **🧪 Testing** - Jest integration + E2E tests
- **📈 Performance** - <200MB Docker images, sub-100ms response times

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Free API Hub v2.0                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │   APISIX     │───▶│  Dragonfly   │◀───│   MCP Server    │  │
│  │   Gateway    │    │    Cache     │    │  (11 Tools)     │  │
│  │  (20 APIs)   │    │   (Redis)    │    │                 │  │
│  └──────┬───────┘    └──────┬───────┘    └────────┬────────┘  │
│         │                    │                      │            │
│         ▼                    ▼                      ▼            │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Monitoring & Observability Layer              │    │
│  │    Prometheus • Grafana • Winston • Health Checks     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              GitHub Actions CI/CD Pipeline             │    │
│  │   Auto-Push • Deploy • Sync • Update Docs              │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │  GitHub API  │    │  Notion API  │    │   Slack API  │
    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js >= 20.0.0
Docker >= 24.0.0
Git >= 2.40.0
npm >= 10.0.0
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Gzeu/free-api-hub.git
cd free-api-hub

# 2. Install dependencies
npm install

# 3. Setup MCP infrastructure
npm run setup

# 4. Configure environment
cp .env.example .env
# Edit .env and add your API tokens

# 5. Start all services
docker-compose up -d

# 6. Start MCP server
npm run start-mcp
```

### Verify Installation

```bash
# Test MCP connections
npm run test-mcp

# Check service health
curl http://localhost:8080/health    # API Hub
curl http://localhost:9080           # APISIX
curl http://localhost:3000           # Grafana

# View logs
docker-compose logs -f
```

---

## 🛠️ MCP Tools

### GitHub Automation (4 Tools)

| Tool | Description | Usage |
|------|-------------|-------|
| `github_push` | Auto-commit and push changes | Push code, create commits |
| `github_create_pr` | Create pull requests | Automated PR creation |
| `github_create_issue` | Create GitHub issues | Bug reports, feature requests |
| `github_read_repo` | Read repository data | Fetch files, stats, metadata |

### Documentation (3 Tools)

| Tool | Description | Usage |
|------|-------------|-------|
| `notion_create_page` | Create Notion pages | New documentation pages |
| `notion_update_page` | Update existing pages | Refresh documentation |
| `notion_sync_documentation` | Auto-sync README to Notion | Scheduled documentation sync |

### Communication (4 Tools)

| Tool | Description | Usage |
|------|-------------|-------|
| `slack_send_message` | Send Slack messages | Channel notifications |
| `slack_send_alert` | Critical alerts | Error notifications |
| `slack_post_metric` | Post performance metrics | Real-time stats |
| `email_send_email` | Email notifications | Critical alerts, reports |

**Total: 11 Production-Ready Tools**

[View Complete Tool Registry →](docs/MCP-TOOLS-REGISTRY.md)

---

## 📚 Documentation

### Getting Started
- [📖 MCP Setup Guide](docs/SETUP-MCP.md) - Complete installation instructions
- [🔧 Configuration Guide](docs/CONFIGURATION.md) - Environment setup
- [🚀 Deployment Guide](docs/DEPLOYMENT.md) - Production deployment

### Reference
- [🛠️ MCP Tools Registry](docs/MCP-TOOLS-REGISTRY.md) - All 11 tools documented
- [⚙️ Git Automation](docs/GIT-AUTOMATION.md) - GitHub Actions workflows
- [🏗️ Architecture](docs/ARCHITECTURE.md) - System design details
- [📊 API Reference](docs/API-REFERENCE.md) - REST API endpoints

### Advanced
- [🔒 Security Best Practices](docs/SECURITY.md)
- [📈 Performance Tuning](docs/PERFORMANCE.md)
- [🐛 Troubleshooting](docs/TROUBLESHOOTING.md)
- [🧪 Testing Guide](docs/TESTING.md)

---

## 🔧 Configuration

### Environment Variables

```bash
# GitHub Integration
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
DEFAULT_REPO=Gzeu/free-api-hub
DEFAULT_BRANCH=main

# Notion Integration
NOTION_API_KEY=secret_xxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxx

# Slack Integration
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx
SLACK_DEFAULT_CHANNEL=#api-hub-alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Deployment
FLY_API_TOKEN=fo1_xxxxxxxxxxxx
NODE_ENV=production
PORT=8080
```

[View Complete Configuration →](.env.example)

---

## 💡 Use Cases

### For Developers
- ✅ **Auto-commit workflow** - Push code with one command
- ✅ **PR automation** - Create PRs from feature branches automatically
- ✅ **Live documentation** - README always synced to Notion
- ✅ **Real-time alerts** - Slack notifications for all events

### For DevOps
- ✅ **Zero-downtime deployments** - Automated Fly.io deployments
- ✅ **Health monitoring** - Prometheus + Grafana dashboards
- ✅ **Auto-scaling** - Kubernetes HPA policies
- ✅ **Log aggregation** - Centralized logging with Winston

### For AI Integration
- ✅ **Claude Desktop** - Native MCP integration
- ✅ **Perplexity AI** - Compatible MCP protocol
- ✅ **Custom AI agents** - Extend with new tools
- ✅ **Automation** - GitHub, Notion, Slack workflows

---

## 💰 Cost Breakdown

| Service | Tier | Cost |
|---------|------|------|
| **Fly.io** | Free (3 shared-cpu-1x, 256MB) | $0/mo |
| **GitHub Actions** | Free (2,000 min/mo) | $0/mo |
| **Notion** | Free (Personal) | $0/mo |
| **Slack** | Free (10 integrations) | $0/mo |
| **Gmail** | Free (App passwords) | $0/mo |
| **Total** | | **$0/month** |

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 👤 Author

**George Pricop**
- GitHub: [@Gzeu](https://github.com/Gzeu)
- Location: București, Romania
- Role: Full-Stack Developer & Blockchain Specialist

---

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/Gzeu/free-api-hub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Gzeu/free-api-hub/discussions)

---

<div align="center">

**Built with ❤️ by [George Pricop](https://github.com/Gzeu)**

[⬆ Back to Top](#-free-api-hub)

</div>