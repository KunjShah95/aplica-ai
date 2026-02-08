# Alpicia API Reference

Complete API documentation for Alpicia.

## Table of Contents

- [Gateway API](#gateway-api)
- [Agent API](#agent-api)
- [Memory API](#memory-api)
- [Execution API](#execution-api)
- [Skills API](#skills-api)
- [Workflow API](#workflow-api)
- [Scheduler API](#scheduler-api)
- [Multi-Agent API](#multi-agent-api)
- [OpenAI-Compatible API](#openai-compatible-api)

---

## Gateway API

### MessageRouter

**File**: `src/gateway/router.ts`

```typescript
import { MessageRouter } from './gateway/router.js';

const router = new MessageRouter(agent);

// Handle messages from different platforms
await router.handleFromTelegram(userId, message, conversationId?);
await router.handleFromDiscord(userId, message, conversationId?);
await router.handleFromWebSocket(userId, message, conversationId?);
await router.handleFromCLI(userId, message, conversationId?);

// Get router statistics
router.getStats();
```

### WebSocketGateway

**File**: `src/gateway/websocket.ts`

```typescript
import { WebSocketGateway } from './gateway/websocket.js';

const wsGateway = new WebSocketGateway(agent, router, { port: 3001 });

await wsGateway.start();

// Client management
wsGateway.broadcast('event', data);

// Get statistics
wsGateway.getStats();

await wsGateway.stop();
```

---

## Agent API

### Agent

**File**: `src/core/agent.ts`

```typescript
import { createAgent } from './core/agent.js';

const agent = createAgent(config, llmProvider);

// Process a message
const response = await agent.processMessage(
  content: string,           // Message content
  conversationId: string,    // Conversation context
  userId: string,            // User identifier
  source: 'telegram' | 'discord' | 'websocket' | 'cli'
);

// Start a new conversation
const { conversationId, response } = await agent.startConversation(
  userId: string,
  platform: 'telegram' | 'discord' | 'websocket' | 'cli',
  initialMessage?: string
);

// Get conversation history
const messages = await agent.getConversationHistory(conversationId);

// Check availability
const available = agent.isAvailable();

// Get configuration
const config = agent.getConfig();
```

### Execution Methods

```typescript
// Execute custom request
const result = await agent.execute({
  type: 'shell' | 'filesystem' | 'browser' | 'sandbox',
  operation: string,
  params: Record<string, unknown>
});

// Shell execution
const shellResult = await agent.executeShell(command, args?, options?);

// File operations
const fileContent = await agent.readFile(path);
const writeResult = await agent.writeFile(path, content);
const fileList = await agent.listDirectory(path);
const searchResults = await agent.searchFiles(pattern, options?);

// Browser operations
const navResult = await agent.navigateBrowser(url);
const clickResult = await agent.clickBrowser(selector);
const fillResult = await agent.fillBrowser(selector, value);
const screenshotResult = await agent.screenshotBrowser();

// Sandboxed code execution
const codeResult = await agent.runSandboxedCode(code, 'javascript', input?);

// Get execution context
const context = agent.getExecutionContext();
```

---

## Memory API

### MemoryManager

**File**: `src/memory/index.ts`

```typescript
import { memoryManager } from './memory/index.js';

// Save conversation
await memoryManager.saveConversation(
  conversationId: string,
  userId: string,
  messages: Array<{ role: string; content: string }>
);

// Save note
const note = await memoryManager.saveNote({
  title: string,
  content: string,
  tags: string[],
  category?: string
});

// Get note
const note = await memoryManager.getNote(fileName);

// List notes
const notes = await memoryManager.listNotes(category?);

// Search notes
const results = await memoryManager.searchNotes(query: string);

// Add daily log entry
const log = await memoryManager.addDailyLog({
  type: 'conversation' | 'task' | 'note' | 'insight',
  content: string,
  tags?: string[]
});

// Get daily logs
const logs = await memoryManager.getDailyLogs(days?);

// Search across all stores
const results = await memoryManager.search({
  query: string,
  store?: 'jsonl' | 'markdown' | 'sqlite',
  limit?: number,
  type?: string,
  tags?: string[]
});

// Remember information
const memories = await memoryManager.remember(query: string, options?);

// Get context for AI
const context = await memoryManager.getContext(
  userId: string,
  conversationId: string,
  maxTokens?: number
);

// Forget/delete memories
await memoryManager.forget(id: string, store?);

// Get statistics
const stats = await memoryManager.getStats();
```

---

## Execution API

### ShellExecutor

**File**: `src/execution/shell.ts`

```typescript
import { shellExecutor } from './execution/shell.js';

const result = await shellExecutor.execute({
  command: string,           // Command to execute
  args?: string[],           // Command arguments
  workingDirectory?: string, // Working directory
  environment?: Record<string, string>,
  timeout?: number,          // Timeout in ms (default 30000)
  maxOutput?: number         // Max output size (default 1MB)
});

// Result
{
  id: string,
  command: string,
  success: boolean,
  exitCode: number | null,
  stdout: string,
  stderr: string,
  duration: number,
  timestamp: Date
}

// Execute script
const scriptResult = await shellExecutor.executeScript(
  script: string,
  language: 'bash' | 'powershell' | 'cmd'
);

// Get status
const status = shellExecutor.getStatus();
```

### FileSystemExecutor

**File**: `src/execution/filesystem.ts`

```typescript
import { fileSystemExecutor } from './execution/filesystem.js';

// Read file
const readResult = await fileSystemExecutor.readFile(path: string);

// Write file
const writeResult = await fileSystemExecutor.writeFile(path: string, content: string);

// Append file
const appendResult = await fileSystemExecutor.appendFile(path: string, content: string);

// Delete file/directory
const deleteResult = await fileSystemExecutor.deleteFile(path: string);

// List directory
const listResult = await fileSystemExecutor.listDirectory(path: string);

// Search files
const searchResult = await fileSystemExecutor.search({
  pattern: string,
  recursive?: boolean,
  maxDepth?: number,
  fileTypes?: string[]
});

// Create directory
const mkdirResult = await fileSystemExecutor.createDirectory(path: string);

// Copy file
const copyResult = await fileSystemExecutor.copyFile(source: string, dest: string);

// Move file
const moveResult = await fileSystemExecutor.moveFile(source: string, dest: string);

// Get file info
const infoResult = await fileSystemExecutor.getFileInfo(path: string);
```

### BrowserExecutor

**File**: `src/execution/browser.ts`

```typescript
import { browserExecutor } from './execution/browser.js';

// Navigate
const navResult = await browserExecutor.navigate({
  url: string,
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit',
  timeout?: number
});

// Click
const clickResult = await browserExecutor.click(selector: string, options?);

// Fill form
const fillResult = await browserExecutor.fill(selector: string, value: string, options?);

// Type text
const typeResult = await browserExecutor.type(selector: string, text: string, options?);

// Get text
const textResult = await browserExecutor.getText(selector: string, options?);

// Get attribute
const attrResult = await browserExecutor.getAttribute(selector: string, attribute: string, options?);

// Screenshot
const screenshotResult = await browserExecutor.screenshot({
  fullPage?: boolean,
  clip?: { x, y, width, height },
  quality?: number,
  format?: 'png' | 'jpeg'
});

// Evaluate JavaScript
const evalResult = await browserExecutor.evaluate(script: string);

// Wait for selector
const waitResult = await browserExecutor.waitForSelector(selector: string, options?);

// Wait for timeout
await browserExecutor.waitForTimeout(milliseconds: number);

// Get page content
const content = await browserExecutor.getPageContent();

// Get page title
const title = await browserExecutor.getTitle();

// Get current URL
const url = await browserExecutor.getCurrentUrl();

// Close browser
await browserExecutor.close();
```

### SandboxExecutor

**File**: `src/execution/sandbox.ts`

```typescript
import { sandboxExecutor } from './execution/sandbox.js';

// Execute JavaScript
const jsResult = await sandboxExecutor.executeJavaScript(
  code: string,
  input?: Record<string, unknown>
);

// Execute TypeScript
const tsResult = await sandboxExecutor.executeTypeScript(
  code: string,
  input?: Record<string, unknown>
);

// Custom execution
const result = await sandboxExecutor.execute({
  code: string,
  language: 'javascript' | 'typescript',
  input?: Record<string, unknown>
});

// Get status
const status = sandboxExecutor.getStatus();
```

---

## Skills API

### SkillLoader

**File**: `src/skills/loader.ts`

```typescript
import { skillLoader, initializeSkills } from './skills/index.js';

// Initialize all skills
await initializeSkills();

// Get skill by name
const skill = skillLoader.getSkill(name: string);

// Get all skills
const allSkills = skillLoader.getAllSkills();

// Find skills by trigger
const matchingSkills = skillLoader.findSkillsByTrigger(message: string);

// Register skill
skillLoader.registerSkill(skill: Skill);

// Unregister skill
const removed = skillLoader.unregisterSkill(name: string);

// Reload skill
const reloaded = await skillLoader.reloadSkill(name: string);

// Get statistics
const stats = skillLoader.getStats();
```

---

## Workflow API

### WorkflowBuilder

**File**: `src/workflows/builder.ts`

```typescript
import { workflowBuilder } from './workflows/builder.js';

// Create workflow
const workflow = workflowBuilder.createWorkflow(
  name: string,
  description?: string
);

// Add node
const node = workflowBuilder.addNode(
  workflowId: string,
  type: NodeType,
  name: string,
  position: { x: number; y: number },
  config?: Record<string, unknown>
);

// Connect nodes
const edge = workflowBuilder.connect(
  workflowId: string,
  sourceNodeId: string,
  targetNodeId: string,
  label?: string,
  condition?: string
);

// Remove node
const removed = workflowBuilder.removeNode(workflowId: string, nodeId: string);

// Execute workflow
const execution = await workflowBuilder.execute(
  workflowId: string,
  inputs?: Record<string, unknown>
);

// Get workflow
const workflow = workflowBuilder.getWorkflow(workflowId: string);

// Get all workflows
const allWorkflows = workflowBuilder.getAllWorkflows();

// Get execution
const execution = workflowBuilder.getExecution(executionId: string);

// Get workflow executions
const executions = workflowBuilder.getWorkflowExecutions(workflowId: string);

// Delete workflow
const deleted = workflowBuilder.deleteWorkflow(workflowId: string);

// Export workflow
const json = workflowBuilder.exportWorkflow(workflowId: string);

// Import workflow
const imported = workflowBuilder.importWorkflow(json: string);

// Get statistics
const stats = workflowBuilder.getStats();
```

---

## Scheduler API

### TaskScheduler

**File**: `src/scheduler/index.ts`

```typescript
import { taskScheduler } from './scheduler/index.js';

// Add task
const task = taskScheduler.addTask({
  name: string,
  type: 'cron' | 'interval' | 'once' | 'manual',
  schedule: string | CronSchedule | number,
  task: {
    type: string,
    payload: Record<string, unknown>
  },
  enabled?: boolean,
  metadata?: Record<string, unknown>
});

// Remove task
const removed = taskScheduler.removeTask(taskId: string);

// Update task
const updated = taskScheduler.updateTask(taskId: string, updates: Partial<ScheduledTask>);

// Enable task
const enabled = taskScheduler.enableTask(taskId: string);

// Disable task
const disabled = taskScheduler.disableTask(taskId: string);

// Get task
const task = taskScheduler.getTask(taskId: string);

// Get all tasks
const allTasks = taskScheduler.getAllTasks();

// Get enabled tasks
const enabledTasks = taskScheduler.getEnabledTasks();

// Get statistics
const stats = taskScheduler.getStats();

// Stop scheduler
await taskScheduler.stop();
```

### Cron Schedule Format

```typescript
interface CronSchedule {
  second?: CronField; // 0-59, *, */n, n-m, n,m
  minute?: CronField; // 0-59, *, */n, n-m, n,m
  hour?: CronField; // 0-23, *, */n, n-m, n,m
  dayOfMonth?: CronField; // 1-31, *, */n, n-m, n,m
  month?: CronField; // 1-12, *, */n, n-m, n,m
  dayOfWeek?: CronField; // 0-6, *, */n, n-m, n,m
}
```

---

## Multi-Agent API

### AgentSwarm

**File**: `src/agents/swarm.ts`

```typescript
import { agentSwarm } from './agents/index.js';

// Register agent
agentSwarm.registerAgent({
  id: string,
  name: string,
  role: 'coordinator' | 'researcher' | 'executor' | 'analyst' | 'creative',
  capabilities: string[],
  maxTasks?: number,
  priority?: number
});

// Unregister agent
const removed = agentSwarm.unregisterAgent(agentId: string);

// Submit task
const task = await agentSwarm.submitTask({
  type: string,
  payload: Record<string, unknown>,
  priority?: number,
  dependencies?: string[]
});

// Complete task
await agentSwarm.completeTask(taskId: string, result: unknown);

// Fail task
await agentSwarm.failTask(taskId: string, error: string);

// Broadcast message
await agentSwarm.broadcast(type: 'task' | 'result' | 'query' | 'response' | 'status', payload: unknown, exclude?: string[]);

// Create task workflow
const taskIds = await agentSwarm.createTaskWorkflow(
  name: string,
  steps: Array<{
    type: string,
    dependsOn?: string[],
    payload: Record<string, unknown>
  }>
);

// Get agent
const agent = agentSwarm.getAgent(agentId: string);

// Get all agents
const allAgents = agentSwarm.getAllAgents();

// Get task
const task = agentSwarm.getTask(taskId: string);

// Get all tasks
const allTasks = agentSwarm.getAllTasks();

// Get pending tasks
const pending = agentSwarm.getPendingTasks();

// Get statistics
const stats = agentSwarm.getStats();
```

---

## OpenAI-Compatible API

### OpenAIEndpoint

**File**: `src/api/openai.ts`

```typescript
import { OpenAIEndpoint } from './api/openai.js';

const openaiApi = new OpenAIEndpoint(agent, router, {
  port?: number,           // Default 3002
  apiKey?: string,         // API key for authentication
  authToken?: string       // Auth token
});

await openaiApi.start();
await openaiApi.stop();
```

### API Endpoints

#### Chat Completions

```bash
POST http://localhost:3002/v1/chat/completions
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "model": "alpicia-claude",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "max_tokens": 1000,
  "temperature": 0.7,
  "stream": false
}
```

**Response:**

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1704067200,
  "model": "alpicia-claude",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  }
}
```

#### List Models

```bash
GET http://localhost:3002/v1/models
Authorization: Bearer YOUR_API_KEY
```

**Response:**

```json
{
  "object": "list",
  "data": [
    { "id": "alpicia-claude", "object": "model" },
    { "id": "alpicia-sonnet", "object": "model" },
    { "id": "alpicia-haiku", "object": "model" }
  ]
}
```

#### Health Check

```bash
GET http://localhost:3002/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-02-02T12:00:00.000Z",
  "model": "claude-sonnet-4-20250514"
}
```

---

## Security API

### AuditLogger

**File**: `src/security/audit.ts`

```typescript
import { auditLogger } from './security/audit.js';

// Log command execution
await auditLogger.logCommandExecution(
  userId: string,
  sessionId: string,
  command: string,
  args: string[],
  result: 'success' | 'failure',
  output?: string
);

// Log file access
await auditLogger.logFileAccess(
  userId: string,
  sessionId: string,
  filePath: string,
  operation: 'read' | 'write' | 'delete' | 'list',
  result: 'success' | 'failure'
);

// Log browser action
await auditLogger.logBrowserAction(
  userId: string,
  sessionId: string,
  url: string,
  action: string,
  result: 'success' | 'failure'
);

// Log authentication
await auditLogger.logAuthentication(
  userId: string,
  sessionId: string,
  method: string,
  result: 'success' | 'failure',
  ipAddress?: string
);

// Log authorization
await auditLogger.logAuthorization(
  userId: string,
  sessionId: string,
  resource: string,
  action: string,
  result: 'success' | 'failure'
);

// Log tool call
await auditLogger.logToolCall(
  userId: string,
  sessionId: string,
  toolName: string,
  parameters: Record<string, unknown>,
  result: 'success' | 'failure'
);

// Log error
await auditLogger.logError(
  userId: string,
  sessionId: string,
  error: Error,
  context?: Record<string, unknown>
);

// Custom log entry
const event = auditLogger.log({
  type: 'custom',
  severity: 'medium',
  userId: string,
  sessionId: string,
  source: 'custom',
  action: 'custom_action',
  result: 'success'
});

// Search logs
const events = await auditLogger.search({
  userId?: string,
  type?: AuditEventType,
  severity?: 'low' | 'medium' | 'high' | 'critical',
  result?: 'success' | 'failure',
  startDate?: Date,
  endDate?: Date,
  limit?: number
});

// Get statistics
const stats = await auditLogger.getStats();

// Export logs
const json = await auditLogger.export('json', query?);
const csv = await auditLogger.export('csv', query?);

// Cleanup old logs
await auditLogger.cleanup();

// Close logger
await auditLogger.close();
```

---

## Configuration API

### ConfigLoader

**File**: `src/config/loader.ts`

```typescript
import { configLoader } from './config/loader.js';

// Load configuration
const config = await configLoader.load();

// Get config (cached)
const cached = configLoader.getConfig();
```
