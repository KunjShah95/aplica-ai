import { useState } from 'react';
import {
  Calendar,
  Clock,
  Play,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  XCircle,
  Loader,
  Brain,
  Globe,
  Briefcase,
  MessageSquare,
  Download,
  Zap,
  Bell,
  BellOff,
  ChevronDown,
  RefreshCw,
  Activity,
  ToggleLeft,
  ToggleRight,
  Filter,
  AlignLeft,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type TaskType = 'research' | 'browser' | 'auto-apply' | 'agent-chat' | 'export' | 'webhook';
type RunStatus = 'success' | 'failed' | 'running' | 'pending';
type CronPreset = 'hourly' | 'daily-9am' | 'weekly-mon' | 'custom';
type HistoryFilter = 'all' | 'success' | 'failed' | 'running';
type ActiveTab = 'tasks' | 'history';

interface TaskParams {
  query?: string;
  depth?: string;
  url?: string;
  selector?: string;
  keywords?: string;
  minSalary?: string;
  message?: string;
  format?: string;
  webhookUrl?: string;
}

interface ScheduledTask {
  id: string;
  name: string;
  type: TaskType;
  cron: string;
  cronPreset: CronPreset;
  cronHuman: string;
  nextRun: string;
  lastStatus: RunStatus | null;
  enabled: boolean;
  notifySuccess: boolean;
  notifyFailure: boolean;
  params: TaskParams;
}

interface RunRecord {
  id: string;
  taskId: string;
  taskName: string;
  startTime: string;
  duration: string;
  status: RunStatus;
  logPreview: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const INITIAL_TASKS: ScheduledTask[] = [
  {
    id: 't1',
    name: 'Daily Research Digest',
    type: 'research',
    cron: '0 9 * * *',
    cronPreset: 'daily-9am',
    cronHuman: 'Every day at 9:00 AM',
    nextRun: 'Tomorrow, 9:00 AM',
    lastStatus: 'success',
    enabled: true,
    notifySuccess: true,
    notifyFailure: true,
    params: { query: 'AI job market trends 2025', depth: '5' },
  },
  {
    id: 't2',
    name: 'Job Board Scan',
    type: 'browser',
    cron: '0 */6 * * *',
    cronPreset: 'custom',
    cronHuman: 'Every 6 hours',
    nextRun: 'In 2 hours',
    lastStatus: 'success',
    enabled: true,
    notifySuccess: false,
    notifyFailure: true,
    params: { url: 'https://linkedin.com/jobs', selector: '.job-card' },
  },
  {
    id: 't3',
    name: 'Auto Apply to Matching Jobs',
    type: 'auto-apply',
    cron: '0 10 * * 1-5',
    cronPreset: 'custom',
    cronHuman: 'Weekdays at 10:00 AM',
    nextRun: 'Monday, 10:00 AM',
    lastStatus: 'failed',
    enabled: false,
    notifySuccess: true,
    notifyFailure: true,
    params: { keywords: 'TypeScript, React, Node.js', minSalary: '120000' },
  },
  {
    id: 't4',
    name: 'Knowledge Base Backup',
    type: 'export',
    cron: '0 0 * * 0',
    cronPreset: 'weekly-mon',
    cronHuman: 'Every Sunday at midnight',
    nextRun: 'Sunday, 12:00 AM',
    lastStatus: 'success',
    enabled: true,
    notifySuccess: false,
    notifyFailure: true,
    params: { format: 'json' },
  },
  {
    id: 't5',
    name: 'Weekly Agent Summary',
    type: 'agent-chat',
    cron: '0 8 * * 1',
    cronPreset: 'weekly-mon',
    cronHuman: 'Every Monday at 8:00 AM',
    nextRun: 'Monday, 8:00 AM',
    lastStatus: 'success',
    enabled: true,
    notifySuccess: true,
    notifyFailure: true,
    params: { message: 'Summarize my job search progress and suggest next steps.' },
  },
  {
    id: 't6',
    name: 'Browser Monitoring',
    type: 'browser',
    cron: '0 * * * *',
    cronPreset: 'hourly',
    cronHuman: 'Every hour',
    nextRun: 'In 45 minutes',
    lastStatus: 'running',
    enabled: true,
    notifySuccess: false,
    notifyFailure: true,
    params: { url: 'https://news.ycombinator.com', selector: '.titleline' },
  },
  {
    id: 't7',
    name: 'Salary Data Webhook',
    type: 'webhook',
    cron: '0 12 * * *',
    cronPreset: 'daily-9am',
    cronHuman: 'Every day at noon',
    nextRun: 'Today, 12:00 PM',
    lastStatus: null,
    enabled: false,
    notifySuccess: false,
    notifyFailure: false,
    params: { webhookUrl: 'https://hooks.example.com/salary-update' },
  },
];

const INITIAL_HISTORY: RunRecord[] = [
  { id: 'r1',  taskId: 't1', taskName: 'Daily Research Digest',        startTime: 'Today, 9:00 AM',     duration: '1m 42s', status: 'success', logPreview: 'Fetched 14 sources. Summarized 6 articles. Report saved.' },
  { id: 'r2',  taskId: 't2', taskName: 'Job Board Scan',               startTime: 'Today, 6:00 AM',     duration: '38s',    status: 'success', logPreview: 'Found 23 new listings. 5 match profile. Added to queue.' },
  { id: 'r3',  taskId: 't6', taskName: 'Browser Monitoring',           startTime: 'Today, 8:00 AM',     duration: '12s',    status: 'success', logPreview: 'Scraped 30 items. No anomalies detected.' },
  { id: 'r4',  taskId: 't3', taskName: 'Auto Apply to Matching Jobs',  startTime: 'Yesterday, 10:00 AM',duration: '5m 11s', status: 'failed',  logPreview: 'ERROR: CAPTCHA detected on lever.co. Aborted after 3 retries.' },
  { id: 'r5',  taskId: 't5', taskName: 'Weekly Agent Summary',         startTime: 'Mon, 8:00 AM',       duration: '2m 03s', status: 'success', logPreview: 'Summary generated. 12 applications tracked. 3 interviews scheduled.' },
  { id: 'r6',  taskId: 't4', taskName: 'Knowledge Base Backup',        startTime: 'Sun, 12:00 AM',      duration: '47s',    status: 'success', logPreview: 'Exported 412 documents to JSON. Archive: kb_backup_2025-07-20.zip' },
  { id: 'r7',  taskId: 't1', taskName: 'Daily Research Digest',        startTime: 'Yesterday, 9:00 AM', duration: '2m 05s', status: 'success', logPreview: 'Fetched 11 sources. Summarized 8 articles. Report saved.' },
  { id: 'r8',  taskId: 't2', taskName: 'Job Board Scan',               startTime: 'Yesterday, 6:00 PM', duration: '41s',    status: 'success', logPreview: 'Found 17 new listings. 2 match profile. Added to queue.' },
  { id: 'r9',  taskId: 't6', taskName: 'Browser Monitoring',           startTime: 'Today, 7:00 AM',     duration: '14s',    status: 'success', logPreview: 'Scraped 30 items. 1 item flagged for review.' },
  { id: 'r10', taskId: 't2', taskName: 'Job Board Scan',               startTime: 'Today, 12:00 PM',    duration: '—',      status: 'running', logPreview: 'Scanning linkedin.com/jobs... (step 2/4)' },
  { id: 'r11', taskId: 't3', taskName: 'Auto Apply to Matching Jobs',  startTime: 'Mon, 10:00 AM',      duration: '3m 50s', status: 'failed',  logPreview: 'ERROR: Resume upload failed on greenhouse.io. Retried 3x.' },
  { id: 'r12', taskId: 't6', taskName: 'Browser Monitoring',           startTime: 'Today, 9:00 AM',     duration: '11s',    status: 'success', logPreview: 'Scraped 30 items. No anomalies detected.' },
];

// ── Config Maps ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<TaskType, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  research:    { label: 'Research',     icon: <Brain size={14} />,       color: 'text-neon-purple',  bg: 'bg-neon-purple/10',  border: 'border-neon-purple/40' },
  browser:     { label: 'Browser',      icon: <Globe size={14} />,       color: 'text-neon-cyan',    bg: 'bg-neon-cyan/10',    border: 'border-neon-cyan/40' },
  'auto-apply':{ label: 'Auto Apply',   icon: <Briefcase size={14} />,   color: 'text-neon-amber',   bg: 'bg-neon-amber/10',   border: 'border-neon-amber/40' },
  'agent-chat':{ label: 'Agent Chat',   icon: <MessageSquare size={14} />, color: 'text-neon-green', bg: 'bg-neon-green/10',   border: 'border-neon-green/40' },
  export:      { label: 'Export',       icon: <Download size={14} />,    color: 'text-neon-magenta', bg: 'bg-neon-magenta/10', border: 'border-neon-magenta/40' },
  webhook:     { label: 'Webhook',      icon: <Zap size={14} />,         color: 'text-neon-pink',    bg: 'bg-neon-pink/10',    border: 'border-neon-pink/40' },
};

const STATUS_CONFIG: Record<RunStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  success: { label: 'Success', icon: <CheckCircle size={12} />, color: 'text-neon-green',  bg: 'bg-neon-green/10' },
  failed:  { label: 'Failed',  icon: <XCircle size={12} />,     color: 'text-neon-pink',   bg: 'bg-neon-pink/10' },
  running: { label: 'Running', icon: <Loader size={12} className="animate-spin" />, color: 'text-neon-cyan', bg: 'bg-neon-cyan/10' },
  pending: { label: 'Pending', icon: <Clock size={12} />,       color: 'text-gray-400',    bg: 'bg-gray-400/10' },
};

