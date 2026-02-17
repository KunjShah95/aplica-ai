# Alpicia - AI Personal Assistant

<div align="center">

![Alpicia](https://img.shields.io/badge/Alpicia-AI%20Assistant-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-22+-green?style=for-the-badge)

**An autonomous AI personal assistant with multi-platform messaging, browser automation, memory persistence, and multi-agent collaboration.**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation) • [Contributing](#-contributing) • [License](#license)

</div>

---

## 🎯 Overview

Alpicia is an open-source AI personal assistant platform designed for extensibility, privacy, and power. It enables users to automate complex tasks across various messaging platforms and local environments.

### Why Alpicia?

🚀 **Unified Agent Platform** - One-command installation vs hours of configuration  
🎨 **Extensible Architecture** - Plugin-based skill system for custom capabilities  
🔒 **Privacy-First** - Runs locally with modular self-hosted components  
🌐 **Multi-Platform** - Telegram, Discord, WebSocket, CLI, and **WhatsApp**  
🤖 **Multi-Agent** - Collaborative AI agents (Swarms) for complex workflows  
📝 **Persistent Memory** - Long-term context and learned preferences  
🔄 **Workflow Automation** - Integrated workflow execution engine  
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
| **Memory & Persistence**     | Multi-layered memory including vector search and JSONL       |

### Advanced Features

| Feature                       | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| **Multi-Agent Collaboration** | Agent swarms with task distribution and dependencies |
| **Task Scheduling**           | Cron expressions, intervals, one-time tasks          |
| **Security Audit Logging**    | Comprehensive logging with sensitive data redaction  |
| **Team Collaboration**        | Multi-user support with RBAC                         |
| **Local LLM Support**         | Ollama integration for self-hosted models            |
| **MCP Integration**           | Model Context Protocol for external tools            |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- PostgreSQL (included via Docker)

### Installation

```bash
# Clone the repository
git clone https://github.com/alpicia/alpicia.git
cd alpicia

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your LLM_API_KEY (Anthropic/OpenAI)

# Start infrastructure (Postgres, Redis)
docker-compose up -d

# Initialize database
npm run db:push

# Launch CLI mode
npm run dev:cli
```

---

## 📖 Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Alpicia System                           │
├─────────────────────────────────────────────────────────────────┤
│                      Interface Layer                            │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│ │ Telegram │ │ Discord  │ │ WhatsApp │ │   CLI    │             │
│ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘             │
│      └────────────┴────────────┴────────────┘                   │
│                       │                                         │
│                ┌──────┴───────┐                                 │
│                │   Gateway    │                                 │
│                │   Router     │                                 │
│                └──────┬───────┘                                 │
│                       │                                         │
│                ┌──────┴───────┐                                 │
│                │   Agent      │                                 │
│                │   Core       │                                 │
│                └──────┬───────┘                                 │
│        ┌──────────────┼──────────────┐                 │
│        │              │              │                          │
│  ┌────┴────┐    ┌────┴────┐    ┌────┴────┐                      │
│  │  Skills │    │  Memory │    │Execution│                      │
│  │  System │    │  System │    │  Layer  │                      │
│  └─────────┘    └─────────┘    └─────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

- **Gateway Layer (`src/gateway/`)**: Unified interface for external platforms.
- **Agent Core (`src/core/`)**: Brain of the system, managing LLM interactions.
- **Memory System (`src/memory/`)**: Handles episodic and long-term storage.
- **Skills System (`src/skills/`)**: Expandable capabilities (Browser, Email, etc).
- **Team Management (`src/teams/`)**: RBAC and multi-user support.

---

## 📁 Project Structure

```
alpicia/
├── src/
│   ├── agents/      # Agent behaviors and swarms
│   ├── core/        # Agent core logic and LLM handling
│   ├── gateway/     # Platform adapters (Telegram, Discord, etc)
│   ├── memory/      # Memory storage and retrieval
│   ├── skills/      # Tool and skill implementations
│   ├── teams/       # Multi-user and RBAC system
│   └── index.ts     # Main entry point
├── docs/            # Detailed documentation
├── tests/           # Test suites
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev           # Start development server
npm run dev:cli       # Start CLI mode
npm run build         # Compile TypeScript
npm test             # Run tests
npm run format       # Format code
```

---

## 🔒 Security

- **Command Sandboxing**: Restricted execution context for safety.
- **Path Validation**: Strict rules for file system interactions.
- **Audit Logs**: Traceability for all agent actions.
- **RBAC**: granular permissions for team members.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md).

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**Built by the Alpicia Team**

</div>
