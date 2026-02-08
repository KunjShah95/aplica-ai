# Alpicia Architecture

This document provides a deep dive into Alpicia's architecture, explaining how each component works and interacts with others.

## Table of Contents

1. [System Overview](#system-overview)
2. [Gateway Layer](#gateway-layer)
3. [Agent Core](#agent-core)
4. [Execution Layer](#execution-layer)
5. [Memory System](#memory-system)
6. [Skills Framework](#skills-framework)
7. [Multi-Agent System](#multi-agent-system)
8. [Workflow Engine](#workflow-engine)
9. [Data Flow](#data-flow)
10. [Security Model](#security-model)

---

## System Overview

Alpicia follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interface                              │
│  Telegram  │  Discord  │  WebSocket  │  CLI  │  OpenAI API        │
└────────────┴───────────┴─────────────┴───────┴─────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Gateway Layer                               │
│  Message Router  │  Queue  │  Adapter Pattern  │  Session Mgmt     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Agent Core                                  │
│  LLM Provider  │  Conversation  │  Context  │  Decision Engine    │
└────────────────┬────────────────┴───────────┬──────────────────────┘
                 │                            │
    ┌────────────┴────────────┐    ┌────────┴────────┐
    ▼                         ▼    ▼                 ▼
┌────────┐              ┌────────┐          ┌────────────┐
│ Skills │              │ Memory │          │ Execution  │
└────────┘              └────────┘          └────────────┘
```

---

## Gateway Layer

### Component: Message Router

**File**: `src/gateway/router.ts`

The message router is the entry point for all incoming messages:

```typescript
class MessageRouter {
  async route(message: RouterMessage): Promise<RouterResponse> {
    // 1. Validate message
    // 2. Get/create conversation
    // 3. Process through agent
    // 4. Store in memory
    // 5. Return response
  }
}
```

**Responsibilities**:

- Message validation and sanitization
- Conversation management
- Source platform detection
- Response routing

### Component: WebSocket Gateway

**File**: `src/gateway/websocket.ts`

Real-time communication via WebSocket:

```typescript
class WebSocketGateway {
  handleConnection(ws: WebSocket) {
    // Authenticate
    // Register client
    // Handle messages
    // Broadcast updates
  }
}
```

**Features**:

- Client authentication
- Ping/pong heartbeat
- Automatic reconnection
- Message broadcasting

### Component: Platform Adapters

**Files**:

- `src/gateway/adapters/telegram.ts`
- `src/gateway/adapters/discord.ts`

Adapter pattern for platform-specific logic:

```typescript
interface PlatformAdapter {
  sendMessage(chatId: string, content: string): Promise<string>;
  getUpdates(): Promise<Update[]>;
  handleCallback(callback: Callback): Promise<void>;
}
```

---

## Agent Core

### Component: Agent

**File**: `src/core/agent.ts`

The central agent orchestrates all operations:

```typescript
class Agent {
  private config: AppConfig;
  private llm: LLMProvider;
  private systemPrompt: string;

  async processMessage(
    content: string,
    conversationId: string,
    userId: string,
    source: Platform
  ): Promise<AgentResponse> {
    // 1. Get conversation context
    // 2. Build messages for LLM
    // 3. Get LLM completion
    // 4. Store in memory
    // 5. Return response
  }
}
```

### Component: LLM Provider

**Files**:

- `src/core/llm/index.ts`
- `src/core/llm/providers/claude.ts`
- `src/core/llm/providers/ollama.ts`

Abstract interface for LLM interactions:

```typescript
abstract class LLMProvider {
  abstract complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResult>;

  abstract stream(messages: LLMMessage[], options?: LLMCompletionOptions): AsyncIterable<string>;

  abstract isAvailable(): boolean | Promise<boolean>;
}
```

### Component: Task Queue

**File**: `src/core/queue.ts`

BullMQ-based priority queue with lanes:

```
┌────────────────────────────────────────────────────┐
│                   Task Queue                        │
├──────────────────┬─────────────────────────────────┤
│  URGENT (Prio 1) │  High-priority tasks           │
│  CONCURRENCY: 5  │  maxConcurrent=5               │
├──────────────────┼─────────────────────────────────┤
│  NORMAL (Prio 2) │  Standard tasks                │
│  CONCURRENCY: 3  │  maxConcurrent=3               │
├──────────────────┼─────────────────────────────────┤
│ BACKGROUND (Prio 3) │  Background jobs           │
│  CONCURRENCY: 1  │  maxConcurrent=1               │
└──────────────────┴─────────────────────────────────┘
```

---

## Execution Layer

### Component: Shell Executor

**File**: `src/execution/shell.ts`

Safe shell command execution with security:

```typescript
class ShellExecutor {
  async execute(options: ShellExecutionOptions): Promise<ShellExecutionResult> {
    // 1. Validate command against allowlist
    // 2. Check against blocklist
    // 3. Set up timeout
    // 4. Spawn process
    // 5. Capture output
    // 6. Return result
  }
}
```

**Security Features**:

- Command allowlisting
- Dangerous command blocking
- Output size limits
- Timeout enforcement

### Component: File System Executor

**File**: `src/execution/filesystem.ts`

Secure file operations:

```typescript
class FileSystemExecutor {
  async readFile(path: string): Promise<FileOperationResult> {
    // 1. Validate path
    // 2. Check permissions
    // 3. Read file
    // 4. Return content
  }
}
```

**Path Validation**:

- Resolves relative paths
- Blocks dangerous paths
- Respects allowed directories
- Limits file size

### Component: Browser Executor

**File**: `src/execution/browser.ts`

Playwright-based browser automation:

```typescript
class BrowserExecutor {
  async navigate(options: NavigationOptions): Promise<BrowserResult> {
    // 1. Initialize browser if needed
    // 2. Navigate to URL
    // 3. Wait for load
    // 4. Return result
  }
}
```

**Capabilities**:

- Navigate and click
- Form filling
- Screenshot capture
- Element extraction
- JavaScript evaluation

### Component: Sandbox Executor

**File**: `src/execution/sandbox.ts`

Isolated code execution:

```typescript
class SandboxExecutor {
  async execute(task: SandboxedTask): Promise<SandboxExecutionResult> {
    // 1. Create worker thread
    // 2. Set up isolation
    // 3. Execute code
    // 4. Collect output
    // 5. Clean up
  }
}
```

---

## Memory System

### Storage Backends

| Backend  | File                 | Use Case                            |
| -------- | -------------------- | ----------------------------------- |
| JSONL    | `memory/jsonl.ts`    | Conversation logs, high-volume data |
| Markdown | `memory/markdown.ts` | Notes, daily logs, human-readable   |
| SQLite   | `memory/sqlite.ts`   | Searchable data, FTS5               |

### Memory Manager

**File**: `src/memory/index.ts`

Unified interface across backends:

```typescript
class MemoryManager {
  async saveConversation(conversationId: string, userId: string, messages: Message[]);
  async search(options: MemorySearchOptions): Promise<MemoryResult[]>;
  async remember(query: string, options?: RememberOptions): Promise<string>;
  async getContext(userId: string, conversationId: string): Promise<string>;
}
```

---

## Skills Framework

### Skill Structure

```
skills/
├── builtins/
│   ├── browser.ts
│   ├── code.ts
│   ├── email.ts
│   ├── memory.ts
│   └── shell.ts
├── custom/
│   └── my-skill/
│       ├── SKILL.md
│       └── index.js
└── loader.ts
```

### Skill Manifest (SKILL.md)

```yaml
---
name: my-skill
version: 1.0.0
description: Description of the skill
triggers:
  - type: keyword
    value: 'my trigger'
  - type: command
    value: '/my-command'
parameters:
  - name: param1
    type: string
    required: true
    description: Description
permissions:
  - filesystem
examples:
  - 'Do my skill with value'
```

### Skill Execution Flow

```
User Message
    │
    ▼
Message Router
    │
    ▼
Skill Loader (find matching skills)
    │
    ▼
Skill.execute(context)
    │
    ▼
Execution Layer (perform actions)
    │
    ▼
Return Result
```

---

## Multi-Agent System

### Agent Roles

| Role        | Capabilities                     |
| ----------- | -------------------------------- |
| Coordinator | Task distribution, orchestration |
| Researcher  | Search, data gathering           |
| Executor    | Shell commands, API calls        |
| Analyst     | Data processing, analysis        |
| Creative    | Content generation               |

### Swarm Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Swarm                           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐                                        │
│  │ Coordinator │ ← Task submission, result aggregation │
│  └──────┬──────┘                                        │
│         │                                               │
│    ┌────┴────┬─────────┐                               │
│    ▼         ▼         ▼                               │
│ ┌──────┐ ┌──────┐ ┌──────┐                           │
│ │ Agent│ │ Agent│ │ Agent│ ← Task execution          │
│ └───┬──┘ └───┬──┘ └───┬──┘                           │
│     │        │        │                               │
│     └────────┴────────┘                               │
│              │                                         │
└──────────────┼─────────────────────────────────────────┘
               ▼
         Task Queue
```

---

## Workflow Engine

### Workflow Structure

```typescript
interface Workflow {
  id: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  trigger: TriggerConfig;
}
```

### Node Types

| Type         | Purpose                     |
| ------------ | --------------------------- |
| Trigger      | Starts workflow execution   |
| Action       | Executes commands/API calls |
| Condition    | Branches based on logic     |
| Transform    | Data transformation         |
| Agent        | Multi-agent task            |
| Notification | Sends alerts                |
| Loop         | Iterates over data          |
| Parallel     | Concurrent execution        |

### Execution Flow

```
Start
  │
  ▼
Node 1 (Trigger)
  │
  ▼
Node 2 (Action)
  │
  ├─→ Condition A? → Node 3
  │
  └─→ Condition B? → Node 4
                │
                ▼
            Node 5 (End)
```

---

## Data Flow

### Message Processing Flow

```
1. User sends message via platform
   │
   ▼
2. Gateway receives and routes
   │
   ▼
3. Message validation
   │
   ▼
4. Conversation retrieval/creation
   │
   ▼
5. Agent processes with LLM
   │
   ├─→ Memory context lookup
   ├─→ Skill matching
   └─→ LLM completion
   │
   ▼
6. Response generation
   │
   ▼
7. Store in memory
   │
   ▼
8. Return via platform adapter
```

### Task Execution Flow

```
1. Task submitted (user/scheduler/workflow)
   │
   ▼
2. Priority assignment (urgent/normal/background)
   │
   ▼
3. Queue placement
   │
   ▼
4. Worker picks up task
   │
   ▼
5. Execution (shell/browser/sandbox/agent)
   │
   ▼
6. Result collection
   │
   ▼
7. Store in memory
   │
   ▼
8. Notify requester
```

---

## Security Model

### Defense Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Network                                            │
│  - Rate limiting                                             │
│  - Input validation                                          │
│  - CORS policies                                             │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Authentication                                     │
│  - API keys                                                  │
│  - OAuth (platform)                                          │
│  - Session management                                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Authorization                                      │
│  - Permission checking                                       │
│  - Resource access control                                   │
│  - Command allowlisting                                      │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Execution Isolation                                │
│  - Sandbox execution                                         │
│  - Timeout enforcement                                       │
│  - Resource limits                                           │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: Audit Logging                                      │
│  - All actions logged                                        │
│  - Sensitive data redaction                                  │
│  - Immutable records                                         │
└─────────────────────────────────────────────────────────────┘
```

### Audit Events

| Category          | Events Logged                    |
| ----------------- | -------------------------------- |
| Authentication    | Login attempts, API key usage    |
| Authorization     | Permission denials, role changes |
| Command Execution | Shell commands, results          |
| File Access       | Read, write, delete operations   |
| Browser Actions   | Navigation, interactions         |
| Agent Actions     | Task submissions, completions    |

---

## Configuration

### Config Hierarchy

1. **Environment Variables** (highest priority)
2. **.env file**
3. **SOUL.md** (personality)
4. **IDENTITY.md** (presentation)
5. **USER.md** (user preferences)

### Config Sections

```typescript
interface AppConfig {
  soul: SoulConfig; // Personality
  identity: IdentityConfig; // Presentation
  user: UserContext; // User preferences
  llm: LLMConfig; // LLM settings
  messaging: MessagingConfig; // Platform settings
  memory: MemoryConfig; // Storage settings
  security: SecurityConfig; // Security settings
}
```

---

## Performance Considerations

### Optimization Strategies

| Area      | Strategy                            |
| --------- | ----------------------------------- |
| LLM Calls | Caching, streaming, batching        |
| Database  | Connection pooling, indexes         |
| Queue     | Priority lanes, concurrency control |
| Memory    | Pruning, compression                |
| Network   | WebSocket persistence, heartbeats   |

### Scaling Recommendations

- **Horizontal**: Multiple instances behind load balancer
- **Redis**: For queue and session sharing
- **Database**: Connection pooling, read replicas
- **CDN**: For static assets

---

## Extensions Points

### Custom LLM Provider

```typescript
// src/core/llm/providers/custom.ts
class CustomProvider extends LLMProvider {
  complete(messages, options) {
    /* ... */
  }
  stream(messages, options) {
    /* ... */
  }
  isAvailable() {
    /* ... */
  }
}

// Register in createProvider()
```

### Custom Platform Adapter

```typescript
// src/gateway/adapters/custom.ts
class CustomAdapter implements PlatformAdapter {
  async sendMessage(chatId, content) {
    /* ... */
  }
  async getUpdates() {
    /* ... */
  }
}
```

### Custom Skill

```typescript
// skills/custom/my-skill/index.js
class MySkill {
  async execute(context) {
    return { success: true, output: 'Done' };
  }
}
```

---

## Conclusion

## Conclusion

Alpicia's architecture is designed for:

1. **Modularity**: Clear separation of concerns
2. **Extensibility**: Easy to add new features
3. **Security**: Defense in depth
4. **Performance**: Optimized for scale
5. **Maintainability**: Clean code structure

For more details, see:

- [API Documentation](API.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Research Document](OPENCLAW_RESEARCH.md)
