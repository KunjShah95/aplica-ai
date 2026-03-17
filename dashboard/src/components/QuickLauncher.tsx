import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap,
  Brain,
  Globe,
  Code,
  Terminal,
  Shield,
  FileText,
  Settings,
  Workflow,
  BarChart3,
  History,
  DollarSign,
  Users,
  BookOpen,
  MessageSquare,
  ArrowRight,
  Command,
  X,
  Briefcase,
  Bell,
  Sliders,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type CommandCategory = 'navigation' | 'agent' | 'research' | 'action' | 'settings';

interface QuickCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: CommandCategory;
  shortcut?: string;
  action: () => void;
  keywords: string[];
}

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  navigation: 'Navigation',
  agent: 'Agent',
  research: 'Research',
  action: 'Quick Actions',
  settings: 'Settings',
};

const CATEGORY_COLORS: Record<CommandCategory, string> = {
  navigation: 'text-neon-cyan',
  agent: 'text-neon-purple',
  research: 'text-neon-green',
  action: 'text-neon-amber',
  settings: 'text-dark-400',
};

// ── Main Component ────────────────────────────────────────────────────────────

interface QuickLauncherProps {
  /** Called when the user selects a navigation command */
  onNavigate?: (tab: string) => void;
  /** Whether to render in floating/overlay mode (Electron quick launcher) */
  overlay?: boolean;
}

