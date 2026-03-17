import { useState, useCallback, useEffect } from 'react';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  X,
  CheckCheck,
  Filter,
  Trash2,
  RefreshCw,
  BellOff,
  Settings,
  Clock,
  Briefcase,
  Brain,
  Globe,
  Bot,
  Shield,
  TrendingUp,
  MessageSquare,
  Cpu,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifType = 'success' | 'warning' | 'error' | 'info';
type NotifCategory =
  | 'job-search'
  | 'agent'
  | 'research'
  | 'system'
  | 'security'
  | 'workflow'
  | 'chat';

interface Notification {
  id: string;
  type: NotifType;
  category: NotifCategory;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: { label: string; primary?: boolean }[];
  progress?: number; // 0–100 for in-progress notifications
  link?: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1', type: 'success', category: 'job-search',
    title: 'Application Submitted',
    message: 'Successfully submitted your application to Anthropic for Senior AI Engineer. AI-generated cover letter used.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    read: false,
    actions: [{ label: 'View Application', primary: true }, { label: 'Dismiss' }],
  },
  {
    id: 'n2', type: 'info', category: 'research',
    title: 'Research Complete',
    message: 'Deep research on "Multi-agent LLM frameworks 2025" completed. 47 sources analysed, 12-section report generated.',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    read: false,
    actions: [{ label: 'Open Report', primary: true }, { label: 'Export PDF' }],
  },
  {
    id: 'n3', type: 'warning', category: 'system',
    title: 'OpenAI Rate Limit',
    message: 'You have used 87% of your gpt-4o monthly token budget. Consider switching to gpt-4o-mini for non-critical tasks.',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    read: false,
    progress: 87,
    actions: [{ label: 'Manage Limits', primary: true }],
  },
  {
    id: 'n4', type: 'success', category: 'job-search',
    title: 'Interview Invite!',
    message: 'Hugging Face has responded to your application! They want to schedule a technical interview for Developer Advocate.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    actions: [{ label: 'Schedule Interview', primary: true }, { label: 'View Message' }],
  },
  {
    id: 'n5', type: 'info', category: 'agent',
    title: 'New Job Matches Found',
    message: 'AI scanner discovered 5 new high-match positions (≥80% compatibility score) on LinkedIn, Wellfound, and Indeed.',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    read: true,
    actions: [{ label: 'Review Jobs', primary: true }],
  },
  {
    id: 'n6', type: 'error', category: 'workflow',
    title: 'Workflow Execution Failed',
    message: 'The "Email Digest" workflow failed at step 3 (API call). Error: Connection timeout after 30s. Retrying in 5 minutes.',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    read: true,
    actions: [{ label: 'Retry Now', primary: true }, { label: 'View Logs' }],
  },
  {
    id: 'n7', type: 'success', category: 'chat',
    title: 'Memory Consolidated',
    message: 'Agent memory consolidation complete. 3 episodic memories merged into 1 long-term memory. 2 duplicates removed.',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    read: true,
    actions: [{ label: 'Open Memory Browser', primary: true }],
  },
  {
    id: 'n8', type: 'warning', category: 'security',
    title: 'Suspicious Login Attempt',
    message: 'Login attempt from unknown IP (45.33.32.156) was blocked. 2FA verification required. Enable enhanced security in Settings.',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    read: true,
    actions: [{ label: 'Review Security', primary: true }, { label: 'Dismiss' }],
  },
  {
    id: 'n9', type: 'info', category: 'research',
    title: 'ArXiv Watch Alert',
    message: '7 new papers on "agentic AI systems" published today matching your watch keywords. Highest relevance: "AutoResearcher v3 — autonomous scientific paper generation".',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    read: true,
    actions: [{ label: 'View Papers', primary: true }],
  },
  {
    id: 'n10', type: 'success', category: 'system',
    title: 'Desktop App Updated',
    message: 'Aplica AI v2.1.0 is now running. New: BrowserAgent NanoClaw panel, Memory Browser, enhanced Auto Apply with AI scoring.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    actions: [{ label: "What's New" }],
  },
];

// ── Config Maps ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotifType, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  success: { color: 'text-neon-green',   bg: 'bg-neon-green/10',   border: 'border-neon-green/30',   icon: <CheckCircle className="w-4 h-4" /> },
  warning: { color: 'text-neon-amber',   bg: 'bg-neon-amber/10',   border: 'border-neon-amber/30',   icon: <AlertCircle className="w-4 h-4" /> },
  error:   { color: 'text-neon-pink',    bg: 'bg-neon-pink/10',    border: 'border-neon-pink/30',    icon: <X className="w-4 h-4" /> },
  info:    { color: 'text-neon-cyan',    bg: 'bg-neon-cyan/10',    border: 'border-neon-cyan/30',    icon: <Info className="w-4 h-4" /> },
};

