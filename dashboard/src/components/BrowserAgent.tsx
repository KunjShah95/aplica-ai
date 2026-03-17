import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Globe,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Home,
  X,
  Search,
  Plus,
  Download,
  Code,
  Terminal,
  Layers,
  Link2,
  Eye,
  Play,
  Copy,
  Bookmark,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Camera,
  Cpu,
  Network,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BrowserTab {
  id: string;
  url: string;
  title: string;
  loading: boolean;
  screenshot?: string;
}

interface ExtractedElement {
  selector: string;
  type: string;
  text: string;
  href?: string;
}

interface ScriptHistoryEntry {
  id: string;
  code: string;
  result: string;
  status: 'success' | 'error';
  ts: string;
}

interface NavHistoryEntry {
  url: string;
  title: string;
  ts: string;
}

// ── Mock page metadata ────────────────────────────────────────────────────────

const MOCK_PAGES: Record<string, { title: string; elements: ExtractedElement[]; meta: string }> = {
  'https://news.ycombinator.com': {
    title: 'Hacker News',
    meta: 'News aggregator for tech / startup community',
    elements: [
      { selector: '.titleline a', type: 'link', text: 'Show HN: Aplica AI – autonomous job applications', href: '#' },
      { selector: '.titleline a', type: 'link', text: 'LLM agents are eating the world', href: '#' },
      { selector: '.titleline a', type: 'link', text: 'Open-source vector databases compared (2025)', href: '#' },
      { selector: '.score', type: 'text', text: '342 points' },
      { selector: '.score', type: 'text', text: '218 points' },
      { selector: 'input[name="q"]', type: 'input', text: 'Search HN…' },
    ],
  },
  'https://arxiv.org': {
    title: 'arXiv – Open access to e-prints',
    meta: 'Open-access repository of electronic preprints',
    elements: [
      { selector: '.title', type: 'text', text: 'Scaling Test-Time Compute with Open Models' },
      { selector: '.title', type: 'text', text: 'DeepResearch: Agentic loops for scientific discovery' },
      { selector: 'input[type="text"]', type: 'input', text: 'Search arXiv…' },
      { selector: '.primary-button', type: 'button', text: 'Search' },
    ],
  },
  'https://github.com': {
    title: 'GitHub – Where the world builds software',
    meta: 'Code hosting platform for version control and collaboration',
    elements: [
      { selector: '.repo-name', type: 'link', text: 'KunjShah95/aplica-ai', href: '#' },
      { selector: 'nav a', type: 'link', text: 'Explore' },
      { selector: 'nav a', type: 'link', text: 'Trending' },
      { selector: 'input[type="text"]', type: 'input', text: 'Search or jump to…' },
    ],
  },
};

function getMockPage(url: string) {
  const key = Object.keys(MOCK_PAGES).find((k) => url.includes(k.replace('https://', '')));
  if (key) return MOCK_PAGES[key];
  return {
    title: new URL(url.startsWith('http') ? url : `https://${url}`).hostname,
    meta: 'Page loaded via browser agent',
    elements: [
      { selector: 'h1', type: 'text', text: 'Page Heading' },
      { selector: 'a', type: 'link', text: 'Link 1', href: '#' },
      { selector: 'a', type: 'link', text: 'Link 2', href: '#' },
      { selector: 'input', type: 'input', text: 'Input field' },
    ],
  };
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────

function BrowserTabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
}: {
  tabs: BrowserTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex items-end gap-0 px-2 pt-2 bg-dark-950 border-b border-glass-border overflow-x-auto">
      {tabs.map((t) => (
        <div
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`flex items-center gap-2 px-3 py-2 mr-0.5 rounded-t-lg cursor-pointer min-w-[120px] max-w-[200px] transition-colors ${
            t.id === activeId
              ? 'bg-dark-900 border-t border-l border-r border-glass-border text-white'
              : 'bg-dark-800/50 text-slate-400 hover:text-white hover:bg-dark-700/50'
          }`}
        >
          {t.loading ? (
            <RefreshCw className="w-3 h-3 animate-spin shrink-0 text-neon-cyan" />
          ) : (
            <Globe className="w-3 h-3 shrink-0 text-neon-cyan" />
          )}
          <span className="text-xs truncate flex-1">{t.title || 'New Tab'}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(t.id); }}
            className="shrink-0 hover:text-neon-pink transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={onNew}
        className="px-2 py-2 mb-0.5 text-slate-400 hover:text-neon-cyan transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Address Bar ───────────────────────────────────────────────────────────────

function AddressBar({
  url,
  loading,
  onNavigate,
  onBack,
  onForward,
  onRefresh,
  canBack,
  canForward,
}: {
  url: string;
  loading: boolean;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  canBack: boolean;
  canForward: boolean;
}) {
  const [input, setInput] = useState(url);
  useEffect(() => setInput(url), [url]);

  const go = () => {
    let normalized = input.trim();
    if (!normalized.startsWith('http')) {
      normalized = normalized.includes('.') ? `https://${normalized}` : `https://www.google.com/search?q=${encodeURIComponent(normalized)}`;
    }
    onNavigate(normalized);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-dark-900 border-b border-glass-border">
      <button
        onClick={onBack}
        disabled={!canBack}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 disabled:opacity-30 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={onForward}
        disabled={!canForward}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 disabled:opacity-30 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        onClick={onRefresh}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
      >
        {loading ? <X className="w-4 h-4 text-neon-pink" /> : <RefreshCw className="w-4 h-4" />}
      </button>
      <button
        onClick={() => onNavigate('https://news.ycombinator.com')}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
      >
        <Home className="w-4 h-4" />
      </button>

      <div className="flex-1 relative">
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go()}
          className="w-full bg-dark-800 border border-glass-border rounded-xl pl-9 pr-4 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50"
          placeholder="Enter URL or search…"
        />
        {loading && (
          <div className="absolute bottom-0 left-9 right-4 h-0.5 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-white animate-[scan_1s_linear_infinite]" />
          </div>
        )}
      </div>

      <button
        onClick={go}
        className="px-3 py-1.5 glow-button-cyan rounded-lg text-xs font-semibold"
      >
        Go
      </button>
    </div>
  );
}

