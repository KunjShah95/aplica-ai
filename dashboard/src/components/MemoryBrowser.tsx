import { useState, useCallback } from 'react';
import {
  Brain,
  Search,
  Filter,
  Clock,
  Layers,
  Database,
  Zap,
  Star,
  Trash2,
  Download,
  RefreshCw,
  MessageSquare,
  BookOpen,
  Globe,
  Code,
  Camera,
  ChevronDown,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Plus,
  X,
  Info,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type MemoryType = 'episodic' | 'semantic' | 'working' | 'procedural' | 'long-term';
type MemorySource = 'chat' | 'research' | 'automation' | 'user' | 'system';

interface MemoryEntry {
  id: string;
  type: MemoryType;
  source: MemorySource;
  content: string;
  summary: string;
  importance: number; // 0–100
  accessCount: number;
  createdAt: string;
  lastAccessedAt: string;
  tags: string[];
  embedding?: number[];
  relatedIds: string[];
  pinned: boolean;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_MEMORIES: MemoryEntry[] = [
  {
    id: 'm1', type: 'episodic', source: 'chat',
    content: 'User discussed building a multi-agent research assistant using LangGraph. They want a RAG pipeline with Chroma vector store and GPT-4o as the synthesis model.',
    summary: 'Multi-agent research assistant with LangGraph + Chroma + GPT-4o',
    importance: 92, accessCount: 7, createdAt: '2025-01-15T10:32:00Z', lastAccessedAt: '2025-01-15T14:20:00Z',
    tags: ['research', 'langgraph', 'rag', 'gpt-4o'], relatedIds: ['m2', 'm5'], pinned: true,
  },
  {
    id: 'm2', type: 'semantic', source: 'research',
    content: 'RAG (Retrieval-Augmented Generation) improves LLM accuracy by grounding responses in retrieved documents. Key components: chunking strategy, embedding model, vector store, retrieval k, reranking.',
    summary: 'RAG architecture principles and best practices',
    importance: 85, accessCount: 12, createdAt: '2025-01-14T08:15:00Z', lastAccessedAt: '2025-01-15T11:00:00Z',
    tags: ['rag', 'architecture', 'embeddings', 'retrieval'], relatedIds: ['m1'], pinned: false,
  },
  {
    id: 'm3', type: 'working', source: 'automation',
    content: 'Currently processing job application batch #42. 7 applications queued for Anthropic, OpenAI, Mistral, DeepMind, Hugging Face, Cohere, Stability AI. Cover letters generated for all.',
    summary: 'Active job application batch #42 — 7 companies',
    importance: 78, accessCount: 3, createdAt: '2025-01-15T13:45:00Z', lastAccessedAt: '2025-01-15T14:30:00Z',
    tags: ['job-search', 'applications', 'automation'], relatedIds: ['m6'], pinned: false,
  },
  {
    id: 'm4', type: 'procedural', source: 'user',
    content: 'User prefers: TypeScript over Python for tooling, React for UIs, Tailwind for styling. Dislikes verbose boilerplate. Prefers functional over OOP patterns. Uses Bun over Node.js.',
    summary: 'User tech preferences — TS/React/Tailwind/Bun/functional',
    importance: 96, accessCount: 24, createdAt: '2025-01-01T09:00:00Z', lastAccessedAt: '2025-01-15T14:00:00Z',
    tags: ['preferences', 'typescript', 'react', 'bun'], relatedIds: [], pinned: true,
  },
  {
    id: 'm5', type: 'long-term', source: 'research',
    content: 'LangGraph enables stateful, graph-based LLM workflows. Nodes are functions, edges define transitions. Supports cycles (agent loops), conditional routing, and persistent checkpointing via PostgreSQL or Redis.',
    summary: 'LangGraph — stateful graph-based LLM workflows',
    importance: 88, accessCount: 9, createdAt: '2025-01-12T15:20:00Z', lastAccessedAt: '2025-01-15T12:10:00Z',
    tags: ['langgraph', 'llm', 'agents', 'workflows'], relatedIds: ['m1', 'm2'], pinned: false,
  },
  {
    id: 'm6', type: 'episodic', source: 'automation',
    content: 'Successfully scraped 47 job listings from LinkedIn, Wellfound, and Indeed. Filtered to 12 high-match positions (>80% AI score). Auto-applied to 5 with tailored cover letters.',
    summary: 'Job scan session: 47 scraped, 12 matched, 5 applied',
    importance: 71, accessCount: 2, createdAt: '2025-01-15T11:30:00Z', lastAccessedAt: '2025-01-15T13:00:00Z',
    tags: ['job-search', 'scraping', 'linkedin', 'wellfound'], relatedIds: ['m3'], pinned: false,
  },
  {
    id: 'm7', type: 'semantic', source: 'system',
    content: 'OpenAI API key stored securely. Rate limits: gpt-4o — 10k TPM, gpt-3.5-turbo — 90k TPM. Anthropic key active with claude-3-opus and claude-3-sonnet access.',
    summary: 'API keys and rate limit configuration',
    importance: 99, accessCount: 45, createdAt: '2024-12-01T00:00:00Z', lastAccessedAt: '2025-01-15T14:35:00Z',
    tags: ['api', 'openai', 'anthropic', 'configuration'], relatedIds: [], pinned: true,
  },
  {
    id: 'm8', type: 'episodic', source: 'chat',
    content: 'User asked about implementing streaming responses in Electron IPC. Solution: use BrowserWindow.webContents.send() with chunked payloads. Implemented with ReadableStream parsing on renderer side.',
    summary: 'Electron IPC streaming implementation solution',
    importance: 67, accessCount: 1, createdAt: '2025-01-13T16:45:00Z', lastAccessedAt: '2025-01-13T17:00:00Z',
    tags: ['electron', 'ipc', 'streaming', 'solution'], relatedIds: [], pinned: false,
  },
];

// ── Config Maps ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<MemoryType, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  episodic:   { label: 'Episodic',   color: 'text-neon-cyan',    bg: 'bg-neon-cyan/10',    border: 'border-neon-cyan/30',    icon: <MessageSquare className="w-3.5 h-3.5" /> },
  semantic:   { label: 'Semantic',   color: 'text-neon-purple',  bg: 'bg-neon-purple/10',  border: 'border-neon-purple/30',  icon: <BookOpen className="w-3.5 h-3.5" /> },
  working:    { label: 'Working',    color: 'text-neon-amber',   bg: 'bg-neon-amber/10',   border: 'border-neon-amber/30',   icon: <Zap className="w-3.5 h-3.5" /> },
  procedural: { label: 'Procedural', color: 'text-neon-green',   bg: 'bg-neon-green/10',   border: 'border-neon-green/30',   icon: <Code className="w-3.5 h-3.5" /> },
  'long-term':{ label: 'Long-term',  color: 'text-neon-magenta', bg: 'bg-neon-magenta/10', border: 'border-neon-magenta/30', icon: <Database className="w-3.5 h-3.5" /> },
};

const SOURCE_CONFIG: Record<MemorySource, { label: string; icon: React.ReactNode }> = {
  chat:       { label: 'Chat',       icon: <MessageSquare className="w-3 h-3" /> },
  research:   { label: 'Research',   icon: <Globe className="w-3 h-3" /> },
  automation: { label: 'Automation', icon: <Zap className="w-3 h-3" /> },
  user:       { label: 'User',       icon: <Star className="w-3 h-3" /> },
  system:     { label: 'System',     icon: <Database className="w-3 h-3" /> },
};

// ── Stats Bar ─────────────────────────────────────────────────────────────────

function MemoryStats({ memories }: { memories: MemoryEntry[] }) {
  const total = memories.length;
  const pinned = memories.filter((m) => m.pinned).length;
  const avgImportance = Math.round(memories.reduce((s, m) => s + m.importance, 0) / (total || 1));
  const totalAccess = memories.reduce((s, m) => s + m.accessCount, 0);

  const byType = Object.keys(TYPE_CONFIG).map((t) => ({
    type: t as MemoryType,
    count: memories.filter((m) => m.type === t).length,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Memories', value: total, icon: <Database className="w-4 h-4" />, color: 'text-neon-cyan' },
          { label: 'Pinned', value: pinned, icon: <Star className="w-4 h-4" />, color: 'text-neon-amber' },
          { label: 'Avg Importance', value: `${avgImportance}%`, icon: <TrendingUp className="w-4 h-4" />, color: 'text-neon-green' },
          { label: 'Total Accesses', value: totalAccess, icon: <BarChart3 className="w-4 h-4" />, color: 'text-neon-purple' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className={`flex items-center justify-center mb-1 ${s.color}`}>{s.icon}</div>
            <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Type breakdown */}
      <div className="glass-card p-4">
        <p className="text-xs font-semibold text-neon-cyan uppercase tracking-wider mb-3">Memory Distribution</p>
        <div className="space-y-2">
          {byType.filter((b) => b.count > 0).map((b) => {
            const tc = TYPE_CONFIG[b.type];
            const pct = Math.round((b.count / total) * 100);
            return (
              <div key={b.type}>
                <div className="flex items-center justify-between mb-1 text-xs">
                  <div className={`flex items-center gap-1.5 ${tc.color}`}>
                    {tc.icon}
                    <span>{tc.label}</span>
                  </div>
                  <span className={tc.color}>{b.count}</span>
                </div>
                <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${tc.bg.replace('/10', '/50')}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Memory Card ───────────────────────────────────────────────────────────────

function MemoryCard({
  memory,
  selected,
  onSelect,
  onPin,
  onDelete,
}: {
  memory: MemoryEntry;
  selected: boolean;
  onSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const tc = TYPE_CONFIG[memory.type];
  const sc = SOURCE_CONFIG[memory.source];
  const importanceColor =
    memory.importance >= 90 ? 'text-neon-green' :
    memory.importance >= 70 ? 'text-neon-amber' : 'text-slate-400';

  return (
    <div
      onClick={onSelect}
      className={`group p-4 border-b border-glass-border cursor-pointer transition-all duration-200 hover:bg-dark-700/20 ${
        selected ? 'bg-neon-cyan/5 border-l-2 border-l-neon-cyan' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 p-1.5 rounded-lg ${tc.bg} ${tc.border} border`}>
          <span className={tc.color}>{tc.icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium ${tc.color}`}>{tc.label}</span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <span className={tc.color}>{sc.icon}</span>
              {sc.label}
            </span>
            {memory.pinned && <Star className="w-3 h-3 text-neon-amber fill-neon-amber" />}
          </div>
          <p className="text-sm text-slate-300 line-clamp-2 mb-2">{memory.summary}</p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(memory.createdAt).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              {memory.accessCount} accesses
            </span>
            <span className={`font-mono font-bold ${importanceColor}`}>{memory.importance}% imp.</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            className={`p-1.5 rounded-lg transition-colors ${memory.pinned ? 'text-neon-amber bg-neon-amber/10' : 'text-slate-400 hover:text-neon-amber hover:bg-neon-amber/10'}`}
          >
            <Star className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-neon-pink hover:bg-neon-pink/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 ml-9">
          {memory.tags.map((t) => (
            <span key={t} className="px-1.5 py-0.5 bg-dark-700 border border-glass-border rounded-full text-xs text-slate-500">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail Pane ───────────────────────────────────────────────────────────────

function MemoryDetail({ memory, onClose }: { memory: MemoryEntry; onClose: () => void }) {
  const tc = TYPE_CONFIG[memory.type];
  const importanceColor =
    memory.importance >= 90 ? 'text-neon-green' :
    memory.importance >= 70 ? 'text-neon-amber' : 'text-slate-400';

  return (
    <div className="w-80 shrink-0 bg-dark-900 border-l border-glass-border flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border">
        <div className={`flex items-center gap-2 text-sm font-semibold ${tc.color}`}>
          {tc.icon}
          {tc.label} Memory
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Importance gauge */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Importance Score</span>
            <span className={`text-2xl font-display font-bold ${importanceColor}`}>{memory.importance}%</span>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${memory.importance >= 90 ? 'bg-neon-green' : memory.importance >= 70 ? 'bg-neon-amber' : 'bg-slate-500'}`}
              style={{ width: `${memory.importance}%` }}
            />
          </div>
        </div>

        {/* Full content */}
        <div>
          <p className="text-xs font-semibold text-neon-cyan uppercase tracking-wider mb-2">Full Content</p>
          <p className="text-sm text-slate-300 bg-dark-800 rounded-xl p-3 border border-glass-border leading-relaxed">
            {memory.content}
          </p>
        </div>

        {/* Metadata */}
        <div className="space-y-2 text-xs">
          {[
            { label: 'Created', value: new Date(memory.createdAt).toLocaleString() },
            { label: 'Last accessed', value: new Date(memory.lastAccessedAt).toLocaleString() },
            { label: 'Access count', value: memory.accessCount.toString() },
            { label: 'Source', value: SOURCE_CONFIG[memory.source].label },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-slate-500">{label}</span>
              <span className="text-slate-300">{value}</span>
            </div>
          ))}
        </div>

        {/* Tags */}
        {memory.tags.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-neon-cyan uppercase tracking-wider mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {memory.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 bg-dark-700 border border-glass-border rounded-full text-xs text-slate-400">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related */}
        {memory.relatedIds.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-neon-cyan uppercase tracking-wider mb-2">Related Memories ({memory.relatedIds.length})</p>
            <div className="space-y-1">
              {memory.relatedIds.map((id) => (
                <div key={id} className="flex items-center gap-2 px-2 py-1.5 bg-dark-800 rounded-lg text-xs text-slate-400 border border-glass-border">
                  <Layers className="w-3 h-3 text-neon-purple" />
                  <span className="font-mono">{id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => navigator.clipboard?.writeText(memory.content)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-dark-700 border border-glass-border rounded-xl text-sm text-slate-300 hover:text-white hover:bg-dark-600 transition-colors"
          >
            Copy Content
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MemoryBrowser() {
  const [memories, setMemories] = useState<MemoryEntry[]>(MOCK_MEMORIES);
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_MEMORIES[0].id);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MemoryType | 'all'>('all');
  const [filterSource, setFilterSource] = useState<MemorySource | 'all'>('all');
  const [view, setView] = useState<'list' | 'stats'>('list');
  const [sortBy, setSortBy] = useState<'importance' | 'recent' | 'access'>('importance');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [isConsolidating, setIsConsolidating] = useState(false);

  const selectedMemory = memories.find((m) => m.id === selectedId) ?? null;

  const filtered = memories
    .filter((m) => filterType === 'all' || m.type === filterType)
    .filter((m) => filterSource === 'all' || m.source === filterSource)
    .filter(
      (m) =>
        !search ||
        m.content.toLowerCase().includes(search.toLowerCase()) ||
        m.summary.toLowerCase().includes(search.toLowerCase()) ||
        m.tags.some((t) => t.includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'importance') return b.importance - a.importance;
      if (sortBy === 'access') return b.accessCount - a.accessCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const handlePin = useCallback((id: string) => {
    setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)));
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setMemories((prev) => prev.filter((m) => m.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId]
  );

  const handleConsolidate = useCallback(() => {
    setIsConsolidating(true);
    setTimeout(() => {
      setIsConsolidating(false);
    }, 2200);
  }, []);

  const handleAddMemory = useCallback(() => {
    if (!newContent.trim()) return;
    const m: MemoryEntry = {
      id: `m${Date.now()}`,
      type: 'semantic',
      source: 'user',
      content: newContent,
      summary: newContent.slice(0, 80) + (newContent.length > 80 ? '…' : ''),
      importance: 70,
      accessCount: 0,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      tags: [],
      relatedIds: [],
      pinned: false,
    };
    setMemories((prev) => [m, ...prev]);
    setNewContent('');
    setAddModalOpen(false);
    setSelectedId(m.id);
  }, [newContent]);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(memories, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aplica-memories.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [memories]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border bg-dark-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-magenta flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Memory Browser</h2>
            <p className="text-xs text-slate-400">Explore and manage agent memories</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border border-glass-border rounded-lg overflow-hidden text-xs">
            {(['list', 'stats'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 capitalize transition-colors ${view === v ? 'bg-neon-purple/10 text-neon-purple' : 'text-slate-400 hover:text-white hover:bg-dark-700'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={exportJSON}
            className="px-3 py-1.5 bg-dark-700 border border-glass-border rounded-lg text-xs text-slate-300 hover:text-white hover:bg-dark-600 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-3 py-1.5 bg-dark-700 border border-glass-border rounded-lg text-xs text-slate-300 hover:text-white hover:bg-dark-600 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Memory
          </button>
          <button
            onClick={handleConsolidate}
            disabled={isConsolidating}
            className="px-4 py-1.5 glow-button-cyan rounded-lg text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {isConsolidating ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Consolidating…</>
            ) : (
              <><Zap className="w-3.5 h-3.5" />Consolidate</>
            )}
          </button>
        </div>
      </div>

      {view === 'stats' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <MemoryStats memories={memories} />
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-glass-border bg-dark-900/30">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search memories…"
                className="w-full bg-dark-800 border border-glass-border rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-neon-purple/50"
              />
            </div>

            <div className="flex gap-1">
              {(['all', ...Object.keys(TYPE_CONFIG)] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t as MemoryType | 'all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                    filterType === t
                      ? 'bg-neon-purple/10 text-neon-purple border border-neon-purple/30'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  {t === 'all' ? 'All Types' : TYPE_CONFIG[t as MemoryType]?.label ?? t}
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-dark-800 border border-glass-border rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="importance">Sort: Importance</option>
              <option value="recent">Sort: Recent</option>
              <option value="access">Sort: Most accessed</option>
            </select>

            <span className="text-xs text-slate-500">{filtered.length} memories</span>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Memory List */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <Brain className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-lg">No memories found</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                filtered.map((m) => (
                  <MemoryCard
                    key={m.id}
                    memory={m}
                    selected={selectedId === m.id}
                    onSelect={() => setSelectedId(m.id)}
                    onPin={() => handlePin(m.id)}
                    onDelete={() => handleDelete(m.id)}
                  />
                ))
              )}
            </div>

            {/* Detail Pane */}
            {selectedMemory && (
              <MemoryDetail
                memory={selectedMemory}
                onClose={() => setSelectedId(null)}
              />
            )}
          </div>
        </>
      )}

      {/* Add Memory Modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setAddModalOpen(false)}
        >
          <div className="w-full max-w-lg bg-dark-900 border border-glass-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-neon-purple" />
                <h3 className="text-lg font-bold text-white">Add Memory</h3>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Enter memory content…"
              className="w-full h-40 bg-dark-950 border border-glass-border rounded-xl p-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-neon-purple/50 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setAddModalOpen(false)}
                className="px-4 py-2 bg-dark-700 border border-glass-border rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMemory}
                className="px-4 py-2 glow-button-cyan rounded-xl text-sm font-semibold"
              >
                Save Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
