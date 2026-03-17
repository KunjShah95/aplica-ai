import { useState, useRef, useEffect, useCallback } from 'react';
import React from 'react';
import {
  Send,
  Bot,
  User,
  Brain,
  Code,
  Globe,
  Terminal,
  ChevronDown,
  RefreshCw,
  Copy,
  Trash2,
  Plus,
  Sparkles,
  Shield,
  MoreHorizontal,
  CheckCheck,
  Search,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentMode = 'general' | 'researcher' | 'coder' | 'browser' | 'analyst' | 'security';

interface ToolCall {
  id: string;
  tool: string;
  input: string;
  output?: string;
  status: 'running' | 'done' | 'error';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  agentMode?: AgentMode;
  toolCalls?: ToolCall[];
  tokens?: number;
  model?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  agentMode: AgentMode;
  createdAt: string;
}

// ── Agent Configs ─────────────────────────────────────────────────────────────

/** Static Tailwind class sets — must be literal strings for JIT to include them */
const AGENT_CLASSES: Record<
  AgentMode,
  { text: string; border: string; bg: string; borderMuted: string }
> = {
  general:    { text: 'text-neon-cyan',    border: 'border-neon-cyan',    bg: 'bg-neon-cyan/10',    borderMuted: 'border-neon-cyan/40' },
  researcher: { text: 'text-neon-purple',  border: 'border-neon-purple',  bg: 'bg-neon-purple/10',  borderMuted: 'border-neon-purple/40' },
  coder:      { text: 'text-neon-green',   border: 'border-neon-green',   bg: 'bg-neon-green/10',   borderMuted: 'border-neon-green/40' },
  browser:    { text: 'text-neon-amber',   border: 'border-neon-amber',   bg: 'bg-neon-amber/10',   borderMuted: 'border-neon-amber/40' },
  analyst:    { text: 'text-neon-magenta', border: 'border-neon-magenta', bg: 'bg-neon-magenta/10', borderMuted: 'border-neon-magenta/40' },
  security:   { text: 'text-red-400',      border: 'border-red-400',      bg: 'bg-red-400/10',      borderMuted: 'border-red-400/40' },
};

const AGENT_MODES: Record<
  AgentMode,
  { label: string; icon: React.ReactNode; description: string; systemPrompt: string }
> = {
  general: {
    label: 'General',
    icon: <Bot className="w-4 h-4" />,
    description: 'All-purpose assistant for any task',
    systemPrompt: 'You are Aplica AI, a helpful, capable, and concise AI assistant.',
  },
  researcher: {
    label: 'Researcher',
    icon: <Search className="w-4 h-4" />,
    description: 'Deep research and summarisation',
    systemPrompt:
      'You are Aplica Research Agent (AutoResearcher mode). You specialise in synthesising information from multiple sources, generating structured reports, and identifying trends. Respond with well-cited, structured answers.',
  },
  coder: {
    label: 'Coder',
    icon: <Code className="w-4 h-4" />,
    description: 'Code generation, review and debugging',
    systemPrompt:
      'You are Aplica Code Agent. You write clean, efficient, idiomatic code. Always include type annotations, error handling, and brief inline comments for non-obvious logic.',
  },
  browser: {
    label: 'Browser',
    icon: <Globe className="w-4 h-4" />,
    description: 'Web automation and scraping',
    systemPrompt:
      'You are Aplica Browser Agent (NanoClaw mode). You plan and execute web automation tasks, extract structured data, and interact with web pages using Playwright.',
  },
  analyst: {
    label: 'Analyst',
    icon: <Brain className="w-4 h-4" />,
    description: 'Data analysis and visualisation',
    systemPrompt:
      'You are Aplica Data Analyst Agent. You analyse datasets, identify statistical patterns, explain findings clearly, and suggest actionable insights.',
  },
  security: {
    label: 'Security',
    icon: <Shield className="w-4 h-4" />,
    description: 'Security audits and threat analysis',
    systemPrompt:
      'You are Aplica Security Agent (PicoClaw mode). You perform security audits, review code for vulnerabilities, and provide remediation guidance following OWASP and CWE best practices.',
  },
};

// ── Mock LLM responses ────────────────────────────────────────────────────────

const MOCK_RESPONSES: Record<AgentMode, string[]> = {
  general: [
    'I can help with that! Here\'s a concise breakdown of what you asked:\n\n1. **First point**: The key insight is that…\n2. **Second point**: You should also consider…\n3. **Action**: I recommend starting with…',
    'Great question. To answer it thoroughly:\n\n- The core concept here is **autonomous reasoning**\n- This connects to multi-agent frameworks where each agent specialises in a subtask\n- Together, they produce emergent behaviour beyond any individual agent\'s capability',
  ],
  researcher: [
    '## Research Summary\n\n**Topic analysed**: Based on 12 synthesised sources\n\n### Key Findings\n1. Recent literature (2023–2025) shows a **40% YoY improvement** in benchmark performance\n2. Cost-per-inference has dropped by **10×** since 2022\n3. Open-source models (Llama, Mistral) now rival proprietary solutions on most tasks\n\n### Recommended Next Steps\n- Review the Stanford HELM leaderboard for up-to-date metrics\n- Consider RAG over your proprietary data before fine-tuning\n- Evaluate Mistral 7B or Phi-3 for edge/on-device deployment',
    '## Literature Review\n\nI\'ve synthesised the following from recent publications:\n\n**Trend 1**: Multi-modal models are converging on a unified architecture\n**Trend 2**: Agentic frameworks (LangGraph, AutoGen, CrewAI) are rapidly maturing\n**Trend 3**: On-device inference (ONNX, llama.cpp) makes privacy-first deployment viable\n\n*Sources: ArXiv 2024.xxxxx, Nature AI Vol.7, IEEE Spectrum Mar 2025*',
  ],
  coder: [
    '```typescript\n// Autonomous agent runner with exponential back-off retry\nasync function runAgentWithRetry<T>(\n  task: () => Promise<T>,\n  maxRetries = 3,\n  baseDelayMs = 1000\n): Promise<T> {\n  for (let attempt = 0; attempt <= maxRetries; attempt++) {\n    try {\n      return await task();\n    } catch (error) {\n      if (attempt === maxRetries) throw error;\n      const delay = baseDelayMs * Math.pow(2, attempt);\n      await new Promise((r) => setTimeout(r, delay));\n    }\n  }\n  throw new Error("unreachable");\n}\n```\n\nKey design decisions:\n- **Exponential back-off** prevents thundering herd on transient failures\n- **Generic `<T>`** keeps it type-safe for any return type\n- Throws the original error after exhausting retries',
    '```python\n# AutoResearcher-style web scraper with async concurrency\nimport asyncio\nfrom playwright.async_api import async_playwright\n\nasync def fetch_page(url: str, semaphore: asyncio.Semaphore) -> dict:\n    async with semaphore:\n        async with async_playwright() as p:\n            browser = await p.chromium.launch(headless=True)\n            page = await browser.new_page()\n            await page.goto(url, timeout=15_000)\n            text = await page.inner_text("body")\n            await browser.close()\n            return {"url": url, "text": text[:4000]}\n\nasync def bulk_fetch(urls: list[str], concurrency: int = 5) -> list[dict]:\n    sem = asyncio.Semaphore(concurrency)\n    return await asyncio.gather(*[fetch_page(u, sem) for u in urls])\n```',
  ],
  browser: [
    '## Browser Automation Plan\n\nI\'ll execute this task in **3 phases**:\n\n**Phase 1 – Navigation**\n```\n→ goto("https://target-site.com")\n→ waitForSelector("main")\n```\n\n**Phase 2 – Data Extraction**\n```\n→ querySelectorAll(".result-item")\n→ extract: title, url, snippet, date\n```\n\n**Phase 3 – Export**\n```\n→ serialize to JSON\n→ write to ./output/results.json\n```\n\n**Estimated duration**: ~8 seconds for 50 results\n**Rate limiting**: 1 req/s to respect robots.txt',
  ],
  analyst: [
    '## Data Analysis Report\n\n**Dataset**: 10,000 rows × 24 columns\n\n### Descriptive Statistics\n| Metric | Value |\n|--------|-------|\n| Mean   | 42.7  |\n| Median | 38.2  |\n| Std Dev| 15.4  |\n| Skewness| 0.87 |\n\n### Key Insights\n1. **Bimodal distribution** detected at columns `revenue` and `sessions` — likely two user segments\n2. **Strong correlation** (r=0.87) between `page_views` and `conversions`\n3. **Outlier cluster** (n=47) with anomalously high `bounce_rate` — investigate traffic source\n\n### Recommended Actions\n- Segment analysis by user cohort\n- A/B test the landing page for the high-bounce cluster',
  ],
  security: [
    '## Security Audit Report\n\n### Critical Findings (CVSS ≥ 9.0)\n🔴 **SQL Injection** (CWE-89) at `POST /api/users/search`\n- User input concatenated directly into query string\n- **Fix**: Use parameterised queries / ORM\n\n### High Findings (CVSS 7.0–8.9)\n🟠 **Broken Authentication** (CWE-287) — JWT secret in `.env` checked into git\n- Rotate secret immediately; add to `.gitignore`\n\n🟠 **Insecure Direct Object Reference** (IDOR) at `GET /api/reports/:id`\n- No ownership check before returning data\n- **Fix**: Validate `req.user.id === report.userId` before serving\n\n### Recommendations\n1. Enable SAST in CI (CodeQL, Semgrep)\n2. Add DAST to staging pipeline (OWASP ZAP)\n3. Implement Content Security Policy headers',
  ],
};

function randomResponse(mode: AgentMode): string {
  const arr = MOCK_RESPONSES[mode];
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToolCallBlock({ tool }: { tool: ToolCall }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 border border-neon-cyan/20 rounded-lg overflow-hidden text-xs font-mono">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 bg-dark-900/60 text-left hover:bg-dark-900 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <Terminal className="w-3 h-3 text-neon-cyan" />
        <span className="text-neon-cyan">{tool.tool}</span>
        {tool.status === 'running' && (
          <RefreshCw className="w-3 h-3 text-neon-amber ml-auto animate-spin" />
        )}
        {tool.status === 'done' && (
          <CheckCheck className="w-3 h-3 text-neon-green ml-auto" />
        )}
        <ChevronDown
          className={`w-3 h-3 text-dark-400 ${tool.status !== 'running' ? (open ? '' : 'rotate-[-90deg]') : 'hidden'}`}
        />
      </button>
      {open && (
        <div className="px-3 py-2 bg-dark-950/60 space-y-1">
          <div className="text-dark-400">INPUT: <span className="text-white">{tool.input}</span></div>
          {tool.output && (
            <div className="text-dark-400">OUTPUT: <span className="text-neon-green">{tool.output}</span></div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  const mode = msg.agentMode ?? 'general';
  const cfg = AGENT_MODES[mode];
  const cls = AGENT_CLASSES[mode];

  const renderContent = (text: string) => {
    // Very light markdown-ish rendering
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-base font-bold text-white mt-3 mb-1">{line.slice(3)}</h3>;
      }
      if (line.startsWith('### ')) {
        return <h4 key={i} className="text-sm font-semibold text-neon-cyan mt-2 mb-0.5">{line.slice(4)}</h4>;
      }
      if (line.startsWith('```') || line.endsWith('```')) {
        return null;
      }
      const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <p
          key={i}
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: boldLine || '&nbsp;' }}
        />
      );
    });
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-lg">
          <div className="bg-neon-cyan/10 border border-neon-cyan/30 rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-sm text-white">{msg.content}</p>
          </div>
          <div className="flex justify-end mt-1">
            <span className="text-xs text-dark-600">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-dark-800 border border-glass-border flex items-center justify-center ml-2 flex-shrink-0 mt-0.5">
          <User className="w-4 h-4 text-dark-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex mb-4">
      <div className={`w-8 h-8 rounded-full bg-dark-800 border ${cls.borderMuted} flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 ${cls.text}`}>
        {cfg.icon}
      </div>
      <div className="max-w-2xl flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold ${cls.text}`}>{cfg.label} Agent</span>
          {msg.model && (
            <span className="text-xs text-dark-600 font-mono">{msg.model}</span>
          )}
        </div>
        <div className="bg-dark-900 border border-glass-border rounded-2xl rounded-tl-sm px-4 py-3">
          {msg.toolCalls && msg.toolCalls.map((t) => <ToolCallBlock key={t.id} tool={t} />)}
          <div className="text-dark-200 space-y-1">
            {renderContent(msg.content)}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-dark-600">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </span>
          {msg.tokens && (
            <span className="text-xs text-dark-600">{msg.tokens} tokens</span>
          )}
          <button
            className="text-xs text-dark-600 hover:text-dark-400 transition-colors"
            onClick={() => navigator.clipboard.writeText(msg.content)}
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgentChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: 'default',
      title: 'New Chat',
      messages: [],
      agentMode: 'general',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState('default');
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId)!;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isGenerating) return;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    const userInput = input.trim();
    setInput('');
    setIsGenerating(true);

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              title: s.messages.length === 0 ? userInput.slice(0, 40) : s.title,
              messages: [...s.messages, userMsg],
            }
          : s
      )
    );

    // Simulate tool calls for certain agents
    const hasToolCalls = agentMode === 'browser' || agentMode === 'researcher';
    const toolCalls: ToolCall[] = hasToolCalls
      ? [
          {
            id: `tool-${Date.now()}`,
            tool: agentMode === 'browser' ? 'playwright.navigate' : 'web.search',
            input: userInput,
            status: 'running',
          },
        ]
      : [];

    const thinkingMsg: ChatMessage = {
      id: `thinking-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      agentMode,
      toolCalls,
      model: 'aplica-1',
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId ? { ...s, messages: [...s.messages, thinkingMsg] } : s
      )
    );

    const thinkDelay = hasToolCalls ? 1800 : 900;
    await new Promise((r) => setTimeout(r, thinkDelay));

    const finalToolCalls: ToolCall[] = toolCalls.map((t) => ({
      ...t,
      status: 'done',
      output: agentMode === 'browser' ? '200 OK, 47 elements found' : '8 relevant sources',
    }));

    const responseContent = randomResponse(agentMode);
    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now()}-response`,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date().toISOString(),
      agentMode,
      toolCalls: finalToolCalls,
      tokens: Math.floor(Math.random() * 300 + 150),
      model: 'aplica-1',
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: s.messages
                .filter((m) => m.id !== thinkingMsg.id)
                .concat(assistantMsg),
            }
          : s
      )
    );
    setIsGenerating(false);
  }, [input, isGenerating, agentMode, activeSessionId]);

  const newSession = useCallback(() => {
    const id = `session-${Date.now()}`;
    setSessions((prev) => [
      ...prev,
      { id, title: 'New Chat', messages: [], agentMode, createdAt: new Date().toISOString() },
    ]);
    setActiveSessionId(id);
  }, [agentMode]);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        const remaining = sessions.filter((s) => s.id !== id);
        if (remaining.length > 0) setActiveSessionId(remaining[0].id);
        else {
          const newId = `session-${Date.now()}`;
          setSessions([{ id: newId, title: 'New Chat', messages: [], agentMode, createdAt: new Date().toISOString() }]);
          setActiveSessionId(newId);
        }
      }
    },
    [activeSessionId, sessions, agentMode]
  );

  const cfg = AGENT_MODES[agentMode];
  const cls = AGENT_CLASSES[agentMode];

  return (
    <div className="flex h-full bg-dark-950 text-white font-mono">
      {/* ── Sidebar ── */}
      <div className="w-60 flex-shrink-0 border-r border-glass-border flex flex-col">
        <div className="p-4 border-b border-glass-border">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-neon-cyan" />
            <h2 className="text-sm font-bold text-neon-cyan tracking-wider">AGENT CHAT</h2>
          </div>
          <button
            onClick={newSession}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-neon-cyan/30 text-neon-cyan text-xs hover:bg-neon-cyan/10 transition-colors"
          >
            <Plus className="w-3 h-3" /> New Chat
          </button>
        </div>

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors mb-1 ${
                s.id === activeSessionId
                  ? 'bg-neon-cyan/10 border border-neon-cyan/20'
                  : 'hover:bg-dark-900'
              }`}
              onClick={() => setActiveSessionId(s.id)}
            >
              <Bot className="w-3 h-3 text-dark-400 flex-shrink-0" />
              <span className="text-xs text-dark-300 truncate flex-1">{s.title}</span>
              <button
                className="opacity-0 group-hover:opacity-100 text-dark-600 hover:text-red-400 transition-all"
                onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col">
        {/* Agent mode selector */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-glass-border bg-dark-900/40 overflow-x-auto">
          {(Object.entries(AGENT_MODES) as [AgentMode, typeof AGENT_MODES[AgentMode]][]).map(
            ([m, c]) => {
              const mCls = AGENT_CLASSES[m];
              return (
                <button
                  key={m}
                  onClick={() => setAgentMode(m)}
                  title={c.description}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${
                    agentMode === m
                      ? `${mCls.borderMuted} ${mCls.bg} ${mCls.text}`
                      : 'border-glass-border text-dark-400 hover:border-dark-500 hover:text-dark-300'
                  }`}
                >
                  {c.icon} {c.label}
                </button>
              );
            }
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSession.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className={`w-16 h-16 rounded-2xl bg-dark-900 border ${cls.borderMuted} flex items-center justify-center mb-4 ${cls.text}`}>
                {cfg.icon && React.cloneElement(cfg.icon as React.ReactElement, { className: 'w-8 h-8' })}
              </div>
              <h3 className="text-xl font-bold text-dark-400 mb-2">{cfg.label} Agent Ready</h3>
              <p className="text-dark-600 max-w-xs text-sm">{cfg.description}</p>
              <div className="mt-6 grid grid-cols-2 gap-2 max-w-sm w-full">
                {[
                  'Explain quantum computing simply',
                  'Write a Python web scraper',
                  'Audit this code for security issues',
                  'Research recent AI breakthroughs',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    className="text-left p-3 bg-dark-900 border border-glass-border rounded-lg text-xs text-dark-400 hover:text-white hover:border-dark-600 transition-colors"
                    onClick={() => {
                      setInput(suggestion);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeSession.messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {isGenerating && activeSession.messages[activeSession.messages.length - 1]?.role !== 'assistant' && (
            <div className="flex mb-4">
              <div className={`w-8 h-8 rounded-full bg-dark-800 border ${cls.borderMuted} flex items-center justify-center mr-2 ${cls.text}`}>
                {cfg.icon}
              </div>
              <div className="bg-dark-900 border border-glass-border rounded-2xl rounded-tl-sm px-4 py-3">
                <MoreHorizontal className="w-5 h-5 text-dark-500 animate-pulse" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-glass-border bg-dark-900/40">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                className="w-full bg-dark-900 border border-glass-border rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 resize-none focus:outline-none focus:border-neon-cyan/60 pr-12 min-h-[52px] max-h-40"
                placeholder={`Message ${cfg.label} Agent… (Shift+Enter for new line)`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={isGenerating}
                rows={1}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isGenerating}
              className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border transition-colors ${
                input.trim() && !isGenerating
                  ? 'bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/30'
                  : 'bg-dark-900 border-glass-border text-dark-600 cursor-not-allowed'
              }`}
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-dark-600 text-center mt-2">
            Aplica AI · {cfg.label} mode · aplica-1 model
          </p>
        </div>
      </div>
    </div>
  );
}
