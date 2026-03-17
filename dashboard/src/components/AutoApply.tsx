import { useState, useCallback } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Download,
  Filter,
  Star,
  BarChart3,
  Target,
  ArrowRight,
  FileText,
  Bot,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Zap,
  TrendingUp,
  Award,
  MapPin,
  DollarSign,
  Building2,
  AlertCircle,
  Send,
  Edit3,
  Trash2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type AppStatus = 'queued' | 'applying' | 'applied' | 'interview' | 'offer' | 'rejected';
type Priority = 'high' | 'medium' | 'low';

interface JobApplication {
  id: string;
  company: string;
  role: string;
  location: string;
  salary?: string;
  status: AppStatus;
  priority: Priority;
  platform: string;
  url: string;
  matchScore: number;
  appliedAt?: string;
  coverLetter?: string;
  notes: string;
  tags: string[];
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_JOBS: JobApplication[] = [
  {
    id: '1',
    company: 'Anthropic',
    role: 'Senior AI Engineer',
    location: 'San Francisco, CA',
    salary: '$180k–$250k',
    status: 'interview',
    priority: 'high',
    platform: 'LinkedIn',
    url: '#',
    matchScore: 94,
    appliedAt: '2025-01-15',
    notes: 'Strong match — RAG + agent experience',
    tags: ['ai', 'ml', 'python'],
  },
  {
    id: '2',
    company: 'OpenAI',
    role: 'Research Engineer',
    location: 'Remote',
    salary: '$200k+',
    status: 'applied',
    priority: 'high',
    platform: 'Company Site',
    url: '#',
    matchScore: 88,
    appliedAt: '2025-01-14',
    notes: 'Requires RL background',
    tags: ['ai', 'research'],
  },
  {
    id: '3',
    company: 'Mistral AI',
    role: 'ML Infrastructure Engineer',
    location: 'Paris / Remote',
    salary: '€140k–€180k',
    status: 'queued',
    priority: 'medium',
    platform: 'Wellfound',
    url: '#',
    matchScore: 82,
    appliedAt: undefined,
    notes: 'European timezone preferred',
    tags: ['infrastructure', 'ml', 'gpu'],
  },
  {
    id: '4',
    company: 'DeepMind',
    role: 'Research Scientist',
    location: 'London, UK',
    salary: '£120k–£160k',
    status: 'applied',
    priority: 'high',
    platform: 'Company Site',
    url: '#',
    matchScore: 79,
    appliedAt: '2025-01-10',
    notes: 'PhD preferred but not required',
    tags: ['research', 'ml', 'rl'],
  },
  {
    id: '5',
    company: 'Cohere',
    role: 'Full Stack Engineer',
    location: 'Toronto / Remote',
    salary: 'CAD $150k+',
    status: 'rejected',
    priority: 'low',
    platform: 'LinkedIn',
    url: '#',
    matchScore: 71,
    appliedAt: '2025-01-05',
    notes: 'Rejected — over-qualified for the role',
    tags: ['fullstack', 'react', 'node'],
  },
  {
    id: '6',
    company: 'Hugging Face',
    role: 'Developer Advocate',
    location: 'Remote',
    salary: '$120k–$160k',
    status: 'offer',
    priority: 'high',
    platform: 'LinkedIn',
    url: '#',
    matchScore: 91,
    appliedAt: '2025-01-08',
    notes: 'Offer received! Reviewing terms',
    tags: ['ml', 'open-source', 'developer-relations'],
  },
  {
    id: '7',
    company: 'Stability AI',
    role: 'AI Product Manager',
    location: 'Remote',
    salary: '$130k–$170k',
    status: 'queued',
    priority: 'medium',
    platform: 'Indeed',
    url: '#',
    matchScore: 76,
    appliedAt: undefined,
    notes: 'Diffusion models background a plus',
    tags: ['product', 'ai', 'vision'],
  },
];

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AppStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  queued:    { label: 'Queued',    color: 'text-slate-400',   bg: 'bg-slate-400/10',   icon: <Clock className="w-3 h-3" /> },
  applying:  { label: 'Applying',  color: 'text-neon-amber',  bg: 'bg-neon-amber/10',  icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  applied:   { label: 'Applied',   color: 'text-neon-cyan',   bg: 'bg-neon-cyan/10',   icon: <Send className="w-3 h-3" /> },
  interview: { label: 'Interview', color: 'text-neon-purple', bg: 'bg-neon-purple/10', icon: <Award className="w-3 h-3" /> },
  offer:     { label: 'Offer',     color: 'text-neon-green',  bg: 'bg-neon-green/10',  icon: <CheckCircle className="w-3 h-3" /> },
  rejected:  { label: 'Rejected',  color: 'text-neon-pink',   bg: 'bg-neon-pink/10',   icon: <XCircle className="w-3 h-3" /> },
};

const PRIORITY_COLOR: Record<Priority, string> = {
  high:   'text-neon-pink',
  medium: 'text-neon-amber',
  low:    'text-slate-400',
};

// ── Cover Letter Generator ────────────────────────────────────────────────────

function CoverLetterModal({
  job,
  onClose,
}: {
  job: JobApplication;
  onClose: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [letter, setLetter] = useState('');
  const [done, setDone] = useState(false);

  const generate = useCallback(() => {
    setGenerating(true);
    setLetter('');
    setDone(false);
    const text = `Dear Hiring Manager,\n\nI am excited to apply for the ${job.role} position at ${job.company}. With my background in AI engineering, agentic systems, and full-stack development, I am confident I can make a meaningful contribution to your team.\n\nMy experience building multi-agent frameworks, RAG pipelines, and production LLM applications aligns directly with your requirements. I have shipped AI-powered products used by thousands of users, and I thrive in fast-moving research-oriented environments.\n\nI am particularly drawn to ${job.company}'s mission and would welcome the opportunity to contribute to your groundbreaking work. Thank you for considering my application.\n\nSincerely,\n[Your Name]`;

    let i = 0;
    const interval = setInterval(() => {
      i += 4;
      setLetter(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setGenerating(false);
        setDone(true);
      }
    }, 20);
  }, [job]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl bg-dark-900 border border-glass-border rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-neon-purple" />
            <h3 className="text-lg font-bold text-white">AI Cover Letter</h3>
            <span className="text-sm text-slate-400">— {job.role} @ {job.company}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="min-h-[280px] bg-dark-950 border border-glass-border rounded-xl p-4 mb-4 font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
          {letter || <span className="text-slate-600">Click "Generate" to create an AI-tailored cover letter…</span>}
          {generating && <span className="inline-block w-2 h-4 bg-neon-purple ml-0.5 animate-pulse" />}
        </div>

        <div className="flex gap-3">
          <button
            onClick={generate}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 glow-button-cyan rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            {generating ? 'Generating…' : 'Generate'}
          </button>
          {done && (
            <>
              <button
                onClick={() => navigator.clipboard?.writeText(letter)}
                className="px-4 py-2.5 bg-dark-700 border border-glass-border rounded-xl text-sm text-slate-300 hover:text-white hover:bg-dark-600 transition-colors"
              >
                Copy
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-neon-green/10 border border-neon-green/30 rounded-xl text-sm text-neon-green hover:bg-neon-green/20 transition-colors"
              >
                Use This
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar({ jobs }: { jobs: JobApplication[] }) {
  const counts = jobs.reduce(
    (acc, j) => { acc[j.status] = (acc[j.status] || 0) + 1; return acc; },
    {} as Record<AppStatus, number>
  );

  const stats = [
    { label: 'Total',       value: jobs.length,            icon: <Briefcase className="w-4 h-4" />, color: 'text-neon-cyan' },
    { label: 'Applied',     value: (counts.applied || 0) + (counts.applying || 0), icon: <Send className="w-4 h-4" />,         color: 'text-neon-cyan' },
    { label: 'Interviews',  value: counts.interview || 0,  icon: <Award className="w-4 h-4" />,         color: 'text-neon-purple' },
    { label: 'Offers',      value: counts.offer || 0,      icon: <CheckCircle className="w-4 h-4" />,   color: 'text-neon-green' },
    { label: 'Avg Match',   value: `${Math.round(jobs.reduce((s, j) => s + j.matchScore, 0) / (jobs.length || 1))}%`, icon: <Target className="w-4 h-4" />, color: 'text-neon-amber' },
    { label: 'Success Rate', value: `${Math.round((counts.offer || 0) / Math.max((counts.applied || 0) + (counts.interview || 0) + (counts.offer || 0), 1) * 100)}%`, icon: <TrendingUp className="w-4 h-4" />, color: 'text-neon-green' },
  ];

  return (
    <div className="grid grid-cols-6 gap-3 mb-6">
      {stats.map((s) => (
        <div key={s.label} className="glass-card p-4 text-center">
          <div className={`flex items-center justify-center gap-1 mb-1 ${s.color}`}>{s.icon}</div>
          <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Job Row ───────────────────────────────────────────────────────────────────

function JobRow({
  job,
  selected,
  onSelect,
  onCoverLetter,
  onDelete,
}: {
  job: JobApplication;
  selected: boolean;
  onSelect: () => void;
  onCoverLetter: () => void;
  onDelete: () => void;
}) {
  const sc = STATUS_CONFIG[job.status];
  const matchColor =
    job.matchScore >= 90 ? 'text-neon-green' :
    job.matchScore >= 75 ? 'text-neon-amber' : 'text-slate-400';

  return (
    <div
      className={`group flex items-center gap-4 px-5 py-4 border-b border-glass-border cursor-pointer transition-all duration-200 ${
        selected ? 'bg-neon-cyan/5 border-l-2 border-l-neon-cyan' : 'hover:bg-dark-700/30'
      }`}
      onClick={onSelect}
    >
      {/* Company + Role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Building2 className="w-3.5 h-3.5 text-neon-cyan shrink-0" />
          <span className="font-semibold text-white truncate">{job.company}</span>
          <span className="text-slate-400 truncate">— {job.role}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
          {job.salary && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{job.salary}</span>}
          <span>{job.platform}</span>
        </div>
      </div>

      {/* Match Score */}
      <div className={`text-sm font-mono font-bold w-12 text-center ${matchColor}`}>
        {job.matchScore}%
      </div>

      {/* Status Badge */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color} ${sc.bg}`}>
        {sc.icon}
        {sc.label}
      </div>

      {/* Priority */}
      <div className={`text-xs font-medium ${PRIORITY_COLOR[job.priority]} w-14 text-center`}>
        {job.priority}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onCoverLetter(); }}
          title="Generate cover letter"
          className="p-1.5 rounded-lg bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); window.open(job.url, '_blank'); }}
          title="Open listing"
          className="p-1.5 rounded-lg bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Remove"
          className="p-1.5 rounded-lg bg-neon-pink/10 text-neon-pink hover:bg-neon-pink/20 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Detail Pane ───────────────────────────────────────────────────────────────

function JobDetail({ job, onCoverLetter }: { job: JobApplication; onCoverLetter: () => void }) {
  const sc = STATUS_CONFIG[job.status];
  const matchColor =
    job.matchScore >= 90 ? 'text-neon-green' :
    job.matchScore >= 75 ? 'text-neon-amber' : 'text-slate-400';

  return (
    <div className="w-80 shrink-0 bg-dark-900 border-l border-glass-border p-6 overflow-y-auto">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-1">{job.role}</h3>
        <p className="text-neon-cyan font-semibold mb-3">{job.company}</p>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${sc.color} ${sc.bg} mb-4`}>
          {sc.icon} {sc.label}
        </div>

        <div className="space-y-2 text-sm text-slate-400">
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-neon-purple" />{job.location}</div>
          {job.salary && <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-neon-green" />{job.salary}</div>}
          <div className="flex items-center gap-2"><ExternalLink className="w-4 h-4 text-neon-amber" />{job.platform}</div>
          {job.appliedAt && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-neon-cyan" />Applied {job.appliedAt}</div>}
        </div>
      </div>

      {/* Match Score */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">AI Match Score</span>
          <span className={`text-2xl font-display font-bold ${matchColor}`}>{job.matchScore}%</span>
        </div>
        <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              job.matchScore >= 90 ? 'bg-neon-green' :
              job.matchScore >= 75 ? 'bg-neon-amber' : 'bg-slate-500'
            }`}
            style={{ width: `${job.matchScore}%` }}
          />
        </div>
      </div>

      {/* Notes */}
      {job.notes && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-neon-cyan uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-slate-300 bg-dark-800 rounded-lg p-3 border border-glass-border">
            {job.notes}
          </p>
        </div>
      )}

      {/* Tags */}
      {job.tags.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-neon-cyan uppercase tracking-wider mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {job.tags.map((t) => (
              <span key={t} className="px-2 py-0.5 bg-dark-700 border border-glass-border rounded-full text-xs text-slate-400">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={onCoverLetter}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 glow-button-cyan rounded-xl text-sm font-semibold"
        >
          <Bot className="w-4 h-4" />
          Generate Cover Letter
        </button>
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-700 border border-glass-border rounded-xl text-sm text-slate-300 hover:bg-dark-600 hover:text-white transition-colors">
          <Edit3 className="w-4 h-4" />
          Edit Application
        </button>
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-700 border border-glass-border rounded-xl text-sm text-slate-300 hover:bg-dark-600 hover:text-white transition-colors">
          <ExternalLink className="w-4 h-4" />
          Open Job Listing
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AutoApply() {
  const [jobs, setJobs] = useState<JobApplication[]>(MOCK_JOBS);
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_JOBS[0].id);
  const [coverLetterJob, setCoverLetterJob] = useState<JobApplication | null>(null);
  const [filterStatus, setFilterStatus] = useState<AppStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'matchScore' | 'company' | 'status'>('matchScore');
  const [showFilters, setShowFilters] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newJob, setNewJob] = useState({ company: '', role: '', url: '', platform: 'LinkedIn' });

  const selectedJob = jobs.find((j) => j.id === selectedId) ?? null;

  const filtered = jobs
    .filter((j) => filterStatus === 'all' || j.status === filterStatus)
    .filter(
      (j) =>
        !search ||
        j.company.toLowerCase().includes(search.toLowerCase()) ||
        j.role.toLowerCase().includes(search.toLowerCase()) ||
        j.tags.some((t) => t.includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'matchScore') return b.matchScore - a.matchScore;
      if (sortBy === 'company') return a.company.localeCompare(b.company);
      return a.status.localeCompare(b.status);
    });

  const handleScan = useCallback(() => {
    setIsScanning(true);
    setTimeout(() => {
      const newJ: JobApplication = {
        id: `new-${Date.now()}`,
        company: 'Inflection AI',
        role: 'Applied AI Engineer',
        location: 'Remote',
        salary: '$160k–$220k',
        status: 'queued',
        priority: 'high',
        platform: 'Wellfound',
        url: '#',
        matchScore: 87,
        notes: 'Auto-discovered by scanner',
        tags: ['ai', 'llm', 'python'],
      };
      setJobs((prev) => [newJ, ...prev]);
      setIsScanning(false);
    }, 2500);
  }, []);

  const handleAddJob = useCallback(() => {
    if (!newJob.company || !newJob.role) return;
    const j: JobApplication = {
      id: `custom-${Date.now()}`,
      ...newJob,
      location: 'Remote',
      status: 'queued',
      priority: 'medium',
      matchScore: 75,
      notes: '',
      tags: [],
    };
    setJobs((prev) => [j, ...prev]);
    setNewJob({ company: '', role: '', url: '', platform: 'LinkedIn' });
    setShowAddForm(false);
  }, [newJob]);

  const handleDelete = useCallback(
    (id: string) => {
      setJobs((prev) => prev.filter((j) => j.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId]
  );

  const exportCSV = useCallback(() => {
    const rows = [
      'Company,Role,Location,Status,Match Score,Platform,Applied At',
      ...jobs.map(
        (j) =>
          `"${j.company}","${j.role}","${j.location}",${j.status},${j.matchScore}%,${j.platform},${j.appliedAt || ''}`
      ),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aplica-applications.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [jobs]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border bg-dark-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-amber to-neon-pink flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Auto Apply</h2>
            <p className="text-xs text-slate-400">AI-powered job application automation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 bg-dark-700 border border-glass-border rounded-lg text-xs text-slate-300 hover:text-white hover:bg-dark-600 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="px-3 py-1.5 bg-dark-700 border border-glass-border rounded-lg text-xs text-slate-300 hover:text-white hover:bg-dark-600 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Job
          </button>
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="px-4 py-1.5 glow-button-cyan rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {isScanning ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />Scanning…</>
            ) : (
              <><Zap className="w-4 h-4" />AI Scan Jobs</>
            )}
          </button>
        </div>
      </div>

      {/* Add Job Form */}
      {showAddForm && (
        <div className="px-6 py-4 border-b border-glass-border bg-dark-800/50">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Company</label>
              <input
                value={newJob.company}
                onChange={(e) => setNewJob((p) => ({ ...p, company: e.target.value }))}
                placeholder="e.g. Anthropic"
                className="w-full bg-dark-900 border border-glass-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Role</label>
              <input
                value={newJob.role}
                onChange={(e) => setNewJob((p) => ({ ...p, role: e.target.value }))}
                placeholder="e.g. Senior AI Engineer"
                className="w-full bg-dark-900 border border-glass-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Platform</label>
              <select
                value={newJob.platform}
                onChange={(e) => setNewJob((p) => ({ ...p, platform: e.target.value }))}
                className="w-full bg-dark-900 border border-glass-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
              >
                {['LinkedIn', 'Indeed', 'Wellfound', 'Company Site', 'Other'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddJob}
              className="px-4 py-2 glow-button-cyan rounded-lg text-sm font-semibold"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-dark-700 border border-glass-border rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="px-6 py-4 border-b border-glass-border">
        <StatsBar jobs={jobs} />

        {/* Filters & Sort */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs…"
              className="w-full bg-dark-800 border border-glass-border rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50"
            />
          </div>

          <div className="flex gap-1">
            {(['all', 'queued', 'applied', 'interview', 'offer', 'rejected'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  filterStatus === s
                    ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-dark-800 border border-glass-border rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="matchScore">Sort: Match Score</option>
            <option value="company">Sort: Company</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Job List */}
        <div className="flex-1 overflow-y-auto">
          {/* Table Header */}
          <div className="flex items-center gap-4 px-5 py-2 bg-dark-900/80 border-b border-glass-border text-xs font-semibold text-neon-cyan uppercase tracking-wider sticky top-0 z-10">
            <div className="flex-1">Company / Role</div>
            <div className="w-12 text-center">Match</div>
            <div className="w-24 text-center">Status</div>
            <div className="w-14 text-center">Priority</div>
            <div className="w-24" />
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Briefcase className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-lg">No jobs found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            filtered.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                selected={selectedId === job.id}
                onSelect={() => setSelectedId(job.id)}
                onCoverLetter={() => setCoverLetterJob(job)}
                onDelete={() => handleDelete(job.id)}
              />
            ))
          )}
        </div>

        {/* Detail Pane */}
        {selectedJob && (
          <JobDetail
            job={selectedJob}
            onCoverLetter={() => setCoverLetterJob(selectedJob)}
          />
        )}
      </div>

      {/* Cover Letter Modal */}
      {coverLetterJob && (
        <CoverLetterModal
          job={coverLetterJob}
          onClose={() => setCoverLetterJob(null)}
        />
      )}
    </div>
  );
}
