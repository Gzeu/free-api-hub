# 🚀 Free API Hub

**Production-ready 100% free & open-source API Gateway Hub**

A complete API management platform combining Apache APISIX, Dragonfly cache, k3s orchestration, Gemini AI integration, and automated deployment to Fly.io - all using free-tier services.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Active Development](https://img.shields.io/badge/Status-Active%20Development-blue)](https://github.com/Gzeu/free-api-hub/issues)
[![Version: 2.0.0](https://img.shields.io/badge/Version-2.0.0-green)](https://github.com/Gzeu/free-api-hub)

## 📊 Current Status

**MCP v2.0 Integration in Progress** - [Track Progress →](https://github.com/Gzeu/free-api-hub/issues/2)

- ✅ **Phase 1:** Core setup complete (14% done)
- 🔄 **Phase 2-7:** Configuration, integrations, and deployment pending
- 📅 **Last Updated:** December 24, 2025
- 🎯 **Target:** Full MCP integration with Claude Desktop support

## ✨ Features

### Core Platform
- 🌐 **API Gateway:** Apache APISIX with advanced routing and load balancing
- ⚡ **High-Performance Cache:** Dragonfly in-memory datastore
- 🐳 **Container Orchestration:** Lightweight k3s Kubernetes
- 🤖 **AI Integration:** Gemini AI for intelligent API optimization
- ☁️ **Free Deployment:** Fly.io with generous free tier

### MCP v2.0 Integration (Coming Soon)
- 🔧 **11 MCP Tools:** Comprehensive automation suite
- 📝 **Notion Sync:** Automatic documentation updates
- 💬 **Slack Alerts:** Real-time monitoring notifications
- 📧 **Email Notifications:** Deployment and error alerts
- 🔄 **Auto Git Push:** Automated commits and PR creation
- 🖥️ **Claude Desktop:** Native MCP server integration

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           Fly.io Cloud Platform            │
├─────────────────────────────────────────────┤
│  ┌──────────────┐    ┌─────────────────┐  │
│  │ Apache APISIX│◄───┤  Gemini AI      │  │
│  │  (Gateway)   │    │  (Intelligence) │  │
│  └──────┬───────┘    └─────────────────┘  │
│         │                                   │
│  ┌──────▼───────┐    ┌─────────────────┐  │
│  │  Dragonfly   │    │  k3s Cluster    │  │
│  │   (Cache)    │    │ (Orchestration) │  │
│  └──────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────┘
         ▲                       ▲
         │     MCP v2.0          │
         │   Integration         │
         ▼                       ▼
┌─────────────┐  ┌──────────┐  ┌────────┐
│   Notion    │  │  Slack   │  │  Email │
│    Docs     │  │  Alerts  │  │ Notify │
└─────────────┘  └──────────┘  └────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker & Docker Compose
- Git
- Fly.io account (free tier)

### Installation

```bash
# Clone the repository
git clone https://github.com/Gzeu/free-api-hub.git
cd free-api-hub

# Install dependencies
npm install

# Setup configuration
npm run setup

# Start with Docker Compose
docker-compose up -d

# Verify installation
curl http://localhost:9080/health
```

### Local Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Core Configuration
NODE_ENV=production
PORT=3000
API_VERSION=v2

# APISIX Configuration
APISIX_ADMIN_KEY=your-admin-key
APISIX_PORT=9080

# Dragonfly Cache
DRAGONFLY_HOST=localhost
DRAGONFLY_PORT=6379

# Gemini AI
GEMINI_API_KEY=your-gemini-key

# MCP Integrations (Optional)
NOTION_API_KEY=your-notion-key
NOTION_DATABASE_ID=your-database-id
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_WEBHOOK_URL=your-webhook-url
SMTP_USER=your-email
SMTP_PASS=your-app-password

# Fly.io Deployment
FLY_API_TOKEN=your-fly-token
```

### GitHub Secrets (for CI/CD)

Add these secrets in repository settings:
- `NOTION_API_KEY`
- `SLACK_BOT_TOKEN`
- `FLY_API_TOKEN`
- `SMTP_USER` & `SMTP_PASS`

## 📦 Deployment

### Deploy to Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
flyctl auth login

# Deploy application
flyctl deploy

# Check status
flyctl status

# View logs
flyctl logs
```

### Docker Deployment

```bash
# Build image
docker build -t free-api-hub .

# Run container
docker run -p 3000:3000 --env-file .env free-api-hub
```

## 🛠️ MCP Integration

### Available MCP Tools (v2.0)

1. **create-notion-page** - Create documentation pages
2. **update-notion-page** - Update existing documentation
3. **send-slack-message** - Send Slack notifications
4. **send-email** - Send email alerts
5. **create-github-pr** - Automated pull requests
6. **auto-git-push** - Commit and push changes
7. **deploy-to-fly** - Trigger deployments
8. **query-metrics** - Fetch performance metrics
9. **optimize-routes** - AI-powered route optimization
10. **backup-config** - Configuration backups
11. **health-check** - System health monitoring

### Claude Desktop Integration

To use MCP tools in Claude Desktop:

1. Copy the config:
   ```bash
   cp config/claude_desktop_config.json ~/.config/claude/config.json
   ```

2. Update paths in the config file

3. Restart Claude Desktop

4. Test with: "Use the free-api-hub MCP tools"

## 📚 Documentation

- **[Setup Guide](docs/SETUP-MCP.md)** - Detailed setup instructions
- **[MCP Tools Registry](docs/MCP-TOOLS-REGISTRY.md)** - Complete tool documentation
- **[Git Automation](docs/GIT-AUTOMATION.md)** - Automated workflows
- **[API Reference](docs/API.md)** - REST API documentation
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment

## 🔍 Monitoring & Observability

### Health Endpoints

```bash
# Main health check
curl http://localhost:3000/health

# APISIX admin API
curl http://localhost:9080/apisix/admin/routes

# Metrics endpoint
curl http://localhost:3000/metrics
```

### Grafana Dashboards

Access dashboards at `http://localhost:3001` (when using docker-compose)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📋 Roadmap

### v2.0 (Current)
- [x] Core platform setup
- [x] MCP integration branch
- [ ] Complete MCP v2.0 integration (14% done)
- [ ] Claude Desktop support
- [ ] Comprehensive documentation

### v2.1 (Planned)
- [ ] GraphQL API support
- [ ] Advanced rate limiting
- [ ] Multi-region deployment
- [ ] Kubernetes Helm charts
- [ ] Web UI dashboard

### v3.0 (Future)
- [ ] Service mesh integration
- [ ] Advanced AI routing
- [ ] Blockchain-based authentication
- [ ] Real-time analytics platform

## 🐛 Issues & Support

- **Bug Reports:** [Create an issue](https://github.com/Gzeu/free-api-hub/issues/new)
- **Feature Requests:** [Request a feature](https://github.com/Gzeu/free-api-hub/issues/new)
- **Discussions:** [GitHub Discussions](https://github.com/Gzeu/free-api-hub/discussions)

## 📊 Project Stats

- **Stars:** ![GitHub stars](https://img.shields.io/github/stars/Gzeu/free-api-hub)
- **Forks:** ![GitHub forks](https://img.shields.io/github/forks/Gzeu/free-api-hub)
- **Issues:** ![GitHub issues](https://img.shields.io/github/issues/Gzeu/free-api-hub)
- **Last Commit:** ![GitHub last commit](https://img.shields.io/github/last-commit/Gzeu/free-api-hub)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Apache APISIX](https://apisix.apache.org/) - API Gateway
- [Dragonfly](https://www.dragonflydb.io/) - In-memory datastore
- [k3s](https://k3s.io/) - Lightweight Kubernetes
- [Fly.io](https://fly.io/) - Cloud platform
- [Google Gemini](https://ai.google.dev/) - AI integration

## 🔗 Links

- **Repository:** [github.com/Gzeu/free-api-hub](https://github.com/Gzeu/free-api-hub)
- **Author:** [George Pricop (@Gzeu)](https://github.com/Gzeu)
- **Website:** [github.com/Gzeu](https://github.com/Gzeu)

---

**Built with ❤️ by George Pricop** | **Last Updated: December 24, 2025**
