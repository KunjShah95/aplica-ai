import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { 
  Bot, 
  Send, 
  Play, 
  Square, 
  RotateCcw, 
  Copy, 
  Check, 
  Download,
  Share2,
  Zap,
  MessageSquare,
  Terminal,
  Settings,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Github,
  Twitter,
  Users,
  Globe,
  Shield,
  Cpu,
  Lightbulb,
  BookOpen,
  Coffee,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  executing?: boolean
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  prompt: string
}

const quickActions: QuickAction[] = [
  {
    id: 'summarize',
    title: 'Summarize Text',
    description: 'Get a quick summary of any text',
    icon: <BookOpen className="w-5 h-5" />,
    prompt: 'Summarize this: Artificial intelligence (AI) leverages computers and machines to mimic the problem-solving and decision-making capabilities of the human mind. As a technology, AI is constantly evolving, offering new opportunities to improve our lives.'
  },
  {
    id: 'translate',
    title: 'Translate',
    description: 'Translate between languages',
    icon: <Globe className="w-5 h-5" />,
    prompt: 'Translate "Hello, how are you?" to Spanish, French, and Japanese'
  },
  {
    id: 'code',
    title: 'Write Code',
    description: 'Generate code snippets',
    icon: <Terminal className="w-5 h-5" />,
    prompt: 'Write a Python function to calculate fibonacci numbers'
  },
  {
    id: ' brainstorm',
    title: 'Brainstorm Ideas',
    description: 'Generate creative ideas',
    icon: <Lightbulb className="w-5 h-5" />,
    prompt: 'Give me 5 creative ideas for a mobile app that helps people stay productive'
  }
]

const tutorials = [
  {
    title: 'Getting Started with SentinelBot',
    duration: '2 min',
    steps: [
      'Click the chat input and type a message',
      'Watch SentinelBot respond instantly',
      'Try one of the quick actions below',
      'Explore the demo features!'
    ]
  },
  {
    title: 'Create Your First Workflow',
    duration: '3 min',
    steps: [
      'Navigate to the Workflow tab',
      'Click "Add Node" to add a trigger',
      'Connect nodes to build your flow',
      'Click Execute to run your workflow'
    ]
  },
  {
    title: 'Using AI Agents',
    duration: '3 min',
    steps: [
      'Select the AI Agent node type',
      'Choose an agent role (Researcher, Coder, etc.)',
      'Define your task',
      'Let the agent handle complex work'
    ]
  }
]

function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'workflows' | 'tutorials'>('chat')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 **Welcome to SentinelBot Demo!**

I'm your AI personal assistant. I can help you with:
- 💬 **Chat** - Ask me anything
- 🔧 **Workflows** - Build automation flows
- 📚 **Tutorials** - Learn how to use me

Try one of the quick actions below or type a message to get started!`,
      timestamp: Date.now()
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedTutorial, setExpandedTutorial] = useState<number | null>(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (prompt?: string) => {
    const message = prompt || input.trim()
    if (!message) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const responses: Record<string, string> = {
        summarize: `📝 **Summary:**

AI (Artificial Intelligence) refers to computer systems that can perform tasks typically requiring human intelligence. Key points:

• **Machine Learning**: Systems that learn from data
• **Natural Language Processing**: Understanding human language
• **Computer Vision**: Interpreting visual information
• **Automation**: Repetitive task handling

AI continues to evolve, offering new ways to improve efficiency and solve complex problems.`,
        translate: `🌍 **Translations:**

• **Spanish**: "Hola, ¿cómo estás?"
• **French**: "Bonjour, comment ça va ?"
• **Japanese**: "お元気ですか？" (O genki desu ka?)

Would you like translations in other languages?`,
        code: `🐍 **Python Fibonacci Function:**

