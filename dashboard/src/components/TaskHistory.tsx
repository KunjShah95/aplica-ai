import React, { useState, useMemo } from "react";
import {
  History,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Download,
  RefreshCw,
  Shield,
  Zap,
  Database,
  Globe,
} from "lucide-react";

export type TaskStatus = "completed" | "failed" | "running" | "pending";
export type TaskCategory = "workflow" | "tool" | "agent" | "memory" | "security" | "api";

export interface TaskRecord {
  id: string;
  userId: string;
  sessionId: string;
  type: string;
  category: TaskCategory;
  description: string;
  status: TaskStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  tokensUsed?: number;
  costUsd?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

const DEMO_TASKS: TaskRecord[] = [
  {
    id: "t-001",
    userId: "user-1",
    sessionId: "sess-abc",
    type: "workflow_execution",
    category: "workflow",
    description: "Execute 'Daily Digest' workflow",
    status: "completed",
    startedAt: new Date(Date.now() - 3600000 * 2),
    completedAt: new Date(Date.now() - 3600000 * 2 + 5200),
    durationMs: 5200,
    tokensUsed: 1840,
    costUsd: 0.0092,
  },
  {
    id: "t-002",
    userId: "user-1",
    sessionId: "sess-abc",
    type: "web_search",
    category: "tool",
    description: "Search: 'latest AI news'",
    status: "completed",
    startedAt: new Date(Date.now() - 3600000),
    completedAt: new Date(Date.now() - 3600000 + 980),
    durationMs: 980,
  },
  {
    id: "t-003",
    userId: "user-2",
    sessionId: "sess-xyz",
    type: "llm_inference",
    category: "agent",
    description: "Generate code: Python data analysis script",
    status: "completed",
    startedAt: new Date(Date.now() - 1800000),
    completedAt: new Date(Date.now() - 1800000 + 2340),
    durationMs: 2340,
    tokensUsed: 3210,
    costUsd: 0.0161,
  },
  {
    id: "t-004",
    userId: "user-1",
    sessionId: "sess-def",
    type: "memory_summarize",
    category: "memory",
    description: "Episodic summarization (24 messages → 1 summary)",
    status: "completed",
    startedAt: new Date(Date.now() - 900000),
    completedAt: new Date(Date.now() - 900000 + 340),
    durationMs: 340,
    tokensUsed: 420,
    costUsd: 0.0021,
  },
  {
    id: "t-005",
    userId: "user-2",
    sessionId: "sess-xyz",
    type: "shell_execution",
    category: "tool",
    description: "Shell: npm run build",
    status: "failed",
    startedAt: new Date(Date.now() - 600000),
    completedAt: new Date(Date.now() - 600000 + 12000),
    durationMs: 12000,
    error: "Build failed: TypeScript error in src/index.ts line 42",
  },
  {
    id: "t-006",
    userId: "user-1",
    sessionId: "sess-ghi",
    type: "safety_check",
    category: "security",
    description: "Constitutional AI validation",
    status: "completed",
    startedAt: new Date(Date.now() - 300000),
    completedAt: new Date(Date.now() - 300000 + 25),
    durationMs: 25,
    metadata: { safe: true, score: 0.97 },
  },
  {
    id: "t-007",
    userId: "user-1",
    sessionId: "sess-ghi",
    type: "api_call",
    category: "api",
    description: "REST API: GET /api/v1/weather (OpenWeatherMap)",
    status: "completed",
    startedAt: new Date(Date.now() - 180000),
    completedAt: new Date(Date.now() - 180000 + 430),
    durationMs: 430,
  },
  {
    id: "t-008",
    userId: "user-2",
    sessionId: "sess-jkl",
    type: "llm_inference",
    category: "agent",
    description: "Chat response with RAG context",
    status: "running",
    startedAt: new Date(Date.now() - 5000),
    tokensUsed: 890,
    costUsd: 0.0045,
  },
];

const CATEGORY_CONFIG: Record<
  TaskCategory,
  { icon: React.ReactNode; color: string; bg: string }
> = {
  workflow: { icon: <Zap className="w-3.5 h-3.5" />, color: "text-primary-400", bg: "bg-primary-500/20" },
  tool: { icon: <Globe className="w-3.5 h-3.5" />, color: "text-amber-400", bg: "bg-amber-500/20" },
  agent: { icon: <Zap className="w-3.5 h-3.5" />, color: "text-violet-400", bg: "bg-violet-500/20" },
  memory: { icon: <Database className="w-3.5 h-3.5" />, color: "text-sky-400", bg: "bg-sky-500/20" },
  security: { icon: <Shield className="w-3.5 h-3.5" />, color: "text-orange-400", bg: "bg-orange-500/20" },
  api: { icon: <Globe className="w-3.5 h-3.5" />, color: "text-emerald-400", bg: "bg-emerald-500/20" },
};

function StatusBadge({ status }: { status: TaskStatus }) {
  if (status === "completed") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
        <CheckCircle className="w-3 h-3" /> Done
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">
        <XCircle className="w-3 h-3" /> Failed
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs">
        <RefreshCw className="w-3 h-3 animate-spin" /> Running
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-600/50 text-slate-400 rounded-full text-xs">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}

function formatDuration(ms?: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function TaskRow({ task }: { task: TaskRecord }) {
  const [expanded, setExpanded] = useState(false);
  const catConfig = CATEGORY_CONFIG[task.category];
  const hasDetails =
    !!task.error || (task.metadata && Object.keys(task.metadata).length > 0);

  return (
    <div className="border-b border-slate-800 last:border-0">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors text-left"
        onClick={() => hasDetails && setExpanded((v) => !v)}
      >
        {/* Category icon */}
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${catConfig.bg}`}
        >
          <span className={catConfig.color}>{catConfig.icon}</span>
        </div>

        {/* Description */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 truncate">{task.description}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {task.type} · {formatRelativeTime(task.startedAt)}
          </p>
        </div>

        {/* Tokens & cost */}
        {task.tokensUsed && (
          <span className="text-xs text-slate-500 hidden sm:block flex-shrink-0">
            {task.tokensUsed.toLocaleString()} tok
          </span>
        )}
        {task.costUsd !== undefined && task.costUsd > 0 && (
          <span className="text-xs text-emerald-400 flex-shrink-0">
            ${task.costUsd.toFixed(4)}
          </span>
        )}

        {/* Duration */}
        <span className="text-xs text-slate-500 w-14 text-right flex-shrink-0">
          {formatDuration(task.durationMs)}
        </span>

        {/* Status */}
        <div className="flex-shrink-0">
          <StatusBadge status={task.status} />
        </div>

        {hasDetails && (
          <ChevronRight
            className={`w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ${
              expanded ? "rotate-90" : ""
            }`}
          />
        )}
      </button>

      {expanded && hasDetails && (
        <div className="px-14 pb-3">
          <div className="bg-slate-900 rounded-lg p-3 text-xs font-mono space-y-1">
            {task.error && (
              <div className="flex gap-2 text-red-400">
                <span className="text-slate-500">error:</span>
                <span>{task.error}</span>
              </div>
            )}
            {task.metadata &&
              Object.entries(task.metadata).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-slate-500">{k}:</span>
                  <span className="text-slate-300">
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TaskHistory() {
  const [tasks] = useState<TaskRecord[]>(DEMO_TASKS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">("all");

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || t.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || t.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [tasks, searchQuery, statusFilter, categoryFilter]);

  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    running: tasks.filter((t) => t.status === "running").length,
    totalTokens: tasks.reduce((acc, t) => acc + (t.tokensUsed ?? 0), 0),
    totalCost: tasks.reduce((acc, t) => acc + (t.costUsd ?? 0), 0),
  }), [tasks]);

  const handleExport = () => {
    const data = JSON.stringify(filtered, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `task-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-white">Task History</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-px bg-slate-800 border-b border-slate-800">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Completed", value: stats.completed, color: "text-green-400" },
          { label: "Failed", value: stats.failed, color: "text-red-400" },
          { label: "Running", value: stats.running, color: "text-blue-400" },
          {
            label: "Tokens Used",
            value: stats.totalTokens.toLocaleString(),
            color: "text-violet-400",
          },
          {
            label: "Total Cost",
            value: `$${stats.totalCost.toFixed(4)}`,
            color: "text-emerald-400",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-slate-900 px-4 py-3 text-center"
          >
            <div className={`text-lg font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as TaskStatus | "all")
          }
          className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-2 py-1.5"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="running">Running</option>
          <option value="pending">Pending</option>
        </select>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as TaskCategory | "all")
          }
          className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-2 py-1.5"
        >
          <option value="all">All Categories</option>
          <option value="workflow">Workflow</option>
          <option value="agent">Agent</option>
          <option value="tool">Tool</option>
          <option value="memory">Memory</option>
          <option value="security">Security</option>
          <option value="api">API</option>
        </select>

        <span className="text-xs text-slate-500 ml-auto">
          {filtered.length} of {tasks.length} tasks
        </span>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <History className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">No tasks match your filters</p>
          </div>
        ) : (
          filtered.map((task) => <TaskRow key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}