const CATEGORY_CONFIG: Record<NotifCategory, { label: string; icon: React.ReactNode; color: string }> = {
  'job-search': { label: 'Job Search',  icon: <Briefcase className="w-3.5 h-3.5" />, color: 'text-neon-amber' },
  agent:        { label: 'Agent',       icon: <Bot className="w-3.5 h-3.5" />,       color: 'text-neon-cyan' },
  research:     { label: 'Research',    icon: <Brain className="w-3.5 h-3.5" />,     color: 'text-neon-purple' },
  system:       { label: 'System',      icon: <Cpu className="w-3.5 h-3.5" />,       color: 'text-slate-400' },
  security:     { label: 'Security',    icon: <Shield className="w-3.5 h-3.5" />,    color: 'text-neon-pink' },
  workflow:     { label: 'Workflow',    icon: <Zap className="w-3.5 h-3.5" />,       color: 'text-neon-green' },
  chat:         { label: 'Chat',        icon: <MessageSquare className="w-3.5 h-3.5" />, color: 'text-neon-magenta' },
};

// ── Time helper ───────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Notification Item ─────────────────────────────────────────────────────────

function NotifItem({
  notif,
  onRead,
  onDismiss,
}: {
  notif: Notification;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const tc = TYPE_CONFIG[notif.type];
  const cc = CATEGORY_CONFIG[notif.category];

  return (
    <div
      className={`group p-4 border-b border-glass-border transition-all duration-200 hover:bg-dark-700/20 ${
        !notif.read ? 'bg-dark-800/40' : ''
      }`}
      onClick={onRead}
    >
      <div className="flex gap-3">
        {/* Type icon */}
        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${tc.bg} ${tc.border} border`}>
          <span className={tc.color}>{tc.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold text-sm ${!notif.read ? 'text-white' : 'text-slate-300'}`}>
                {notif.title}
              </span>
              {!notif.read && (
                <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 whitespace-nowrap">{timeAgo(notif.timestamp)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-slate-400 hover:text-neon-pink hover:bg-neon-pink/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Category badge */}
          <div className={`inline-flex items-center gap-1 text-xs mb-2 ${cc.color}`}>
            {cc.icon}
            <span>{cc.label}</span>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed">{notif.message}</p>

          {/* Progress bar */}
          {notif.progress !== undefined && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Usage</span>
                <span className={notif.progress >= 80 ? 'text-neon-amber' : 'text-slate-400'}>{notif.progress}%</span>
              </div>
              <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${notif.progress >= 90 ? 'bg-neon-pink' : notif.progress >= 80 ? 'bg-neon-amber' : 'bg-neon-green'}`}
                  style={{ width: `${notif.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          {notif.actions && notif.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {notif.actions.map((action) => (
                <button
                  key={action.label}
                  onClick={(e) => e.stopPropagation()}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    action.primary
                      ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/20'
                      : 'bg-dark-700 text-slate-400 border border-glass-border hover:text-white hover:bg-dark-600'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Summary Strip ─────────────────────────────────────────────────────────────

function SummaryStrip({ notifications }: { notifications: Notification[] }) {
  const unread = notifications.filter((n) => !n.read).length;
  const byCat = Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => ({
    cat: cat as NotifCategory,
    cfg,
    count: notifications.filter((n) => n.category === cat).length,
  })).filter((c) => c.count > 0);

  return (
    <div className="px-6 py-4 border-b border-glass-border">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {unread > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-neon-cyan/10 border border-neon-cyan/30 rounded-full text-sm text-neon-cyan font-semibold">
              <Bell className="w-3.5 h-3.5" />
              {unread} unread
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-neon-green/10 border border-neon-green/30 rounded-full text-sm text-neon-green">
              <CheckCheck className="w-3.5 h-3.5" />
              All caught up
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {byCat.map(({ cat, cfg, count }) => (
            <div key={cat} className={`flex items-center gap-1 text-xs ${cfg.color}`}>
              {cfg.icon}
              <span>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function NotificationsCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [filterType, setFilterType] = useState<NotifType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<NotifCategory | 'all'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [dndEnabled, setDndEnabled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate new incoming notification
  useEffect(() => {
    const timer = setTimeout(() => {
      const newNotif: Notification = {
        id: `live-${Date.now()}`,
        type: 'info',
        category: 'agent',
        title: 'Agent Status Update',
        message: 'The Research Agent completed 3 sub-queries and is now synthesising results for your query "AutoResearcher frameworks comparison".',
        timestamp: new Date().toISOString(),
        read: false,
        actions: [{ label: 'View Progress', primary: true }],
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      const refreshNotif: Notification = {
        id: `refresh-${Date.now()}`,
        type: 'success',
        category: 'workflow',
        title: 'Workflow Synced',
        message: 'All workflows are running normally. Last sync: just now.',
        timestamp: new Date().toISOString(),
        read: false,
        actions: [{ label: 'View Workflows', primary: true }],
      };
      setNotifications((prev) => [refreshNotif, ...prev]);
      setIsRefreshing(false);
    }, 1500);
  }, []);

  const filtered = notifications
    .filter((n) => filterType === 'all' || n.type === filterType)
    .filter((n) => filterCategory === 'all' || n.category === filterCategory)
    .filter((n) => !showUnreadOnly || !n.read);

  const grouped: Record<string, Notification[]> = filtered.reduce(
    (acc, n) => {
      const day = new Date(n.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      if (!acc[day]) acc[day] = [];
      acc[day].push(n);
      return acc;
    },
    {} as Record<string, Notification[]>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border bg-dark-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-neon-pink text-white text-xs flex items-center justify-center font-bold">
                {notifications.filter((n) => !n.read).length}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Notifications</h2>
            <p className="text-xs text-slate-400">Stay updated on agent and system events</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* DND Toggle */}
          <button
            onClick={() => setDndEnabled((v) => !v)}
            title="Do Not Disturb"
            className={`p-2 rounded-lg border transition-colors ${
              dndEnabled
                ? 'bg-neon-amber/10 border-neon-amber/30 text-neon-amber'
                : 'bg-dark-700 border-glass-border text-slate-400 hover:text-white hover:bg-dark-600'
            }`}
          >
            <BellOff className="w-4 h-4" />
          </button>

          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-dark-700 border border-glass-border text-slate-400 hover:text-white hover:bg-dark-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={markAllRead}
            className="px-3 py-1.5 bg-dark-700 border border-glass-border rounded-lg text-xs text-slate-300 hover:text-white hover:bg-dark-600 transition-colors flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark All Read
          </button>

          <button
            onClick={clearAll}
            className="px-3 py-1.5 bg-dark-700 border border-glass-border rounded-lg text-xs text-slate-300 hover:text-neon-pink hover:bg-neon-pink/10 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>
      </div>

      {/* Summary */}
      <SummaryStrip notifications={notifications} />

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-glass-border bg-dark-900/30">
        {/* Type filter */}
        <div className="flex gap-1">
          {(['all', 'success', 'info', 'warning', 'error'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                filterType === t
                  ? t === 'all' ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30' :
                    t === 'success' ? 'bg-neon-green/10 text-neon-green border border-neon-green/30' :
                    t === 'info' ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30' :
                    t === 'warning' ? 'bg-neon-amber/10 text-neon-amber border border-neon-amber/30' :
                    'bg-neon-pink/10 text-neon-pink border border-neon-pink/30'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-glass-border" />

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as typeof filterCategory)}
          className="bg-dark-800 border border-glass-border rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => (
            <option key={cat} value={cat}>{cfg.label}</option>
          ))}
        </select>

        {/* Unread toggle */}
        <button
          onClick={() => setShowUnreadOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
            showUnreadOnly ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30' : 'text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <Bell className="w-3 h-3" />
          Unread only
        </button>

        <span className="text-xs text-slate-500 ml-auto">{filtered.length} notifications</span>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Bell className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg">{showUnreadOnly ? 'All caught up!' : 'No notifications'}</p>
            {showUnreadOnly && (
              <button
                onClick={() => setShowUnreadOnly(false)}
                className="mt-2 text-sm text-neon-cyan hover:underline"
              >
                Show all notifications
              </button>
            )}
          </div>
        ) : (
          Object.entries(grouped).map(([day, group]) => (
            <div key={day}>
              <div className="px-6 py-2 bg-dark-900/50 border-b border-glass-border">
                <span className="text-xs font-semibold text-neon-cyan uppercase tracking-wider">
                  {day}
                </span>
              </div>
              {group.map((n) => (
                <NotifItem
                  key={n.id}
                  notif={n}
                  onRead={() => markRead(n.id)}
                  onDismiss={() => dismiss(n.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* DND Banner */}
      {dndEnabled && (
        <div className="px-6 py-3 bg-neon-amber/5 border-t border-neon-amber/20 flex items-center gap-3">
          <BellOff className="w-4 h-4 text-neon-amber" />
          <span className="text-sm text-neon-amber">Do Not Disturb is enabled — desktop notifications are paused</span>
          <button
            onClick={() => setDndEnabled(false)}
            className="ml-auto text-xs text-neon-amber hover:underline"
          >
            Disable
          </button>
        </div>
      )}
    </div>
  );
}
