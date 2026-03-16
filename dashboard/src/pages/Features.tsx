import React from 'react';
import {
  Brain,
  Zap,
  Globe,
  Shield,
  MessageSquare,
  Bot,
  Workflow,
  Cpu,
  Gauge,
  Lock,
  Code,
  Terminal,
  Layers,
  Sparkles,
  ArrowRight,
  Check,
  Play,
  ChevronRight,
} from 'lucide-react';

const features = [
  {
    category: 'Communication',
    items: [
      {
        icon: <MessageSquare className="w-8 h-8" />,
        title: 'Multi-Platform Messaging',
        description:
          'Connect Telegram, Discord, WhatsApp, LINE, Nostr, IRC, SMS, WeCom, DingTalk, Feishu, QQ and more. One assistant, every platform.',
        highlights: ['50+ adapters', 'Real-time sync', 'Unified inbox'],
      },
      {
        icon: <Mail className="w-8 h-8" />,
        title: 'Email Integration',
        description:
          'Send and receive emails with full automation. Newsletter digests, auto-responders, and more.',
        highlights: ['SMTP/IMAP', 'Template emails', 'Bulk sending'],
      },
      {
        icon: <Globe className="w-8 h-8" />,
        title: 'WebSocket Gateway',
        description:
          'Real-time bidirectional communication for custom web applications and live features.',
        highlights: ['Sub-millisecond latency', 'Auto-reconnection', 'Event-based'],
      },
    ],
  },
  {
    category: 'Intelligence',
    items: [
      {
        icon: <Brain className="w-8 h-8" />,
        title: 'Self-Evolution',
        description:
          'Genetic algorithms that mutate prompts and breed skills. Your assistant gets smarter over time through continuous learning.',
        highlights: ['Prompt mutation', 'Skill breeding', 'Overnight evolution'],
      },
      {
        icon: <Layers className="w-8 h-8" />,
        title: 'Hybrid Memory',
        description:
          'Multi-layered memory system with vector search, knowledge graphs, episodic replay, and Ebbinghaus curve decay.',
        highlights: ['Vector search', 'Knowledge graphs', 'Pattern extraction'],
      },
      {
        icon: <Cpu className="w-8 h-8" />,
        title: 'Causal Analytics',
        description:
          'Statistical analysis tools for understanding cause and effect. Diff-in-diff, instrumental variables, and more.',
        highlights: ['A/B testing', 'Statistical inference', 'Experiment designer'],
      },
    ],
  },
  {
    category: 'Automation',
    items: [
      {
        icon: <Workflow className="w-8 h-8" />,
        title: 'Visual Workflow Builder',
        description:
          'Drag-and-drop interface for creating complex automation pipelines. No code required.',
        highlights: ['50+ node types', 'Conditional logic', 'Parallel execution'],
      },
      {
        icon: <Gauge className="w-8 h-8" />,
        title: 'Execution Engine',
        description:
          'Firecracker sandbox for safe code execution, persistent REPL, Git autopilot, and CI/CD self-healer.',
        highlights: ['5s timeout', '256MB limit', 'Auto-fixes'],
      },
      {
        icon: <Zap className="w-8 h-8" />,
        title: 'Task Scheduler',
        description: 'Cron expressions, intervals, and one-time tasks for recurring automation.',
        highlights: ['Cron syntax', 'Timezone aware', 'Retry logic'],
      },
    ],
  },
  {
    category: 'Security',
    items: [
      {
        icon: <Shield className="w-8 h-8" />,
        title: 'Enterprise Security',
        description:
          'Injection shields, PII scrubbing, and comprehensive audit logging for production deployments.',
        highlights: ['Prompt guard', 'Data redaction', 'Full audit trail'],
      },
      {
        icon: <Lock className="w-8 h-8" />,
        title: 'End-to-End Encryption',
        description: 'Encrypt memories at rest and in transit. Your data stays yours.',
        highlights: ['AES-256', 'Key rotation', 'Zero-knowledge'],
      },
      {
        icon: <Code className="w-8 h-8" />,
        title: 'Command Sandboxing',
        description:
          'Restricted execution context for shell commands with allowlist/blocklist filtering.',
        highlights: ['Whitelist mode', 'Path validation', 'Timeout protection'],
      },
    ],
  },
];

const FeaturesPage = () => {
  return (
    <div className="min-h-screen bg-dark-950 animated-bg noise-overlay">
      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-[128px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-neon-cyan text-sm font-mono tracking-wider">FEATURES</span>
            <h1 className="text-5xl md:text-6xl font-display font-bold text-white mt-4 mb-6">
              Powerful Capabilities
              <br />
              <span className="text-neon-purple">Built for Production</span>
            </h1>
            <p className="text-xl text-slate-400 mb-10">
              Every tool you need to build, deploy, and scale intelligent AI assistants.
            </p>
          </div>
        </div>
      </section>

      {/* Features by Category */}
      {features.map((category, catIdx) => (
        <section key={category.category} className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-px h-8 bg-gradient-to-b from-neon-cyan to-neon-magenta" />
              <h2 className="text-3xl font-display font-bold text-white">{category.category}</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {category.items.map((feature, idx) => (
                <div
                  key={idx}
                  className="glass-card p-8 group hover:scale-[1.02] transition-all duration-300"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center text-neon-cyan mb-6 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-display font-semibold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.highlights.map((highlight, hIdx) => (
                      <li key={hIdx} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-neon-green flex-shrink-0" />
                        <span className="text-slate-300">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 via-neon-purple/10 to-neon-magenta/10" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl font-display font-bold text-white mb-6">Ready to Explore?</h2>
          <p className="text-xl text-slate-400 mb-10">Start building with Alpicia today.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/dashboard"
              className="px-8 py-4 glow-button-cyan rounded-xl text-base font-semibold flex items-center gap-3"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="/docs"
              className="px-8 py-4 glass-card rounded-xl text-base font-semibold text-slate-300 flex items-center gap-3 hover:border-neon-cyan/30 transition-all"
            >
              <Book className="w-5 h-5" />
              Read Docs
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

function Book({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export default FeaturesPage;
