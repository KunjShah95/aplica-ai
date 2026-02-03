import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import {
  Home,
  MessageSquare,
  Calendar,
  GitBranch,
  FileText,
  Mic,
  Settings,
  Users,
  Activity,
} from 'lucide-react';

function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-primary-600">SentinelBot</span>
            </div>
            <div className="flex items-center space-x-4">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-gray-900'}`
                }
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </NavLink>
              <NavLink
                to="/conversations"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-gray-900'}`
                }
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Conversations
              </NavLink>
              <NavLink
                to="/calendar"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-gray-900'}`
                }
              >
                <Calendar className="w-4 h-4 mr-2" />
                Calendar
              </NavLink>
              <NavLink
                to="/git"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-gray-900'}`
                }
              >
                <GitBranch className="w-4 h-4 mr-2" />
                Git
              </NavLink>
              <NavLink
                to="/knowledge"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-gray-900'}`
                }
              >
                <FileText className="w-4 h-4 mr-2" />
                Knowledge
              </NavLink>
              <NavLink
                to="/voice"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-gray-900'}`
                }
              >
                <Mic className="w-4 h-4 mr-2" />
                Voice
              </NavLink>
              <NavLink
                to="/integrations"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-gray-900'}`
                }
              >
                <Users className="w-4 h-4 mr-2" />
                Integrations
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-gray-900'}`
                }
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </NavLink>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4">
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/git" element={<GitPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/voice" element={<VoicePage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

function DashboardHome() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Conversations"
          value="1,234"
          icon={<MessageSquare className="w-8 h-8 text-primary-600" />}
        />
        <StatCard
          title="Messages Today"
          value="89"
          icon={<Activity className="w-8 h-8 text-green-600" />}
        />
        <StatCard
          title="Knowledge Base Docs"
          value="156"
          icon={<FileText className="w-8 h-8 text-blue-600" />}
        />
        <StatCard
          title="Calendar Events"
          value="12"
          icon={<Calendar className="w-8 h-8 text-purple-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                <span className="text-sm text-gray-600">User started a new conversation</span>
                <span className="text-xs text-gray-400 ml-auto">2 min ago</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Connected Platforms</h2>
          <div className="grid grid-cols-2 gap-4">
            {['Telegram', 'Discord', 'Slack', 'Teams'].map((platform) => (
              <div
                key={platform}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-sm font-medium">{platform}</span>
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}

function ConversationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No conversations yet. Start chatting with your assistant!</p>
      </div>
    </div>
  );
}

function CalendarPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Connect Google Calendar to view events.</p>
      </div>
    </div>
  );
}

function GitPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Git Repositories</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No repositories configured.</p>
      </div>
    </div>
  );
}

function KnowledgePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Create a knowledge base to store documents.</p>
      </div>
    </div>
  );
}

function VoicePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Voice</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Configure voice settings for TTS and STT.</p>
      </div>
    </div>
  );
}

function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {['Telegram', 'Discord', 'Slack', 'Teams', 'Google Calendar', 'GitHub'].map(
          (integration) => (
            <div key={integration} className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-2">{integration}</h3>
              <p className="text-sm text-gray-500 mb-4">Configure {integration} integration</p>
              <button className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                Connect
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">General Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">LLM Provider</label>
            <select className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
              <option>Claude</option>
              <option>OpenAI</option>
              <option>Ollama</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Default Model</label>
            <input
              type="text"
              className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="claude-sonnet-4-20250514"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
}
