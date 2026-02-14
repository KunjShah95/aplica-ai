'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Settings,
  Plus,
  Search,
  Menu,
  X,
  Mic,
  Paperclip,
  Image,
  Code,
  FileText,
  MoreVertical,
  Clock,
  Star,
  Trash2,
  Copy,
  Edit,
  ChevronDown,
  Sparkles,
  Zap,
  Terminal,
  Database,
  Wifi,
  Cpu,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tools?: string[];
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}

const defaultMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content:
      "Hello! I'm Alpicia, your personal AI assistant. I can help you with a wide range of tasks including:\n\n• **Content Creation** - Writing, editing, and brainstorming\n• **Data Analysis** - Analyzing numbers and generating insights\n• **Image Generation** - Creating images with DALL-E or Stable Diffusion\n• **Automation** - Scheduling, emails, and workflow automation\n• **Research** - Searching the web, reading documents, and summarizing\n\nWhat would you like help with today?",
    timestamp: new Date(),
    tools: ['web_search', 'generate_image', 'analyze_data'],
  },
];

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: '1', title: 'Image Generation Ideas', messages: [], timestamp: new Date() },
    { id: '2', title: 'Data Analysis Project', messages: [], timestamp: new Date() },
    { id: '3', title: 'Email Automation', messages: [], timestamp: new Date() },
  ]);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getAIResponse(input),
        timestamp: new Date(),
        tools: ['web_search', 'generate_image'],
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const getAIResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    if (
      lowerQuery.includes('image') ||
      lowerQuery.includes('generate') ||
      lowerQuery.includes('draw')
    ) {
      return "I'd be happy to help you generate an image! Here's what I can create:\n\n**Available Models:**\n• **DALL-E 3** - Best for detailed, photorealistic images\n• **Stable Diffusion** - Great for artistic styles and custom outputs\n\n**Sizes:** 256x256, 512x512, 1024x1024, 1792x1024\n\nJust describe what you'd like to see, and I'll generate it for you!";
    }

    if (
      lowerQuery.includes('data') ||
      lowerQuery.includes('analyze') ||
      lowerQuery.includes('chart')
    ) {
      return 'I can help you analyze data! Here are my capabilities:\n\n**Analysis Tools:**\n• Statistical analysis (mean, median, mode, std dev)\n• Trend detection and forecasting\n• Correlation analysis\n• Outlier detection\n• Pattern recognition\n\nYou can paste your data, upload a file, or connect to a database. What data would you like to analyze?';
    }

    if (lowerQuery.includes('weather') || lowerQuery.includes('forecast')) {
      return 'I can get current weather and forecasts for any location! Just tell me:\n\n• City name (e.g., "New York")\n• Or use coordinates\n\nI can also provide:\n• 5-day forecasts\n• Weather alerts\n• Temperature in Celsius or Fahrenheit\n\nWhat location would you like weather for?';
    }

    if (lowerQuery.includes('translate') || lowerQuery.includes('language')) {
      return "I support translation in 100+ languages! Here's what I can do:\n\n**Features:**\n• Translate between any two languages\n• Auto-detect source language\n• Translate entire documents\n• Maintain formatting\n\n**Supported Languages:** English, Spanish, French, German, Chinese, Japanese, Korean, Arabic, Russian, and 90+ more!\n\nWhat would you like to translate?";
    }

    if (lowerQuery.includes('summarize') || lowerQuery.includes('summary')) {
      return 'I can summarize content in multiple ways:\n\n**Summary Styles:**\n• **Brief** - 1-2 sentence overview\n• **Detailed** - Comprehensive summary with key points\n• **Bullet Points** - Key takeaways as a list\n\nI can summarize:\n• URLs/webpages\n• Documents (PDF, DOCX)\n• YouTube videos (with transcripts)\n• Long text passages\n\nWhat would you like summarized?';
    }

    return (
      'I understand you\'re asking about "' +
      query.slice(0, 50) +
      '...". I\'m here to help with a wide range of tasks!\n\n**What I can do:**\n• 🎨 Generate images with AI\n• 📊 Analyze data and create insights\n• 🌐 Search the web and read content\n• 📝 Write, edit, and brainstorm\n• 🔄 Automate workflows\n• 🌍 Translate between 100+ languages\n• 📅 Manage calendar and email\n• 🎙️ Voice interactions\n\nHow can I assist you today?'
    );
  };

  const quickActions = [
    { icon: Image, label: 'Generate Image', color: '#ff6b6b' },
    { icon: Code, label: 'Write Code', color: '#4ecdc4' },
    { icon: FileText, label: 'Summarize', color: '#45b7d1' },
    { icon: Cpu, label: 'Analyze Data', color: '#96ceb4' },
    { icon: Zap, label: 'Quick Task', color: '#ffeaa7' },
    { icon: Wifi, label: 'Web Search', color: '#dfe6e9' },
  ];

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <Link href="/" className="sidebar-logo">
            <div className="logo-mark" />
            <span>Alpicia</span>
          </Link>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <button className="new-chat-btn">
          <Plus size={18} />
          {sidebarOpen && <span>New Chat</span>}
        </button>

        {sidebarOpen && (
          <div className="conversations-list">
            <div className="conversations-header">
              <span>Recent Chats</span>
            </div>
            {conversations.map((conv) => (
              <button key={conv.id} className="conversation-item">
                <MessageSquare size={16} />
                <span>{conv.title}</span>
              </button>
            ))}
          </div>
        )}

        <div className="sidebar-footer">
          <Link href="/settings" className="sidebar-link">
            <Settings size={18} />
            {sidebarOpen && <span>Settings</span>}
          </Link>
          <div className="user-info">
            <div className="user-avatar">JD</div>
            {sidebarOpen && (
              <div className="user-details">
                <span className="user-name">John Doe</span>
                <span className="user-plan">Pro Plan</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={20} />
            </button>
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                <MessageSquare size={16} /> Chat
              </button>
              <button
                className={`tab ${activeTab === 'agents' ? 'active' : ''}`}
                onClick={() => setActiveTab('agents')}
              >
                <Bot size={16} /> Agents
              </button>
              <button
                className={`tab ${activeTab === 'workflows' ? 'active' : ''}`}
                onClick={() => setActiveTab('workflows')}
              >
                <Terminal size={16} /> Workflows
              </button>
              <button
                className={`tab ${activeTab === 'memory' ? 'active' : ''}`}
                onClick={() => setActiveTab('memory')}
              >
                <Database size={16} /> Memory
              </button>
            </div>
          </div>
          <div className="top-bar-right">
            <div className="search-box">
              <Search size={16} />
              <input type="text" placeholder="Search..." />
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="chat-container">
          <div className="messages-container">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                <div className="message-avatar">
                  {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className="message-content">
                  <div
                    className="message-text"
                    dangerouslySetInnerHTML={{
                      __html: message.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br>'),
                    }}
                  />
                  {message.tools && message.tools.length > 0 && (
                    <div className="message-tools">
                      <span className="tools-label">Using:</span>
                      {message.tools.map((tool, i) => (
                        <span key={i} className="tool-badge">
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="message-actions">
                    <button>
                      <Copy size={14} />
                    </button>
                    <button>
                      <Edit size={14} />
                    </button>
                    <button>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar">
                  <Bot size={20} />
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="quick-actions">
              <p className="quick-actions-label">Quick actions</p>
              <div className="quick-actions-grid">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    className="quick-action-btn"
                    onClick={() => setInput(action.label.toLowerCase())}
                  >
                    <div
                      className="quick-action-icon"
                      style={{ background: `${action.color}20`, color: action.color }}
                    >
                      <action.icon size={20} />
                    </div>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="input-container">
            <div className="input-wrapper">
              <button className="input-action">
                <Paperclip size={18} />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message Alpicia..."
                className="message-input"
              />
              <button className="input-action">
                <Mic size={18} />
              </button>
              <button
                className="send-btn"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
              >
                <Send size={18} />
              </button>
            </div>
            <p className="input-hint">
              <Sparkles size={12} />
              Alpicia can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </main>

      <style jsx>{`
        .dashboard {
          display: flex;
          height: 100vh;
          background: var(--obsidian);
          overflow: hidden;
        }

        .sidebar {
          width: 280px;
          background: var(--charcoal);
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          transition: width 0.3s ease;
        }

        .sidebar.closed {
          width: 70px;
        }

        .sidebar-header {
          padding: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: var(--white);
          font-weight: 600;
        }

        .logo-mark {
          width: 32px;
          height: 32px;
          background: var(--lime);
          clip-path: polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%);
          position: relative;
        }

        .logo-mark::after {
          content: '';
          position: absolute;
          inset: 3px;
          background: var(--charcoal);
          clip-path: polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%);
        }

        .sidebar-toggle {
          background: transparent;
          border: none;
          color: var(--white-dim);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .sidebar-toggle:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--white);
        }

        .new-chat-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin: 1rem;
          padding: 0.875rem;
          background: var(--lime);
          border: none;
          color: var(--obsidian);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .new-chat-btn:hover {
          box-shadow: 0 4px 20px rgba(202, 255, 0, 0.3);
        }

        .conversations-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .conversations-header {
          padding: 0.75rem 0.5rem;
          font-size: 0.75rem;
          color: var(--white-dim);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .conversation-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem;
          background: transparent;
          border: none;
          color: var(--white-dim);
          font-size: 0.9375rem;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
          text-align: left;
        }

        .conversation-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--white);
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          color: var(--white-dim);
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .sidebar-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--white);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          margin-top: 0.5rem;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          background: var(--lime);
          color: var(--obsidian);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .user-details {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-weight: 500;
          font-size: 0.9375rem;
        }
        .user-plan {
          font-size: 0.75rem;
          color: var(--lime);
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          background: var(--charcoal);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .top-bar-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .mobile-menu-btn {
          display: none;
          background: transparent;
          border: none;
          color: var(--white);
          cursor: pointer;
          padding: 0.5rem;
        }

        .tabs {
          display: flex;
          gap: 0.25rem;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: transparent;
          border: none;
          color: var(--white-dim);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .tab:hover {
          color: var(--white);
        }
        .tab.active {
          background: rgba(202, 255, 0, 0.1);
          color: var(--lime);
        }

        .top-bar-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: var(--graphite);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
        }

        .search-box input {
          background: transparent;
          border: none;
          color: var(--white);
          font-size: 0.875rem;
          outline: none;
          width: 200px;
        }

        .search-box input::placeholder {
          color: var(--white-dim);
        }

        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
        }

        .message {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          animation: fadeIn 0.3s ease;
        }

        .message-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .message.user .message-avatar {
          background: #74b9ff;
          color: var(--obsidian);
        }
        .message.assistant .message-avatar {
          background: var(--lime);
          color: var(--obsidian);
        }

        .message-content {
          flex: 1;
          max-width: 800px;
        }

        .message-text {
          line-height: 1.7;
          color: var(--white);
          font-size: 0.9375rem;
        }

        .message-text :global(strong) {
          color: var(--lime);
          font-weight: 600;
        }

        .message-tools {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .tools-label {
          font-size: 0.75rem;
          color: var(--white-dim);
        }
        .tool-badge {
          padding: 0.25rem 0.625rem;
          background: rgba(202, 255, 0, 0.1);
          color: var(--lime);
          font-size: 0.75rem;
          border-radius: 999px;
        }

        .message-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .message:hover .message-actions {
          opacity: 1;
        }

        .message-actions button {
          background: transparent;
          border: none;
          color: var(--white-dim);
          cursor: pointer;
          padding: 0.375rem;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .message-actions button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--white);
        }

        .typing-indicator {
          display: flex;
          gap: 0.375rem;
          padding: 0.5rem;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: var(--lime);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(1) {
          animation-delay: -0.32s;
        }
        .typing-indicator span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        .quick-actions {
          padding: 0 2rem;
          margin-bottom: 1rem;
        }

        .quick-actions-label {
          font-size: 0.75rem;
          color: var(--white-dim);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1rem;
        }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.75rem;
        }

        .quick-action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: var(--charcoal);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quick-action-btn:hover {
          border-color: rgba(202, 255, 0, 0.3);
          transform: translateY(-2px);
        }

        .quick-action-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .quick-action-btn span {
          font-size: 0.8125rem;
          color: var(--white-dim);
        }

        .input-container {
          padding: 1.5rem 2rem;
          background: var(--charcoal);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--graphite);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
        }

        .input-action {
          background: transparent;
          border: none;
          color: var(--white-dim);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .input-action:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--white);
        }

        .message-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--white);
          font-size: 0.9375rem;
          outline: none;
        }

        .message-input::placeholder {
          color: var(--white-dim);
        }

        .send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: var(--lime);
          border: none;
          color: var(--obsidian);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .send-btn:hover:not(:disabled) {
          box-shadow: 0 4px 15px rgba(202, 255, 0, 0.3);
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .input-hint {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          font-size: 0.75rem;
          color: var(--white-dim);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1024px) {
          .quick-actions-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            z-index: 100;
            height: 100%;
          }
          .sidebar.closed {
            transform: translateX(-100%);
          }
          .mobile-menu-btn {
            display: flex;
          }
          .tabs {
            display: none;
          }
          .search-box {
            display: none;
          }
          .quick-actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .messages-container {
            padding: 1rem;
          }
          .input-container {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
