import { useState, useCallback, useRef } from 'react';
import {
  Search,
  BookOpen,
  FileText,
  Globe,
  Zap,
  ChevronDown,
  ChevronRight,
  Download,
  Copy,
  RefreshCw,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Brain,
  Network,
  Database,
  ArrowRight,
  Star,
  Bookmark,
  Share2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ResearchSource {
  id: string;
  title: string;
  url: string;
  snippet: string;
  relevance: number;
  domain: string;
}

interface ResearchStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
}

interface ResearchReport {
  id: string;
  topic: string;
  summary: string;
  sections: { heading: string; content: string }[];
  sources: ResearchSource[];
  keywords: string[];
  createdAt: string;
  depth: 'quick' | 'standard' | 'deep';
}

// ── Mock research simulation ──────────────────────────────────────────────────

const MOCK_STEPS: ResearchStep[] = [
  { id: '1', label: 'Parsing query & generating sub-queries', status: 'pending' },
  { id: '2', label: 'Searching primary sources', status: 'pending' },
  { id: '3', label: 'Fetching & extracting content', status: 'pending' },
  { id: '4', label: 'Cross-referencing & deduplication', status: 'pending' },
  { id: '5', label: 'Synthesising findings with LLM', status: 'pending' },
  { id: '6', label: 'Generating structured report', status: 'pending' },
];