export default function QuickLauncher({ onNavigate, overlay = false }: QuickLauncherProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = useCallback(
    (tab: string) => {
      if (onNavigate) onNavigate(tab);
      if ((window as any).electronAPI) {
        (window as any).electronAPI.closeQuickLauncher?.();
      }
    },
    [onNavigate]
  );

  // Build commands list
  const COMMANDS: QuickCommand[] = [
    // Navigation
    {
      id: 'nav-workflow',
      label: 'Open Workflow Builder',
      description: 'Visual node-based workflow editor',
      icon: <Workflow className="w-4 h-4" />,
      category: 'navigation',
      shortcut: '⌘W',
      action: () => navigate('workflow'),
      keywords: ['workflow', 'builder', 'node', 'flow', 'automation'],
    },
    {
      id: 'nav-research',
      label: 'Open Research Assistant',
      description: 'AutoResearcher — deep topic research',
      icon: <Brain className="w-4 h-4" />,
      category: 'navigation',
      shortcut: '⌘R',
      action: () => navigate('research'),
      keywords: ['research', 'assistant', 'autoresearcher', 'study', 'search'],
    },
    {
      id: 'nav-chat',
      label: 'Open Agent Chat',
      description: 'Multi-agent conversational interface',
      icon: <MessageSquare className="w-4 h-4" />,
      category: 'navigation',
      shortcut: '⌘C',
      action: () => navigate('chat'),
      keywords: ['chat', 'agent', 'conversation', 'message', 'llm'],
    },
    {
      id: 'nav-knowledge',
      label: 'Open Knowledge Base',
      description: 'Manage your local research notes',
      icon: <BookOpen className="w-4 h-4" />,
      category: 'navigation',
      action: () => navigate('knowledge'),
      keywords: ['knowledge', 'base', 'notes', 'documents', 'memory'],
    },
    {
      id: 'nav-analytics',
      label: 'Analytics Dashboard',
      description: 'Execution metrics and performance',
      icon: <BarChart3 className="w-4 h-4" />,
      category: 'navigation',
      action: () => navigate('analytics'),
      keywords: ['analytics', 'metrics', 'stats', 'performance', 'dashboard'],
    },
    {
      id: 'nav-history',
      label: 'Task History',
      description: 'Browse past agent executions',
      icon: <History className="w-4 h-4" />,
      category: 'navigation',
      action: () => navigate('history'),
      keywords: ['history', 'tasks', 'past', 'log', 'executions'],
    },
    {
      id: 'nav-costs',
      label: 'Cost Tracker',
      description: 'Monitor LLM token usage and costs',
      icon: <DollarSign className="w-4 h-4" />,
      category: 'navigation',
      action: () => navigate('costs'),
      keywords: ['cost', 'token', 'usage', 'spending', 'billing'],
    },
    {
      id: 'nav-team',
      label: 'Team Management',
      description: 'Manage team members and permissions',
      icon: <Users className="w-4 h-4" />,
      category: 'navigation',
      action: () => navigate('team'),
      keywords: ['team', 'members', 'permissions', 'roles', 'users'],
    },
    {
      id: 'nav-autoapply',
      label: 'Auto Apply',
      description: 'AI-powered job application automation',
      icon: <Briefcase className="w-4 h-4" />,
      category: 'navigation',
      shortcut: '⌘J',
      action: () => navigate('autoapply'),
      keywords: ['apply', 'job', 'application', 'career', 'resume', 'cover letter'],
    },
    {
      id: 'nav-browser',
      label: 'Browser Agent (NanoClaw)',
      description: 'Headless web automation and scraping',
      icon: <Globe className="w-4 h-4" />,
      category: 'navigation',
      action: () => navigate('browser'),
      keywords: ['browser', 'nanoclaw', 'web', 'scrape', 'automation', 'navigate'],
    },
    {
      id: 'nav-memory',
      label: 'Memory Browser',
      description: 'Explore and manage agent memories',
      icon: <Brain className="w-4 h-4" />,
      category: 'navigation',
      action: () => navigate('memory'),
      keywords: ['memory', 'episodic', 'semantic', 'recall', 'history', 'agent'],
    },
    {
      id: 'nav-notifications',
      label: 'Notifications',
      description: 'View alerts and system notifications',
      icon: <Bell className="w-4 h-4" />,
      category: 'navigation',
      action: () => navigate('notifications'),
      keywords: ['notifications', 'alerts', 'bell', 'messages', 'updates'],
    },
    {
      id: 'nav-app-settings',
      label: 'App Settings',
      description: 'API keys, models, appearance and more',
      icon: <Sliders className="w-4 h-4" />,
      category: 'navigation',
      action: () => navigate('app-settings'),
      keywords: ['settings', 'api', 'keys', 'models', 'appearance', 'shortcuts', 'privacy'],
    },
    // Agent commands
    {
      id: 'agent-general',
      label: 'New General Agent Chat',
      description: 'Start a conversation with the general AI agent',
      icon: <Zap className="w-4 h-4" />,
      category: 'agent',
      action: () => navigate('chat'),
      keywords: ['agent', 'general', 'ai', 'chat', 'aplica'],
    },
    {
      id: 'agent-coder',
      label: 'Open Coder Agent',
      description: 'Code generation, review and debugging',
      icon: <Code className="w-4 h-4" />,
      category: 'agent',
      shortcut: '⌘K',
      action: () => navigate('chat'),
      keywords: ['code', 'coder', 'programming', 'developer', 'debug'],
    },
    {
      id: 'agent-browser',
      label: 'Launch Browser Agent',
      description: 'NanoClaw web automation agent',
      icon: <Globe className="w-4 h-4" />,
      category: 'agent',
      action: () => navigate('chat'),
      keywords: ['browser', 'web', 'automation', 'playwright', 'nanoclaw', 'scrape'],
    },
    {
      id: 'agent-terminal',
      label: 'Terminal Agent',
      description: 'Execute shell commands via AI agent',
      icon: <Terminal className="w-4 h-4" />,
      category: 'agent',
      action: () => navigate('chat'),
      keywords: ['terminal', 'shell', 'command', 'bash', 'cli'],
    },
    {
      id: 'agent-security',
      label: 'Security Audit Agent',
      description: 'PicoClaw — security analysis and audit',
      icon: <Shield className="w-4 h-4" />,
      category: 'agent',
      action: () => navigate('chat'),
      keywords: ['security', 'audit', 'vulnerability', 'picoclaw', 'owasp'],
    },
    // Research
    {
      id: 'research-quick',
      label: 'Quick Research (2s)',
      description: 'Fast overview of any topic',
      icon: <Zap className="w-4 h-4" />,
      category: 'research',
      action: () => navigate('research'),
      keywords: ['quick', 'fast', 'research', 'overview'],
    },
    {
      id: 'research-deep',
      label: 'Deep Research (8s)',
      description: 'Exhaustive multi-source analysis',
      icon: <Brain className="w-4 h-4" />,
      category: 'research',
      action: () => navigate('research'),
      keywords: ['deep', 'thorough', 'research', 'exhaustive', 'autoresearcher'],
    },
    {
      id: 'research-report',
      label: 'View Saved Reports',
      description: 'Browse your research report library',
      icon: <FileText className="w-4 h-4" />,
      category: 'research',
      action: () => navigate('knowledge'),
      keywords: ['reports', 'saved', 'library', 'documents'],
    },
    // Settings
    {
      id: 'settings-main',
      label: 'Open Settings',
      description: 'Configure API keys, models and preferences',
      icon: <Settings className="w-4 h-4" />,
      category: 'settings',
      shortcut: '⌘,',
      action: () => navigate('settings'),
      keywords: ['settings', 'preferences', 'configuration', 'api', 'keys'],
    },
  ];

  const filtered = query.trim()
    ? COMMANDS.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description.toLowerCase().includes(q) ||
          cmd.keywords.some((k) => k.includes(q))
        );
      })
    : COMMANDS;

  const grouped = filtered.reduce<Record<CommandCategory, QuickCommand[]>>(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<CommandCategory, QuickCommand[]>
  );

  // Flat list for keyboard navigation
  const flat = filtered;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flat.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flat[selectedIndex]) {
          const selected = flat[selectedIndex];
          setRecentCommands((prev) =>
            [selected.id, ...prev.filter((id) => id !== selected.id)].slice(0, 5)
          );
          selected.action();
        }
      } else if (e.key === 'Escape') {
        if ((window as any).electronAPI) {
          (window as any).electronAPI.closeQuickLauncher?.();
        }
      }
    },
    [flat, selectedIndex]
  );

  const runCommand = useCallback((cmd: QuickCommand) => {
    setRecentCommands((prev) => [cmd.id, ...prev.filter((id) => id !== cmd.id)].slice(0, 5));
    cmd.action();
  }, []);

  let flatIndex = 0;

  const containerClass = overlay
    ? 'w-full h-full bg-dark-950/95 backdrop-blur-xl rounded-2xl border border-glass-border shadow-2xl overflow-hidden flex flex-col font-mono'
    : 'flex flex-col h-full bg-dark-950 text-white font-mono';

  return (
    <div className={containerClass}>
      {/* Search input */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-glass-border">
        <Command className="w-5 h-5 text-neon-cyan flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-transparent text-white placeholder-dark-500 outline-none text-sm"
          placeholder="Search commands, agents, features…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            className="text-dark-500 hover:text-dark-300 transition-colors"
            onClick={() => setQuery('')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <kbd className="text-xs text-dark-600 font-mono bg-dark-900 px-1.5 py-0.5 rounded border border-glass-border">
          esc
        </kbd>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto py-2">
        {flat.length === 0 && (
          <div className="text-center py-8 text-dark-600 text-sm">
            No commands found for "{query}"
          </div>
        )}

        {(Object.keys(CATEGORY_LABELS) as CommandCategory[]).map((category) => {
          const cmds = grouped[category];
          if (!cmds || cmds.length === 0) return null;
          return (
            <div key={category} className="mb-1">
              <div className="px-4 py-1">
                <span className={`text-xs uppercase tracking-widest font-bold ${CATEGORY_COLORS[category]}`}>
                  {CATEGORY_LABELS[category]}
                </span>
              </div>
              {cmds.map((cmd) => {
                const isSelected = flat[selectedIndex]?.id === cmd.id;
                const isRecent = recentCommands.includes(cmd.id);
                flatIndex++;
                return (
                  <button
                    key={cmd.id}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-neon-cyan/10 border-l-2 border-neon-cyan'
                        : 'hover:bg-dark-900 border-l-2 border-transparent'
                    }`}
                    onClick={() => runCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(flat.findIndex((f) => f.id === cmd.id))}
                  >
                    <span className={`flex-shrink-0 ${isSelected ? CATEGORY_COLORS[category] : 'text-dark-500'}`}>
                      {cmd.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-dark-200'}`}>
                          {cmd.label}
                        </span>
                        {isRecent && (
                          <span className="text-xs text-neon-amber/60">recent</span>
                        )}
                      </div>
                      <span className="text-xs text-dark-500 truncate block">{cmd.description}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {cmd.shortcut && (
                        <kbd className="text-xs text-dark-600 font-mono bg-dark-900 px-1.5 py-0.5 rounded border border-glass-border">
                          {cmd.shortcut}
                        </kbd>
                      )}
                      {isSelected && (
                        <ArrowRight className="w-3 h-3 text-neon-cyan" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-glass-border flex items-center gap-4 text-xs text-dark-600">
        <span>↑↓ navigate</span>
        <span>⏎ select</span>
        <span>esc close</span>
        <span className="ml-auto text-neon-cyan/40">APLICA AI</span>
      </div>
    </div>
  );
}
