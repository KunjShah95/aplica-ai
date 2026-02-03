# SentinelBot Deployment Guide

## Quick Start with Docker

### Prerequisites

- Docker & Docker Compose
- Git

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd sentinelbot
```

### 2. Configure Environment

```bash
# Copy environment files
cp .env.example .env
cp .env.integration.example .env

# Edit .env with your API keys
nano .env
```

### 3. Deploy with Docker Compose

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Access Services

- **Dashboard**: http://localhost
- **API**: http://localhost:3000
- **WebSocket**: ws://localhost:3001
- **OpenAI API**: http://localhost:3002
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Manual Deployment

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ with pgvector
- Redis 7+

### 1. Install Dependencies

```bash
# Backend
npm install

# Dashboard
cd dashboard
npm install
cd ..
```

### 2. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema
npm run db:push

# Or run migrations
npm run db:migrate
```

### 3. Build and Start

```bash
# Build TypeScript
npm run build

# Start in production
npm start

# Or development mode
npm run dev
```

## Environment Variables

### Required

```env
DATABASE_URL="postgresql://user:password@localhost:5432/sentinelbot"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
LLM_PROVIDER=claude
LLM_API_KEY=your-anthropic-key
```

### Optional Integrations

**Git Integration:**

```env
GIT_REPOS_PATH=./repos
```

**Google Calendar:**

```env
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback
```

**Slack:**

```env
SLACK_BOT_TOKEN=xoxb-xxx
```

**Microsoft Teams:**

```env
TEAMS_CLIENT_ID=xxx
TEAMS_CLIENT_SECRET=xxx
TEAMS_TENANT_ID=xxx
```

**Voice (TTS/STT):**

```env
OPENAI_API_KEY=your-openai-key
DEFAULT_VOICE=alloy
```

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name sentinelbot

# Setup auto-restart
pm2 startup
pm2 save
```

### Using systemd

Create `/etc/systemd/system/sentinelbot.service`:

```ini
[Unit]
Description=SentinelBot AI Assistant
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=sentinelbot
WorkingDirectory=/opt/sentinelbot
ExecStart=/usr/bin/node dist/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name bot.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Health Checks

```bash
# Check API health
curl http://localhost:3000/health

# Check database connection
docker exec -it sentinelbot-postgres psql -U sentinelbot -d sentinelbot -c "SELECT 1"

# Check Redis
docker exec -it sentinelbot-redis redis-cli ping
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker logs sentinelbot-postgres

# Verify connection
docker exec -it sentinelbot-postgres psql -U sentinelbot
```

### Memory Issues

```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### View Logs

```bash
# Docker logs
docker-compose logs -f sentinelbot

# Application logs
tail -f logs/app.log
```

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.scaling.yml
services:
  sentinelbot:
    deploy:
      replicas: 3
    depends_on:
      - postgres
      - redis
```

### Load Balancer Configuration

```nginx
upstream sentinelbot {
    server sentinelbot:3000;
    server sentinelbot:3000;
    server sentinelbot:3000;
}
```

## Security Considerations

1. **Use secrets management** for API keys
2. **Enable HTTPS** in production
3. **Configure CORS** properly
4. **Set up rate limiting**
5. **Regular backups** of PostgreSQL
6. **Update dependencies** regularly