function buildMockReport(topic: string, depth: ResearchReport['depth']): ResearchReport {
  return {
    id: `report-${Date.now()}`,
    topic,
    summary: `Comprehensive analysis of "${topic}" synthesised from multiple authoritative sources. The research identifies key trends, leading methodologies, and open challenges in the field, providing actionable insights for practitioners and researchers alike.`,
    sections: [
      {
        heading: 'Overview',
        content: `"${topic}" represents a rapidly evolving domain at the intersection of advanced computation and real-world applicability. Recent breakthroughs have dramatically lowered the barrier to adoption, enabling organisations of all sizes to leverage state-of-the-art capabilities.`,
      },
      {
        heading: 'Key Findings',
        content:
          '1. Performance on standard benchmarks has improved 40% year-over-year.\n2. Cost-per-inference has dropped by an order of magnitude since 2022.\n3. Open-source alternatives now rival proprietary solutions on most metrics.\n4. Multi-modal and agentic frameworks are the primary growth vectors.',
      },
      {
        heading: 'Current Challenges',
        content:
          'Hallucination, context-window limitations, latency for real-time use-cases, and regulatory uncertainty around AI-generated content remain the most frequently cited obstacles.',
      },
      ...(depth !== 'quick'
        ? [
            {
              heading: 'Emerging Trends',
              content:
                'Small Language Models (SLMs) optimised for edge deployment, mixture-of-experts architectures, and retrieval-augmented generation (RAG) pipelines are dominating 2024–2025 research output.',
            },
          ]
        : []),
      ...(depth === 'deep'
        ? [
            {
              heading: 'Technical Deep-Dive',
              content:
                'Transformer attention complexity scales quadratically with sequence length; recent work on linear-attention variants (Mamba, RWKV) and sparse-attention (Longformer, BigBird) offers O(n) alternatives. Flash-Attention 2/3 substantially reduces GPU memory bandwidth bottlenecks.',
            },
            {
              heading: 'Competitive Landscape',
              content:
                'OpenAI, Anthropic, Google DeepMind, Meta AI, Mistral AI, and Cohere remain the dominant commercial players. Hugging Face acts as the central hub for open-source distribution, with >500 k public models as of Q1 2025.',
            },
          ]
        : []),
      {
        heading: 'Recommendations',
        content:
          'Start with RAG over proprietary data before fine-tuning. Adopt LLMOps tooling early (MLflow, Weights & Biases, or LangSmith). Design for multi-model fallback from day one.',
      },
    ],
    sources: [
      {
        id: 's1',
        title: 'Advances in Large Language Models – Survey 2024',
        url: 'https://arxiv.org/abs/2402.example',
        snippet: 'A comprehensive survey covering architectural improvements, training strategies, and emergent capabilities across 120+ models released in 2023–2024.',
        relevance: 0.97,
        domain: 'arxiv.org',
      },
      {
        id: 's2',
        title: 'State of AI Report 2024',
        url: 'https://www.stateof.ai/2024',
        snippet: 'Annual analysis of AI research output, industry adoption, safety developments, and geopolitical dynamics authored by Nathan Benaich & Air Street Capital.',
        relevance: 0.93,
        domain: 'stateof.ai',
      },
      {
        id: 's3',
        title: 'Hugging Face Model Hub Statistics',
        url: 'https://huggingface.co/models',
        snippet: 'Real-time statistics on open-source model availability, downloads, and trending repositories in the ML community.',
        relevance: 0.88,
        domain: 'huggingface.co',
      },
      {
        id: 's4',
        title: 'LLM Benchmarks – HELM Holistic Evaluation',
        url: 'https://crfm.stanford.edu/helm',
        snippet: "Stanford CRFM holistic evaluation framework measuring accuracy, calibration, robustness, fairness, and efficiency across 42 scenarios.",
        relevance: 0.85,
        domain: 'stanford.edu',
      },
    ],
    keywords: [topic, 'AI', 'LLM', 'machine learning', 'research', 'automation'],
    createdAt: new Date().toISOString(),
    depth,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepItem({ step }: { step: ResearchStep }) {
  const icons = {
    pending: <Clock className="w-4 h-4 text-dark-500" />,
    running: <RefreshCw className="w-4 h-4 text-neon-cyan animate-spin" />,
    done: <CheckCircle className="w-4 h-4 text-neon-green" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
  };
  return (
    <div className="flex items-center gap-3 py-1.5">
      {icons[step.status]}
      <span
        className={`text-sm ${
          step.status === 'done'
            ? 'text-dark-400 line-through'
            : step.status === 'running'
            ? 'text-neon-cyan'
            : 'text-dark-400'
        }`}
      >
        {step.label}
      </span>
      {step.detail && (
        <span className="text-xs text-dark-500 ml-auto">{step.detail}</span>
      )}
    </div>
  );
}

function SourceCard({ source }: { source: ResearchSource }) {
  return (
    <div className="p-3 bg-dark-900 border border-glass-border rounded-lg hover:border-neon-cyan/40 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs text-neon-cyan font-mono">{source.domain}</span>
        <span className="text-xs text-neon-green font-mono">
          {Math.round(source.relevance * 100)}%
        </span>
      </div>
      <h4 className="text-sm font-medium text-white mb-1 line-clamp-1">{source.title}</h4>
      <p className="text-xs text-dark-400 line-clamp-2">{source.snippet}</p>
      <button
        className="mt-2 text-xs text-neon-cyan hover:underline flex items-center gap-1"
        onClick={() => {
          if ((window as any).electronAPI) {
            (window as any).electronAPI.openExternal(source.url);
          } else {
            window.open(source.url, '_blank');
          }
        }}
      >
        <Globe className="w-3 h-3" /> View source
      </button>
    </div>
  );
}

function ReportSection({
  section,
  index,
}: {
  section: { heading: string; content: string };
  index: number;
}) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="border border-glass-border rounded-lg overflow-hidden mb-3">
      <button
        className="w-full flex items-center justify-between p-3 bg-dark-900/60 hover:bg-dark-900 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-semibold text-white">{section.heading}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-dark-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-dark-400" />
        )}
      </button>
      {open && (
        <div className="p-4 bg-dark-950/60 text-sm text-dark-300 leading-relaxed whitespace-pre-line">
          {section.content}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ResearchAssistant() {
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState<ResearchReport['depth']>('standard');
  const [steps, setSteps] = useState<ResearchStep[]>(MOCK_STEPS.map((s) => ({ ...s })));
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [savedReports, setSavedReports] = useState<ResearchReport[]>([]);
  const [viewingSaved, setViewingSaved] = useState(false);
  const abortRef = useRef(false);

  const runResearch = useCallback(async () => {
    if (!topic.trim() || phase === 'running') return;
    abortRef.current = false;
    setPhase('running');
    setReport(null);
    const freshSteps = MOCK_STEPS.map((s) => ({ ...s, status: 'pending' as const }));
    setSteps(freshSteps);

    for (let i = 0; i < freshSteps.length; i++) {
      if (abortRef.current) break;
      setSteps((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status: 'running' } : s))
      );
      const delay = depth === 'quick' ? 400 : depth === 'standard' ? 700 : 1100;
      await new Promise((r) => setTimeout(r, delay));
      if (abortRef.current) break;
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'done', detail: `${(Math.random() * 50 + 10).toFixed(0)} items` } : s
        )
      );
    }

    if (!abortRef.current) {
      const generatedReport = buildMockReport(topic, depth);
      setReport(generatedReport);
      setPhase('done');

      if ((window as any).electronAPI) {
        (window as any).electronAPI.showNotification(
          'Research Complete',
          `Report for "${topic}" is ready.`
        );
      }
    }
  }, [topic, depth, phase]);

  const stopResearch = useCallback(() => {
    abortRef.current = true;
    setPhase('idle');
  }, []);

  const saveReport = useCallback(() => {
    if (!report) return;
    setSavedReports((prev) => [report, ...prev.filter((r) => r.id !== report.id)]);
  }, [report]);

  const exportMarkdown = useCallback(() => {
    if (!report) return;
    const md = [
      `# ${report.topic}`,
      `_Generated: ${new Date(report.createdAt).toLocaleString()}  |  Depth: ${report.depth}_`,
      '',
      `## Summary`,
      report.summary,
      '',
      ...report.sections.flatMap((s) => [`## ${s.heading}`, s.content, '']),
      '## Sources',
      ...report.sources.map((s) => `- [${s.title}](${s.url}) — ${s.domain}`),
    ].join('\n');

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.topic.replace(/\s+/g, '-').toLowerCase()}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  const copyMarkdown = useCallback(() => {
    if (!report) return;
    const md = [
      `# ${report.topic}`,
      '',
      report.summary,
      '',
      ...report.sections.flatMap((s) => [`## ${s.heading}`, s.content, '']),
    ].join('\n');
    navigator.clipboard.writeText(md);
  }, [report]);

  return (
    <div className="flex h-full bg-dark-950 text-white font-mono">
      {/* ── Left panel: query + steps ── */}
      <div className="w-80 flex-shrink-0 border-r border-glass-border flex flex-col">
        <div className="p-4 border-b border-glass-border">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-neon-cyan" />
            <h2 className="text-lg font-bold text-neon-cyan tracking-wider">
              RESEARCH ASSISTANT
            </h2>
          </div>

          {/* Topic input */}
          <div className="mb-3">
            <label className="text-xs text-dark-400 uppercase tracking-widest mb-1 block">
              Research Topic
            </label>
            <textarea
              className="w-full bg-dark-900 border border-glass-border rounded-lg px-3 py-2 text-sm text-white placeholder-dark-500 resize-none focus:outline-none focus:border-neon-cyan/60 h-20"
              placeholder="e.g. Transformer architectures for real-time robotics control"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  runResearch();
                }
              }}
              disabled={phase === 'running'}
            />
          </div>

          {/* Depth selector */}
          <div className="mb-4">
            <label className="text-xs text-dark-400 uppercase tracking-widest mb-1 block">
              Depth
            </label>
            <div className="flex gap-2">
              {(['quick', 'standard', 'deep'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  className={`flex-1 py-1 rounded text-xs font-bold uppercase tracking-widest border transition-colors ${
                    depth === d
                      ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10'
                      : 'border-glass-border text-dark-400 hover:border-dark-500'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Start/Stop button */}
          {phase === 'running' ? (
            <button
              onClick={stopResearch}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-900/30 border border-red-500/40 text-red-400 hover:bg-red-900/50 transition-colors font-bold"
            >
              <X className="w-4 h-4" /> Stop Research
            </button>
          ) : (
            <button
              onClick={runResearch}
              disabled={!topic.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/20 transition-colors font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Search className="w-4 h-4" />
              {phase === 'done' ? 'Re-run Research' : 'Start Research'}
            </button>
          )}
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs text-dark-500 uppercase tracking-widest mb-3">
            Agent Steps
          </p>
          {steps.map((step) => (
            <StepItem key={step.id} step={step} />
          ))}
        </div>

        {/* Saved reports */}
        <div className="border-t border-glass-border p-4">
          <button
            className="flex items-center gap-2 text-xs text-dark-400 hover:text-neon-cyan transition-colors w-full"
            onClick={() => setViewingSaved((v) => !v)}
          >
            <Bookmark className="w-4 h-4" />
            <span>Saved Reports ({savedReports.length})</span>
            {viewingSaved ? (
              <ChevronDown className="w-3 h-3 ml-auto" />
            ) : (
              <ChevronRight className="w-3 h-3 ml-auto" />
            )}
          </button>
          {viewingSaved && savedReports.length > 0 && (
            <div className="mt-2 space-y-1">
              {savedReports.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left text-xs text-dark-300 hover:text-white px-2 py-1.5 rounded hover:bg-dark-900 transition-colors truncate"
                  onClick={() => setReport(r)}
                >
                  <span className="text-neon-cyan">[{r.depth}]</span> {r.topic}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: report ── */}
      <div className="flex-1 overflow-y-auto">
        {!report && phase !== 'running' && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Network className="w-16 h-16 text-dark-700 mb-6" />
            <h3 className="text-xl font-bold text-dark-500 mb-2">
              No Research Report Yet
            </h3>
            <p className="text-dark-600 max-w-sm">
              Enter a research topic on the left, choose your depth, and click "Start Research"
              to generate a structured report powered by AI agents.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-dark-500 w-full max-w-sm">
              {[
                { icon: <Zap className="w-4 h-4" />, label: 'Quick', desc: '~2s, overview' },
                { icon: <BookOpen className="w-4 h-4" />, label: 'Standard', desc: '~5s, detailed' },
                { icon: <Database className="w-4 h-4" />, label: 'Deep', desc: '~8s, exhaustive' },
              ].map((d) => (
                <div key={d.label} className="p-3 bg-dark-900 rounded-lg border border-glass-border">
                  <div className="flex items-center gap-1 mb-1 text-neon-cyan">
                    {d.icon}
                    <span className="font-bold">{d.label}</span>
                  </div>
                  <span>{d.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'running' && !report && (
          <div className="flex flex-col items-center justify-center h-full">
            <RefreshCw className="w-12 h-12 text-neon-cyan animate-spin mb-4" />
            <p className="text-neon-cyan font-bold">Researching…</p>
            <p className="text-dark-500 text-sm mt-1">{topic}</p>
          </div>
        )}

        {report && (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 uppercase tracking-widest">
                    {report.depth}
                  </span>
                  <span className="text-xs text-dark-500">
                    {new Date(report.createdAt).toLocaleString()}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white">{report.topic}</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveReport}
                  className="p-2 rounded-lg bg-dark-900 border border-glass-border text-dark-400 hover:text-neon-cyan hover:border-neon-cyan/40 transition-colors"
                  title="Save report"
                >
                  <Star className="w-4 h-4" />
                </button>
                <button
                  onClick={copyMarkdown}
                  className="p-2 rounded-lg bg-dark-900 border border-glass-border text-dark-400 hover:text-neon-cyan hover:border-neon-cyan/40 transition-colors"
                  title="Copy as Markdown"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={exportMarkdown}
                  className="p-2 rounded-lg bg-dark-900 border border-glass-border text-dark-400 hover:text-neon-cyan hover:border-neon-cyan/40 transition-colors"
                  title="Export Markdown"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: report.topic, text: report.summary });
                    }
                  }}
                  className="p-2 rounded-lg bg-dark-900 border border-glass-border text-dark-400 hover:text-neon-cyan hover:border-neon-cyan/40 transition-colors"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-dark-900/60 border border-neon-cyan/20 rounded-xl mb-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-neon-cyan" />
                <span className="text-xs uppercase tracking-widest text-neon-cyan font-bold">
                  Executive Summary
                </span>
              </div>
              <p className="text-dark-300 text-sm leading-relaxed">{report.summary}</p>
            </div>

            {/* Keywords */}
            <div className="flex flex-wrap gap-2 mb-6">
              {report.keywords.map((kw) => (
                <span
                  key={kw}
                  className="text-xs px-2 py-1 rounded-full bg-neon-purple/10 border border-neon-purple/30 text-neon-purple"
                >
                  {kw}
                </span>
              ))}
            </div>

            {/* Sections */}
            <div className="mb-6">
              <h2 className="text-sm uppercase tracking-widest text-dark-400 mb-3 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" /> Report Sections
              </h2>
              {report.sections.map((s, i) => (
                <ReportSection key={s.heading} section={s} index={i} />
              ))}
            </div>

            {/* Sources */}
            <div>
              <h2 className="text-sm uppercase tracking-widest text-dark-400 mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Sources ({report.sources.length})
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {report.sources.map((source) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
