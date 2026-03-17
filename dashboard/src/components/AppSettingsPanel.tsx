import { useState, useCallback } from 'react';
import {
  Settings,
  Key,
  Cpu,
  Palette,
  Keyboard,
  Shield,
  Bell,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  ChevronRight,
  Sliders,
  Download,
  Trash2,
  Info,
  AlertCircle,
  CheckCircle,
  X,
  Code,
  Terminal,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Section =
  | 'api-keys'
  | 'models'
  | 'appearance'
  | 'shortcuts'
  | 'privacy'
  | 'notifications'
  | 'advanced';

interface ApiKey {
  id: string;
  provider: string;
  label: string;
  value: string;
  status: 'valid' | 'invalid' | 'unchecked';
  tier?: string;
  usagePercent?: number;
  color: string;
  icon: string;
}

interface ModelConfig {
  id: string;
  provider: string;
  name: string;
  contextLength: string;
  costPer1kTokens: string;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'excellent' | 'good' | 'moderate';
  enabled: boolean;
  isDefault: boolean;
}

interface ShortcutEntry {
  id: string;
  label: string;
  shortcut: string;
  category: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const INITIAL_API_KEYS: ApiKey[] = [
  { id: 'openai',     provider: 'OpenAI',     label: 'OpenAI API Key',      value: 'sk-proj-...Xx9Q', status: 'valid',     tier: 'Pro',   usagePercent: 43, color: 'text-neon-green',   icon: '🟢' },
  { id: 'anthropic',  provider: 'Anthropic',  label: 'Anthropic API Key',   value: 'sk-ant-...mNkQ',  status: 'valid',     tier: 'Tier 2', usagePercent: 12, color: 'text-neon-purple',  icon: '🟣' },
  { id: 'gemini',     provider: 'Google',     label: 'Gemini API Key',      value: '',                status: 'unchecked', tier: undefined, usagePercent: 0, color: 'text-neon-amber',   icon: '🟡' },
  { id: 'perplexity', provider: 'Perplexity', label: 'Perplexity API Key',  value: 'pplx-...7f3a',    status: 'valid',     tier: 'Pro',   usagePercent: 67, color: 'text-neon-cyan',    icon: '🔵' },
  { id: 'cohere',     provider: 'Cohere',     label: 'Cohere API Key',      value: '',                status: 'unchecked', tier: undefined, usagePercent: 0, color: 'text-neon-magenta', icon: '🔴' },
  { id: 'groq',       provider: 'Groq',       label: 'Groq API Key',        value: 'gsk_...ab12',     status: 'valid',     tier: 'Free',  usagePercent: 8,  color: 'text-neon-pink',    icon: '⚡' },
];

const MODELS: ModelConfig[] = [
  { id: 'gpt-4o',             provider: 'OpenAI',     name: 'GPT-4o',              contextLength: '128k', costPer1kTokens: '$5 / $15',   speed: 'fast',   quality: 'excellent', enabled: true,  isDefault: true  },
  { id: 'gpt-4o-mini',        provider: 'OpenAI',     name: 'GPT-4o Mini',         contextLength: '128k', costPer1kTokens: '$0.15 / $0.6', speed: 'fast',   quality: 'good',      enabled: true,  isDefault: false },
  { id: 'claude-3-5-sonnet',  provider: 'Anthropic',  name: 'Claude 3.5 Sonnet',   contextLength: '200k', costPer1kTokens: '$3 / $15',   speed: 'medium', quality: 'excellent', enabled: true,  isDefault: false },
  { id: 'claude-3-haiku',     provider: 'Anthropic',  name: 'Claude 3 Haiku',      contextLength: '200k', costPer1kTokens: '$0.25 / $1.25', speed: 'fast',  quality: 'good',     enabled: true,  isDefault: false },
  { id: 'gemini-2-flash',     provider: 'Google',     name: 'Gemini 2.0 Flash',    contextLength: '1M',   costPer1kTokens: '$0.075 / $0.3', speed: 'fast', quality: 'good',      enabled: false, isDefault: false },
  { id: 'llama-3-3-70b',      provider: 'Groq',       name: 'Llama 3.3 70B',       contextLength: '128k', costPer1kTokens: '$0.59 / $0.79', speed: 'fast', quality: 'good',      enabled: true,  isDefault: false },
  { id: 'mixtral-8x7b',       provider: 'Groq',       name: 'Mixtral 8x7B',        contextLength: '32k',  costPer1kTokens: '$0.24 / $0.24', speed: 'fast', quality: 'moderate',  enabled: true,  isDefault: false },
  { id: 'pplx-sonar',         provider: 'Perplexity', name: 'Sonar',               contextLength: '127k', costPer1kTokens: '$1 / $1',    speed: 'fast',   quality: 'good',      enabled: true,  isDefault: false },
];

const SHORTCUTS: ShortcutEntry[] = [
  { id: 'launcher',   label: 'Open Quick Launcher',    shortcut: 'Ctrl+Shift+Space', category: 'Navigation' },
  { id: 'research',   label: 'New Research Session',   shortcut: 'Ctrl+Shift+R',     category: 'Navigation' },
  { id: 'chat',       label: 'New Chat Session',       shortcut: 'Ctrl+Shift+C',     category: 'Navigation' },
  { id: 'settings',   label: 'Open Settings',          shortcut: 'Ctrl+,',           category: 'Navigation' },
  { id: 'fullscreen', label: 'Toggle Fullscreen',      shortcut: 'F11',              category: 'Window' },
  { id: 'devtools',   label: 'Developer Tools',        shortcut: 'Ctrl+Shift+I',     category: 'Window' },
  { id: 'reload',     label: 'Reload App',             shortcut: 'Ctrl+R',           category: 'Window' },
  { id: 'copy',       label: 'Copy Selection',         shortcut: 'Ctrl+C',           category: 'Edit' },
  { id: 'paste',      label: 'Paste',                  shortcut: 'Ctrl+V',           category: 'Edit' },
  { id: 'find',       label: 'Find in Page',           shortcut: 'Ctrl+F',           category: 'Edit' },
];

// ── Section nav ───────────────────────────────────────────────────────────────

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'api-keys',      label: 'API Keys',       icon: <Key className="w-4 h-4" /> },
  { id: 'models',        label: 'Models',         icon: <Cpu className="w-4 h-4" /> },
  { id: 'appearance',    label: 'Appearance',     icon: <Palette className="w-4 h-4" /> },
  { id: 'shortcuts',     label: 'Shortcuts',      icon: <Keyboard className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications',  icon: <Bell className="w-4 h-4" /> },
  { id: 'privacy',       label: 'Privacy & Data', icon: <Shield className="w-4 h-4" /> },
  { id: 'advanced',      label: 'Advanced',       icon: <Sliders className="w-4 h-4" /> },
];

// ── API Keys Section ──────────────────────────────────────────────────────────

function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL_API_KEYS);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const handleSave = useCallback((id: string) => {
    setSaving(id);
    setTimeout(() => {
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, value: editing[id] ?? k.value, status: editing[id] ? 'valid' : 'unchecked' } : k)));
      setSaving(null);
      setEditing((prev) => { const next = { ...prev }; delete next[id]; return next; });
    }, 1200);
  }, [editing]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-neon-amber bg-neon-amber/5 border border-neon-amber/20 rounded-xl px-4 py-3">
        <AlertCircle className="w-4 h-4 shrink-0" />
        API keys are stored locally in encrypted form and never sent to external servers.
      </div>

      <div className="space-y-3">
        {keys.map((key) => {
          const isEditing = editing[key.id] !== undefined;
          const isVisible = showValues[key.id];

          return (
            <div key={key.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{key.icon}</span>
                  <div>
                    <p className={`font-semibold text-sm ${key.color}`}>{key.provider}</p>
                    {key.tier && <p className="text-xs text-slate-500">{key.tier} plan</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {key.status === 'valid' && (
                    <div className="flex items-center gap-1 text-xs text-neon-green">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Valid
                    </div>
                  )}
                  {key.status === 'invalid' && (
                    <div className="flex items-center gap-1 text-xs text-neon-pink">
                      <X className="w-3.5 h-3.5" />
                      Invalid
                    </div>
                  )}
                  {key.status === 'unchecked' && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Info className="w-3.5 h-3.5" />
                      Not set
                    </div>
                  )}
                </div>
              </div>

              {/* Usage bar */}
              {key.usagePercent !== undefined && key.usagePercent > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Monthly usage</span>
                    <span className={key.usagePercent >= 80 ? 'text-neon-amber' : 'text-slate-400'}>{key.usagePercent}%</span>
                  </div>
                  <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${key.usagePercent >= 90 ? 'bg-neon-pink' : key.usagePercent >= 70 ? 'bg-neon-amber' : 'bg-neon-green'}`}
                      style={{ width: `${key.usagePercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Key input */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={isVisible ? 'text' : 'password'}
                    value={isEditing ? editing[key.id] : key.value || ''}
                    onChange={(e) => setEditing((prev) => ({ ...prev, [key.id]: e.target.value }))}
                    onFocus={() => { if (!isEditing) setEditing((prev) => ({ ...prev, [key.id]: key.value })); }}
                    placeholder={`Enter ${key.provider} API key…`}
                    className="w-full bg-dark-950 border border-glass-border rounded-xl px-3 py-2 text-sm text-slate-300 font-mono placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50 pr-10"
                  />
                  <button
                    onClick={() => setShowValues((prev) => ({ ...prev, [key.id]: !isVisible }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isEditing && (
                  <>
                    <button
                      onClick={() => handleSave(key.id)}
                      disabled={saving === key.id}
                      className="px-3 py-2 glow-button-cyan rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {saving === key.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save
                    </button>
                    <button
                      onClick={() => setEditing((prev) => { const next = { ...prev }; delete next[key.id]; return next; })}
                      className="px-3 py-2 bg-dark-700 border border-glass-border rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Models Section ────────────────────────────────────────────────────────────

function ModelsSection() {
  const [models, setModels] = useState<ModelConfig[]>(MODELS);

  const setDefault = (id: string) => {
    setModels((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
  };

  const toggleEnabled = (id: string) => {
    setModels((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
  };

  const speedColor = { fast: 'text-neon-green', medium: 'text-neon-amber', slow: 'text-neon-pink' };
  const qualityColor = { excellent: 'text-neon-green', good: 'text-neon-amber', moderate: 'text-neon-pink' };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Toggle models on/off and set the default for each agent mode.</p>
      {models.map((m) => (
        <div key={m.id} className={`glass-card p-4 transition-opacity ${m.enabled ? '' : 'opacity-50'}`}>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-white">{m.name}</span>
                {m.isDefault && (
                  <span className="px-2 py-0.5 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 rounded-full text-xs">
                    Default
                  </span>
                )}
                <span className="text-xs text-slate-500">{m.provider}</span>
              </div>
              <div className="flex gap-4 text-xs text-slate-400">
                <span>Context: <span className="text-white">{m.contextLength}</span></span>
                <span>Cost (in/out): <span className="text-neon-amber font-mono">{m.costPer1kTokens}</span></span>
                <span>Speed: <span className={speedColor[m.speed]}>{m.speed}</span></span>
                <span>Quality: <span className={qualityColor[m.quality]}>{m.quality}</span></span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!m.isDefault && m.enabled && (
                <button
                  onClick={() => setDefault(m.id)}
                  className="px-2.5 py-1 text-xs bg-dark-700 border border-glass-border rounded-lg text-slate-400 hover:text-neon-cyan hover:border-neon-cyan/30 transition-colors"
                >
                  Set Default
                </button>
              )}
              <button
                onClick={() => toggleEnabled(m.id)}
                className={`w-12 h-6 rounded-full transition-all duration-300 ${m.enabled ? 'bg-gradient-to-r from-neon-cyan to-neon-purple' : 'bg-dark-600'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 mx-1 ${m.enabled ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Appearance Section ────────────────────────────────────────────────────────

function AppearanceSection() {
  const [accentColor, setAccentColor] = useState<'cyan' | 'purple' | 'green' | 'pink'>('cyan');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [animations, setAnimations] = useState(true);
  const [glowEffects, setGlowEffects] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [sidebarLabels, setSidebarLabels] = useState(true);

  const accents = [
    { id: 'cyan' as const, label: 'Cyber Cyan', color: 'bg-neon-cyan', ring: 'ring-neon-cyan' },
    { id: 'purple' as const, label: 'Neon Purple', color: 'bg-neon-purple', ring: 'ring-neon-purple' },
    { id: 'green' as const, label: 'Matrix Green', color: 'bg-neon-green', ring: 'ring-neon-green' },
    { id: 'pink' as const, label: 'Hot Pink', color: 'bg-neon-pink', ring: 'ring-neon-pink' },
  ];

  const toggleRow = (label: string, value: boolean, setValue: (v: boolean) => void) => (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-dark-700/20 transition-colors">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        onClick={() => setValue(!value)}
        className={`w-12 h-6 rounded-full transition-all duration-300 ${value ? 'bg-gradient-to-r from-neon-cyan to-neon-purple' : 'bg-dark-600'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 mx-1 ${value ? 'translate-x-6' : ''}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Accent color */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-glass-border">
          <p className="text-sm font-semibold text-neon-cyan">Accent Color</p>
        </div>
        <div className="p-4 flex gap-3">
          {accents.map((a) => (
            <button
              key={a.id}
              onClick={() => setAccentColor(a.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                accentColor === a.id ? 'border-neon-cyan bg-neon-cyan/5' : 'border-glass-border hover:border-glass-hover'
              }`}
            >
              <div className={`w-8 h-8 rounded-full ${a.color} ${accentColor === a.id ? `ring-2 ${a.ring} ring-offset-2 ring-offset-dark-900` : ''}`} />
              <span className="text-xs text-slate-400">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-glass-border">
          <p className="text-sm font-semibold text-neon-cyan">Interface Size</p>
        </div>
        <div className="p-4 flex gap-3">
          {([['sm', 'Compact'], ['md', 'Default'], ['lg', 'Large']] as const).map(([size, label]) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={`flex-1 py-2.5 rounded-xl border text-sm transition-all ${
                fontSize === size
                  ? 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'
                  : 'border-glass-border text-slate-400 hover:text-white hover:bg-dark-700/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="glass-card overflow-hidden divide-y divide-glass-border">
        {toggleRow('Animations & transitions', animations, setAnimations)}
        {toggleRow('Neon glow effects', glowEffects, setGlowEffects)}
        {toggleRow('Compact sidebar', compactMode, setCompactMode)}
        {toggleRow('Sidebar labels', sidebarLabels, setSidebarLabels)}
      </div>
    </div>
  );
}

// ── Shortcuts Section ─────────────────────────────────────────────────────────

function ShortcutsSection() {
  const grouped = SHORTCUTS.reduce(
    (acc, s) => { if (!acc[s.category]) acc[s.category] = []; acc[s.category].push(s); return acc; },
    {} as Record<string, ShortcutEntry[]>
  );

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([cat, shortcuts]) => (
        <div key={cat} className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-glass-border">
            <p className="text-sm font-semibold text-neon-cyan">{cat}</p>
          </div>
          <div className="divide-y divide-glass-border">
            {shortcuts.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-dark-700/20 transition-colors">
                <span className="text-sm text-slate-300">{s.label}</span>
                <kbd className="px-2.5 py-1 bg-dark-800 border border-glass-border rounded-lg text-xs font-mono text-neon-cyan">
                  {s.shortcut}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Privacy Section ───────────────────────────────────────────────────────────

function PrivacySection() {
  const [telemetry, setTelemetry] = useState(false);
  const [crashReports, setCrashReports] = useState(true);
  const [localHistory, setLocalHistory] = useState(true);
  const [encryptMemory, setEncryptMemory] = useState(true);
  const [clearing, setClearing] = useState(false);

  const clearData = () => {
    setClearing(true);
    setTimeout(() => setClearing(false), 2000);
  };

  const toggleRow = (label: string, desc: string, value: boolean, setValue: (v: boolean) => void) => (
    <div className="flex items-center justify-between px-4 py-4 hover:bg-dark-700/20 transition-colors">
      <div>
        <p className="text-sm text-slate-300">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => setValue(!value)}
        className={`w-12 h-6 rounded-full transition-all duration-300 ${value ? 'bg-gradient-to-r from-neon-cyan to-neon-purple' : 'bg-dark-600'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 mx-1 ${value ? 'translate-x-6' : ''}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="glass-card overflow-hidden divide-y divide-glass-border">
        {toggleRow('Anonymous telemetry', 'Help improve Aplica AI by sending anonymous usage stats', telemetry, setTelemetry)}
        {toggleRow('Crash reports', 'Automatically send crash reports to help diagnose issues', crashReports, setCrashReports)}
        {toggleRow('Local session history', 'Store conversation history locally on this device', localHistory, setLocalHistory)}
        {toggleRow('Encrypt agent memory', 'Encrypt stored memories using AES-256', encryptMemory, setEncryptMemory)}
      </div>

      <div className="glass-card p-4 space-y-3">
        <p className="text-sm font-semibold text-neon-cyan mb-1">Data Management</p>
        <button
          className="w-full flex items-center gap-3 px-4 py-3 bg-dark-800 rounded-xl border border-glass-border text-sm text-slate-300 hover:text-white hover:bg-dark-700 transition-colors"
        >
          <Download className="w-4 h-4 text-neon-cyan" />
          Export All Data
          <ChevronRight className="w-4 h-4 ml-auto text-slate-500" />
        </button>
        <button
          onClick={clearData}
          disabled={clearing}
          className="w-full flex items-center gap-3 px-4 py-3 bg-neon-pink/5 rounded-xl border border-neon-pink/20 text-sm text-neon-pink hover:bg-neon-pink/10 transition-colors disabled:opacity-50"
        >
          {clearing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          {clearing ? 'Clearing…' : 'Clear All Local Data'}
        </button>
      </div>
    </div>
  );
}

// ── Advanced Section ──────────────────────────────────────────────────────────

function AdvancedSection() {
  const [devMode, setDevMode] = useState(false);
  const [logLevel, setLogLevel] = useState<'debug' | 'info' | 'warn' | 'error'>('info');
  const [concurrency, setConcurrency] = useState(3);
  const [maxTokens, setMaxTokens] = useState(4096);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-neon-pink bg-neon-pink/5 border border-neon-pink/20 rounded-xl px-4 py-3">
        <AlertCircle className="w-4 h-4 shrink-0" />
        Advanced settings may affect performance and stability. Change with care.
      </div>

      <div className="glass-card overflow-hidden divide-y divide-glass-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm text-slate-300">Developer Mode</p>
            <p className="text-xs text-slate-500 mt-0.5">Show DevTools, verbose logging, mock data override</p>
          </div>
          <button
            onClick={() => setDevMode((v) => !v)}
            className={`w-12 h-6 rounded-full transition-all duration-300 ${devMode ? 'bg-gradient-to-r from-neon-cyan to-neon-purple' : 'bg-dark-600'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 mx-1 ${devMode ? 'translate-x-6' : ''}`} />
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm text-slate-300">Log Level</p>
            <p className="text-xs text-slate-500 mt-0.5">Verbosity of application logs</p>
          </div>
          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value as typeof logLevel)}
            className="bg-dark-800 border border-glass-border rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            {['debug', 'info', 'warn', 'error'].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm text-slate-300">Agent Concurrency</p>
            <p className="text-xs text-slate-500 mt-0.5">Max parallel agent tasks: {concurrency}</p>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value))}
            className="w-32 accent-neon-cyan"
          />
        </div>

        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm text-slate-300">Default Max Tokens</p>
            <p className="text-xs text-slate-500 mt-0.5">Per-request token limit: {maxTokens.toLocaleString()}</p>
          </div>
          <input
            type="range"
            min={256}
            max={32768}
            step={256}
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            className="w-32 accent-neon-cyan"
          />
        </div>
      </div>

      <div className="glass-card p-4">
        <p className="text-sm font-semibold text-neon-cyan mb-3">Debug Tools</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Open DevTools', icon: <Code className="w-3.5 h-3.5" />, action: () => (window as any).electronAPI?.openDevTools?.() },
            { label: 'View Logs', icon: <Terminal className="w-3.5 h-3.5" />, action: () => {} },
            { label: 'Clear Cache', icon: <Trash2 className="w-3.5 h-3.5" />, action: () => {} },
            { label: 'Check Updates', icon: <RefreshCw className="w-3.5 h-3.5" />, action: () => {} },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.action}
              className="flex items-center gap-2 px-3 py-2 bg-dark-800 border border-glass-border rounded-xl text-xs text-slate-300 hover:text-white hover:bg-dark-700 transition-colors"
            >
              <span className="text-neon-cyan">{btn.icon}</span>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-slate-600 text-center py-2">
        Aplica AI v2.1.0 — Electron 35.7.5 — Node.js 22 — Chromium 130
      </div>
    </div>
  );
}

// ── Notifications Settings Section ────────────────────────────────────────────

function NotificationsSettings() {
  const [desktop, setDesktop] = useState(true);
  const [sound, setSound] = useState(false);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [researchAlerts, setResearchAlerts] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);

  const toggleRow = (label: string, value: boolean, setValue: (v: boolean) => void) => (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-dark-700/20 transition-colors">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        onClick={() => setValue(!value)}
        className={`w-12 h-6 rounded-full transition-all duration-300 ${value ? 'bg-gradient-to-r from-neon-cyan to-neon-purple' : 'bg-dark-600'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 mx-1 ${value ? 'translate-x-6' : ''}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="glass-card overflow-hidden divide-y divide-glass-border">
        {toggleRow('Desktop notifications', desktop, setDesktop)}
        {toggleRow('Notification sounds', sound, setSound)}
      </div>
      <div className="glass-card overflow-hidden divide-y divide-glass-border">
        <div className="px-4 py-3 border-b border-glass-border">
          <p className="text-sm font-semibold text-neon-cyan">Alert Categories</p>
        </div>
        {toggleRow('Job search alerts', jobAlerts, setJobAlerts)}
        {toggleRow('Research completion alerts', researchAlerts, setResearchAlerts)}
        {toggleRow('System & workflow alerts', systemAlerts, setSystemAlerts)}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const SECTION_COMPONENTS: Record<Section, React.ReactNode> = {
  'api-keys': <ApiKeysSection />,
  models: <ModelsSection />,
  appearance: <AppearanceSection />,
  shortcuts: <ShortcutsSection />,
  notifications: <NotificationsSettings />,
  privacy: <PrivacySection />,
  advanced: <AdvancedSection />,
};

export default function AppSettingsPanel() {
  const [activeSection, setActiveSection] = useState<Section>('api-keys');

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left nav */}
      <div className="w-56 shrink-0 bg-dark-900 border-r border-glass-border flex flex-col overflow-y-auto">
        <div className="px-4 py-5 border-b border-glass-border">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-neon-cyan" />
            <h2 className="font-display font-bold text-white">Settings</h2>
          </div>
        </div>
        <nav className="flex-1 p-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm text-left transition-colors ${
                activeSection === s.id
                  ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                  : 'text-slate-400 hover:text-white hover:bg-dark-700/40'
              }`}
            >
              <span className={activeSection === s.id ? 'text-neon-cyan' : 'text-slate-500'}>{s.icon}</span>
              {s.label}
              {activeSection === s.id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <h3 className="text-xl font-display font-bold text-white mb-6">
            {SECTIONS.find((s) => s.id === activeSection)?.label}
          </h3>
          {SECTION_COMPONENTS[activeSection]}
        </div>
      </div>
    </div>
  );
}
