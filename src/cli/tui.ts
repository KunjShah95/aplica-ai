#!/usr/bin/env node
/**
 * Aplica-AI Full TUI
 * A rich terminal UI inspired by opencode / claude-code
 * 7 panels: Terminal, Agents, Skills, AutoResearch, Symphony, Memory, Monitor
 * Right panel: task queue, context vars, per-agent token costs
 */
import * as os from 'os';
import chalk from 'chalk';
import { randomUUID } from 'crypto';

// ─── ANSI / Terminal utilities ────────────────────────────────────────────────
const ESC = '\x1B';
const CSI = `${ESC}[`;
const HIDE_CURSOR = `${CSI}?25l`;
const SHOW_CURSOR = `${CSI}?25h`;
const CLEAR_SCREEN = `${CSI}2J`;
const HOME = `${CSI}H`;
const ALT_ON = `${CSI}?1049h`;
const ALT_OFF = `${CSI}?1049l`;

// Box drawing characters
const B = {
  TL: '╭', TR: '╮', BL: '╰', BR: '╯',
  H: '─', V: '│', HL: '━',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type PanelId = 'terminal' | 'agents' | 'skills' | 'research' | 'symphony' | 'memory' | 'monitor';

interface AgentCard {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'thinking' | 'executing' | 'error';
  tokensUsed: number;
  tokensPerMin: number;
  latencyMs: number;
  progress: number;
  task: string;
}

interface Skill {
  id: string;
  name: string;
  version: string;
  state: 'installed' | 'available' | 'remote';
  triggers: string[];
  description: string;
  manifest: string;
}

interface Experiment {
  id: number;
  name: string;
  score: number;
  delta: number;
  status: 'completed' | 'running' | 'pending' | 'discarded';
  commitHash?: string;
}

interface SymphonyRun {
  id: string;
  branch: string;
  status: 'awaiting-review' | 'accepted' | 'rejected' | 'running';
  diff: string[];
  summary: string;
}

interface MemoryEntry {
  id: string;
  type: 'episodic' | 'semantic' | 'procedural' | 'preference';
  content: string;
  score: number;
  timestamp: string;
}

interface ToolCall {
  time: string;
  agent: string;
  tool: string;
  args: string;
  result?: string;
}

interface TaskItem {
  id: string;
  priority: 1 | 2 | 3;
  label: string;
  status: 'queued' | 'running' | 'done';
}

interface TermLine {
  text: string;
  color: 'cyan' | 'white' | 'green' | 'yellow' | 'red' | 'gray';
}

// ─── Initial data factories ───────────────────────────────────────────────────
function mkAgents(): AgentCard[] {
  return [
    { id: 'research-01', name: 'research-01', role: 'Research', status: 'idle', tokensUsed: 1240, tokensPerMin: 0, latencyMs: 0, progress: 0, task: 'Awaiting task' },
    { id: 'symphony-main', name: 'symphony-main', role: 'Symphony', status: 'idle', tokensUsed: 3820, tokensPerMin: 0, latencyMs: 0, progress: 0, task: 'Ready' },
    { id: 'browser-01', name: 'browser-01', role: 'Browser', status: 'idle', tokensUsed: 890, tokensPerMin: 0, latencyMs: 0, progress: 0, task: 'Idle' },
    { id: 'email', name: 'email', role: 'Email', status: 'idle', tokensUsed: 210, tokensPerMin: 0, latencyMs: 0, progress: 0, task: 'Monitoring inbox' },
    { id: 'calendar', name: 'calendar', role: 'Calendar', status: 'idle', tokensUsed: 150, tokensPerMin: 0, latencyMs: 0, progress: 0, task: 'Next: standup 10:00' },
    { id: 'voice-stt', name: 'voice-stt', role: 'Voice/STT', status: 'idle', tokensUsed: 420, tokensPerMin: 0, latencyMs: 0, progress: 0, task: 'Listening off' },
    { id: 'rag-retriever', name: 'rag-retriever', role: 'RAG', status: 'idle', tokensUsed: 760, tokensPerMin: 0, latencyMs: 0, progress: 0, task: 'Index ready' },
  ];
}

function mkSkills(): Skill[] {
  return [
    {
      id: 'web-search', name: 'web-search', version: '1.2.0', state: 'installed',
      triggers: ['search for', 'look up', 'find online'],
      description: 'Full-text web search via Brave/Bing',
      manifest: '# web-search\n\nVersion: 1.2.0\n\n## Description\nFull-text web search.\n\n## Triggers\n- search for\n- look up\n\n## Install\n```\nskill install web-search\n```',
    },
    {
      id: 'code-exec', name: 'code-exec', version: '2.0.1', state: 'installed',
      triggers: ['run code', 'execute', 'eval'],
      description: 'Sandboxed code execution in Python, JS, Bash',
      manifest: '# code-exec\n\nVersion: 2.0.1\n\n## Description\nSandboxed code execution.\n\n## Triggers\n- run code\n- execute\n- eval',
    },
    {
      id: 'browser-auto', name: 'browser-auto', version: '1.5.0', state: 'installed',
      triggers: ['open url', 'click', 'screenshot'],
      description: 'Playwright browser automation',
      manifest: '# browser-auto\n\nVersion: 1.5.0\n\n## Description\nPlaywright browser automation.',
    },
    {
      id: 'email-compose', name: 'email-compose', version: '1.0.3', state: 'installed',
      triggers: ['send email', 'compose', 'draft'],
      description: 'Email composition and sending',
      manifest: '# email-compose\n\nVersion: 1.0.3',
    },
    {
      id: 'calendar-sync', name: 'calendar-sync', version: '1.1.0', state: 'installed',
      triggers: ['schedule', 'book meeting', 'check calendar'],
      description: 'Google Calendar sync',
      manifest: '# calendar-sync\n\nVersion: 1.1.0',
    },
    {
      id: 'memory-search', name: 'memory-search', version: '3.0.0', state: 'installed',
      triggers: ['remember when', 'recall', 'what did I'],
      description: 'Semantic memory retrieval',
      manifest: '# memory-search\n\nVersion: 3.0.0',
    },
    {
      id: 'rag-ingest', name: 'rag-ingest', version: '2.1.0', state: 'installed',
      triggers: ['index', 'ingest', 'add to knowledge'],
      description: 'Document ingestion for RAG',
      manifest: '# rag-ingest\n\nVersion: 2.1.0',
    },
    {
      id: 'voice-transcribe', name: 'voice-transcribe', version: '1.0.0', state: 'available',
      triggers: ['transcribe', 'speech to text'],
      description: 'Voice transcription via Sarvam/Whisper',
      manifest: '# voice-transcribe\n\nVersion: 1.0.0',
    },
    {
      id: 'notion-sync', name: 'notion-sync', version: '1.3.0', state: 'available',
      triggers: ['sync notion', 'create page', 'update notion'],
      description: 'Notion workspace sync',
      manifest: '# notion-sync\n\nVersion: 1.3.0',
    },
    {
      id: 'github-ops', name: 'github-ops', version: '2.2.0', state: 'available',
      triggers: ['create PR', 'open issue', 'commit'],
      description: 'GitHub operations via Octokit',
      manifest: '# github-ops\n\nVersion: 2.2.0',
    },
    {
      id: 'slack-post', name: 'slack-post', version: '1.0.0', state: 'remote',
      triggers: ['post to slack', 'notify team'],
      description: 'Slack message posting',
      manifest: '# slack-post\n\nVersion: 1.0.0',
    },
    {
      id: 'discord-bot', name: 'discord-bot', version: '1.2.0', state: 'remote',
      triggers: ['send discord', 'discord message'],
      description: 'Discord bot integration',
      manifest: '# discord-bot\n\nVersion: 1.2.0',
    },
    {
      id: 'image-gen', name: 'image-gen', version: '0.9.0', state: 'remote',
      triggers: ['generate image', 'create image', 'dall-e'],
      description: 'Image generation via DALL-E/SD',
      manifest: '# image-gen\n\nVersion: 0.9.0',
    },
    {
      id: 'pdf-reader', name: 'pdf-reader', version: '1.1.0', state: 'remote',
      triggers: ['read pdf', 'extract pdf', 'parse document'],
      description: 'PDF text extraction',
      manifest: '# pdf-reader\n\nVersion: 1.1.0',
    },
  ];
}

function mkExperiments(): Experiment[] {
  return [
    { id: 1, name: 'Baseline RAG pipeline', score: 0.72, delta: 0, status: 'completed', commitHash: 'a1b2c3d' },
    { id: 2, name: 'Add semantic chunking', score: 0.76, delta: +0.04, status: 'completed', commitHash: 'e4f5g6h' },
    { id: 3, name: 'Hybrid BM25+vector search', score: 0.81, delta: +0.05, status: 'completed', commitHash: 'i7j8k9l' },
    { id: 4, name: 'Reranker with cross-encoder', score: 0.84, delta: +0.03, status: 'completed', commitHash: 'm1n2o3p' },
    { id: 5, name: 'Context compression (LLMLingua)', score: 0.83, delta: -0.01, status: 'discarded' },
    { id: 6, name: 'MMR diversity sampling', score: 0.86, delta: +0.02, status: 'completed', commitHash: 'q4r5s6t' },
    { id: 7, name: 'Query expansion via HyDE', score: 0.89, delta: +0.03, status: 'completed', commitHash: 'u7v8w9x' },
    { id: 8, name: 'Adaptive retrieval depth', score: 0, delta: 0, status: 'running' },
  ];
}

function mkSymphonyRuns(): SymphonyRun[] {
  return [
    {
      id: 'run-001', branch: 'feat/adaptive-retrieval',
      status: 'awaiting-review',
      summary: 'Implements adaptive retrieval depth based on query complexity',
      diff: [
        '  async retrieveContext(query: string, opts: RetrieveOpts) {',
        '-   const topK = 5;',
        '+   const complexity = await this.scorer.score(query);',
        '+   const topK = complexity > 0.7 ? 10 : complexity > 0.4 ? 7 : 5;',
        '    return this.vectorStore.query(query, topK);',
        '  }',
      ],
    },
    {
      id: 'run-002', branch: 'fix/memory-leak',
      status: 'accepted',
      summary: 'Fix memory leak in embedding cache',
      diff: [
        '  private cache = new Map<string, number[]>();',
        '+',
        '+ private readonly MAX_CACHE = 1000;',
        '+',
        '  embed(text: string) {',
        '-   if (this.cache.has(text)) return this.cache.get(text)!;',
        '+   if (this.cache.size > this.MAX_CACHE) this.cache.clear();',
        '+   if (this.cache.has(text)) return this.cache.get(text)!;',
        '    const vec = this.model.encode(text);',
      ],
    },
    {
      id: 'run-003', branch: 'refactor/agent-routing',
      status: 'running',
      summary: 'Refactor agent routing logic for better performance',
      diff: [],
    },
  ];
}

function mkMemoryEntries(): MemoryEntry[] {
  return [
    { id: 'm1', type: 'episodic', content: 'User asked about RAG pipeline optimization on 2025-03-10', score: 0.97, timestamp: '2025-03-10' },
    { id: 'm2', type: 'semantic', content: 'LLMLingua compression reduces context by 40% with minimal quality loss', score: 0.91, timestamp: '2025-03-11' },
    { id: 'm3', type: 'procedural', content: 'Deploy process: npm run build && docker build && push to registry', score: 0.88, timestamp: '2025-03-12' },
    { id: 'm4', type: 'preference', content: 'User prefers TypeScript over JavaScript for new files', score: 0.99, timestamp: '2025-03-13' },
    { id: 'm5', type: 'episodic', content: 'Discussed vector database options: Pinecone vs Weaviate vs Qdrant', score: 0.85, timestamp: '2025-03-14' },
    { id: 'm6', type: 'semantic', content: 'Cross-encoder reranking improves precision@5 by 15-20%', score: 0.89, timestamp: '2025-03-14' },
    { id: 'm7', type: 'preference', content: 'User prefers streaming responses for long outputs', score: 0.96, timestamp: '2025-03-15' },
    { id: 'm8', type: 'procedural', content: 'Git commit convention: feat/fix/refactor/docs/test prefix', score: 0.92, timestamp: '2025-03-15' },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function stripAnsi(s: string): string {
  return s.replace(/\x1B\[[\d;]*[A-Za-z]/g, '').replace(/\x1B\][\d;]*\x07/g, '');
}

function pad(line: string, w: number): string {
  const visible = stripAnsi(line).length;
  if (visible >= w) return line;
  return line + ' '.repeat(w - visible);
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderMd(text: string, width: number): string[] {
  const lines: string[] = [];
  const raw = text.split('\n');
  let inCodeBlock = false;
  const codeLines: string[] = [];

  for (const line of raw) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        const bw = Math.min(width - 4, 56);
        lines.push(chalk.gray('  ' + B.TL + B.H.repeat(bw) + B.TR));
        for (const cl of codeLines) {
          const padded = cl.padEnd(bw).slice(0, bw);
          lines.push(chalk.gray('  ' + B.V) + chalk.cyan(' ' + padded) + chalk.gray(' ' + B.V));
        }
        lines.push(chalk.gray('  ' + B.BL + B.H.repeat(bw) + B.BR));
        codeLines.length = 0;
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }

    if (line.startsWith('# ')) {
      lines.push(chalk.bold.cyan('  ' + line.slice(2)));
      lines.push(chalk.cyan('  ' + B.H.repeat(Math.min(line.length - 2, width - 4))));
    } else if (line.startsWith('## ')) {
      lines.push(chalk.bold.white('  ' + line.slice(3)));
    } else if (line.startsWith('### ')) {
      lines.push(chalk.bold.gray('  ' + line.slice(4)));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      lines.push('  ' + chalk.cyan('•') + ' ' + inlineMd(line.slice(2)));
    } else if (line.startsWith('> ')) {
      lines.push(chalk.gray('  ┃ ' + line.slice(2)));
    } else if (line === '') {
      lines.push('');
    } else {
      lines.push('  ' + inlineMd(line));
    }
  }
  return lines;
}

function inlineMd(text: string): string {
  text = text.replace(/\*\*(.*?)\*\*/g, (_m, g: string) => chalk.bold(g));
  text = text.replace(/\*(.*?)\*/g, (_m, g: string) => chalk.italic(g));
  text = text.replace(/`(.*?)`/g, (_m, g: string) => chalk.bgBlack.cyan(` ${g} `));
  return text;
}

// ─── TUI ─────────────────────────────────────────────────────────────────────
class ApplicaTUI {
  private w: number;
  private h: number;
  private panel: PanelId = 'terminal';
  private frames = 0;
  private running = true;
  private readonly refreshRate = 100;

  // Terminal panel
  private termHistory: string[] = [];
  private termOutput: TermLine[] = [];
  private historyIdx = -1;

  // Input
  private input = '';
  private cursor = 0;
  private tabIdx = -1;

  // Panel data
  private agents: AgentCard[] = mkAgents();
  private skills: Skill[] = mkSkills();
  private selectedSkill = 0;
  private experiments: Experiment[] = mkExperiments();
  private researchIntent = [
    '# Research Intent',
    '',
    'Goal: Improve RAG retrieval quality for long-context documents.',
    '',
    'Hypothesis: Adaptive retrieval depth based on query complexity',
    'will improve precision@5 by 5-10% without increasing latency.',
    '',
    'Success metric: precision@5 >= 0.90, p99 latency < 200ms',
  ].join('\n');
  private symphonyRuns: SymphonyRun[] = mkSymphonyRuns();
  private selectedRun = 0;
  private memoryEntries: MemoryEntry[] = mkMemoryEntries();
  private memorySearch = '';
  private toolCalls: ToolCall[] = [];
  private tokenHistory: number[] = new Array(40).fill(0);
  private latencyHistory: number[] = new Array(40).fill(0);
  private errorHistory: number[] = new Array(40).fill(0);
  private costHistory: number[] = new Array(40).fill(0);

  // Right panel
  private tasks: TaskItem[] = [
    { id: 't1', priority: 1, label: 'Optimize RAG retrieval', status: 'running' },
    { id: 't2', priority: 1, label: 'Review symphony diff', status: 'queued' },
    { id: 't3', priority: 2, label: 'Update SKILL.md manifests', status: 'queued' },
    { id: 't4', priority: 3, label: 'Memory consolidation', status: 'queued' },
    { id: 't5', priority: 3, label: 'Cost report generation', status: 'queued' },
  ];

  private contextVars: Record<string, string> = {
    USER: 'developer',
    PROJECT: 'aplica-ai',
    MODEL: 'claude-3-5-sonnet',
    ENV: 'development',
    SESSION: randomUUID().slice(0, 8),
  };

  private activityTick = 0;

  constructor() {
    this.w = process.stdout.columns || 120;
    this.h = process.stdout.rows || 30;
    process.stdout.on('resize', () => {
      this.w = process.stdout.columns || 120;
      this.h = process.stdout.rows || 30;
    });
  }

  // ─── Input handling ──────────────────────────────────────────────────────────
  private setupInput() {
    if (!process.stdin.isTTY) return;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key: string) => this.onKey(key));
  }

  private readonly PANEL_KEYS: Record<string, PanelId> = {
    '1': 'terminal', '2': 'agents', '3': 'skills',
    '4': 'research', '5': 'symphony', '6': 'memory', '7': 'monitor',
  };

  private onKey(key: string): void {
    if (key === '\x03' || key === '\x11') { this.stop(); return; }
    if (key === '\x1B[A') { this.historyUp(); return; }
    if (key === '\x1B[B') { this.historyDown(); return; }
    if (key === '\x1B[C') { if (this.cursor < this.input.length) this.cursor++; return; }
    if (key === '\x1B[D') { if (this.cursor > 0) this.cursor--; return; }
    if (key === '\t') { this.doAutocomplete(); return; }
    if (key === '\r' || key === '\n') { this.submitInput(); return; }
    if (key === '\x7F' || key === '\x08') {
      if (this.cursor > 0) {
        this.input = this.input.slice(0, this.cursor - 1) + this.input.slice(this.cursor);
        this.cursor--;
      }
      this.tabIdx = -1;
      return;
    }
    if (this.PANEL_KEYS[key] && this.input === '') {
      this.panel = this.PANEL_KEYS[key];
      return;
    }
    const code = Buffer.from(key).toString('hex');
    if (code.length === 2 && parseInt(code, 16) < 32) return;
    this.input = this.input.slice(0, this.cursor) + key + this.input.slice(this.cursor);
    this.cursor++;
    this.tabIdx = -1;
  }

  private historyUp(): void {
    if (this.termHistory.length === 0) return;
    if (this.historyIdx < this.termHistory.length - 1) this.historyIdx++;
    this.input = this.termHistory[this.termHistory.length - 1 - this.historyIdx];
    this.cursor = this.input.length;
  }

  private historyDown(): void {
    if (this.historyIdx <= 0) { this.historyIdx = -1; this.input = ''; this.cursor = 0; return; }
    this.historyIdx--;
    this.input = this.termHistory[this.termHistory.length - 1 - this.historyIdx];
    this.cursor = this.input.length;
  }

  private readonly COMPLETIONS = [
    'help', 'agent list', 'skill list', 'skill search ', 'skill install ',
    'research start', 'research status', 'symphony new', 'symphony review',
    'memory search ', 'memory stats', 'cost today', 'clear', 'exit',
  ];

  private doAutocomplete(): void {
    const matches = this.COMPLETIONS.filter(c => c.startsWith(this.input));
    if (matches.length === 0) return;
    this.tabIdx = (this.tabIdx + 1) % matches.length;
    this.input = matches[this.tabIdx];
    this.cursor = this.input.length;
  }

  private submitInput(): void {
    const raw = this.input.trim();
    if (!raw) return;
    this.termHistory.push(raw);
    this.historyIdx = -1;
    this.tabIdx = -1;
    this.input = '';
    this.cursor = 0;
    this.handleCommand(raw);
  }

  // ─── Commands ────────────────────────────────────────────────────────────────
  private print(text: string, color: TermLine['color'] = 'white'): void {
    for (const line of text.split('\n')) {
      this.termOutput.push({ text: line, color });
    }
    if (this.termOutput.length > 500) this.termOutput.splice(0, this.termOutput.length - 500);
  }

  private handleCommand(raw: string): void {
    const parts = raw.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    this.print(`> ${raw}`, 'cyan');
    switch (cmd) {
      case 'help': this.print(HELP_TEXT, 'gray'); break;
      case 'agent': this.cmdAgent(args); break;
      case 'skill': this.cmdSkill(args); break;
      case 'research': this.cmdResearch(args); break;
      case 'symphony': this.cmdSymphony(args); break;
      case 'memory': this.cmdMemory(args); break;
      case 'cost': this.cmdCost(args); break;
      case 'clear': this.termOutput = []; break;
      case 'exit': case 'quit': this.stop(); break;
      default: this.dispatchToAgent(raw);
    }
  }

  private cmdAgent(args: string[]): void {
    if (args[0] === 'list') {
      this.print('Registered agents:', 'green');
      for (const a of this.agents) {
        this.print(`  ${a.id.padEnd(20)} [${a.status.toUpperCase()}]  ${a.task}`, 'white');
      }
    } else {
      this.print('Usage: agent list', 'yellow');
    }
  }

  private cmdSkill(args: string[]): void {
    const sub = args[0];
    if (sub === 'list') {
      this.print('Available skills:', 'green');
      for (const s of this.skills) {
        const badge = s.state === 'installed' ? '●' : s.state === 'available' ? '○' : '◌';
        this.print(`  ${badge} ${s.name.padEnd(20)} v${s.version}  ${s.description}`, 'white');
      }
    } else if (sub === 'search') {
      const q = args.slice(1).join(' ').toLowerCase();
      const found = this.skills.filter(s => s.name.includes(q) || s.description.toLowerCase().includes(q));
      this.print(`Search results for "${q}":`, 'green');
      for (const s of found) this.print(`  ${s.name} — ${s.description}`, 'white');
    } else if (sub === 'install') {
      const sk = this.skills.find(s => s.id === args[1]);
      if (!sk) { this.print(`Skill not found: ${args[1]}`, 'red'); return; }
      if (sk.state === 'installed') { this.print(`Already installed: ${args[1]}`, 'yellow'); return; }
      sk.state = 'installed';
      this.print(`Installed skill: ${args[1]}`, 'green');
    } else {
      this.print('Usage: skill list | skill search <q> | skill install <name>', 'yellow');
    }
  }

  private cmdResearch(args: string[]): void {
    if (args[0] === 'start') {
      const running = this.experiments.find(e => e.status === 'running');
      if (running) { this.print(`Already running experiment #${running.id}`, 'yellow'); return; }
      const next = this.experiments.find(e => e.status === 'pending');
      if (next) { next.status = 'running'; this.print(`Started experiment #${next.id}: ${next.name}`, 'green'); }
      else { this.print('No pending experiments. Panel 4 to add one.', 'yellow'); }
    } else if (args[0] === 'status') {
      const running = this.experiments.filter(e => e.status === 'running');
      if (running.length === 0) { this.print('No experiments running.', 'gray'); return; }
      for (const e of running) this.print(`  #${e.id} ${e.name} — RUNNING`, 'yellow');
    } else {
      this.print('Usage: research start | research status', 'yellow');
    }
  }

  private cmdSymphony(args: string[]): void {
    if (args[0] === 'new') {
      const id = `run-${String(this.symphonyRuns.length + 1).padStart(3, '0')}`;
      this.symphonyRuns.push({ id, branch: `feat/new-${id}`, status: 'running', summary: 'New symphony run', diff: [] });
      this.print(`Created symphony run: ${id}`, 'green');
    } else if (args[0] === 'review') {
      const awaiting = this.symphonyRuns.filter(r => r.status === 'awaiting-review');
      if (awaiting.length === 0) { this.print('No runs awaiting review.', 'gray'); return; }
      this.print(`Awaiting review: ${awaiting.map(r => r.id).join(', ')}`, 'yellow');
      this.print('Switch to Symphony panel (key 5) to review diffs.', 'gray');
    } else {
      this.print('Usage: symphony new | symphony review', 'yellow');
    }
  }

  private cmdMemory(args: string[]): void {
    if (args[0] === 'search') {
      const q = args.slice(1).join(' ').toLowerCase();
      this.memorySearch = q;
      const found = this.memoryEntries.filter(e => e.content.toLowerCase().includes(q));
      this.print(`Memory search "${q}": ${found.length} result(s)`, 'green');
      for (const e of found) this.print(`  [${e.type}] (${e.score.toFixed(2)}) ${e.content.slice(0, 80)}`, 'white');
    } else if (args[0] === 'stats') {
      const c = { episodic: 0, semantic: 0, procedural: 0, preference: 0 };
      for (const e of this.memoryEntries) c[e.type]++;
      this.print('Memory statistics:', 'green');
      this.print(`  Episodic: ${c.episodic}  Semantic: ${c.semantic}  Procedural: ${c.procedural}  Prefs: ${c.preference}`, 'white');
    } else {
      this.print('Usage: memory search <q> | memory stats', 'yellow');
    }
  }

  private cmdCost(args: string[]): void {
    if (args[0] === 'today') {
      const total = this.agents.reduce((s, a) => s + a.tokensUsed, 0);
      const cost = (total / 1000) * 0.003;
      this.print(`Today: $${cost.toFixed(4)} (${total.toLocaleString()} tokens)`, 'green');
      for (const a of this.agents) {
        const c = (a.tokensUsed / 1000) * 0.003;
        this.print(`  ${a.id.padEnd(20)} ${a.tokensUsed.toString().padStart(6)} tok  $${c.toFixed(4)}`, 'white');
      }
    } else {
      this.print('Usage: cost today', 'yellow');
    }
  }

  private dispatchToAgent(text: string): void {
    const agent = this.agents.find(a => a.id === 'research-01');
    if (agent) { agent.status = 'thinking'; agent.task = text.slice(0, 40); agent.progress = 10; }
    this.print(`Dispatching to agent: ${text}`, 'gray');
    const self = this;
    setTimeout(() => {
      if (agent) { agent.status = 'idle'; agent.task = 'Done'; agent.progress = 0; }
      self.print('Agent response: I received your message. In production the AI agent would process your request.', 'green');
      self.toolCalls.unshift({
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        agent: 'research-01', tool: 'think', args: text.slice(0, 30), result: 'ok',
      });
      if (self.toolCalls.length > 50) self.toolCalls.pop();
    }, 1200);
  }

  // ─── Simulation ticks ────────────────────────────────────────────────────────
  private tick(): void {
    this.frames++;
    this.activityTick++;

    this.tokenHistory.push(Math.floor(Math.random() * 120 + 20));
    this.tokenHistory.shift();
    this.latencyHistory.push(Math.floor(Math.random() * 60 + 30));
    this.latencyHistory.shift();
    this.errorHistory.push(Math.random() < 0.05 ? 100 : 0);
    this.errorHistory.shift();
    this.costHistory.push(Math.random() * 100);
    this.costHistory.shift();

    if (this.activityTick % 30 === 0) {
      const activities: [string, string, string][] = [
        ['browser-01', 'browser.navigate', 'https://arxiv.org/'],
        ['rag-retriever', 'vector.query', 'RAG optimization'],
        ['email', 'mail.check', 'inbox'],
        ['calendar', 'calendar.list', 'today'],
        ['symphony-main', 'git.diff', 'HEAD'],
        ['research-01', 'web.search', 'cross-encoder papers'],
        ['voice-stt', 'audio.listen', 'mic'],
      ];
      const [ag, tool, args] = activities[Math.floor(Math.random() * activities.length)];
      this.toolCalls.unshift({
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        agent: ag, tool, args, result: 'ok',
      });
      if (this.toolCalls.length > 50) this.toolCalls.pop();
      for (const a of this.agents) {
        a.tokensUsed += Math.floor(Math.random() * 20);
        a.tokensPerMin = Math.floor(Math.random() * 80 + 10);
        a.latencyMs = Math.floor(Math.random() * 150 + 30);
      }
    }

    if (this.activityTick % 150 === 0) {
      const running = this.experiments.find(e => e.status === 'running');
      if (running) {
        running.status = 'completed';
        running.score = Math.round((0.88 + Math.random() * 0.05) * 100) / 100;
        running.delta = Math.round((Math.random() * 0.04 - 0.01) * 100) / 100;
        running.commitHash = randomUUID().slice(0, 7);
        this.print(`Experiment #${running.id} complete! score=${running.score} delta=${running.delta >= 0 ? '+' : ''}${running.delta}`, 'green');
      }
    }
  }

  // ─── Entry point ─────────────────────────────────────────────────────────────
  async start(): Promise<void> {
    process.stdout.write(ALT_ON + CLEAR_SCREEN + HIDE_CURSOR);
    this.setupInput();
    this.print('Welcome to Aplica-AI TUI. Type `help` for commands.', 'cyan');
    this.print('Switch panels: press 1-7 (when input is empty).', 'gray');
    this.print('', 'white');
    while (this.running) {
      this.tick();
      process.stdout.write(HOME + this.render());
      await sleep(this.refreshRate);
    }
    process.stdout.write(ALT_OFF + SHOW_CURSOR);
    console.log('\n\u{1F44B} Aplica-AI TUI closed.\n');
    process.exit(0);
  }

  stop(): void {
    this.running = false;
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  private render(): string {
    const { w, h } = this;
    const SIDEBAR_W = 14;
    const RIGHT_W = 24;
    const HEADER_H = 3;
    const FOOTER_H = 2;
    const MAIN_H = Math.max(1, h - HEADER_H - FOOTER_H);
    const MAIN_W = Math.max(1, w - SIDEBAR_W - RIGHT_W - 4);

    let buf = this.renderHeader(w);
    const sidebar = this.renderSidebar(SIDEBAR_W, MAIN_H);
    const main = this.renderMain(MAIN_W, MAIN_H);
    const right = this.renderRight(RIGHT_W, MAIN_H);

    for (let i = 0; i < MAIN_H; i++) {
      const s = sidebar[i] ?? ' '.repeat(SIDEBAR_W);
      const m = main[i] ?? ' '.repeat(MAIN_W);
      const r = right[i] ?? ' '.repeat(RIGHT_W);
      buf += s + chalk.gray(' ' + B.V + ' ') + m + chalk.gray(' ' + B.V + ' ') + r + '\n';
    }

    buf += this.renderFooter(w);
    return buf;
  }

  // ─── Header ──────────────────────────────────────────────────────────────────
  private renderHeader(w: number): string {
    const title = ' \u25C8 APLICA-AI';
    const sub = '  MD Terminal Assistant';
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const rightStr = `${time} `;
    const gap = Math.max(0, w - stripAnsi(title + sub).length - rightStr.length);
    const line = chalk.gray(B.H.repeat(w));
    const main = chalk.bold.cyan(title) + chalk.gray(sub) + ' '.repeat(gap) + chalk.gray(rightStr);
    return `${line}\n${main}\n${line}\n`;
  }

  // ─── Sidebar ─────────────────────────────────────────────────────────────────
  private readonly PANELS: Array<{ id: PanelId; label: string; key: string }> = [
    { id: 'terminal', label: 'Terminal', key: '1' },
    { id: 'agents', label: 'Agents', key: '2' },
    { id: 'skills', label: 'Skills', key: '3' },
    { id: 'research', label: 'Research', key: '4' },
    { id: 'symphony', label: 'Symphony', key: '5' },
    { id: 'memory', label: 'Memory', key: '6' },
    { id: 'monitor', label: 'Monitor', key: '7' },
  ];

  private renderSidebar(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(chalk.bold.gray(' PANELS'));
    lines.push(chalk.gray(B.H.repeat(w)));
    for (const p of this.PANELS) {
      const active = p.id === this.panel;
      const icon = active ? '\u25B6' : ' ';
      const label = p.label.padEnd(w - 5).slice(0, w - 5);
      if (active) lines.push(chalk.bold.cyan(` ${icon} ${p.key} ${label}`));
      else lines.push(chalk.gray(` ${icon} ${p.key} ${label}`));
    }
    lines.push('');
    lines.push(chalk.gray(B.H.repeat(w)));
    lines.push(chalk.gray(' KEYS'));
    lines.push(chalk.gray(' 1-7 panel'));
    lines.push(chalk.gray(' Tab  tab'));
    lines.push(chalk.gray(' \u2191\u2193  history'));
    lines.push(chalk.gray(' ^C   quit'));
    while (lines.length < h) lines.push('');
    return lines.slice(0, h).map(l => pad(l, w));
  }

  // ─── Main dispatch ───────────────────────────────────────────────────────────
  private renderMain(w: number, h: number): string[] {
    switch (this.panel) {
      case 'terminal': return this.renderTerminal(w, h);
      case 'agents': return this.renderAgents(w, h);
      case 'skills': return this.renderSkills(w, h);
      case 'research': return this.renderResearch(w, h);
      case 'symphony': return this.renderSymphony(w, h);
      case 'memory': return this.renderMemory(w, h);
      case 'monitor': return this.renderMonitor(w, h);
    }
  }

  // ─── Terminal panel ──────────────────────────────────────────────────────────
  private renderTerminal(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(chalk.bold.cyan(' \u25C8 Terminal') + chalk.gray('  — free-text or commands'));
    lines.push(chalk.gray(B.H.repeat(w)));
    const visible = this.termOutput.slice(-(h - 2));
    for (const item of visible) {
      const text = item.text.slice(0, w - 2);
      let colored: string;
      switch (item.color) {
        case 'cyan': colored = chalk.cyan(' ' + text); break;
        case 'green': colored = chalk.green(' ' + text); break;
        case 'yellow': colored = chalk.yellow(' ' + text); break;
        case 'red': colored = chalk.red(' ' + text); break;
        case 'gray': colored = chalk.gray(' ' + text); break;
        default: colored = chalk.white(' ' + text);
      }
      lines.push(colored);
    }
    while (lines.length < h) lines.push('');
    return lines.slice(0, h).map(l => pad(l, w));
  }

  // ─── Agents panel ────────────────────────────────────────────────────────────
  private renderAgents(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(chalk.bold.cyan(' \u25C8 Agents') + chalk.gray('  — 7 agents, live metrics'));
    lines.push(chalk.gray(B.H.repeat(w)));
    const cardW = Math.max(20, Math.floor((w - 2) / 2));
    for (let i = 0; i < this.agents.length; i += 2) {
      const left = this.renderAgentCard(this.agents[i], cardW);
      const right = i + 1 < this.agents.length ? this.renderAgentCard(this.agents[i + 1], cardW) : [];
      const maxL = Math.max(left.length, right.length);
      for (let j = 0; j < maxL; j++) {
        const l = left[j] ?? ' '.repeat(cardW);
        const r = right[j] ?? ' '.repeat(cardW);
        lines.push(l + ' ' + r);
      }
    }
    while (lines.length < h) lines.push('');
    return lines.slice(0, h).map(l => pad(l, w));
  }

  private renderAgentCard(a: AgentCard, w: number): string[] {
    const statusColor = a.status === 'idle' ? chalk.gray :
      a.status === 'thinking' ? chalk.yellow :
        a.status === 'executing' ? chalk.green : chalk.red;
    const dot = statusColor('\u25CF');
    const lines: string[] = [];
    lines.push(chalk.gray(B.TL + B.H.repeat(w - 2) + B.TR));
    lines.push(chalk.gray(B.V) + chalk.bold.white(` ${a.name}`.padEnd(w - 2)) + chalk.gray(B.V));
    lines.push(chalk.gray(B.V) + ` ${dot} ${a.status.toUpperCase().padEnd(w - 5)}` + chalk.gray(B.V));
    lines.push(chalk.gray(B.V) + chalk.dim(` ${a.task}`.slice(0, w - 2).padEnd(w - 2)) + chalk.gray(B.V));
    lines.push(chalk.gray(B.V) + chalk.gray(` Tok: ${a.tokensUsed.toLocaleString()} TPM: ${a.tokensPerMin}`.padEnd(w - 2)) + chalk.gray(B.V));
    lines.push(chalk.gray(B.V) + chalk.gray(` Lat: ${a.latencyMs}ms`.padEnd(w - 2)) + chalk.gray(B.V));
    if (a.status !== 'idle') {
      const bw = Math.max(1, w - 4);
      const filled = Math.floor(a.progress / 100 * bw);
      const bar = chalk.cyan(B.HL.repeat(filled)) + chalk.gray(B.HL.repeat(Math.max(0, bw - filled)));
      lines.push(chalk.gray(B.V) + ` ${bar}` + chalk.gray(B.V));
    } else {
      lines.push(chalk.gray(B.V) + ' '.repeat(w - 2) + chalk.gray(B.V));
    }
    lines.push(chalk.gray(B.BL + B.H.repeat(w - 2) + B.BR));
    return lines;
  }

  // ─── Skills panel ────────────────────────────────────────────────────────────
  private renderSkills(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(chalk.bold.cyan(' \u25C8 Skills') + chalk.gray('  — ClawHub registry (14 skills)'));
    lines.push(chalk.gray(B.H.repeat(w)));
    const listW = Math.max(16, Math.floor(w * 0.35));
    const detailW = Math.max(1, w - listW - 3);
    const list = this.renderSkillList(listW, h - 2);
    const detail = this.renderSkillDetail(detailW, h - 2);
    for (let i = 0; i < h - 2; i++) {
      const l = list[i] ?? ' '.repeat(listW);
      const r = detail[i] ?? ' '.repeat(detailW);
      lines.push(l + chalk.gray(' ' + B.V + ' ') + r);
    }
    while (lines.length < h) lines.push('');
    return lines.slice(0, h).map(l => pad(l, w));
  }

  private renderSkillList(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(chalk.bold.gray(' SKILLS'));
    lines.push(chalk.gray(B.H.repeat(w)));
    this.skills.forEach((s, idx) => {
      const isSelected = idx === this.selectedSkill;
      const dot = s.state === 'installed' ? chalk.green('\u25CF') :
        s.state === 'available' ? chalk.yellow('\u25CB') : chalk.gray('\u25CC');
      const label = s.name.padEnd(w - 4).slice(0, w - 4);
      if (isSelected) lines.push(chalk.bgGray.white(` ${dot} ${label}`));
      else lines.push(` ${dot} ${chalk.white(label)}`);
    });
    while (lines.length < h) lines.push('');
    return lines.slice(0, h).map(l => pad(l, w));
  }

  private renderSkillDetail(w: number, h: number): string[] {
    const skill = this.skills[this.selectedSkill];
    if (!skill) return Array(h).fill('');
    const lines: string[] = [];
    lines.push(chalk.bold.white(` ${skill.name}`) + chalk.gray(` v${skill.version}`));
    lines.push(chalk.gray(B.H.repeat(w)));
    const stateLabel = skill.state === 'installed' ? chalk.green('\u25CF INSTALLED') :
      skill.state === 'available' ? chalk.yellow('\u25CB AVAILABLE') : chalk.gray('\u25CC REMOTE');
    lines.push(` State: ${stateLabel}`);
    lines.push(` Desc: ${chalk.white(skill.description.slice(0, w - 8))}`);
    lines.push('');
    lines.push(chalk.bold.gray(' TRIGGER PHRASES'));
    for (const t of skill.triggers) lines.push(chalk.gray('  \u2022 ') + chalk.cyan(t));
    lines.push('');
    lines.push(chalk.bold.gray(' SKILL.md'));
    lines.push(chalk.gray(B.H.repeat(w)));
    for (const ml of renderMd(skill.manifest, w)) lines.push(ml);
    lines.push('');
    lines.push(chalk.gray(B.H.repeat(w)));
    if (skill.state !== 'installed') lines.push(chalk.green(' [I] Install') + chalk.gray('  |  ') + chalk.gray('[U] Unload'));
    else lines.push(chalk.red(' [U] Unload') + chalk.gray('  |  ') + chalk.green('[I] Reinstall'));
    while (lines.length < h) lines.push('');
    return lines.slice(0, h).map(l => pad(l, w));
  }

  // ─── AutoResearch panel ──────────────────────────────────────────────────────
  private renderResearch(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(chalk.bold.cyan(' \u25C8 AutoResearch') + chalk.gray('  — Karpathy-style loop'));
    lines.push(chalk.gray(B.H.repeat(w)));
    const intentH = Math.min(10, Math.floor(h * 0.38));
    lines.push(chalk.bold.gray(' program.md \u2014 INTENT SPEC'));
    lines.push(chalk.gray(B.H.repeat(w)));
    const intentLines = renderMd(this.researchIntent, w - 2);
    for (let i = 0; i < intentH; i++) lines.push(intentLines[i] ?? '');
    lines.push(chalk.gray(B.H.repeat(w)));
    lines.push(chalk.bold.gray(' EXPERIMENT TIMELINE'));
    lines.push(chalk.gray(B.H.repeat(w)));
    const header = ` ${'#'.padEnd(3)} ${'Name'.padEnd(33)} ${'Score'.padEnd(7)} ${'Delta'.padEnd(8)} Status`;
    lines.push(chalk.bold.gray(header));
    lines.push(chalk.gray(B.H.repeat(w)));
    for (const e of this.experiments) {
      const st = e.status === 'completed' ? chalk.green('\u2713 done') :
        e.status === 'running' ? chalk.yellow('\u27F3 run ') :
          e.status === 'discarded' ? chalk.red('\u2717 disc') : chalk.gray('\u25CB pend');
      const ds = e.status === 'completed'
        ? (e.delta >= 0 ? chalk.green(`+${e.delta.toFixed(2)}`) : chalk.red(e.delta.toFixed(2)))
        : chalk.gray('  \u2014  ');
      const ss = (e.status === 'completed' || e.status === 'running') ? chalk.cyan(e.score.toFixed(2)) : chalk.gray(' \u2014 ');
      const hash = e.commitHash ? chalk.gray(` ${e.commitHash}`) : '';
      lines.push(` ${String(e.id).padEnd(3)} ${chalk.white(e.name.padEnd(33).slice(0, 33))} ${ss.padEnd(7)} ${ds}  ${st}${hash}`);
    }
    while (lines.length < h) lines.push('');
    return lines.slice(0, h).map(l => pad(l, w));
  }

  // ─── Symphony panel ──────────────────────────────────────────────────────────
  private renderSymphony(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(chalk.bold.cyan(' \u25C8 Symphony') + chalk.gray('  — diff viewer + review'));
    lines.push(chalk.gray(B.H.repeat(w)));
    const listW = Math.max(16, Math.floor(w * 0.35));
    const diffW = Math.max(1, w - listW - 3);
    const list = this.renderRunList(listW, h - 2);
    const diff = this.renderDiffViewer(diffW, h - 2);
    for (let i = 0; i < h - 2; i++) {
      const l = list[i] ?? ' '.repeat(listW);
      const r = diff[i] ?? ' '.repeat(diffW);
      lines.push(l + chalk.gray(' ' + B.V + ' ') + r);
    }
    while (lines.length < h) lines.push('');
    return lines.slice(0, h).map(l => pad(l, w));
  }

  private renderRunList(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(chalk.bold.gray(' RUNS'));
    lines.push(chalk.gray(B.H.repeat(w)));
    this.symphonyRuns.forEach((r, idx) => {
      const isSelected = idx === this.selectedRun;
      const dot = r.status === 'running' ? chalk.yellow('\u27F3') :
        r.status === 'awaiting-review' ? chalk.cyan('\u25C9') :
          r.status === 'accepted' ? chalk.green('\u2713') : chalk.red('\u2717');
      const label = r.branch.padEnd(w - 4).slice(0, w - 4);
      if (isSelected) lines.push(chalk.bgGray.white(` ${dot} ${label}`));
      else lines.push(` ${dot} ${chalk.white(label)}`);
    });
    while (lines.length < h) lines.push('');
    return lines.slice(0, h).map(l => pad(l, w));
  }

  private renderDiffViewer(w: number, h: number): string[] {
    const run = this.symphonyRuns[this.selectedRun];
    if (!run) return Array(h).fill('');
    const lines: string[] = [];
    lines.push(chalk.bold.white(` ${run.id}`) + chalk.gray(` \u2014 ${run.branch}`));
    lines.push(chalk.gray(B.H.repeat(w)));
    lines.push(` ${chalk.gray('Status:')} ${this.runStatusBadge(run.status)}`);
    lines.push(` ${chalk.gray('Summary:')} ${chalk.white(run.summary.slice(0, w - 12))}`);
    lines.push('');
    lines.push(chalk.bold.gray(' DIFF'));
    lines.push(chalk.gray(B.H.repeat(w)));
    for (const dl of run.diff) {
      if (dl.startsWith('+')) lines.push(chalk.green(' ' + dl.slice(0, w - 2)));
      else if (dl.startsWith('-')) lines.push(chalk.red(' ' + dl.slice(0, w - 2)));
      else lines.push(chalk.gray(' ' + dl.slice(0, w - 2)));
    }
    if (run.status === 'awaiting-review') {
      lines.push('');
      lines.push(chalk.gray(B.H.repeat(w)));
      lines.push(chalk.green(' [A] Accept') + chalk.gray('  ') + chalk.red('[R] Reject') + chalk.gray('  ') + chalk.yellow('[T] Retry'));
    }
    while (lines.length < h) lines.push('');
    return lines.slice(0, h).map(l => pad(l, w));
  }

  private runStatusBadge(s: SymphonyRun['status']): string {
    switch (s) {
      case 'awaiting-review': return chalk.cyan('\u25C9 AWAITING REVIEW');
      case 'accepted': return chalk.green('\u2713 ACCEPTED');
      case 'rejected': return chalk.red('\u2717 REJECTED');
      case 'running': return chalk.yellow('\u27F3 RUNNING');
    }
  }

  // ─── Memory panel ────────────────────────────────────────────────────────────
  private renderMemory(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(chalk.bold.cyan(' \u25C8 Memory') + chalk.gray('  — episodic/semantic/procedural/prefs'));
    lines.push(chalk.gray(B.H.repeat(w)));
    const c = { episodic: 0, semantic: 0, procedural: 0, preference: 0 };
    for (const e of this.memoryEntries) c[e.type]++;
    lines.push(
      chalk.blue(` Episodic: ${c.episodic}`) + '  ' +
      chalk.cyan(` Semantic: ${c.semantic}`) + '  ' +
      chalk.yellow(` Procedural: ${c.procedural}`) + '  ' +
      chalk.magenta(` Prefs: ${c.preference}`)
    );
    lines.push(chalk.gray(B.H.repeat(w)));
    lines.push(chalk.gray(' Search: ') + (this.memorySearch ? chalk.cyan(this.memorySearch) : chalk.gray('(memory search <query>)')));
    lines.push(chalk.gray(B.H.repeat(w)));
    const filtered = this.memorySearch
      ? this.memoryEntries.filter(e => e.content.toLowerCase().includes(this.memorySearch.toLowerCase()))
      : this.memoryEntries;
    lines.push(chalk.bold.gray(` ${'Type'.padEnd(12)} ${'Score'.padEnd(7)} Content`));
    lines.push(chalk.gray(B.H.repeat(w)));
    for (const e of filtered) {
      let typeBadge: string;
      switch (e.type) {
        case 'episodic': typeBadge = chalk.blue('[episodic ]'); break;
        case 'semantic': typeBadge = chalk.cyan('[semantic ]'); break;
        case 'procedural': typeBadge = chalk.yellow('[procedural]'); break;
        case 'preference': typeBadge = chalk.magenta('[preference]'); break;
      }
      const score = chalk.gray(e.score.toFixed(2));
      const content = e.content.slice(0, w - 26);
      lines.push(` ${typeBadge} ${score} ${chalk.white(content)}`);
    }
    while (lines.length < h) lines.push('');
    return lines.slice(0, h).map(l => pad(l, w));
  }

  // ─── Monitor panel ───────────────────────────────────────────────────────────
  private renderMonitor(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(chalk.bold.cyan(' \u25C8 Monitor') + chalk.gray('  — metrics + live tool-call feed'));
    lines.push(chalk.gray(B.H.repeat(w)));
    const spW = Math.max(4, Math.floor((w - 20) / 4));
    lines.push(
      chalk.gray(' Tok/min ') + this.sparkline(this.tokenHistory, spW, chalk.cyan) + '  ' +
      chalk.gray('Latency ') + this.sparkline(this.latencyHistory, spW, chalk.yellow)
    );
    lines.push(
      chalk.gray(' Errors  ') + this.sparkline(this.errorHistory, spW, chalk.red) + '  ' +
      chalk.gray('Cost     ') + this.sparkline(this.costHistory, spW, chalk.green)
    );
    lines.push(chalk.gray(B.H.repeat(w)));
    lines.push(chalk.bold.gray(' LIVE TOOL-CALL FEED'));
    lines.push(chalk.bold.gray(` ${'Time'.padEnd(10)} ${'Agent'.padEnd(16)} ${'Tool'.padEnd(18)} Args`));
    lines.push(chalk.gray(B.H.repeat(w)));
    const visible = this.toolCalls.slice(0, Math.max(0, h - 9));
    for (const tc of visible) {
      const ag = tc.agent.padEnd(16).slice(0, 16);
      const tool = tc.tool.padEnd(18).slice(0, 18);
      const args = tc.args.slice(0, Math.max(0, w - 52));
      lines.push(chalk.gray(` ${tc.time}`) + '  ' + chalk.cyan(ag) + ' ' + chalk.yellow(tool) + ' ' + chalk.white(args));
    }
    while (lines.length < h) lines.push('');
    return lines.slice(0, h).map(l => pad(l, w));
  }

  private sparkline(data: number[], w: number, colorFn: (s: string) => string): string {
    const CHARS = [' ', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
    const max = Math.max(...data, 1);
    return colorFn(data.slice(-w).map(v => {
      const idx = Math.floor((v / max) * (CHARS.length - 1));
      return CHARS[Math.max(0, Math.min(CHARS.length - 1, idx))];
    }).join(''));
  }

  // ─── Right panel ─────────────────────────────────────────────────────────────
  private renderRight(w: number, h: number): string[] {
    const lines: string[] = [];
    lines.push(chalk.bold.gray(' TASKS'));
    lines.push(chalk.gray(B.H.repeat(w)));
    const priorityDot = (p: 1 | 2 | 3) => p === 1 ? chalk.red('\u25CF') : p === 2 ? chalk.yellow('\u25CF') : chalk.gray('\u25CF');
    for (const t of this.tasks) {
      const dot = priorityDot(t.priority);
      const st = t.status === 'running' ? chalk.green('\u27F3') : t.status === 'done' ? chalk.gray('\u2713') : chalk.gray('\u25CB');
      const label = t.label.padEnd(w - 5).slice(0, w - 5);
      lines.push(` ${dot}${st} ${chalk.white(label)}`);
    }
    lines.push('');
    lines.push(chalk.gray(B.H.repeat(w)));
    lines.push(chalk.bold.gray(' CONTEXT'));
    lines.push(chalk.gray(B.H.repeat(w)));
    for (const [k, v] of Object.entries(this.contextVars)) {
      const key = k.padEnd(8).slice(0, 8);
      const val = v.padEnd(w - 11).slice(0, w - 11);
      lines.push(` ${chalk.gray(key)} ${chalk.cyan(val)}`);
    }
    lines.push('');
    lines.push(chalk.gray(B.H.repeat(w)));
    lines.push(chalk.bold.gray(' TOKEN COSTS'));
    lines.push(chalk.gray(B.H.repeat(w)));
    for (const a of this.agents) {
      const cost = ((a.tokensUsed / 1000) * 0.003).toFixed(3);
      const name = a.id.padEnd(Math.max(1, w - 8)).slice(0, Math.max(1, w - 8));
      lines.push(` ${chalk.gray(name)} ${chalk.green('$' + cost)}`);
    }
    while (lines.length < h) lines.push('');
    return lines.slice(0, h).map(l => pad(l, w));
  }

  // ─── Footer / Input ──────────────────────────────────────────────────────────
  private renderFooter(w: number): string {
    const panelName = this.panel.toUpperCase();
    const prompt = ` [${panelName}] > `;
    const cursorBlock = (this.frames % 10 < 5) ? chalk.bold.white('\u2588') : ' ';
    const maxInput = Math.max(1, w - stripAnsi(prompt).length - 2);
    const display = this.input.slice(0, maxInput);
    const before = display.slice(0, this.cursor);
    const after = display.slice(this.cursor);
    const inputRendered = chalk.cyan(prompt) + chalk.white(before) + cursorBlock + chalk.white(after);
    const rawLen = stripAnsi(prompt).length + display.length + 1;
    const line = chalk.gray(B.H.repeat(w));
    return `${line}\n${inputRendered}${' '.repeat(Math.max(0, w - rawLen))}\n`;
  }
}

// ─── Help text ────────────────────────────────────────────────────────────────
const HELP_TEXT = [
  '  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
  '  \u2502          APLICA-AI TUI COMMAND REFERENCE           \u2502',
  '  \u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
  '  \u2502  NAVIGATION                                          \u2502',
  '  \u2502    1-7         Switch panels (empty input)          \u2502',
  '  \u2502    \u2191/\u2193         Command history                      \u2502',
  '  \u2502    Tab         Autocomplete                         \u2502',
  '  \u2502    Ctrl+C      Quit                                 \u2502',
  '  \u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
  '  \u2502  agent list           List all 7 agents             \u2502',
  '  \u2502  skill list           List all 14 skills            \u2502',
  '  \u2502  skill search <q>     Search skills                 \u2502',
  '  \u2502  skill install <name> Install a skill               \u2502',
  '  \u2502  research start       Start next experiment         \u2502',
  '  \u2502  research status      Show running experiments      \u2502',
  '  \u2502  symphony new         Create new symphony run       \u2502',
  '  \u2502  symphony review      Show runs awaiting review     \u2502',
  '  \u2502  memory search <q>    Search memory entries         \u2502',
  '  \u2502  memory stats         Show memory statistics        \u2502',
  '  \u2502  cost today           Show today\'s token costs      \u2502',
  '  \u2502  clear                Clear terminal output         \u2502',
  '  \u2502  exit / quit          Exit the TUI                  \u2502',
  '  \u2502  <text>               Dispatch to AI agent          \u2502',
  '  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
].join('\n');

// ─── Exports ──────────────────────────────────────────────────────────────────
export async function startTUI(): Promise<void> {
  const tui = new ApplicaTUI();
  await tui.start();
}

// Standalone entry point
async function main(): Promise<void> {
  await startTUI();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    process.stderr.write(`TUI error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