\`\`\`python
def fibonacci(n):
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    
    fib = [0, 1]
    while len(fib) < n:
        fib.append(fib[-1] + fib[-2])
    return fib

# Usage
print(fibonacci(10))  # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
\`\`\`

Want me to explain the code or optimize it?`,
        brainstorm: `💡 **5 Productive Mobile App Ideas:**

1. **Focus Buddy** - AI-powered focus timer with accountability partners

2. **Habit Farm** - Gamified habit tracking where habits grow into virtual gardens

3. **Meeting Summarizer** - Auto-transcribe and summarize meetings with action items

4. **Learning Snap** - Capture notes, get AI explanations and quizzes

5. **Energy Tracker** - Track productivity patterns and suggest optimal work times

Want detailed specifications for any of these?`
      }

      let responseContent = responses[prompt || 'default'] || `🤖 **SentinelBot Response:**

I processed your message: "${message}"

In the full version of SentinelBot, I would:
- Execute commands on your system
- Search the web for current information
- Read and write files
- Interact with multiple platforms

**Try these commands:**
- "Summarize this text..."
- "Translate to [language]..."
- "Write a Python script to..."
- "Generate ideas for..."

🚀 *Sign up at sentinelbot.dev to unlock full capabilities!*`

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: Date.now()
      }

      setMessages(prev => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('• ')) {
        return <div key={i} className="ml-4 mb-1">{line}</div>
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} className="font-semibold text-white mt-3 mb-1">{line.slice(2, -2)}</div>
      }
      if (line.startsWith('```')) {
        return null
      }
      return <div key={i} className="mb-1">{line}</div>
    })
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">SentinelBot</h1>
              <p className="text-xs text-slate-400">AI Personal Assistant Demo</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
              { id: 'workflows', label: 'Workflows', icon: <Share2 className="w-4 h-4" /> },
              { id: 'tutorials', label: 'Learn', icon: <BookOpen className="w-4 h-4" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg font-medium transition-colors">
              <Zap className="w-4 h-4" />
              Deploy
            </button>
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors" title="GitHub">
              <Github className="w-5 h-5 text-slate-400" />
            </button>
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors" title="Twitter">
              <Twitter className="w-5 h-5 text-slate-400" />
            </button>
            <button 
              className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-800 p-2">
            {[
              { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
              { id: 'workflows', label: 'Workflows', icon: <Share2 className="w-4 h-4" /> },
              { id: 'tutorials', label: 'Learn', icon: <BookOpen className="w-4 h-4" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  setMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-slate-800"
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {activeTab === 'chat' && (
          <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
            {/* Left Sidebar - Quick Actions */}
            <aside className="hidden lg:block w-80 border-r border-slate-800 p-4 overflow-y-auto">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Quick Actions
              </h2>
              <div className="space-y-2">
                {quickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleSend(action.prompt)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors text-left"
                  >
                    <div className="p-2 bg-primary-500/20 text-primary-400 rounded-lg">
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{action.title}</div>
                      <div className="text-xs text-slate-400">{action.description}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>

              <div className="mt-8">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Features
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: <Bot className="w-4 h-4" />, label: 'AI Agents' },
                    { icon: <Terminal className="w-4 h-4" />, label: 'Shell Commands' },
                    { icon: <Globe className="w-4 h-4" />, label: 'Web Search' },
                    { icon: <FileText className="w-4 h-4" />, label: 'File Ops' }
                  ].map(feature => (
                    <div key={feature.label} className="p-3 bg-slate-800/50 rounded-lg text-center">
                      <div className="text-primary-400 mb-1 flex justify-center">{feature.icon}</div>
                      <div className="text-xs">{feature.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 p-4 bg-gradient-to-br from-primary-500/20 to-pink-500/20 rounded-xl border border-primary-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary-400" />
                  <span className="font-semibold">Go Full Version</span>
                </div>
                <p className="text-sm text-slate-300 mb-3">
                  Get unlimited access to all features, custom workflows, and multi-platform support.
                </p>
                <button className="w-full py-2 bg-primary-500 hover:bg-primary-600 rounded-lg font-medium transition-colors">
                  Get Started Free
                </button>
              </div>
            </aside>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'assistant' 
                        ? 'bg-gradient-to-br from-primary-500 to-pink-500' 
                        : 'bg-slate-700'
                    }`}>
                      {message.role === 'assistant' ? (
                        <Bot className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-sm font-medium">You</span>
                      )}
                    </div>
                    
                    <div className={`max-w-[75%] ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block p-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-primary-500 text-white rounded-tr-sm'
                          : 'bg-slate-800 rounded-tl-sm'
                      }`}>
                        <div className="text-sm whitespace-pre-wrap text-left">
                          {formatText(message.content)}
                          {message.executing && (
                            <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full ml-2 animate-pulse" />
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-slate-800">
                <div className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      placeholder="Ask SentinelBot anything..."
                      className="w-full px-4 py-3 pr-12 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      rows={1}
                      style={{ minHeight: '52px', maxHeight: '120px' }}
                    />
                    <button 
                      onClick={() => setIsMuted(!isMuted)}
                      className={`absolute right-3 bottom-3 p-1.5 rounded-lg transition-colors ${
                        isMuted ? 'text-red-400' : 'text-slate-400 hover:text-white}
                    >
                      {isMuted ? <MicOff className="w'
                      }`-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                  </div>
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() && !isTyping}
                    className="p-3 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span>Press Enter to send, Shift+Enter for new line</span>
                  <span>{isMuted ? '🔇 Voice off' : '🎤 Voice available'}</span>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Stats & Info */}
            <aside className="hidden xl:block w-72 border-l border-slate-800 p-4 overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Demo Stats
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-white">{messages.length}</div>
                    <div className="text-xs text-slate-400">Messages</div>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-white">{quickActions.length}</div>
                    <div className="text-xs text-slate-400">Actions</div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Capabilities
                </h2>
                <div className="space-y-2">
                  {[
                    { name: 'Multi-Platform', status: true, icon: <Globe className="w-4 h-4" /> },
                    { name: 'Browser Control', status: true, icon: <Globe className="w-4 h-4" /> },
                    { name: 'Code Execution', status: true, icon: <Terminal className="w-4 h-4" /> },
                    { name: 'Voice Input', status: false, icon: <Mic className="w-4 h-4" /> },
                    { name: 'File Manager', status: true, icon: <FileText className="w-4 h-4" /> }
                  ].map(cap => (
                    <div key={cap.name} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {cap.icon}
                        <span className="text-sm">{cap.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        cap.status 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-slate-600 text-slate-400'
                      }`}>
                        {cap.status ? 'Demo' : 'Pro'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Resources
                </h2>
                <div className="space-y-2">
                  {[
                    { label: 'Documentation', icon: <BookOpen className="w-4 h-4" /> },
                    { label: 'GitHub', icon: <Github className="w-4 h-4" /> },
                    { label: 'Discord', icon: <Users className="w-4 h-4" /> },
                    { label: 'Website', icon: <ExternalLink className="w-4 h-4" /> }
                  ].map(resource => (
                    <a
                      key={resource.label}
                      href="#"
                      className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-300"
                    >
                      {resource.icon}
                      <span className="text-sm">{resource.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'workflows' && (
          <div className="p-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Share2 className="w-12 h-12 text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Visual Workflow Builder</h2>
            <p className="text-slate-400 max-w-md mx-auto mb-6">
              Create powerful automation workflows with our drag-and-drop builder. 
              Connect AI agents, triggers, and actions into intelligent flows.
            </p>
            <button className="px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-xl font-medium inline-flex items-center gap-2">
              <Play className="w-5 h-5" />
              Launch Workflow Builder
            </button>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[
                { icon: <Bot className="w-6 h-6" />, label: 'AI Agents' },
                { icon: <Zap className="w-6 h-6" />, label: 'Triggers' },
                { icon: <Terminal className="w-6 h-6" />, label: 'Actions' }
              ].map(item => (
                <div key={item.label} className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-primary-400 mb-2 flex justify-center">{item.icon}</div>
                  <div className="text-sm text-slate-300">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tutorials' && (
          <div className="p-6 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">Learn SentinelBot</h2>
            <p className="text-slate-400 mb-8">Interactive tutorials to get you started</p>

            <div className="space-y-4">
              {tutorials.map((tutorial, index) => (
                <div 
                  key={index}
                  className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedTutorial(expandedTutorial === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{tutorial.title}</div>
                        <div className="text-xs text-slate-400">{tutorial.duration} • {tutorial.steps.length} steps</div>
                      </div>
                    </div>
                    {expandedTutorial === index ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  {expandedTutorial === index && (
                    <div className="border-t border-slate-700 p-4">
                      <div className="space-y-3">
                        {tutorial.steps.map((step, stepIndex) => (
                          <div key={stepIndex} className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                              {stepIndex + 1}
                            </div>
                            <span className="text-slate-300">{step}</span>
                          </div>
                        ))}
                      </div>
                      <button className="mt-4 w-full py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-lg font-medium transition-colors">
                        Start Tutorial
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-gradient-to-br from-primary-500/10 to-pink-500/10 rounded-xl border border-primary-500/20">
              <h3 className="font-semibold mb-2">🚀 Ready to go further?</h3>
              <p className="text-slate-400 text-sm mb-4">
                Install SentinelBot locally to unlock the full power of AI automation.
              </p>
              <div className="flex gap-3">
                <button className="flex-1 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg font-medium transition-colors">
                  Install Now
                </button>
                <button className="px-4 py-2 border border-slate-600 rounded-lg hover:bg-slate-800 transition-colors">
                  View Docs
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span>© 2026 SentinelBot</span>
            <span>•</span>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <span>•</span>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500">Open Source • MIT License</span>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FileText(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
