import React, { useState, useCallback } from "react";
import {
  Workflow,
  Play,
  Users,
  Cloud,
  Settings,
  ChevronRight,
  Box,
  Zap,
  BarChart3,
  Shield,
  Menu,
  X,
  Moon,
  Sun,
  Globe,
  Smartphone,
} from "lucide-react";
import WorkflowCanvas from "./components/workflow/WorkflowCanvas";
import NodePanel from "./components/workflow/NodePanel";
import NodeConfigPanel from "./components/workflow/NodeConfigPanel";
import WorkflowToolbar from "./components/workflow/WorkflowToolbar";
import TemplateGallery from "./components/workflow/TemplateGallery";
import { useWorkflowStore, NodeType } from "./store/workflowStore";

type Tab =
  | "workflow"
  | "templates"
  | "deploy"
  | "analytics"
  | "team"
  | "settings";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("workflow");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const { addNode } = useWorkflowStore();

  const handleExecute = useCallback(() => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      alert("Workflow executed successfully! 🚀");
    }, 2000);
  }, []);

  const handleAddNode = useCallback(
    (type: NodeType) => {
      addNode(type, [Math.random() * 300 + 100, Math.random() * 300 + 100]);
    },
    [addNode],
  );

  const handleSelectTemplate = useCallback((template: any) => {
    setShowTemplateGallery(false);
    alert(
      `Template "${template.name}" loaded! Configure the nodes to get started.`,
    );
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "workflow",
      label: "Workflows",
      icon: <Workflow className="w-5 h-5" />,
    },
    { id: "templates", label: "Templates", icon: <Box className="w-5 h-5" /> },
    { id: "deploy", label: "Deploy", icon: <Cloud className="w-5 h-5" /> },
    {
      id: "analytics",
      label: "Analytics",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    { id: "team", label: "Team", icon: <Users className="w-5 h-5" /> },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  if (showTemplateGallery) {
    return (
      <div className="h-screen bg-slate-950 flex">
        <div className="w-16 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "workflow") {
                  setShowTemplateGallery(false);
                } else {
                  setActiveTab(tab.id);
                  setShowTemplateGallery(false);
                }
              }}
              className={`p-3 rounded-lg transition-colors ${activeTab === tab.id ? "bg-primary-500 text-white" : "text-slate-400 hover:bg-slate-800"}`}
              title={tab.label}
            >
              {tab.icon}
            </button>
          ))}
        </div>

        <div className="flex-1">
          <TemplateGallery onSelectTemplate={handleSelectTemplate} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-screen flex ${darkMode ? "bg-slate-950" : "bg-slate-100"}`}
    >
      {/* Left Sidebar */}
      <div
        className={`${sidebarOpen ? "w-16" : "w-16"} bg-slate-900 border-r border-slate-700 flex flex-col transition-all duration-300`}
      >
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-white">SentinelBot</span>
            )}
          </div>
        </div>

        <div className="flex-1 py-4 flex flex-col items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 rounded-lg transition-all duration-200 ${activeTab === tab.id ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
              title={tab.label}
            >
              {tab.icon}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-700 flex flex-col gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
            title={darkMode ? "Light Mode" : "Dark Mode"}
          >
            {darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-3 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
            title="Toggle Sidebar"
          >
            {sidebarOpen ? (
              <ChevronRight className="w-5 h-5 rotate-180" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white capitalize">
              {activeTab}
            </h1>
            {activeTab === "workflow" && (
              <button
                onClick={() => setShowTemplateGallery(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
              >
                📁 Browse Templates
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Connected to SentinelBot
            </div>

            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
              <Smartphone className="w-5 h-5" />
            </button>

            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
              <Globe className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-slate-700 mx-2"></div>

            <button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors">
              Deploy Workflow
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === "workflow" ? (
            <>
              <NodePanel onAddNode={handleAddNode} />

              <div className="flex-1 flex flex-col">
                <WorkflowToolbar
                  onExecute={handleExecute}
                  isExecuting={isExecuting}
                />
                <WorkflowCanvas />
              </div>

              <NodeConfigPanel />
            </>
          ) : activeTab === "deploy" ? (
            <DeployPanel />
          ) : activeTab === "analytics" ? (
            <AnalyticsPanel />
          ) : activeTab === "team" ? (
            <TeamPanel />
          ) : activeTab === "settings" ? (
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
      <h2 className="text-2xl font-bold text-white mb-6">
        🚀 One-Click Deployment
      </h2>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <DeployCard
          title="Docker"
          icon="🐳"
          description="Run in isolated containers"
          steps={[
            "docker-compose up -d",
            "Configure .env",
            "Access at localhost:3000",
          ]}
          badge="Recommended"
        />
        <DeployCard
          title="Railway"
          icon="🚂"
          description="Deploy to cloud in minutes"
          steps={["Click Deploy Button", "Add Environment Vars", "Done!"]}
          badge="Easiest"
        />
        <DeployCard
          title="Vercel"
          icon="▲"
          description="Edge deployment with CI/CD"
          steps={["Connect GitHub", "Import Repository", "Auto Deploy"]}
          badge="Fastest"
        />
      </div>

      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Quick Deploy Command
        </h3>
        <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <span className="text-green-400">$</span> npx sentinelbot deploy
          --provider=railway
        </div>
      </div>
    </div>
  );
}

function DeployCard({
  title,
  icon,
  description,
  steps,
  badge,
}: {
  title: string;
  icon: string;
  description: string;
  steps: string[];
  badge?: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-primary-500 transition-colors">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-4xl">{icon}</span>
          {badge && (
            <span className="px-2 py-1 bg-primary-500 text-white text-xs rounded-full">
              {badge}
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-4">{description}</p>

        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-5 h-5 bg-primary-500/20 text-primary-400 rounded-full flex items-center justify-center text-xs">
                {i + 1}
              </span>
              <code className="text-slate-300">{step}</code>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700">
        <button className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors">
          Deploy Now
        </button>
      </div>
    </div>
  );
}

function AnalyticsPanel() {
  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-6">
        📊 Analytics Dashboard
      </h2>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Executions" value="12,847" change="+24%" />
        <StatCard label="Active Workflows" value="47" change="+5" />
        <StatCard label="Success Rate" value="99.2%" change="+0.3%" />
        <StatCard label="Avg Response Time" value="1.2s" change="-0.2s" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Workflow Popularity
          </h3>
          <div className="space-y-3">
            {[
              "Welcome Bot",
              "Auto Responder",
              "Daily Digest",
              "Ticket System",
            ].map((name, i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-slate-400 text-sm w-32">{name}</span>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-pink-500"
                    style={{ width: `${80 - i * 15}%` }}
                  ></div>
                </div>
                <span className="text-slate-400 text-sm w-12 text-right">
                  {80 - i * 15}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Platform Usage
          </h3>
          <div className="flex items-center justify-center gap-8">
            {[
              { platform: "Telegram", usage: 45, color: "bg-blue-500" },
              { platform: "Discord", usage: 30, color: "bg-indigo-500" },
              { platform: "WebSocket", usage: 15, color: "bg-purple-500" },
              { platform: "CLI", usage: 10, color: "bg-slate-500" },
            ].map(({ platform, usage, color }) => (
              <div key={platform} className="text-center">
                <div
                  className={`w-16 h-16 ${color} rounded-full flex items-center justify-center text-white font-bold`}
                >
                  {usage}%
                </div>
                <p className="text-slate-400 text-sm mt-2">{platform}</p>
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
}: {
  label: string;
  value: string;
  change: string;
}) {
  const isPositive = change.startsWith("+");
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p
        className={`text-sm mt-2 ${isPositive ? "text-green-400" : "text-red-400"}`}
      >
        {change} from last week
      </p>
    </div>
  );
}

function TeamPanel() {
  const teamMembers = [
    { name: "John Doe", role: "Admin", avatar: "👨‍💻", status: "online" },
    { name: "Jane Smith", role: "Developer", avatar: "👩‍💻", status: "away" },
    { name: "Bob Wilson", role: "Viewer", avatar: "👨‍🔬", status: "offline" },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">👥 Team Management</h2>
        <button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors">
          + Invite Member
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {teamMembers.map((member) => (
              <tr key={member.name} className="hover:bg-slate-700/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{member.avatar}</span>
                    <span className="font-medium text-white">
                      {member.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      member.role === "Admin"
                        ? "bg-red-500/20 text-red-400"
                        : member.role === "Developer"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-slate-500/20 text-slate-400"
                    }`}
                  >
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`flex items-center gap-2 ${
                      member.status === "online"
                        ? "text-green-400"
                        : member.status === "away"
                          ? "text-amber-400"
                          : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        member.status === "online"
                          ? "bg-green-400"
                          : member.status === "away"
                            ? "bg-amber-400"
                            : "bg-slate-400"
                      }`}
                    ></span>
                    {member.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-slate-400 hover:text-white transition-colors">
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
      <h2 className="text-2xl font-bold text-white mb-6">⚙️ Settings</h2>

      <div className="space-y-6 max-w-2xl">
        <SettingsSection title="General" icon="🌐">
          <SettingsItem label="Language" value="English" />
          <SettingsItem label="Timezone" value="UTC (GMT+0)" />
          <SettingsItem label="Date Format" value="YYYY-MM-DD" />
        </SettingsSection>

        <SettingsSection title="Notifications" icon="🔔">
          <SettingsToggle label="Email Notifications" enabled />
          <SettingsToggle label="Push Notifications" enabled={false} />
          <SettingsToggle label="Slack Alerts" enabled />
        </SettingsSection>

        <SettingsSection title="Security" icon="🔒">
          <SettingsItem label="Two-Factor Auth" value="Disabled" link />
          <SettingsItem label="API Keys" value="Manage" link />
          <SettingsItem label="Session Timeout" value="30 minutes" />
        </SettingsSection>

        <SettingsSection title="API Access" icon="🔑">
          <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm">
            <span className="text-green-400">OPENAI_API_KEY</span>=sk-...
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
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="px-6 py-4 bg-slate-900 border-b border-slate-700">
        <h3 className="font-semibold text-white">
          {icon} {title}
        </h3>
      </div>
      <div className="divide-y divide-slate-700">{children}</div>
    </div>
  );
}

function SettingsItem({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: boolean;
}) {
  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <span className="text-slate-300">{label}</span>
      <button
        className={`text-slate-400 hover:text-white transition-colors ${link ? "text-primary-400" : ""}`}
      >
        {value} →
      </button>
    </div>
  );
}

function SettingsToggle({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <span className="text-slate-300">{label}</span>
      <button
        className={`w-12 h-6 rounded-full transition-colors ${enabled ? "bg-primary-500" : "bg-slate-600"}`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`}
        ></div>
      </button>
    </div>
  );
}

export default App;
