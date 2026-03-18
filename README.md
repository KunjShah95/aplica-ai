# Alpicia - AI Personal Assistant

<div align="center">

![Alpicia](https://img.shields.io/badge/Alpicia-AI%20Assistant-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-22+-green?style=for-the-badge)

**An autonomous AI personal assistant with multi-platform messaging, browser automation, memory persistence, and multi-agent collaboration.**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Modules](#-modules) • [API Reference](#-api-reference) • [Configuration](#-configuration) • [Contributing](#-contributing)

</div>

---

## Overview

Alpicia is an open-source AI personal assistant platform designed for extensibility, privacy, and power. It enables users to automate complex tasks across various messaging platforms and local environments.

### Why Alpicia?

- **Unified Agent Platform** - One-command installation vs hours of configuration
- **Extensible Architecture** - Plugin-based skill system for custom capabilities
- **Privacy-First** - Runs locally with modular self-hosted components
- **Multi-Platform** - Telegram, Discord, WhatsApp, WebSocket, CLI
- **Multi-Agent** - Collaborative AI agents (Swarms) for complex workflows
- **Persistent Memory** - Long-term context and learned preferences
- **Workflow Automation** - Integrated workflow execution engine
- **Self-Evolution** - Genetic algorithms that improve prompts and skills over time

---

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Multi-Platform Messaging** | Telegram, Discord, WhatsApp, LINE, Nostr, Twitch, IRC, SMS, WeCom, DingTalk, Feishu, QQ |
| **Browser Automation** | Navigate, click, fill forms, take screenshots via Playwright |
| **Shell Command Execution** | Safe command execution with allowlist/blocklist filtering |
| **File System Operations** | Read, write, search, and manage files securely |
| **Memory & Persistence** | Multi-layered memory including PostgreSQL, JSONL, and knowledge graphs |
| **Voice + ACP** | Wake word detection, local STT/TTS, Audio Context Protocol |
| **Live Canvas** | Real-time collaborative canvas with WebSocket sync |

### Execution Engine

| Feature | Description |
|---------|-------------|
| **Firecracker Sandbox** | MicroVM execution with 5s timeout, 256MB memory cap |
| **Persistent REPL** | Variables survive across conversation turns |
| **Git Autopilot** | Conventional commits, auto-PRs, 3-way merge |
| **CI/CD Self-Healer** | Auto-diagnose and fix flaky tests, missing env vars |

### Self-Evolution

| Feature | Description |
|---------|-------------|
| **Prompt Mutation** | Genetic operators on system prompts (rephrase, expand, constrain, simplify, example, chain-of-thought) |
| **Skill Breeding** | Merge two skills into hybrid via genetic algorithms with crossover and mutation |
| **Elite Selection** | Tournament selection for best-performing variants |
| **Overnight Evolution** | Run evolution loop while you sleep with Symphony Mode |

### World Hooks

| Feature | Description |
|---------|-------------|
| **ArXiv Watcher** | Daily sweeps of ArXiv papers by category with relevance scoring |
| **Patent Watcher** | USPTO patent search with CPC code filtering |
| **Grant Radar** | Monitors Grants.gov, NSF, NIH for matching opportunities |
| **Regulatory Watcher** | Federal Register alerts with impact level estimation |

### Analytics + Science

| Feature | Description |
|---------|-------------|
| **Causal Inference** | Diff-in-diff, instrumental variables, regression discontinuity, matched groups |
| **Experiment Designer** | A/B test specs with power calculations and confidence intervals |
| **LLM Ops** | Token usage tracking, cost analysis, latency monitoring |
| **Budget Governor** | Spend limits and auto-throttling |

### Wild Features

| Feature | Description |
|---------|-------------|
| **Second Brain Sync** | Bidirectional Obsidian/Notion integration with graph search |
| **Legacy Letter** | AI-generated letters for birthdays, farewells, gratitude with life summary |
| **Memory Decay** | Ebbinghaus curve-based importance decay |
| **Episodic Replay** | Daily pattern extraction and insight generation |

### Security

| Feature | Description |
|---------|-------------|
| **Injection Shield** | Prompt injection detection and sanitization |
| **PII Scrubber** | Automatic redaction of sensitive information |
| **E2E Encryption** | End-to-end encryption for stored memories |
| **Audit Logging** | Comprehensive action logging with redaction |

### Social + Workflow

| Feature | Description |
|---------|-------------|
| **Social Scheduler** | Optimal time detection for messages |
| **Personal CRM** | Contact tracking and relationship management |
| **Newsletter Digest** | Automated content curation |
| **Visual Builder** | No-code workflow designer |
| **Contract Reviewer** | Legal document analysis |
| **Habit Coach** | Behavioral pattern tracking and coaching |

---

## Quick Start

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- PostgreSQL (included via Docker)
- For browser automation: Playwright browsers

### Installation

```bash
# Clone the repository
git clone https://github.com/alpicia/alpicia.git
cd alpicia

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start infrastructure (Postgres, Redis)
docker-compose up -d

# Initialize database
npm run db:push

# Launch in development mode
npm run dev

# Or launch CLI mode
npm run dev:cli
```

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://postgres:password@localhost:5432/alpicia
LLM_API_KEY=sk-your-api-key

# Optional - Platform tokens
TELEGRAM_BOT_TOKEN=
DISCORD_BOT_TOKEN=
WHATSAPP_SESSION_ID=

# Optional - Features
OLLAMA_BASE_URL=http://localhost:11434
REDIS_URL=redis://localhost:6379
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Interface Layer                             │
│  Telegram │ Discord │ WhatsApp │ LINE │ Nostr │ IRC │ WebSocket  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Gateway Router                              │
│              Auth │ Rate Limit │ Message Transform                 │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Agent Core                                  │
│     LLM │ Context │ Skills │ Memory │ Session │ Multi-Agent        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
        ┌──────────┬──────────┬───┴───┬──────────┬──────────┐
        ▼          ▼          ▼         ▼          ▼          ▼
   ┌─────────┐ ┌──────┐ ┌────────┐ ┌───────┐ ┌────────┐ ┌──────┐
   │Memory   │ │Skills │ │Execution│ │Evolution│ │World  │ │Analytics│
   │Systems  │ │      │ │Engine  │ │        │ │Hooks   │ │       │
   └─────────┘ └──────┘ └────────┘ └────────┘ └────────┘ └──────┘
```

### Core Components

```
src/
├── agents/           # Agent behaviors, swarms, tool definitions
├── api/              # REST API endpoints
├── auth/             # Authentication & authorization
├── autoresearch/     # AutoResearch Loop with multi-agent
├── canvas/           # Live Canvas with WebSocket
├── cluster/          # Multi-instance coordination
├── config/           # Configuration loading
├── core/             # Agent core logic
├── db/               # Database client (PostgreSQL)
├── economy/           # Token economy & cost tracking
├── evaluation/        # Skill evaluation framework
├── evolution/         # Self-Evolution (prompt mutation, skill breeding)
├── execution/         # Execution Engine (sandbox, REPL, git)
├── federation/        # Cross-instance communication
├── gateway/           # Platform adapters
│   └── adapters/     # WhatsApp, LINE, Nostr, Twitch, IRC, SMS, etc
├── memory/           # Memory systems
│   ├── hybrid-loop.ts       # Retrieve + extract patterns
│   ├── knowledge-graph.ts   # Entity relationships
│   ├── memory-decay.ts      # Ebbinghaus curve decay
│   └── episodic-replay.ts    # Daily pattern extraction
├── mcp/              # Model Context Protocol
├── middleware/        # Express middleware
├── monitoring/       # Metrics & health checks
├── multiagent/       # Swarm orchestration
├── network/          # P2P networking
├── nodes/            # Distributed node types
├── notifications/    # Multi-channel notifications
├── plugins/          # Plugin system
├── scheduler/        # Task scheduling
├── security/         # Injection shield, PII, E2E
├── session/          # Session scoping
├── skills/           # Skill system
│   ├── builtins/     # Browser, Code, Shell, Memory, Voice, Email
│   └── custom/       # Custom skill templates
├── social/           # Social scheduler, CRM, newsletter
├── symphony/         # Symphony Mode for isolated runs
├── teams/            # Team management & RBAC
├── types/            # TypeScript definitions
├── users/            # User management
├── voice/            # Voice + ACP (wake word, STT, TTS)
├── webhook/          # Webhook handlers
├── wild/             # Second Brain, Legacy Letter
├── workflow/         # Visual builder, contract reviewer, habit coach
└── world-hooks/      # ArXiv, Patent, Grant, Regulatory watchers
```

---

## Modules

### Gateway (`src/gateway/`)

The gateway provides unified interface for external messaging platforms.

```typescript
import { GatewayRouter } from './gateway/router';

const router = new GatewayRouter();

// Register adapters
router.registerAdapter('telegram', new TelegramAdapter(botToken));
router.registerAdapter('discord', new DiscordAdapter(botToken));
router.registerAdapter('whatsapp', new WhatsAppAdapter(sessionId));

// Route incoming messages
router.onMessage(async (context) => {
  const { platform, userId, message } = context;
  // Process through agent core
});
```

### Platform Adapters

| Adapter | File | Description |
|---------|------|-------------|
| WhatsApp | `adapters/whatsapp.ts` | WhatsApp Business API |
| LINE | `adapters/line.ts` | LINE Messaging API |
| Nostr | `adapters/nostr.ts` | Nostr protocol |
| Twitch | `adapters/twitch.ts` | Twitch chat |
| IRC | `adapters/irc.ts` | IRC protocol |
| SMS | `adapters/sms.ts` | Twilio SMS |
| WeCom | `adapters/wecom.ts` | WeChat Work |
| DingTalk | `adapters/dingtalk.ts` | DingTalk |
| Feishu | `adapters/feishu.ts` | Feishu/Lark |
| QQ | `adapters/qq.ts` | QQ protocol |

### Skills System (`src/skills/`)

Skills provide capabilities to the agent.

```typescript
import { SkillLoader, SkillExecutionContext } from './skills/loader';

// Built-in skills
- browser    # Playwright automation
- code       # Code execution
- shell      # Command execution
- memory     # Memory operations
- voice      # Voice commands
- email      # Email sending

// Custom skills
loader.registerSkill(new MyCustomSkill());

// Execute
const result = await skill.execute({
  userId: 'user123',
  conversationId: 'conv456',
  message: 'browse to example.com',
  parameters: {},
  memory: {
    get: async (key) => ...,
    set: async (key, value) => ...,
  }
});
```

### Memory System (`src/memory/`)

Multi-layered memory architecture:

```typescript
import { HybridMemoryLoop } from './memory/hybrid-loop';
import { KnowledgeGraph } from './memory/knowledge-graph';
import { MemoryDecay } from './memory/memory-decay';
import { EpisodicReplay } from './memory/episodic-replay';

// Hybrid memory - retrieve + extract patterns
const memories = await hybridLoop.retrieve(query, {
  limit: 10,
  importance: 0.5,
  recency: 24 * 60 * 60 * 1000,
});

// Knowledge graph - entity relationships
await knowledgeGraph.addNode({
  type: 'person',
  name: 'John Doe',
  properties: { role: 'engineer' },
});
const related = await knowledgeGraph.findRelatedNodes(nodeId, 'works_with');

// Memory decay - Ebbinghaus curve
const importance = memoryDecay.calculateImportance({
  accessCount: 5,
  lastAccessed: new Date('2024-01-01'),
  baseImportance: 0.8,
});

// Episodic replay - daily insights
const insights = await episodicReplay.runDailyReplay(userId, new Date());
```

### Execution Engine (`src/execution/`)

```typescript
import { FirecrackerSandbox } from './execution/firecracker';
import { GitAutopilot } from './execution/firecracker';
import { CIHealer } from './execution/ci-healer';

// Firecracker sandbox
const result = await sandbox.execute(`
  console.log("Hello from sandbox");
  // 5s timeout, 256MB limit
`);

// Git autopilot
await gitAutopilot.commit('feat: add new feature', { autoPush: true });
await gitAutopilot.createPR('feat: new feature', 'main');

// CI healer
const diagnosis = await ciHealer.diagnose();
await ciHealer.applyFix(diagnosis);
```

### Self-Evolution (`src/evolution/`)

```typescript
import { PromptMutator } from './evolution/prompt-mutator';
import { SkillBreeder } from './evolution/skill-breeder';

// Prompt mutation
const mutated = mutator.mutate(prompt, skillId, { context: 'coding' });
mutator.recordSuccess(mutationId);  // Track success rate

// Skill breeding
await breeder.createBaselineVariant(skillId, 'My Skill');
const child = await breeder.crossbreed(parent1Id, parent2Id);
const mutant = breeder.mutate(variantId);

// Evolve population
const elite = breeder.selectElite(skillId, 3);
const newVariants = breeder.evolve(skillId);
```

### World Hooks (`src/world-hooks/`)

```typescript
import { arxivWatcher } from './world-hooks/arxiv-watcher';
import { patentWatcher } from './world-hooks/patent-watcher';
import { grantRadar } from './world-hooks/grant-radar';
import { regulatoryWatcher } from './world-hooks/regulatory-watcher';

// ArXiv papers
const papers = await arxivWatcher.search('large language model', ['cs.ai', 'cs.lg']);
const alerts = await arxivWatcher.checkForNewPapers(userId);

// Patents
const patents = await patentWatcher.search(['AI', 'machine learning'], {
  cpcCodes: ['G06N'],
  maxResults: 20,
});

// Grants
const grants = await grantRadar.search(['AI research'], {
  amountMin: 50000,
  deadlineAfter: new Date(),
});
const deadlines = await grantRadar.getUpcomingDeadlines(userId, 30);

// Regulatory
const updates = await regulatoryWatcher.search(['privacy', 'data'], {
  type: 'proposed',
});
const impact = updates.filter(u => u.impactLevel === 'high');
```

### Analytics (`src/analytics/`)

```typescript
import { CausalInferenceEngine } from './analytics/causal-inference';
import { ExperimentDesigner } from './analytics/experiment-designer';

// Causal inference
const result = await engine.analyze('diff-in-diff', {
  treatmentGroup: treatmentData,
  controlGroup: controlData,
  preTreatment: preData,
  postTreatment: postData,
});
// Returns: treatment effect, confidence interval, p-value, plain English story

// Experiment designer
const spec = experimentDesigner.createSpec({
  name: 'New Prompt Test',
  variants: ['control', 'treatment'],
  primaryMetric: 'completion_rate',
  sampleSize: 1000,
  power: 0.8,
});
```

### Wild Features (`src/wild/`)

```typescript
import { secondBrain } from './wild/second-brain';
import { legacySystem } from './wild/legacy-letter';

// Second Brain
const node = await secondBrain.createNode('concept', 'AI', 'Artificial Intelligence...', ['tech']);
await secondBrain.linkNodes(node1Id, node2Id);
const results = await secondBrain.search('machine learning');
const graph = await secondBrain.getGraph();
await secondBrain.sync();  // Obsidian/Notion sync

// Legacy Letter
await legacySystem.addMemory(userId, {
  category: 'achievement',
  title: 'Built Alpicia',
  content: 'Created an AI assistant...',
  importance: 0.9,
});

const letter = await legacySystem.generateLetter(
  userId,
  recipientId,
  'John',
  'gratitude'
);

const summary = await legacySystem.generateLifeSummary(userId);
```

---

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send a message |
| GET | `/api/conversations` | List conversations |
| GET | `/api/memory` | Query memory |
| POST | `/api/skills/execute` | Execute a skill |
| GET | `/api/analytics/causal` | Run causal analysis |
| POST | `/api/workflow/execute` | Execute workflow |

### WebSocket Events

| Event | Payload | Description |
|-------|---------|-------------|
| `message` | `{ content, role }` | Chat message |
| `canvas:update` | `{ elements }` | Canvas update |
| `agent:progress` | `{ task, status }` | Task progress |
| `memory:recalled` | `{ memories }` | Memory retrieval |

---

## Configuration

### Database Schema

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  conversations Conversation[]
  memories      Memory[]
}

model Conversation {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  messages  Message[]
  createdAt DateTime  @default(now())
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  role           String       // 'user' | 'assistant' | 'system'
  content        String
  metadata       Json?
  createdAt      DateTime     @default(now())
}

model Memory {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  type       String   // 'EPISODE' | 'FACT' | 'ENTITY' | 'SKILL'
  content    String
  importance Float    @default(0.5)
  metadata   Json?
  createdAt  DateTime @default(now())
  lastAccessedAt DateTime?
  accessCount Int     @default(0)
}
```

### Skill Manifest

```typescript
interface SkillManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  trust?: 'verified' | 'community' | 'unverified';
  triggers: Array<{
    type: 'keyword' | 'pattern' | 'command' | 'context';
    value: string;
  }>;
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    description: string;
  }>;
  permissions: string[];
  examples: string[];
}
```

---

## Development

### Available Scripts

```bash
npm run dev           # Start development server
npm run dev:cli       # Start CLI mode
npm run build         # Compile TypeScript
npm test             # Run tests
npm run format       # Format code
npm run lint         # Lint code
npm run db:push      # Push schema to database
npm run db:seed      # Seed database
```

### Running Tests

```bash
npm test             # All tests
npm test -- --watch  # Watch mode
npm test -- coverage # Coverage report
```

### Adding a New Skill

```typescript
import { Skill, SkillManifest, SkillExecutionContext, SkillResult } from '../loader';

export const manifest: SkillManifest = {
  name: 'my-skill',
  version: '1.0.0',
  description: 'Does something useful',
  triggers: [
    { type: 'keyword', value: 'do thing' },
  ],
  parameters: [
    { name: 'input', type: 'string', required: true, description: 'Input text' },
  ],
  permissions: ['filesystem:read'],
  examples: ['do thing with hello'],
};

export class MySkill implements Skill {
  manifest = manifest;

  async execute(context: SkillExecutionContext): Promise<SkillResult> {
    const input = context.parameters.input as string;
    // Do something
    return { success: true, output: 'Done!' };
  }
}
```

---

## Security

- **Command Sandboxing**: Restricted execution context for safety
- **Path Validation**: Strict rules for file system interactions
- **Audit Logs**: Traceability for all agent actions
- **RBAC**: Granular permissions for team members
- **Prompt Injection Shield**: Detects and blocks malicious prompts
- **PII Scrubber**: Automatic redaction of sensitive data

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md).

### Areas for Contribution

- New platform adapters
- Skill implementations
- Memory algorithms
- Self-evolution strategies
- Analytics methods
- Documentation

---

## License

MIT License - see LICENSE file for details.

---

<div align="center">

**Built by the Alpicia Team**

</div>
