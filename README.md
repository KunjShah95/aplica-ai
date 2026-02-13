# SentinelBot - AI Personal Assistant

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

SentinelBot is an open-source AI personal assistant inspired by OpenClaw that gained massive popularity for its ability to autonomously control computers, execute tasks, and interact across multiple messaging platforms.

### Why SentinelBot?

🚀 **70% Faster Setup** - One-command installation vs hours of configuration  
🎨 **Visual Workflow Builder** - Drag-and-drop automation (OpenClaw doesn't have this)  
🔒 **Privacy-First** - Runs locally with optional self-hosted components  
🌐 **Multi-Platform** - Telegram, Discord, WebSocket, CLI, and **WhatsApp**  
🤖 **Multi-Agent** - Collaborative AI agents for complex workflows  
📝 **Persistent Memory** - Long-term context and learned preferences  
🔧 **Extensible Skills** - Plugin-based skill system with custom skill support  
🔄 **Workflow Automation** - Visual workflow builder for complex automations  
📅 **Task Scheduling** - Advanced cron-like scheduling for recurring tasks

---

## ✨ Features

### Core Capabilities

| Feature                      | Description                                                  |
| ---------------------------- | ------------------------------------------------------------ |
| **Multi-Platform Messaging** | Telegram, Discord, WhatsApp, WebSocket, CLI interfaces       |
| **Browser Automation**       | Navigate, click, fill forms, take screenshots via Playwright |
| **Shell Command Execution**  | Safe command execution with allowlist/blocklist filtering    |
| **File System Operations**   | Read, write, search, and manage files securely               |
| **Sandboxed Code Execution** | Isolated JavaScript/TypeScript execution                     |
| **Memory & Persistence**     | JSONL, Markdown, and SQLite+FTS5 storage                     |

### Advanced Features

| Feature                       | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| **Multi-Agent Collaboration** | Agent swarms with task distribution and dependencies |
| **Visual Workflow Builder**   | Node-based workflow design and execution (NEW!)      |
| **Task Scheduling**           | Cron expressions, intervals, one-time tasks          |
| **Security Audit Logging**    | Comprehensive logging with sensitive data redaction  |
| **OpenAI-Compatible API**     | `/v1/chat/completions` endpoint for integration      |
| **Email Automation**          | Send, draft, read, and search emails                 |
| **Local LLM Support**         | Ollama integration for self-hosted models            |
| **MCP Integration**           | Model Context Protocol for external tools            |
| **Voice Interactions**        | Speech-to-text and text-to-speech support (NEW!)     |
| **Team Collaboration**        | Multi-user support with RBAC (NEW!)                  |

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
git clone https://github.com/sentinelbot/sentinelbot.git
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

### One-Click Deploy

Deploy to your favorite platform in seconds:

#### Docker

```bash
docker-compose up -d
```

#### Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

#### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

```

### Try the Demo

No installation required - try SentinelBot in your browser!

🌐 **[Try SentinelBot Demo](https://sentinelbot.dev/demo)** - Experience the power of AI automation instantly

---

## 📖 Documentation

### Architecture Overview

```

┌─────────────────────────────────────────────────────────────────┐
│ SentinelBot System │
├─────────────────────────────────────────────────────────────────┤
│ User Interface Layer │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ Telegram │ │ Discord │ │ WhatsApp │ │ Web │ │
│ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│ └────────────┴────────────┴────────────┘ │
│ │ │
│ ┌───────┴───────┐ │
│ │ Gateway │ │
│ │ Router │ │
│ │ Queue │ │
│ └───────┬───────┘ │
│ │ │
│ ┌───────┴───────┐ │
│ │ Agent │ │
│ │ Core │ │
│ └───────┬───────┘ │
│ ┌──────────────┼──────────────┐ │
│ │ │ │ │
│ ┌────┴────┐ ┌────┴────┐ ┌────┴────┐ │
│ │ Skills │ │ Memory │ │Execution│ │
│ │ System │ │ System │ │ Layer │ │
│ └─────────┘ └─────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────────┘

```

### Core Components

#### 1. Gateway Layer (`src/gateway/`)

The gateway handles all incoming messages and routes them to the appropriate handlers.

| File                   | Description                                  |
| ---------------------- | -------------------------------------------- |
| `websocket.ts`         | WebSocket server for real-time communication |
| `router.ts`            | Message routing and platform abstraction     |
| `server.ts`             | Gateway orchestrator                         |
| `adapters/telegram.ts`  | Telegram bot integration                     |
| `adapters/discord.ts`   | Discord bot integration                      |
| `adapters/whatsapp.ts`  | WhatsApp bot integration (NEW!)             |

#### 2. Agent Core (`src/core/`)

The agent processes messages and manages conversations.

| File              | Description                                  |
| ----------------- | -------------------------------------------- |
| `agent.ts`        | Main agent logic with execution capabilities |
| `llm/`            | LLM provider abstraction (Claude, Ollama)    |
| `conversation.ts` | Conversation management                      |
| `queue.ts`        | BullMQ task queue with priority lanes         |

#### 3. Execution Layer (`src/execution/`)

Provides sandboxed execution capabilities.

| File            | Description                          |
| --------------- | ------------------------------------ |
| `shell.ts`      | Safe shell command execution         |
| `filesystem.ts` | File operations with path validation |
| `browser.ts`    | Playwright-based browser automation  |
| `sandbox.ts`    | Isolated code execution              |

#### 4. Memory System (`src/memory/`)

Multiple storage backends for persistent memory.

| File          | Description                       |
| ------------- | --------------------------------- |
| `jsonl.ts`    | JSONL line-based storage          |
| `markdown.ts` | Markdown notes and daily logs     |
| `sqlite.ts`   | SQLite with FTS5 full-text search |
| `index.ts`    | Unified memory manager            |

#### 5. Skills System (`src/skills/`)

Extensible skill framework for adding capabilities.

| File        | Description                                           |
| ----------- | ----------------------------------------------------- |
| `loader.ts` | Skill loader and manifest parser                      |
| `index.ts`  | Skills API                                            |
| `builtins/`  | Built-in skills (browser, code, shell, memory, email) |
| `voice.ts`  | Voice/speech skills (NEW!)                           |

#### 6. Multi-Agent Framework (`src/agents/`)

Collaborative AI agents for complex tasks.

| File       | Description            |
| ---------- | ---------------------- |
| `swarm.ts` | Agent swarm management |
| `index.ts` | Multi-agent API        |

#### 7. Visual Workflow Builder (`src/workflows/`)

Node-based visual workflow automation (NEW!).

| File         | Description                   |
| ------------ | ----------------------------- |
| `builder.ts` | Workflow builder and executor |
| `runner.ts`  | Workflow execution engine     |

#### 8. Task Scheduler (`src/scheduler/`)

Cron-like task scheduling.

| File       | Description                      |
| ---------- | -------------------------------- |
| `index.ts` | Task scheduler with cron support |

#### 9. Team Management (`src/teams/`)

Multi-user support with role-based access control (NEW!).

| File        | Description                        |
| ----------- | ---------------------------------- |
| `service.ts`| Team and user management           |
| `types.ts`  | Type definitions and permissions   |
| `auth.ts`   | Authentication and authorization   |

---

## 📁 Project Structure

```

sentinelbot/
├── src/
│ ├── agents/ # Multi-agent framework
│ ├── api/ # API endpoints
│ ├── auth/ # Authentication (NEW!)
│ ├── config/ # Configuration
│ ├── core/ # Agent core
│ ├── execution/ # Execution layer
│ ├── gateway/ # Messaging gateway
│ │ └── adapters/ # Platform adapters (including WhatsApp)
│ ├── integration/ # External integrations
│ ├── memory/ # Memory system
│ ├── scheduler/ # Task scheduler
│ ├── security/ # Security & audit
│ ├── skills/ # Skills system
│ │ └── builtins/ # Built-in skills (including voice)
│ ├── teams/ # Team management (NEW!)
│ ├── workflows/ # Visual workflow builder (NEW!)
│ └── index.ts # Entry point
├── dashboard/ # Visual Workflow Dashboard (React)
├── demo-playground/ # Interactive Demo (NEW!)
├── docs/ # Documentation
├── tests/ # Tests
├── .env.example # Environment template
├── package.json
├── tsconfig.json
└── README.md

````

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
````

### Adding a New Skill

1. Create skill directory: `skills/custom/my-skill/`
2. Add `SKILL.md` manifest
3. Implement `index.js`:

```javascript
export const manifest = {
  name: "my-skill",
  version: "1.0.0",
  // ... manifest fields
};

export class MySkill {
  async execute(context) {
    // Implementation
    return { success: true, output: "Done" };
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

---

## 🔒 Security

### Security Features

- **Command Allowlist/Blocklist**: Control executable commands
- **Path Validation**: Restrict file system access
- **Audit Logging**: Comprehensive activity logging
- **Sandboxing**: Isolate untrusted code
- **Rate Limiting**: Prevent abuse
- **Team RBAC**: Role-based access control (NEW!)

### Reporting Security Issues

For security vulnerabilities, please email `security@sentinelbot.dev` instead of opening a public issue.

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

[Website](https://sentinelbot.dev) • [GitHub](https://github.com/sentinelbot/sentinelbot) • [Discord](https://discord.gg/sentinelbot) • [Twitter](https://twitter.com/sentinelbot)

</div>
