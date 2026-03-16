import React, { useState, useEffect } from 'react';
import {
  Brain,
  Zap,
  Globe,
  Shield,
  MessageSquare,
  Bot,
  Workflow,
  Cpu,
  ChevronRight,
  ArrowRight,
  Play,
  Star,
  Check,
  Sparkles,
  Terminal,
  Layers,
  Gauge,
  Lock,
  Code,
  Mail,
  ChevronDown,
  Menu,
  X,
  Twitter,
  Github,
  Linkedin,
  MessageCircle,
  Rocket,
} from 'lucide-react';

const Discord = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <div className="min-h-screen bg-dark-950 animated-bg noise-overlay overflow-x-hidden">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-dark-900/90 backdrop-blur-xl border-b border-glass-border'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-display font-bold text-white tracking-wider">
                ALPICIA
              </span>
            </a>

            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-slate-400 hover:text-neon-cyan transition-colors text-sm font-medium"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4">
              <a
                href="/dashboard"
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors text-sm"
              >
                Sign In
              </a>
              <a
                href="/dashboard"
                className="px-5 py-2.5 glow-button-cyan rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                Get Started
              </a>
            </div>

            <button
              className="md:hidden p-2 text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-dark-900/95 backdrop-blur-xl border-t border-glass-border">
            <div className="px-6 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-slate-300 hover:text-neon-cyan py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/dashboard"
                className="block px-5 py-2.5 glow-button-cyan rounded-xl text-sm font-semibold text-center mt-4"
              >
                Get Started
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-magenta/10 rounded-full blur-[128px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-neon-purple/5 rounded-full blur-[150px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark-800/50 border border-glass-border mb-8">
              <Sparkles className="w-4 h-4 text-neon-amber" />
              <span className="text-sm text-slate-300">The Future of AI Assistants is Here</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 leading-tight">
              Your AI That{' '}
              <span className="bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-magenta bg-clip-text text-transparent">
                Evolves
              </span>{' '}
              With You
            </h1>

            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Alpicia is an autonomous AI personal assistant that learns, adapts, and grows. From
              multi-platform messaging to self-evolving prompts, experience the next generation of
              AI.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <a
                href="/dashboard"
                className="px-8 py-4 glow-button-cyan rounded-xl text-base font-semibold flex items-center gap-3"
              >
                <Rocket className="w-5 h-5" />
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </a>
              <button className="px-8 py-4 glass-card rounded-xl text-base font-semibold text-slate-300 flex items-center gap-3 hover:border-neon-cyan/30 transition-all">
                <Play className="w-5 h-5" />
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {[
                { value: '50+', label: 'Platforms' },
                { value: '10K+', label: 'Active Users' },
                { value: '99.9%', label: 'Uptime' },
                { value: '24/7', label: 'Support' },
              ].map((stat) => (
                <div key={stat.label} className="glass-card p-4 text-center">
                  <div className="text-3xl font-display font-bold text-neon-cyan">{stat.value}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Platform Logos */}
      <section className="py-12 px-6 border-y border-glass-border bg-dark-900/50">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-slate-500 text-sm mb-8">
            CONNECTED WITH YOUR FAVORITE PLATFORMS
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-50">
            {['Telegram', 'Discord', 'WhatsApp', 'Slack', 'Twitter', 'LINE'].map((platform) => (
              <span key={platform} className="text-xl font-display font-bold text-slate-400">
                {platform}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-neon-cyan text-sm font-mono tracking-wider">FEATURES</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mt-4 mb-6">
              Everything You Need to Build
              <br />
              <span className="text-neon-purple">Intelligent Assistants</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              From basic automation to advanced self-evolution, Alpicia provides the complete
              toolkit for building AI-powered experiences.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <MessageSquare className="w-6 h-6" />,
                title: 'Multi-Platform',
                description:
                  'Telegram, Discord, WhatsApp, LINE, Nostr, IRC, SMS, and more. One assistant, everywhere.',
                gradient: 'from-neon-cyan to-neon-purple',
              },
              {
                icon: <Brain className="w-6 h-6" />,
                title: 'Self-Evolution',
                description:
                  'Genetic algorithms that mutate prompts and breed skills. Your assistant gets smarter over time.',
                gradient: 'from-neon-purple to-neon-magenta',
              },
              {
                icon: <Workflow className="w-6 h-6" />,
                title: 'Visual Workflows',
                description:
                  'Drag-and-drop workflow builder. No code required for complex automation pipelines.',
                gradient: 'from-neon-magenta to-neon-pink',
              },
              {
                icon: <Layers className="w-6 h-6" />,
                title: 'Hybrid Memory',
                description:
                  'Vector search, knowledge graphs, episodic replay. True long-term memory for AI.',
                gradient: 'from-neon-green to-neon-cyan',
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: 'Enterprise Security',
                description:
                  'Injection shields, PII scrubbing, E2E encryption. Built for production use.',
                gradient: 'from-neon-amber to-neon-pink',
              },
              {
                icon: <Gauge className="w-6 h-6" />,
                title: 'Execution Engine',
                description:
                  'Firecracker sandbox, persistent REPL, Git autopilot. Run code safely in production.',
                gradient: 'from-neon-pink to-neon-amber',
              },
              {
                icon: <Globe className="w-6 h-6" />,
                title: 'World Hooks',
                description:
                  'Monitor patents, arxiv papers, grants, and regulations automatically.',
                gradient: 'from-indigo-500 to-neon-purple',
              },
              {
                icon: <Cpu className="w-6 h-6" />,
                title: 'Analytics Suite',
                description:
                  'Causal inference, A/B testing, experiment designer. Data-driven decisions.',
                gradient: 'from-neon-cyan to-neon-green',
              },
              {
                icon: <Terminal className="w-6 h-6" />,
                title: 'CLI & SDK',
                description:
                  'Programmatic control with full SDK. Integrate into your existing stack.',
                gradient: 'from-neon-purple to-neon-cyan',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="glass-card p-6 group hover:scale-[1.02] transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-display font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-dark-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-neon-magenta text-sm font-mono tracking-wider">HOW IT WORKS</span>
            <h2 className="text-4xl font-display font-bold text-white mt-4">
              From Setup to Self-Evolution
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Connect',
                description: 'Link your messaging platforms with one click',
              },
              {
                step: '02',
                title: 'Configure',
                description: 'Set up skills, workflows, and memory',
              },
              {
                step: '03',
                title: 'Deploy',
                description: 'Go live instantly with auto-scaling',
              },
              {
                step: '04',
                title: 'Evolve',
                description: 'Watch your assistant learn and improve',
              },
            ].map((item, idx) => (
              <div key={idx} className="text-center relative">
                <div className="text-6xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-neon-cyan/20 to-neon-magenta/20 mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-display font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.description}</p>
                {idx < 3 && (
                  <ChevronRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-neon-cyan/30 w-6 h-6" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-neon-green text-sm font-mono tracking-wider">PRICING</span>
            <h2 className="text-4xl font-display font-bold text-white mt-4 mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: 'Starter',
                price: 'Free',
                description: 'Perfect for individuals',
                features: [
                  '3 platforms',
                  '1,000 messages/month',
                  'Basic memory',
                  'Community support',
                ],
                gradient: 'from-slate-700 to-slate-600',
                cta: 'Start Free',
              },
              {
                name: 'Pro',
                price: '$29',
                period: '/month',
                description: 'For growing teams',
                features: [
                  'Unlimited platforms',
                  'Unlimited messages',
                  'Advanced memory',
                  'Self-evolution',
                  'Priority support',
                  'Custom workflows',
                ],
                gradient: 'from-neon-cyan to-neon-purple',
                popular: true,
                cta: 'Start Trial',
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                description: 'For large organizations',
                features: [
                  'Everything in Pro',
                  'Dedicated infrastructure',
                  'SLA guarantee',
                  '24/7 phone support',
                  'Custom integrations',
                  'On-premise option',
                ],
                gradient: 'from-neon-purple to-neon-magenta',
                cta: 'Contact Sales',
              },
            ].map((plan, idx) => (
              <div
                key={idx}
                className={`glass-card p-6 relative ${
                  plan.popular ? 'border-neon-cyan shadow-[0_0_30px_rgba(0,245,255,0.2)]' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-white mb-4 mx-auto`}
                >
                  {idx === 0 && <Bot className="w-6 h-6" />}
                  {idx === 1 && <Zap className="w-6 h-6" />}
                  {idx === 2 && <Layers className="w-6 h-6" />}
                </div>
                <h3 className="text-2xl font-display font-bold text-white text-center mb-2">
                  {plan.name}
                </h3>
                <div className="text-center mb-4">
                  <span className="text-4xl font-display font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-slate-400 text-sm">{plan.period}</span>}
                </div>
                <p className="text-slate-400 text-sm text-center mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-neon-green flex-shrink-0" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    plan.popular
                      ? 'glow-button-cyan'
                      : 'glass-card border border-glass-border text-slate-300 hover:border-neon-cyan/30'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 via-neon-purple/10 to-neon-magenta/10" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
            Ready to Build the Future?
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Join thousands of developers building intelligent assistants with Alpicia.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/dashboard"
              className="px-8 py-4 glow-button-cyan rounded-xl text-base font-semibold flex items-center gap-3"
            >
              <Rocket className="w-5 h-5" />
              Start Building Free
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#contact"
              className="px-8 py-4 glass-card rounded-xl text-base font-semibold text-slate-300 flex items-center gap-3 hover:border-neon-cyan/30 transition-all"
            >
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-glass-border bg-dark-900/80 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <a href="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-display font-bold text-white tracking-wider">
                  ALPICIA
                </span>
              </a>
              <p className="text-slate-400 text-sm max-w-xs">
                The autonomous AI personal assistant that evolves with you. Build intelligent
                experiences across any platform.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#features" className="hover:text-neon-cyan transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-neon-cyan transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-neon-cyan transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-neon-cyan transition-colors">
                    Changelog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#about" className="hover:text-neon-cyan transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-neon-cyan transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-neon-cyan transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-neon-cyan transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#" className="hover:text-neon-cyan transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-neon-cyan transition-colors">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-neon-cyan transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-glass-border">
            <p className="text-slate-500 text-sm">© 2024 Alpicia. All rights reserved.</p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <a href="#" className="text-slate-400 hover:text-neon-cyan transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-neon-cyan transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-neon-cyan transition-colors">
                <Discord className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-neon-cyan transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
