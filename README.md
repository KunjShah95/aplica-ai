# SentinelBot - Open-Source AI Personal Assistant

<div align="center">

![SentinelBot](https://img.shields.io/badge/SentinelBot-AI%20Assistant-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=for-the-badge)

**An autonomous AI personal assistant with multi-platform messaging, browser automation, memory persistence, and multi-agent collaboration.**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation) • [Contributing](#-contributing) • [License](#license)

</div>

---

## 🎯 Overview

SentinelBot is an open-source AI personal assistant inspired by OpenClaw (formerly Clawdbot/Moltbot) that gained massive popularity for its ability to autonomously control computers, execute tasks, and interact across multiple messaging platforms.

### What Makes SentinelBot Different

- **🔒 Privacy-First**: Runs locally with optional self-hosted components
- **🌐 Multi-Platform**: Telegram, Discord, WebSocket, and CLI support
- **🤖 Multi-Agent**: Collaborative AI agents for complex workflows
- **📝 Persistent Memory**: Long-term context and learned preferences
- **🔧 Extensible Skills**: Plugin-based skill system with custom skill support
- **🔄 Workflow Automation**: Visual workflow builder for complex automations
- **📅 Task Scheduling**: Advanced cron-like scheduling for recurring tasks

---

## ✨ Features

### Core Capabilities

| Feature                      | Description                                                  |
| ---------------------------- | ------------------------------------------------------------ |
| **Multi-Platform Messaging** | Telegram, Discord, WebSocket, CLI interfaces                 |
| **Browser Automation**       | Navigate, click, fill forms, take screenshots via Playwright |
| **Shell Command Execution**  | Safe command execution with allowlist/blocklist filtering    |
| **File System Operations**   | Read, write, search, and manage files securely               |
| **Sandboxed Code Execution** | Isolated JavaScript/TypeScript execution                     |
| **Memory & Persistence**     | JSONL, Markdown, and SQLite+FTS5 storage                     |

### Advanced Features

| Feature                       | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| **Multi-Agent Collaboration** | Agent swarms with task distribution and dependencies |
| **Visual Workflow Builder**   | Node-based workflow design and execution             |
| **Task Scheduling**           | Cron expressions, intervals, one-time tasks          |
| **Security Audit Logging**    | Comprehensive logging with sensitive data redaction  |
| **OpenAI-Compatible API**     | `/v1/chat/completions` endpoint for integration      |
| **Email Automation**          | Send, draft, read, and search emails                 |
| **Local LLM Support**         | Ollama integration for self-hosted models            |
| **MCP Integration**           | Model Context Protocol for external tools            |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Redis (optional, for task queue)
- SQLite (optional, for vector search)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sentinelbot.git
cd sentinelbot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure your environment (edit .env)
# Add your API keys for LLM providers, messaging platforms, etc.

# Build the project
npm run build

# Start the development server
npm run dev
```

### Configuration

Create a `.env` file with your settings:

```env
# LLM Configuration
LLM_PROVIDER=claude
LLM_API_KEY=your-anthropic-api-key
LLM_MODEL=claude-sonnet-4-20250514

# Messaging Platforms
TELEGRAM_ENABLED=true
TELEGRAM_TOKEN=your-telegram-bot-token
DISCORD_ENABLED=true
DISCORD_TOKEN=your-discord-bot-token
DISCORD_GUILD_ID=your-guild-id

# WebSocket
WS_ENABLED=true
WS_PORT=3001

# OpenAI-Compatible API
OPENAI_API_ENABLED=true
OPENAI_API_PORT=3002

# Security
SANDBOX_ENABLED=true
ALLOWED_COMMANDS=ls,cat,echo,mkdir,cd
BLOCKED_COMMANDS=rm,del,format,mkfs

# Memory
MEMORY_TYPE=sqlite
MEMORY_PATH=./memory

# Scheduler
SCHEDULER_ENABLED=true
```

---

## 📖 Documentation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      SentinelBot System                         │
├─────────────────────────────────────────────────────────────────┤
│  User Interface Layer                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Telegram │ │ Discord  │ │ WebSocket│ │   CLI    │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       └────────────┴────────────┴────────────┘                  │
│                      │                                           │
│              ┌───────┴───────┐                                  │
│              │   Gateway     │                                  │
│              │   Router      │                                  │
│              │   Queue       │                                  │
│              └───────┬───────┘                                  │
│                      │                                           │
│              ┌───────┴───────┐                                  │
│              │    Agent      │                                  │
│              │   Core        │                                  │
│              └───────┬───────┘                                  │
│       ┌──────────────┼──────────────┐                          │
│       │              │              │                           │
│  ┌────┴────┐   ┌────┴────┐   ┌────┴────┐                      │
│  │ Skills  │   │ Memory  │   │Execution│                      │
│  │ System  │   │ System  │   │  Layer  │                      │
│  └─────────┘   └─────────┘   └─────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Gateway Layer (`src/gateway/`)

The gateway handles all incoming messages and routes them to the appropriate handlers.

| File                   | Description                                  |
| ---------------------- | -------------------------------------------- |
| `websocket.ts`         | WebSocket server for real-time communication |
| `router.ts`            | Message routing and platform abstraction     |
| `server.ts`            | Gateway orchestrator                         |
| `adapters/telegram.ts` | Telegram bot integration                     |
| `adapters/discord.ts`  | Discord bot integration                      |

**Usage Example:**

```typescript
import { GatewayServer } from './gateway/server.js';
import { configLoader } from './config/loader.js';

const config = await configLoader.load();
const gateway = new GatewayServer(config);
await gateway.start();
```

#### 2. Agent Core (`src/core/`)

The agent processes messages and manages conversations.

| File              | Description                                  |
| ----------------- | -------------------------------------------- |
| `agent.ts`        | Main agent logic with execution capabilities |
| `llm/`            | LLM provider abstraction (Claude, Ollama)    |
| `conversation.ts` | Conversation management                      |
| `queue.ts`        | BullMQ task queue with priority lanes        |

**Usage Example:**

```typescript
import { createAgent } from './core/agent.js';
import { createProvider } from './core/llm/index.js';

const llm = createProvider(config.llm);
const agent = createAgent(config, llm);

const response = await agent.processMessage(
  'Help me write a function',
  conversationId,
  userId,
  'telegram'
);
```

#### 3. Execution Layer (`src/execution/`)

Provides sandboxed execution capabilities.

| File            | Description                          |
| --------------- | ------------------------------------ |
| `shell.ts`      | Safe shell command execution         |
| `filesystem.ts` | File operations with path validation |
| `browser.ts`    | Playwright-based browser automation  |
| `sandbox.ts`    | Isolated code execution              |

**Usage Example:**

```typescript
import { shellExecutor, fileSystemExecutor, browserExecutor } from './execution/index.js';

// Execute shell command
const result = await shellExecutor.execute({
  command: 'ls',
  args: ['-la'],
  timeout: 30000,
});

// Read file
const file = await fileSystemExecutor.readFile('./data/config.json');

// Navigate browser
await browserExecutor.navigate({ url: 'https://example.com' });
```

#### 4. Memory System (`src/memory/`)

Multiple storage backends for persistent memory.

| File          | Description                       |
| ------------- | --------------------------------- |
| `jsonl.ts`    | JSONL line-based storage          |
| `markdown.ts` | Markdown notes and daily logs     |
| `sqlite.ts`   | SQLite with FTS5 full-text search |
| `index.ts`    | Unified memory manager            |

**Usage Example:**

```typescript
import { memoryManager } from './memory/index.js';

// Save conversation
await memoryManager.saveConversation(conversationId, userId, messages);

// Search memories
const results = await memoryManager.search({
  query: 'project update',
  limit: 10,
});

// Remember information
await memoryManager.remember('User prefers dark mode', { tags: ['preference'] });
```

#### 5. Skills System (`src/skills/`)

Extensible skill framework for adding capabilities.

| File        | Description                                           |
| ----------- | ----------------------------------------------------- |
| `loader.ts` | Skill loader and manifest parser                      |
| `index.ts`  | Skills API                                            |
| `builtins/` | Built-in skills (browser, code, shell, memory, email) |

**Skill Manifest (SKILL.md):**

```yaml
---
name: my-skill
version: 1.0.0
description: Custom skill for specific tasks
triggers:
  - type: keyword
    value: 'do something'
parameters:
  - name: action
    type: string
    required: true
permissions:
  - filesystem
examples:
  - 'do something with file.txt'
```

**Custom Skill Structure:**

```
skills/custom/my-skill/
├── SKILL.md          # Skill manifest
├── index.js          # Skill implementation
└── README.md         # Documentation
```

#### 6. Multi-Agent Framework (`src/agents/`)

Collaborative AI agents for complex tasks.

| File       | Description            |
| ---------- | ---------------------- |
| `swarm.ts` | Agent swarm management |
| `index.ts` | Multi-agent API        |

**Usage Example:**

```typescript
import { agentSwarm } from './agents/index.js';

// Register an agent
agentSwarm.registerAgent({
  id: 'researcher-1',
  name: 'Research Agent',
  role: 'researcher',
  capabilities: ['search', 'read', 'analyze'],
});

// Submit a task
const task = await agentSwarm.submitTask({
  type: 'research',
  payload: { topic: 'AI trends 2026' },
  priority: 1,
});

// Create workflow
await agentSwarm.createTaskWorkflow('research-project', [
  { type: 'search', payload: { query: 'AI trends' } },
  { type: 'read', dependsOn: [0], payload: { urls: ['...'] } },
  { type: 'analyze', dependsOn: [1], payload: {} },
]);
```

#### 7. Workflow Builder (`src/workflows/`)

Visual workflow automation.

| File         | Description                   |
| ------------ | ----------------------------- |
| `builder.ts` | Workflow builder and executor |

**Usage Example:**

```typescript
import { workflowBuilder } from './workflows/builder.js';

// Create workflow
const workflow = workflowBuilder.createWorkflow('Daily Report', 'Generate and send daily report');

// Add nodes
const trigger = workflowBuilder.addNode(workflow.id, 'trigger', 'Start', { x: 0, y: 0 });
const shell = workflowBuilder.addNode(
  workflow.id,
  'action',
  'Run Script',
  { x: 100, y: 0 },
  {
    command: 'npm',
    args: ['run', 'report'],
  }
);

// Connect nodes
workflowBuilder.connect(workflow.id, trigger.id, shell.id);

// Execute
const execution = await workflowBuilder.execute(workflow.id, {
  date: new Date().toISOString(),
});
```

#### 8. Task Scheduler (`src/scheduler/`)

Cron-like task scheduling.

| File       | Description                      |
| ---------- | -------------------------------- |
| `index.ts` | Task scheduler with cron support |

**Usage Example:**

```typescript
import { taskScheduler } from './scheduler/index.js';

// Schedule a task
taskScheduler.addTask({
  name: 'Daily Backup',
  type: 'cron',
  schedule: { minute: 0, hour: 2 },
  enabled: true,
  task: {
    type: 'shell',
    payload: { command: 'backup', args: ['--daily'] },
  },
});
```

#### 9. Security & Audit (`src/security/`)

Comprehensive security features.

| File       | Description                                 |
| ---------- | ------------------------------------------- |
| `audit.ts` | Audit logging with sensitive data redaction |

**Usage Example:**

```typescript
import { auditLogger } from './security/audit.js';

// Log command execution
await auditLogger.logCommandExecution(
  userId,
  sessionId,
  'npm install',
  ['package-name'],
  'success'
);

// Log file access
await auditLogger.logFileAccess(userId, sessionId, '/data/config.json', 'read', 'success');

// Search audit logs
const events = await auditLogger.search({
  userId: 'user-123',
  type: 'command_execution',
  startDate: new Date('2026-01-01'),
});
```

#### 10. API Layer (`src/api/`)

RESTful and OpenAI-compatible APIs.

| File        | Description                                       |
| ----------- | ------------------------------------------------- |
| `openai.ts` | OpenAI-compatible `/v1/chat/completions` endpoint |

**Usage Example:**

```typescript
import { OpenAIEndpoint } from './api/openai.js';

const openaiApi = new OpenAIEndpoint(agent, router, {
  port: 3002,
  apiKey: process.env.OPENAI_API_KEY,
});

await openaiApi.start();

// Now you can call:
// POST http://localhost:3002/v1/chat/completions
// GET  http://localhost:3002/v1/models
```

---

## 📁 Project Structure

```
sentinelbot/
├── src/
│   ├── api/              # API endpoints
│   ├── agents/           # Multi-agent framework
│   ├── config/           # Configuration
│   ├── core/             # Agent core
│   ├── execution/        # Execution layer
│   ├── gateway/          # Messaging gateway
│   ├── integration/      # External integrations
│   ├── memory/           # Memory system
│   ├── scheduler/        # Task scheduler
│   ├── security/         # Security & audit
│   ├── skills/           # Skills system
│   ├── workflows/        # Workflow builder
│   └── index.ts          # Entry point
├── skills/               # User-defined skills
├── memory/               # Conversation logs
├── docs/                 # Documentation
├── tests/                # Tests
├── .env.example          # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev           # Start development server with hot reload
npm run dev:cli       # Start CLI mode

# Building
npm run build         # Compile TypeScript
npm run watch        # Watch mode compilation

# Testing
npm test             # Run all tests
npm run test:unit    # Unit tests
npm run test:integ   # Integration tests
npm run test:e2e     # End-to-end tests

# Quality
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run typecheck    # TypeScript type checking
```

### Adding a New Skill

1. Create skill directory: `skills/custom/my-skill/`
2. Add `SKILL.md` manifest
3. Implement `index.js`:

```javascript
export const manifest = {
  name: 'my-skill',
  version: '1.0.0',
  // ... manifest fields
};

export class MySkill {
  async execute(context) {
    // Implementation
    return { success: true, output: 'Done' };
  }
}
```

### Adding a New LLM Provider

1. Create provider: `src/core/llm/providers/custom.ts`
2. Extend `LLMProvider` class
3. Register in `src/core/llm/index.ts`:

```typescript
case 'custom':
  return new CustomProvider(config);
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Ways to Contribute

- 🐛 **Bug Reports**: Report bugs or issues
- 💡 **Feature Requests**: Suggest new features
- 📝 **Documentation**: Improve or translate docs
- 🔧 **Code**: Submit pull requests
- 🎨 **Design**: UI/UX improvements
- 📢 **Community**: Help other users

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

### Good First Issues

Looking for a place to start? Check our [Good First Issues](https://github.com/yourusername/sentinelbot/issues?q=label%3A%22good+first+issue%22).

---

## 📚 API Reference

### Agent API

```typescript
agent.processMessage(content, conversationId, userId, source)
agent.startConversation(userId, platform, initialMessage?)
agent.getConversationHistory(conversationId)
agent.execute(request)
agent.readFile(path)
agent.writeFile(path, content)
agent.navigateBrowser(url)
agent.runSandboxedCode(code, language, input?)
```

### Memory API

```typescript
memoryManager.saveConversation(conversationId, userId, messages)
memoryManager.saveNote(note)
memoryManager.search(options)
memoryManager.remember(query, options)
memoryManager.forget(id, store?)
memoryManager.getContext(userId, conversationId, maxTokens)
```

### Workflow API

```typescript
workflowBuilder.createWorkflow(name, description);
workflowBuilder.addNode(workflowId, type, name, position, config);
workflowBuilder.connect(workflowId, sourceId, targetId, label, condition);
workflowBuilder.execute(workflowId, inputs);
workflowBuilder.exportWorkflow(workflowId);
```

---

## 🔒 Security

### Security Features

- **Command Allowlist/Blocklist**: Control executable commands
- **Path Validation**: Restrict file system access
- **Audit Logging**: Comprehensive activity logging
- **Sandboxing**: Isolate untrusted code
- **Rate Limiting**: Prevent abuse

### Reporting Security Issues

For security vulnerabilities, please email `security@example.com` instead of opening a public issue.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [OpenClaw](https://github.com/openclaw/openclaw) for inspiring this project
- [Anthropic](https://anthropic.com) for Claude AI
- [Playwright](https://playwright.dev) for browser automation
- [BullMQ](https://docs.bullmq.io) for task queuing
- [Better-SQLite3](https://github.com/JoshuaWise/better-sqlite3) for fast SQLite

---

<div align="center">

**Built with ❤️ by the SentinelBot Community**

[Website](https://sentinelbot.dev) • [GitHub](https://github.com/yourusername/sentinelbot) • [Discord](https://discord.gg/sentinelbot)

</div>