// ── Agent Script Runner ───────────────────────────────────────────────────────

function ScriptRunner({ url }: { url: string }) {
  const [script, setScript] = useState(
    `// NanoClaw — browser automation script\n// Available: page.url, page.title, page.click(selector), page.extract(selector), page.screenshot()\n\nconst links = await page.extract('a');\nconst headlines = links.slice(0, 5);\nreturn headlines.map(l => l.text);`
  );
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<ScriptHistoryEntry[]>([]);

  const run = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const result = JSON.stringify(
        ['Aplica AI tops HN front page', 'New LLM benchmark released', 'GPT-5 specs leaked', 'Open-source model beats GPT-4', 'AI coding agent ships v2'],
        null,
        2
      );
      setHistory((prev) => [
        {
          id: `r-${Date.now()}`,
          code: script,
          result,
          status: 'success',
          ts: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 9),
      ]);
      setRunning(false);
    }, 1800);
  }, [script]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 bg-dark-900/80 border-b border-glass-border">
        <div className="flex items-center gap-2 text-xs font-semibold text-neon-green">
          <Terminal className="w-3.5 h-3.5" />
          Script Runner
        </div>
        <button
          onClick={run}
          disabled={running}
          className="flex items-center gap-1 px-2.5 py-1 bg-neon-green/10 border border-neon-green/30 rounded-lg text-xs text-neon-green hover:bg-neon-green/20 transition-colors disabled:opacity-50"
        >
          {running ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          {running ? 'Running' : 'Run'}
        </button>
      </div>
      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        className="flex-1 bg-dark-950 font-mono text-xs text-neon-green p-3 resize-none focus:outline-none border-b border-glass-border leading-relaxed"
        spellCheck={false}
      />
      <div className="h-40 overflow-y-auto p-3 space-y-2">
        {history.length === 0 ? (
          <p className="text-xs text-slate-600 text-center mt-4">Script output will appear here</p>
        ) : (
          history.map((h) => (
            <div key={h.id} className={`text-xs rounded-lg p-2 font-mono border ${h.status === 'success' ? 'bg-neon-green/5 border-neon-green/20 text-neon-green' : 'bg-neon-pink/5 border-neon-pink/20 text-neon-pink'}`}>
              <div className="flex justify-between mb-1 text-slate-500">{h.ts}</div>
              <pre className="whitespace-pre-wrap">{h.result}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Element Inspector ─────────────────────────────────────────────────────────

function ElementInspector({ elements }: { elements: ExtractedElement[] }) {
  const [filter, setFilter] = useState('all');
  const types = ['all', ...new Set(elements.map((e) => e.type))];
  const filtered = filter === 'all' ? elements : elements.filter((e) => e.type === filter);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-glass-border bg-dark-900/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-neon-amber">
            <Layers className="w-3.5 h-3.5" />
            DOM Elements ({filtered.length})
          </div>
        </div>
        <div className="flex gap-1">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-2 py-0.5 rounded text-xs transition-colors capitalize ${
                filter === t ? 'bg-neon-amber/10 text-neon-amber border border-neon-amber/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-glass-border/50">
        {filtered.map((el, i) => (
          <div key={i} className="px-3 py-2 hover:bg-dark-700/30 transition-colors group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded mr-2 ${
                  el.type === 'link' ? 'bg-neon-cyan/10 text-neon-cyan' :
                  el.type === 'input' ? 'bg-neon-purple/10 text-neon-purple' :
                  el.type === 'button' ? 'bg-neon-amber/10 text-neon-amber' :
                  'bg-dark-700 text-slate-400'
                }`}>{el.type}</span>
                <span className="text-sm text-slate-300">{el.text}</span>
                {el.href && (
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-neon-cyan/60 truncate">
                    <Link2 className="w-3 h-3 shrink-0" />{el.href}
                  </div>
                )}
                <div className="text-xs text-slate-600 font-mono mt-0.5">{el.selector}</div>
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(el.selector)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:text-white"
                title="Copy selector"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── History Panel ─────────────────────────────────────────────────────────────

function HistoryPanel({ history, onNavigate }: { history: NavHistoryEntry[]; onNavigate: (url: string) => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-glass-border bg-dark-900/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-neon-purple">
          <Clock className="w-3.5 h-3.5" />
          Navigation History
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-glass-border/50">
        {history.length === 0 ? (
          <p className="text-xs text-slate-600 text-center mt-8">No history yet</p>
        ) : (
          history.map((h, i) => (
            <button
              key={i}
              onClick={() => onNavigate(h.url)}
              className="w-full text-left px-3 py-2 hover:bg-dark-700/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3 text-neon-purple shrink-0" />
                <span className="text-sm text-slate-300 truncate flex-1">{h.title || h.url}</span>
                <span className="text-xs text-slate-600 shrink-0">{h.ts}</span>
              </div>
              <div className="text-xs text-slate-600 truncate ml-5">{h.url}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Quick Sites ───────────────────────────────────────────────────────────────

const QUICK_SITES = [
  { label: 'Hacker News', url: 'https://news.ycombinator.com', color: 'text-neon-amber' },
  { label: 'arXiv', url: 'https://arxiv.org', color: 'text-neon-purple' },
  { label: 'GitHub', url: 'https://github.com', color: 'text-neon-green' },
  { label: 'LinkedIn Jobs', url: 'https://linkedin.com/jobs', color: 'text-neon-cyan' },
  { label: 'Wellfound', url: 'https://wellfound.com', color: 'text-neon-magenta' },
  { label: 'Product Hunt', url: 'https://producthunt.com', color: 'text-neon-pink' },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function BrowserAgent() {
  const [tabs, setTabs] = useState<BrowserTab[]>([
    { id: 'tab-1', url: 'https://news.ycombinator.com', title: 'Hacker News', loading: false },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [sidePanel, setSidePanel] = useState<'elements' | 'script' | 'history'>('elements');
  const [navHistory, setNavHistory] = useState<NavHistoryEntry[]>([]);
  const [historyStack, setHistoryStack] = useState<string[]>(['https://news.ycombinator.com']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const activeTab = tabs.find((t) => t.id === activeTabId)!;
  const pageMeta = activeTab ? getMockPage(activeTab.url) : null;

  const navigate = useCallback(
    (url: string) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, url, title: 'Loading…', loading: true } : t
        )
      );
      setNavHistory((prev) => [
        { url, title: 'Loading…', ts: new Date().toLocaleTimeString() },
        ...prev.slice(0, 49),
      ]);

      setTimeout(() => {
        const meta = getMockPage(url);
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId ? { ...t, title: meta.title, loading: false } : t
          )
        );
        setNavHistory((prev) =>
          prev.map((h, i) => (i === 0 ? { ...h, title: meta.title } : h))
        );
        setHistoryStack((prev) => {
          const next = [...prev.slice(0, historyIndex + 1), url];
          setHistoryIndex(next.length - 1);
          return next;
        });
      }, 900);
    },
    [activeTabId, historyIndex]
  );

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      navigate(historyStack[newIndex]);
    }
  }, [historyIndex, historyStack, navigate]);

  const goForward = useCallback(() => {
    if (historyIndex < historyStack.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      navigate(historyStack[newIndex]);
    }
  }, [historyIndex, historyStack, navigate]);

  const newTab = useCallback(() => {
    const id = `tab-${Date.now()}`;
    setTabs((prev) => [...prev, { id, url: '', title: 'New Tab', loading: false }]);
    setActiveTabId(id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      if (tabs.length === 1) return;
      setTabs((prev) => prev.filter((t) => t.id !== id));
      if (activeTabId === id) {
        setActiveTabId(tabs[tabs.length - 2]?.id ?? tabs[0].id);
      }
    },
    [tabs, activeTabId]
  );

  const takeScreenshot = useCallback(() => {
    const api = (window as any).electronAPI;
    if (api?.captureScreenshot) {
      api.captureScreenshot();
    } else {
      alert('Screenshot captured! (Available in full Electron build)');
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-dark-950">
      {/* Tab Bar */}
      <BrowserTabBar
        tabs={tabs}
        activeId={activeTabId}
        onSelect={setActiveTabId}
        onClose={closeTab}
        onNew={newTab}
      />

      {/* Address Bar */}
      {activeTab && (
        <AddressBar
          url={activeTab.url}
          loading={activeTab.loading}
          onNavigate={navigate}
          onBack={goBack}
          onForward={goForward}
          onRefresh={() => navigate(activeTab.url)}
          canBack={historyIndex > 0}
          canForward={historyIndex < historyStack.length - 1}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-glass-border bg-dark-900/50">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Cpu className="w-3 h-3 text-neon-cyan" />
          <span className="text-neon-cyan font-semibold">NanoClaw</span>
          <span className="ml-1">Browser Agent</span>
        </div>

        <div className="flex-1 flex gap-1 justify-center">
          {QUICK_SITES.map((s) => (
            <button
              key={s.url}
              onClick={() => navigate(s.url)}
              className={`px-2 py-0.5 text-xs rounded hover:bg-dark-700 transition-colors ${s.color}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={takeScreenshot}
            className="p-1.5 text-slate-400 hover:text-neon-amber hover:bg-dark-700 rounded-lg transition-colors"
            title="Screenshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { /* bookmark */ }}
            className="p-1.5 text-slate-400 hover:text-neon-cyan hover:bg-dark-700 rounded-lg transition-colors"
            title="Bookmark"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Side panel switcher */}
        <div className="flex border border-glass-border rounded-lg overflow-hidden text-xs">
          {(['elements', 'script', 'history'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSidePanel(p)}
              className={`px-2.5 py-1 capitalize transition-colors ${
                sidePanel === p ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-slate-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              {p === 'elements' ? <Layers className="w-3 h-3 inline mr-1" /> :
               p === 'script' ? <Terminal className="w-3 h-3 inline mr-1" /> :
               <Clock className="w-3 h-3 inline mr-1" />}
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Viewport */}
        <div className="flex-1 overflow-y-auto bg-dark-950 flex flex-col">
          {!activeTab?.url ? (
            /* New Tab page */
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <Globe className="w-16 h-16 text-neon-cyan/20 mb-4" />
              <h3 className="text-xl font-display font-bold text-white mb-2">New Tab</h3>
              <p className="text-slate-500 text-sm mb-8">Navigate to a URL or use a quick site below</p>
              <div className="grid grid-cols-3 gap-3 max-w-sm">
                {QUICK_SITES.map((s) => (
                  <button
                    key={s.url}
                    onClick={() => navigate(s.url)}
                    className={`p-4 glass-card rounded-xl text-center hover:scale-105 transition-all ${s.color}`}
                  >
                    <Globe className="w-6 h-6 mx-auto mb-2 opacity-70" />
                    <span className="text-xs font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : activeTab.loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="w-10 h-10 text-neon-cyan animate-spin mx-auto mb-3" />
                <p className="text-slate-400">Loading {activeTab.url}…</p>
              </div>
            </div>
          ) : pageMeta ? (
            /* Simulated page view */
            <div className="p-8 max-w-4xl mx-auto w-full">
              <div className="glass-card rounded-2xl overflow-hidden">
                {/* Page header */}
                <div className="px-6 py-4 bg-dark-800/50 border-b border-glass-border flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{pageMeta.title}</h2>
                    <p className="text-sm text-slate-400">{pageMeta.meta}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-neon-cyan">
                      <Network className="w-3 h-3" />
                      <span className="font-mono">{activeTab.url}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neon-green/10 border border-neon-green/30 rounded-full text-xs text-neon-green">
                      <CheckCircle className="w-3 h-3" />
                      Loaded
                    </div>
                  </div>
                </div>

                {/* Page content (simulated) */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-4 h-4 text-neon-amber" />
                    <p className="text-xs text-slate-400">
                      This is a simulated page preview. In the packaged Electron build, a real embedded <code className="text-neon-cyan">BrowserView</code> renders the actual page.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {pageMeta.elements.filter((e) => e.type === 'link').slice(0, 5).map((el, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl border border-glass-border hover:border-neon-cyan/30 transition-colors cursor-pointer">
                        <ArrowRight className="w-4 h-4 text-neon-cyan shrink-0" />
                        <span className="text-sm text-slate-300">{el.text}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-600 ml-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Side Panel */}
        <div className="w-72 border-l border-glass-border bg-dark-900 flex flex-col overflow-hidden">
          {sidePanel === 'elements' && pageMeta && (
            <ElementInspector elements={pageMeta.elements} />
          )}
          {sidePanel === 'script' && <ScriptRunner url={activeTab?.url ?? ''} />}
          {sidePanel === 'history' && <HistoryPanel history={navHistory} onNavigate={navigate} />}
        </div>
      </div>
    </div>
  );
}
