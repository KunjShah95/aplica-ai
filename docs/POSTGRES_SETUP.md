# PostgreSQL Setup Guide

This guide walks you through setting up PostgreSQL with pgvector for SentinelBot.

## Prerequisites

- PostgreSQL 15 or higher
- pgvector extension
- Node.js 20+

## 1. Install PostgreSQL

### Windows
```bash
# Using Chocolatey
choco install postgresql

# Or download from https://www.postgresql.org/download/windows/
```

### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## 2. Install pgvector Extension

### From Source (All Platforms)
```bash
cd /tmp
git clone --branch v0.6.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
```

### macOS (Homebrew)
```bash
brew install pgvector
```

### Docker (Recommended for Development)
```bash
docker run -d \
  --name sentinelbot-db \
  -e POSTGRES_USER=sentinelbot \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=sentinelbot \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

## 3. Create Database and Enable Extension

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE USER sentinelbot WITH PASSWORD 'your_password';
CREATE DATABASE sentinelbot OWNER sentinelbot;

# Connect to the new database
\c sentinelbot

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE sentinelbot TO sentinelbot;

# Exit
\q
```

## 4. Configure Environment

Copy the `.env.example` to `.env` and update the database URL:

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://sentinelbot:your_password@localhost:5432/sentinelbot?schema=public"
```

## 5. Run Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Seed default data
npm run db:seed
```

## 6. Verify Setup

```bash
# Open Prisma Studio to view your database
npm run db:studio
```

## Database Schema Overview

### Core Tables

| Table | Description |
|-------|-------------|
| `User` | User accounts with auth |
| `Session` | Active user sessions |
| `ApiKey` | API key management |
| `OAuthAccount` | OAuth provider links |

### Conversations & Memory

| Table | Description |
|-------|-------------|
| `Conversation` | Chat conversations |
| `Message` | Individual messages |
| `Memory` | User memories with embeddings |
| `KnowledgeBase` | RAG knowledge bases |
| `KnowledgeDocument` | Documents in KB |
| `DocumentChunk` | Chunks with embeddings |

### Teams & Collaboration

| Table | Description |
|-------|-------------|
| `Team` | Team/organization |
| `TeamMember` | Team membership |
| `Workspace` | Team workspaces |

### Automation

| Table | Description |
|-------|-------------|
| `Workflow` | Workflow definitions |
| `WorkflowTrigger` | Workflow triggers |
| `WorkflowExecution` | Execution history |
| `ScheduledTask` | Cron/scheduled tasks |
| `TaskRun` | Task execution history |

### Plugins & Tools

| Table | Description |
|-------|-------------|
| `Plugin` | Installed plugins |
| `Tool` | Registered tools |
| `ToolExecution` | Tool usage history |
| `AgentPersona` | AI personas |

### Analytics & Integrations

| Table | Description |
|-------|-------------|
| `UsageRecord` | API usage tracking |
| `AuditLog` | Security audit logs |
| `Notification` | User notifications |
| `Integration` | External integrations |
| `Webhook` | Outgoing webhooks |
| `WebhookDelivery` | Delivery history |

## Troubleshooting

### Connection Refused
```bash
# Check if PostgreSQL is running
pg_isready

# On Windows
net start postgresql-x64-15

# On macOS
brew services start postgresql@15

# On Linux
sudo systemctl status postgresql
```

### Permission Denied
```sql
-- Grant all necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sentinelbot;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sentinelbot;
```

### pgvector Not Found
```sql
-- Check available extensions
SELECT * FROM pg_available_extensions WHERE name = 'vector';

-- If not listed, you need to install pgvector (see step 2)
```

### Migration Failed
```bash
# Reset database (WARNING: deletes all data)
npm run db:reset

# Or manually fix and retry
npm run db:migrate
```

## Backup & Restore

### Backup
```bash
pg_dump -U sentinelbot sentinelbot > backup.sql
```

### Restore
```bash
psql -U sentinelbot sentinelbot < backup.sql
```

## Production Recommendations

1. **Use connection pooling** (PgBouncer or built-in)
2. **Enable SSL** for database connections
3. **Set up regular backups**
4. **Monitor query performance**
5. **Use read replicas** for high-traffic deployments
6. **Configure proper indexes** for your query patterns

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection URL | Required |
| `OPENAI_API_KEY` | For embeddings | Optional |
| `EMBEDDING_MODEL` | OpenAI embedding model | `text-embedding-3-small` |
| `OLLAMA_BASE_URL` | Ollama API URL | `http://localhost:11434` |