const CRON_PRESETS: { value: CronPreset; label: string; cron: string; human: string }[] = [
  { value: 'hourly',     label: 'Every Hour',         cron: '0 * * * *',   human: 'Every hour' },
  { value: 'daily-9am',  label: 'Every Day at 9 AM',  cron: '0 9 * * *',   human: 'Every day at 9:00 AM' },
  { value: 'weekly-mon', label: 'Every Monday',        cron: '0 9 * * 1',   human: 'Every Monday at 9:00 AM' },
  { value: 'custom',     label: 'Custom Cron',         cron: '',            human: '' },
];

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: 'research',    label: 'Research' },
  { value: 'browser',     label: 'Browser Agent' },
  { value: 'auto-apply',  label: 'Auto Apply' },
  { value: 'agent-chat',  label: 'Agent Chat' },
  { value: 'export',      label: 'Export' },
  { value: 'webhook',     label: 'Webhook' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function newTask(): ScheduledTask {
  return {
    id: `t${Date.now()}`,
    name: 'New Task',
    type: 'research',
    cron: '0 9 * * *',
    cronPreset: 'daily-9am',
    cronHuman: 'Every day at 9:00 AM',
    nextRun: '—',
    lastStatus: null,
    enabled: true,
    notifySuccess: true,
    notifyFailure: true,
    params: {},
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-dark-800 border border-glass-border rounded-lg px-4 py-3 flex flex-col gap-1 min-w-[120px]">
      <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold font-display ${color}`}>{value}</span>
    </div>
  );
}

function TypeBadge({ type }: { type: TaskType }) {
  const cfg = TYPE_CONFIG[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: RunStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono ${cfg.color} ${cfg.bg}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Params Editor ─────────────────────────────────────────────────────────────

function ParamsEditor({ type, params, onChange }: {
  type: TaskType;
  params: TaskParams;
  onChange: (p: TaskParams) => void;
}) {
  const field = (label: string, key: keyof TaskParams, placeholder: string, hint?: string) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400 font-mono">{label}</label>
      <input
        className="bg-dark-950 border border-glass-border rounded px-3 py-1.5 text-sm text-gray-200 font-mono placeholder-gray-600 focus:border-neon-cyan/50 focus:outline-none"
        value={(params[key] as string) ?? ''}
        onChange={e => onChange({ ...params, [key]: e.target.value })}
        placeholder={placeholder}
      />
      {hint && <span className="text-xs text-gray-600">{hint}</span>}
    </div>
  );

  if (type === 'research') return (
    <div className="flex flex-col gap-3">
      {field('Query', 'query', 'e.g. AI job market trends 2025')}
      {field('Depth', 'depth', 'e.g. 5', 'Number of sources to fetch')}
    </div>
  );
  if (type === 'browser') return (
    <div className="flex flex-col gap-3">
      {field('URL', 'url', 'https://example.com/page')}
      {field('CSS Selector', 'selector', 'e.g. .job-card', 'Element(s) to extract')}
    </div>
  );
  if (type === 'auto-apply') return (
    <div className="flex flex-col gap-3">
      {field('Keywords', 'keywords', 'e.g. TypeScript, React, Node.js')}
      {field('Min Salary (USD)', 'minSalary', 'e.g. 120000')}
    </div>
  );
  if (type === 'agent-chat') return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 font-mono">Prompt</label>
        <textarea
          rows={3}
          className="bg-dark-950 border border-glass-border rounded px-3 py-1.5 text-sm text-gray-200 font-mono placeholder-gray-600 focus:border-neon-cyan/50 focus:outline-none resize-none"
          value={params.message ?? ''}
          onChange={e => onChange({ ...params, message: e.target.value })}
          placeholder="Message to send to the agent…"
        />
      </div>
    </div>
  );
  if (type === 'export') return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 font-mono">Format</label>
        <select
          className="bg-dark-950 border border-glass-border rounded px-3 py-1.5 text-sm text-gray-200 font-mono focus:border-neon-cyan/50 focus:outline-none"
          value={params.format ?? 'json'}
          onChange={e => onChange({ ...params, format: e.target.value })}
        >
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="markdown">Markdown</option>
        </select>
      </div>
    </div>
  );
  if (type === 'webhook') return (
    <div className="flex flex-col gap-3">
      {field('Webhook URL', 'webhookUrl', 'https://hooks.example.com/…')}
    </div>
  );
  return null;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SchedulerView() {
  const [tasks, setTasks] = useState<ScheduledTask[]>(INITIAL_TASKS);
  const [history] = useState<RunRecord[]>(INITIAL_HISTORY);
  const [selectedId, setSelectedId] = useState<string | null>('t1');
  const [draft, setDraft] = useState<ScheduledTask | null>(INITIAL_TASKS[0]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('tasks');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [customCron, setCustomCron] = useState('');

  // ── Derived ──

  const totalTasks = tasks.length;
  const activeTasks = tasks.filter(t => t.enabled).length;
  const successToday = history.filter(r => r.status === 'success').length;
  const failedToday = history.filter(r => r.status === 'failed').length;

  const filteredHistory = historyFilter === 'all'
    ? history
    : history.filter(r => r.status === historyFilter);

  // ── Handlers ──

  function handleSelectTask(task: ScheduledTask) {
    setSelectedId(task.id);
    setDraft({ ...task });
    setCustomCron(task.cronPreset === 'custom' ? task.cron : '');
  }

  function handleNewTask() {
    const t = newTask();
    setTasks(prev => [t, ...prev]);
    setSelectedId(t.id);
    setDraft({ ...t });
    setCustomCron('');
    setActiveTab('tasks');
  }

  function handleToggleEnabled(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
    if (draft?.id === id) setDraft(d => d ? { ...d, enabled: !d.enabled } : d);
  }

  function handleDraftChange(patch: Partial<ScheduledTask>) {
    setDraft(d => d ? { ...d, ...patch } : d);
  }

  function handlePresetChange(preset: CronPreset) {
    const p = CRON_PRESETS.find(x => x.value === preset);
    if (!p) return;
    if (preset === 'custom') {
      handleDraftChange({ cronPreset: 'custom', cron: customCron, cronHuman: customCron || 'Custom expression' });
    } else {
      handleDraftChange({ cronPreset: preset, cron: p.cron, cronHuman: p.human });
      setCustomCron('');
    }
  }

  function handleCustomCronChange(val: string) {
    setCustomCron(val);
    handleDraftChange({ cron: val, cronHuman: val || 'Custom expression' });
  }

  function handleSave() {
    if (!draft) return;
    setTasks(prev => prev.map(t => t.id === draft.id ? { ...draft } : t));
  }

  function handleDelete() {
    if (!draft) return;
    setTasks(prev => prev.filter(t => t.id !== draft.id));
    setSelectedId(null);
    setDraft(null);
  }

  // ── Render ──

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-gray-200 font-body select-none overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border shrink-0">
        <div className="flex flex-col">
          <h1 className="text-xl font-display font-bold text-neon-cyan tracking-wider">Task Scheduler</h1>
          <p className="text-xs text-gray-500 mt-0.5">Automate recurring agent jobs — research, scans, applications, and more</p>
        </div>
        <button
          onClick={handleNewTask}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-sm font-mono hover:bg-neon-cyan/20 hover:border-neon-cyan/60 transition-colors"
        >
          <Plus size={15} />
          New Task
        </button>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-glass-border shrink-0 overflow-x-auto">
        <StatCard label="Total Tasks"        value={totalTasks}   color="text-gray-200" />
        <StatCard label="Active"             value={activeTasks}  color="text-neon-cyan" />
        <StatCard label="Successful Today"   value={successToday} color="text-neon-green" />
        <StatCard label="Failed Today"       value={failedToday}  color="text-neon-pink" />
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-glass-border shrink-0">
        {(['tasks', 'history'] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded text-xs font-mono capitalize transition-colors ${
              activeTab === tab
                ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'tasks' ? <span className="flex items-center gap-1.5"><Calendar size={12} />Tasks</span>
                             : <span className="flex items-center gap-1.5"><Activity size={12} />Run History</span>}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {activeTab === 'tasks' && (
          <>
            {/* Task List (60%) */}
            <div className="w-[60%] flex flex-col border-r border-glass-border overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {tasks.map(task => {
                  const cfg = TYPE_CONFIG[task.type];
                  const isSelected = task.id === selectedId;
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleSelectTask(task)}
                      className={`rounded-lg border px-4 py-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-dark-700 border-neon-cyan/40'
                          : 'bg-dark-800 border-glass-border hover:border-glass-hover hover:bg-dark-700'
                      }`}
                    >
                      {/* Row 1 */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`shrink-0 ${cfg.color}`}>{cfg.icon}</span>
                          <span className="font-mono font-semibold text-sm text-gray-100 truncate">{task.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <TypeBadge type={task.type} />
                          <button
                            onClick={e => handleToggleEnabled(task.id, e)}
                            className="transition-colors"
                            title={task.enabled ? 'Disable task' : 'Enable task'}
                          >
                            {task.enabled
                              ? <ToggleRight size={20} className="text-neon-cyan" />
                              : <ToggleLeft size={20} className="text-gray-600" />}
                          </button>
                        </div>
                      </div>

                      {/* Row 2 */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-mono">
                        <span className="flex items-center gap-1">
                          <RefreshCw size={11} />
                          {task.cronHuman}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          Next: {task.nextRun}
                        </span>
                        {task.lastStatus && (
                          <StatusBadge status={task.lastStatus} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detail / Editor Panel (40%) */}
            <div className="w-[40%] flex flex-col overflow-hidden">
              {draft ? (
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                  {/* Task Name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-mono uppercase tracking-wider">Task Name</label>
                    <input
                      className="bg-dark-950 border border-glass-border rounded px-3 py-2 text-sm text-gray-100 font-mono placeholder-gray-600 focus:border-neon-cyan/50 focus:outline-none"
                      value={draft.name}
                      onChange={e => handleDraftChange({ name: e.target.value })}
                    />
                  </div>

                  {/* Task Type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-mono uppercase tracking-wider">Task Type</label>
                    <div className="relative">
                      <select
                        className="w-full bg-dark-950 border border-glass-border rounded px-3 py-2 text-sm text-gray-200 font-mono appearance-none focus:border-neon-cyan/50 focus:outline-none"
                        value={draft.type}
                        onChange={e => handleDraftChange({ type: e.target.value as TaskType, params: {} })}
                      >
                        {TASK_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Schedule Builder */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-400 font-mono uppercase tracking-wider">Schedule</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CRON_PRESETS.map(p => (
                        <button
                          key={p.value}
                          onClick={() => handlePresetChange(p.value)}
                          className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
                            draft.cronPreset === p.value
                              ? 'bg-neon-purple/10 border-neon-purple/40 text-neon-purple'
                              : 'bg-dark-950 border-glass-border text-gray-400 hover:border-glass-hover hover:text-gray-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {draft.cronPreset === 'custom' && (
                      <div className="flex flex-col gap-1 mt-1">
                        <input
                          className="bg-dark-950 border border-glass-border rounded px-3 py-1.5 text-sm text-gray-200 font-mono placeholder-gray-600 focus:border-neon-cyan/50 focus:outline-none"
                          value={customCron}
                          onChange={e => handleCustomCronChange(e.target.value)}
                          placeholder="e.g. 0 */6 * * *"
                        />
                        <span className="text-xs text-gray-600 font-mono">
                          {customCron ? `→ ${customCron}` : 'Enter a valid cron expression'}
                        </span>
                      </div>
                    )}

                    {draft.cronPreset !== 'custom' && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-950 rounded border border-glass-border">
                        <RefreshCw size={12} className="text-neon-cyan shrink-0" />
                        <span className="text-xs text-neon-cyan font-mono">{draft.cronHuman}</span>
                        <span className="text-xs text-gray-600 font-mono ml-auto">{draft.cron}</span>
                      </div>
                    )}
                  </div>

                  {/* Parameters */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-400 font-mono uppercase tracking-wider">Parameters</label>
                    <div className="bg-dark-950 border border-glass-border rounded p-3">
                      <ParamsEditor
                        type={draft.type}
                        params={draft.params}
                        onChange={params => handleDraftChange({ params })}
                      />
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-400 font-mono uppercase tracking-wider">Notifications</label>
                    <div className="flex flex-col gap-2 bg-dark-950 border border-glass-border rounded p-3">
                      {[
                        { key: 'notifySuccess' as const, label: 'Notify on success', icon: <Bell size={13} className="text-neon-green" /> },
                        { key: 'notifyFailure' as const, label: 'Notify on failure', icon: <Bell size={13} className="text-neon-pink" /> },
                      ].map(({ key, label, icon }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={draft[key]}
                            onChange={e => handleDraftChange({ [key]: e.target.checked })}
                            className="accent-neon-cyan w-3.5 h-3.5"
                          />
                          {icon}
                          <span className="text-xs text-gray-300 font-mono group-hover:text-gray-100 transition-colors">{label}</span>
                          {!draft[key] && <BellOff size={11} className="text-gray-600 ml-auto" />}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 pb-4">
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-xs font-mono hover:bg-neon-cyan/20 transition-colors"
                    >
                      <Save size={13} />
                      Save
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs font-mono hover:bg-neon-green/20 transition-colors">
                      <Play size={13} />
                      Run Now
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neon-pink/10 border border-neon-pink/30 text-neon-pink text-xs font-mono hover:bg-neon-pink/20 transition-colors ml-auto"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-600">
                  <AlignLeft size={32} />
                  <p className="text-sm font-mono">Select a task to edit</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter Bar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-glass-border shrink-0">
              <Filter size={14} className="text-gray-500" />
              <span className="text-xs text-gray-500 font-mono">Filter:</span>
              {(['all', 'success', 'failed', 'running'] as HistoryFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className={`px-3 py-1 rounded text-xs font-mono capitalize transition-colors ${
                    historyFilter === f
                      ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {f}
                </button>
              ))}
              <span className="text-xs text-gray-600 font-mono ml-auto">{filteredHistory.length} records</span>
            </div>

            {/* History Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs font-mono">
                <thead className="sticky top-0 bg-dark-900 border-b border-glass-border">
                  <tr className="text-gray-500 text-left">
                    <th className="px-4 py-2 font-normal">Task</th>
                    <th className="px-4 py-2 font-normal">Start Time</th>
                    <th className="px-4 py-2 font-normal">Duration</th>
                    <th className="px-4 py-2 font-normal">Status</th>
                    <th className="px-4 py-2 font-normal">Log Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((run, i) => (
                    <tr
                      key={run.id}
                      className={`border-b border-glass-border transition-colors hover:bg-dark-700 ${
                        i % 2 === 0 ? 'bg-dark-800' : 'bg-dark-900'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-gray-200 whitespace-nowrap">{run.taskName}</td>
                      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{run.startTime}</td>
                      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{run.duration}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 max-w-sm truncate">{run.logPreview}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
