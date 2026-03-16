import React, { useState, useCallback } from 'react';
import {
  Workflow,
  Users,
  Cloud,
  Settings,
  ChevronRight,
  Box,
  Zap,
  BarChart3,
  Moon,
  Sun,
  Globe,
  Smartphone,
  Activity,
  History,
  DollarSign,
  Play,
  Cpu,
  Brain,
  Network,
  Shield,
  Code,
  Database,
  Mail,
  Terminal,
  Bug,
  Rocket,
  Sparkles,
} from 'lucide-react';
import WorkflowCanvas from './components/workflow/WorkflowCanvas';
import NodePanel from './components/workflow/NodePanel';
import NodeConfigPanel from './components/workflow/NodeConfigPanel';
import WorkflowToolbar from './components/workflow/WorkflowToolbar';
import TemplateGallery from './components/workflow/TemplateGallery';
import AgentTrace from './components/AgentTrace';
import TaskHistory from './components/TaskHistory';
import CostTrackerPanel from './components/CostTrackerPanel';
import { useWorkflowStore, NodeType } from './store/workflowStore';

type Tab =
  | 'workflow'
  | 'templates'
  | 'deploy'
  | 'analytics'
  | 'trace'
  | 'history'
  | 'costs'
  | 'team'
  | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('workflow');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const { addNode } = useWorkflowStore();

  const handleExecute = useCallback(() => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
    }, 2000);
  }, []);

  const handleAddNode = useCallback(
    (type: NodeType) => {
      const label = `${type.charAt(0).toUpperCase()}${type.slice(1)} Node`;
      addNode(type, [Math.random() * 300 + 100, Math.random() * 300 + 100], label);
    },
    [addNode]
  );

  const handleSelectTemplate = useCallback((template: any) => {
    setShowTemplateGallery(false);
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'workflow', label: 'Workflows', icon: <Workflow className="w-5 h-5" /> },
    { id: 'templates', label: 'Templates', icon: <Box className="w-5 h-5" /> },
    { id: 'deploy', label: 'Deploy', icon: <Rocket className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'trace', label: 'Agent Trace', icon: <Activity className="w-5 h-5" /> },
    { id: 'history', label: 'Task History', icon: <History className="w-5 h-5" /> },
    { id: 'costs', label: 'Cost Tracker', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'team', label: 'Team', icon: <Users className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  if (showTemplateGallery) {
    return (
      <div className="h-screen bg-dark-950 flex animated-bg noise-overlay">
        <div className="w-20 bg-dark-900/80 backdrop-blur-xl border-r border-glass-border flex flex-col items-center py-6 gap-3 relative z-10">
          <div className="mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center animate-pulse-glow">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'workflow') {
                  setShowTemplateGallery(false);
                } else {
                  setActiveTab(tab.id);
                  setShowTemplateGallery(false);
                }
              }}
              className={`p-3.5 rounded-xl transition-all duration-300 group relative ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 text-neon-cyan'
                  : 'text-slate-500 hover:text-neon-cyan hover:bg-dark-700/50'
              }`}
              title={tab.label}
            >
              {tab.icon}
              {activeTab === tab.id && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-neon-cyan to-neon-magenta rounded-r-full" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 relative z-10">
          <TemplateGallery onSelectTemplate={handleSelectTemplate} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-dark-950 animated-bg noise-overlay">
      {/* Left Sidebar - Cyberpunk Style */}
      <div className="w-20 bg-dark-900/80 backdrop-blur-xl border-r border-glass-border flex flex-col relative z-20">
        <div className="p-5 border-b border-glass-border">
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan via-neon-purple to-neon-magenta flex items-center justify-center animate-pulse-glow">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-neon-green rounded-full border-2 border-dark-900 animate-pulse" />
            </div>
          </div>
          <p className="text-center text-xs text-neon-cyan mt-2 font-mono tracking-wider">
            ALPICIA
          </p>
        </div>

        <div className="flex-1 py-6 flex flex-col items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3.5 rounded-xl transition-all duration-300 group relative ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 text-neon-cyan shadow-[0_0_20px_rgba(0,245,255,0.2)]'
                  : 'text-slate-500 hover:text-neon-cyan hover:bg-dark-700/50'
              }`}
              title={tab.label}
            >
              {tab.icon}
              {activeTab === tab.id && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-neon-cyan to-neon-magenta rounded-r-full shadow-[0_0_10px_var(--neon-cyan)]" />
              )}
              <span className="absolute left-full ml-3 px-2 py-1 bg-dark-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-glass-border flex flex-col gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 rounded-xl text-slate-500 hover:text-neon-amber hover:bg-dark-700/50 transition-all group relative"
            title={darkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header - Cyber Style */}
        <div className="h-16 bg-dark-900/60 backdrop-blur-xl border-b border-glass-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-display font-semibold bg-gradient-to-r from-neon-cyan to-neon-magenta bg-clip-text text-transparent uppercase tracking-wider">
              {activeTab}
            </h1>
            {activeTab === 'workflow' && (
              <button
                onClick={() => setShowTemplateGallery(true)}
                className="px-4 py-2 bg-dark-700/50 hover:bg-dark-600/50 text-slate-300 rounded-lg text-sm transition-all border border-glass-border hover:border-neon-cyan/30"
              >
                <Sparkles className="w-4 h-4 inline mr-2 text-neon-amber" />
                Browse Templates
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-neon-green/10 border border-neon-green/30 rounded-full text-sm">
              <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse shadow-[0_0_10px_var(--neon-green)]"></span>
              <span className="text-neon-green font-mono text-xs">ONLINE</span>
            </div>

            <div className="w-px h-8 bg-glass-border mx-2"></div>

            <button className="p-2.5 hover:bg-dark-700/50 rounded-xl transition-all text-slate-400 hover:text-neon-cyan">
              <Smartphone className="w-5 h-5" />
            </button>

            <button className="p-2.5 hover:bg-dark-700/50 rounded-xl transition-all text-slate-400 hover:text-neon-cyan">
              <Globe className="w-5 h-5" />
            </button>

            <div className="w-px h-8 bg-glass-border mx-2"></div>

            <button
              onClick={handleExecute}
              className="px-5 py-2.5 glow-button-cyan rounded-xl text-sm font-semibold tracking-wide uppercase flex items-center gap-2"
            >
              {isExecuting ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Deploy Workflow
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden cyber-grid">
          {activeTab === 'workflow' ? (
            <>
              <NodePanel onAddNode={handleAddNode} />

              <div className="flex-1 flex flex-col">
                <WorkflowToolbar onExecute={handleExecute} isExecuting={isExecuting} />
                <WorkflowCanvas />
              </div>

              <NodeConfigPanel />
            </>
          ) : activeTab === 'deploy' ? (
            <DeployPanel />
          ) : activeTab === 'analytics' ? (
            <AnalyticsPanel />
          ) : activeTab === 'trace' ? (
            <AgentTrace />
          ) : activeTab === 'history' ? (
            <TaskHistory />
          ) : activeTab === 'costs' ? (
            <CostTrackerPanel />
          ) : activeTab === 'team' ? (
            <TeamPanel />
          ) : activeTab === 'settings' ? (
            <SettingsPanel />
          ) : (
            <TemplateGallery onSelectTemplate={handleSelectTemplate} />
          )}
        </div>
      </div>
    </div>
  );
}

function DeployPanel() {
  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
          <Rocket className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-white">One-Click Deployment</h2>
          <p className="text-slate-400 text-sm">Deploy your AI assistant to the world</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <DeployCard
          title="Docker"
          icon={<Cloud className="w-8 h-8" />}
          description="Isolated containers with full control"
          steps={['docker-compose up -d', 'Configure .env', 'Access at localhost:3000']}
          badge="Recommended"
          gradient="from-neon-cyan to-neon-purple"
        />
        <DeployCard
          title="Railway"
          icon={<Train className="w-8 h-8" />}
          description="Cloud deployment in minutes"
          steps={['Click Deploy', 'Add Env Vars', 'Go Live!']}
          badge="Easiest"
          gradient="from-neon-purple to-neon-magenta"
        />
        <DeployCard
          title="Vercel"
          icon={<Globe className="w-8 h-8" />}
          description="Edge deployment with CI/CD"
          steps={['Connect GitHub', 'Import Repo', 'Auto Deploy']}
          badge="Fastest"
          gradient="from-neon-magenta to-neon-pink"
        />
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-neon-cyan" />
          Quick Deploy Command
        </h3>
        <div className="bg-dark-950 rounded-lg p-4 font-mono text-sm border border-glass-border">
          <span className="text-neon-green">$</span> npx alpicia deploy --provider=railway
        </div>
      </div>
    </div>
  );
}

function Train({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" />
      <path d="M12 22V12" />
      <path d="M4 7l8 5 8-5" />
    </svg>
  );
}

function DeployCard({
  title,
  icon,
  description,
  steps,
  badge,
  gradient,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  steps: string[];
  badge?: string;
  gradient: string;
}) {
  return (
    <div className="glass-card overflow-hidden group hover:scale-[1.02] transition-all duration-300">
      <div className={`p-6 bg-gradient-to-br ${gradient} opacity-10 absolute inset-0`} />
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}
          >
            {icon}
          </div>
          {badge && (
            <span
              className={`px-3 py-1 bg-gradient-to-r ${gradient} text-white text-xs rounded-full font-medium`}
            >
              {badge}
            </span>
          )}
        </div>
        <h3 className="text-xl font-display font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-4">{description}</p>

        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span
                className={`w-6 h-6 rounded-full bg-gradient-to-r ${gradient} flex items-center justify-center text-xs text-white font-bold`}
              >
                {i + 1}
              </span>
              <code className="text-slate-300">{step}</code>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 bg-dark-800/50 border-t border-glass-border">
        <button
          className={`w-full py-3 bg-gradient-to-r ${gradient} hover:opacity-90 text-white rounded-lg font-semibold transition-all group-hover:shadow-[0_0_20px_rgba(0,245,255,0.3)]`}
        >
          Deploy Now
        </button>
      </div>
    </div>
  );
}

function AnalyticsPanel() {
  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple to-neon-magenta flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Analytics Dashboard</h2>
          <p className="text-slate-400 text-sm">Monitor your AI assistant performance</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Executions" value="12,847" change="+24%" trend="up" />
        <StatCard label="Active Workflows" value="47" change="+5" trend="up" />
        <StatCard label="Success Rate" value="99.2%" change="+0.3%" trend="up" />
        <StatCard label="Avg Response" value="1.2s" change="-0.2s" trend="down" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Network className="w-5 h-5 text-neon-cyan" />
            Workflow Popularity
          </h3>
          <div className="space-y-4">
            {[
              { name: 'Welcome Bot', pct: 85, color: 'from-neon-cyan to-neon-purple' },
              { name: 'Auto Responder', pct: 70, color: 'from-neon-purple to-neon-magenta' },
              { name: 'Daily Digest', pct: 55, color: 'from-neon-magenta to-neon-pink' },
              { name: 'Ticket System', pct: 40, color: 'from-neon-pink to-neon-amber' },
            ].map((item) => (
              <div key={item.name} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400 text-sm">{item.name}</span>
                  <span className="text-neon-cyan text-sm font-mono">{item.pct}%</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000 group-hover:shadow-[0_0_10px_var(--neon-cyan)]`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-neon-magenta" />
            Platform Usage
          </h3>
          <div className="flex items-center justify-around">
            {[
              { platform: 'Telegram', usage: 45, color: '#229ED9' },
              { platform: 'Discord', usage: 30, color: '#5865F2' },
              { platform: 'WebSocket', usage: 15, color: '#b026ff' },
              { platform: 'CLI', usage: 10, color: '#39ff14' },
            ].map(({ platform, usage, color }) => (
              <div key={platform} className="text-center group">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg relative"
                  style={{
                    background: `conic-gradient(${color} ${usage * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
                    boxShadow: `0 0 30px ${color}30`,
                  }}
                >
                  <div className="w-14 h-14 bg-dark-900 rounded-full flex items-center justify-center">
                    {usage}%
                  </div>
                </div>
                <p className="text-slate-400 text-sm mt-3 group-hover:text-white transition-colors">
                  {platform}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
  trend,
}: {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
}) {
  return (
    <div className="glass-card p-5 hover:scale-[1.02] transition-all duration-300">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className="text-3xl font-display font-bold text-white">{value}</p>
      <p
        className={`text-sm mt-2 flex items-center gap-1 ${trend === 'up' ? 'text-neon-green' : 'text-neon-pink'}`}
      >
        {trend === 'up' ? '↑' : '↓'} {change}
        <span className="text-slate-500">from last week</span>
      </p>
    </div>
  );
}

function TeamPanel() {
  const teamMembers = [
    { name: 'John Doe', role: 'Admin', avatar: '👨‍💻', status: 'online' },
    { name: 'Jane Smith', role: 'Developer', avatar: '👩‍💻', status: 'away' },
    { name: 'Bob Wilson', role: 'Viewer', avatar: '👨‍🔬', status: 'offline' },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-green to-neon-cyan flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-white">Team Management</h2>
            <p className="text-slate-400 text-sm">Manage your team members and permissions</p>
          </div>
        </div>
        <button className="px-5 py-2.5 glow-button-cyan rounded-xl text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-800/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neon-cyan uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neon-cyan uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neon-cyan uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neon-cyan uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-glass-border">
            {teamMembers.map((member) => (
              <tr key={member.name} className="hover:bg-dark-700/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{member.avatar}</span>
                    <span className="font-medium text-white">{member.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      member.role === 'Admin'
                        ? 'bg-neon-pink/20 text-neon-pink'
                        : member.role === 'Developer'
                          ? 'bg-neon-cyan/20 text-neon-cyan'
                          : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`flex items-center gap-2 ${
                      member.status === 'online'
                        ? 'text-neon-green'
                        : member.status === 'away'
                          ? 'text-neon-amber'
                          : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        member.status === 'online'
                          ? 'bg-neon-green shadow-[0_0_10px_var(--neon-green)]'
                          : member.status === 'away'
                            ? 'bg-neon-amber'
                            : 'bg-slate-500'
                      }`}
                    />
                    {member.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-neon-cyan hover:text-white transition-colors">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-amber to-neon-pink flex items-center justify-center">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Settings</h2>
          <p className="text-slate-400 text-sm">Configure your AI assistant</p>
        </div>
      </div>

      <div className="space-y-6 max-w-2xl">
        <SettingsSection title="General" icon={<Globe className="w-5 h-5" />}>
          <SettingsItem label="Language" value="English" />
          <SettingsItem label="Timezone" value="UTC (GMT+0)" />
          <SettingsItem label="Date Format" value="YYYY-MM-DD" />
        </SettingsSection>

        <SettingsSection title="Notifications" icon={<Shield className="w-5 h-5" />}>
          <SettingsToggle label="Email Notifications" enabled />
          <SettingsToggle label="Push Notifications" enabled={false} />
          <SettingsToggle label="Slack Alerts" enabled />
        </SettingsSection>

        <SettingsSection title="Security" icon={<Shield className="w-5 h-5" />}>
          <SettingsItem label="Two-Factor Auth" value="Disabled" link />
          <SettingsItem label="API Keys" value="Manage" link />
          <SettingsItem label="Session Timeout" value="30 minutes" />
        </SettingsSection>

        <SettingsSection title="API Access" icon={<Code className="w-5 h-5" />}>
          <div className="bg-dark-950 rounded-lg p-4 font-mono text-sm border border-glass-border">
            <span className="text-neon-green">OPENAI_API_KEY</span>=sk-...
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-4 bg-dark-800/50 border-b border-glass-border flex items-center gap-3">
        <span className="text-neon-cyan">{icon}</span>
        <h3 className="font-display font-semibold text-white">{title}</h3>
      </div>
      <div className="divide-y divide-glass-border">{children}</div>
    </div>
  );
}

function SettingsItem({ label, value, link }: { label: string; value: string; link?: boolean }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between hover:bg-dark-700/20 transition-colors">
      <span className="text-slate-300">{label}</span>
      <button
        className={`transition-colors ${link ? 'text-neon-cyan hover:text-white' : 'text-slate-400 hover:text-white'}`}
      >
        {value} →
      </button>
    </div>
  );
}

function SettingsToggle({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between hover:bg-dark-700/20 transition-colors">
      <span className="text-slate-300">{label}</span>
      <button
        className={`w-14 h-7 rounded-full transition-all duration-300 ${
          enabled
            ? 'bg-gradient-to-r from-neon-cyan to-neon-purple shadow-[0_0_15px_var(--neon-cyan)]'
            : 'bg-dark-600'
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
            enabled ? 'translate-x-8' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default App;
