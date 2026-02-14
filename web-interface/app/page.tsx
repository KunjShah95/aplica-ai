'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Terminal,
  Zap,
  Shield,
  Globe,
  Code,
  Brain,
  Lock,
  ChevronRight,
  Check,
  Star,
  MessageSquare,
  Cpu,
  Database,
  Cloud,
  Key,
  FileText,
  Music,
  Image,
  Video,
  Link2,
  Rss,
  ExternalLink,
  Mail,
  Calendar,
  Clock,
  Bot,
  Command,
  Layers,
  Workflow,
  TrendingUp,
  Users,
  Zap as Lightning,
} from 'lucide-react';

function CursorSpotlight() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="cursor-spotlight" style={{ left: `${position.x}px`, top: `${position.y}px` }} />
  );
}

function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="nav-logo">
        <div className="logo-mark" />
        <span className="logo-text">Alpicia</span>
      </div>
      <ul className="nav-links">
        <li>
          <Link href="#features" className="nav-link">
            Features
          </Link>
        </li>
        <li>
          <Link href="#tools" className="nav-link">
            Tools
          </Link>
        </li>
        <li>
          <Link href="#pricing" className="nav-link">
            Pricing
          </Link>
        </li>
        <li>
          <Link href="#docs" className="nav-link">
            Docs
          </Link>
        </li>
      </ul>
      <div className="nav-actions">
        <Link href="/dashboard" className="nav-link-login">
          Login
        </Link>
        <button className="nav-cta">Get Started</button>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="deco-line deco-line-1" />
      <div className="deco-line deco-line-2" />
      <div className="deco-square deco-square-1" />
      <div className="deco-square deco-square-2" />

      <div className="hero-badge">
        <span className="hero-badge-dot" />
        v3.0 Now Available with GPT-5
      </div>

      <h1 className="hero-title">
        <span className="line">
          <span className="word">Your Personal</span>
        </span>
        <span className="line">
          <span className="word">
            <span className="accent">AI Evolution</span>
          </span>
        </span>
      </h1>

      <p className="hero-subtitle">
        Alpicia isn&apos;t just an assistant. It&apos;s an extension of your mind. Automate tasks,
        analyze data, create content, and control your digital life with the speed of thought.
      </p>

      <div className="hero-actions">
        <button className="btn-primary">
          Start Building Free <ArrowRight size={18} />
        </button>
        <button className="btn-secondary">
          <Terminal size={18} /> View Documentation
        </button>
      </div>

      <div className="hero-stats">
        <div className="stat-item">
          <span className="stat-value">50K+</span>
          <span className="stat-label">Active Users</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value">10M+</span>
          <span className="stat-label">Tasks Completed</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value">99.9%</span>
          <span className="stat-label">Uptime</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value">150+</span>
          <span className="stat-label">AI Tools</span>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: any;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <div className="feature-card" style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="feature-icon">
        <Icon size={24} />
      </div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-desc">{description}</p>
    </div>
  );
}

function Features() {
  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description:
        'Process requests in milliseconds with our custom neural engine. Experience real-time AI interactions like never before.',
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description:
        'End-to-end encryption. Your data stays yours. Toggle secure mode for sensitive tasks with local processing.',
    },
    {
      icon: Globe,
      title: 'Global Reach',
      description:
        'Support for 100+ languages. Translate, communicate, and understand without barriers.',
    },
    {
      icon: Code,
      title: 'Developer APIs',
      description:
        'Powerful CLI tools and REST APIs. Build custom workflows and integrate into your existing stack.',
    },
    {
      icon: Brain,
      title: 'Context Aware',
      description:
        'Long-term memory that learns your preferences. Adapts to your working style over time.',
    },
    {
      icon: Lock,
      title: 'Enterprise Security',
      description: 'SOC2 compliant, GDPR ready. Role-based access control and audit logs.',
    },
  ];

  return (
    <section className="features" id="features">
      <div className="features-header">
        <p className="features-label">Capabilities</p>
        <h2 className="features-title">Built for the Future</h2>
        <p className="features-subtitle">Everything you need to automate, create, and succeed</p>
      </div>
      <div className="features-grid">
        {features.map((f, i) => (
          <FeatureCard key={i} {...f} index={i} />
        ))}
      </div>
    </section>
  );
}

function ToolShowcase() {
  const tools = [
    { icon: Image, name: 'Image Generation', desc: 'DALL-E 3, Stable Diffusion', color: '#ff6b6b' },
    { icon: Music, name: 'Voice & Audio', desc: 'TTS, STT, Voice Cloning', color: '#4ecdc4' },
    { icon: Video, name: 'Video Analysis', desc: 'Content moderation, scenes', color: '#45b7d1' },
    {
      icon: FileText,
      name: 'Document AI',
      desc: 'OCR, summarization, extraction',
      color: '#96ceb4',
    },
    { icon: Globe, name: 'Web Search', desc: 'Real-time information retrieval', color: '#ffeaa7' },
    { icon: Link2, name: 'URL Tools', desc: 'Shortening, metadata, RSS', color: '#dfe6e9' },
    { icon: Calendar, name: 'Calendar', desc: 'Google Calendar integration', color: '#74b9ff' },
    { icon: Mail, name: 'Email', desc: 'Gmail, Outlook automation', color: '#a29bfe' },
    {
      icon: Database,
      name: 'Data Analysis',
      desc: 'Statistics, patterns, insights',
      color: '#fd79a8',
    },
    { icon: Cloud, name: 'Cloud Storage', desc: 'Drive, Dropbox, S3', color: '#00cec9' },
    { icon: Key, name: 'Passwords', desc: 'Secure credential management', color: '#fdcb6e' },
    { icon: Workflow, name: 'Workflows', desc: 'Custom automation pipelines', color: '#e17055' },
  ];

  return (
    <section className="tools-section" id="tools">
      <div className="tools-header">
        <p className="features-label">Powerful Tools</p>
        <h2 className="features-title">150+ Built-in Tools</h2>
        <p className="features-subtitle">
          From image generation to data analysis, we have you covered
        </p>
      </div>
      <div className="tools-grid">
        {tools.map((tool, i) => (
          <div key={i} className="tool-card" style={{ '--tool-color': tool.color } as any}>
            <div className="tool-icon" style={{ background: `${tool.color}20`, color: tool.color }}>
              <tool.icon size={24} />
            </div>
            <div className="tool-info">
              <h3>{tool.name}</h3>
              <p>{tool.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: '0',
      period: 'forever',
      desc: 'Perfect for individuals',
      features: ['5,000 messages/month', 'Basic tools', 'Email support', '1 workspace'],
      cta: 'Start Free',
      popular: false,
    },
    {
      name: 'Pro',
      price: '29',
      period: 'month',
      desc: 'For power users',
      features: [
        'Unlimited messages',
        'All 150+ tools',
        'Priority support',
        '10 workspaces',
        'API access',
        'Custom workflows',
      ],
      cta: 'Start Trial',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      desc: 'For organizations',
      features: [
        'Everything in Pro',
        'Dedicated support',
        'Custom integrations',
        'SSO & SAML',
        'Audit logs',
        'SLA guarantee',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-header">
        <p className="features-label">Pricing</p>
        <h2 className="features-title">Simple, Transparent Pricing</h2>
        <p className="features-subtitle">Start free, upgrade when you're ready</p>
      </div>
      <div className="pricing-grid">
        {plans.map((plan, i) => (
          <div key={i} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <div className="popular-badge">Most Popular</div>}
            <h3 className="plan-name">{plan.name}</h3>
            <div className="plan-price">
              <span className="price-amount">{plan.price}</span>
              {plan.period && <span className="price-period">/{plan.period}</span>}
            </div>
            <p className="plan-desc">{plan.desc}</p>
            <ul className="plan-features">
              {plan.features.map((f, j) => (
                <li key={j}>
                  <Check size={16} /> {f}
                </li>
              ))}
            </ul>
            <button className={`plan-cta ${plan.popular ? 'primary' : ''}`}>{plan.cta}</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'CTO at TechFlow',
      text: "Alpicia saved us 40 hours per week on data analysis. It's like having a whole team of analysts.",
      avatar: 'SC',
    },
    {
      name: 'Marcus Johnson',
      role: 'Founder, StartupHub',
      text: 'The voice capabilities are incredible. I can now manage my entire calendar hands-free while driving.',
      avatar: 'MJ',
    },
    {
      name: 'Elena Rodriguez',
      role: 'Lead Developer',
      text: 'The API is beautifully designed. We integrated it into our app in less than a day.',
      avatar: 'ER',
    },
    {
      name: 'David Kim',
      role: 'Product Manager',
      text: 'Context awareness is a game-changer. It actually remembers my preferences across sessions.',
      avatar: 'DK',
    },
  ];

  return (
    <section className="testimonials-section">
      <div className="testimonials-header">
        <p className="features-label">Testimonials</p>
        <h2 className="features-title">Loved by Developers</h2>
      </div>
      <div className="testimonials-grid">
        {testimonials.map((t, i) => (
          <div key={i} className="testimonial-card">
            <div className="testimonial-stars">
              {[...Array(5)].map((_, j) => (
                <Star key={j} size={16} fill="#ffb800" color="#ffb800" />
              ))}
            </div>
            <p className="testimonial-text">&ldquo;{t.text}&rdquo;</p>
            <div className="testimonial-author">
              <div className="avatar">{t.avatar}</div>
              <div>
                <h4>{t.name}</h4>
                <p>{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="cta-section">
      <div className="cta-content">
        <h2>Ready to Transform Your Workflow?</h2>
        <p>Join thousands of developers already building with Alpicia</p>
        <div className="cta-actions">
          <button className="btn-primary btn-large">
            Get Started Free <ArrowRight size={20} />
          </button>
          <button className="btn-secondary btn-large">Talk to Sales</button>
        </div>
      </div>
    </section>
  );
}

function DocsPreview() {
  const docs = [
    { title: 'Quick Start', desc: 'Get up and running in 5 minutes', icon: Lightning },
    { title: 'API Reference', desc: 'Complete REST API documentation', icon: Code },
    { title: 'Tool Guides', desc: 'Learn how to use each AI tool', icon: Cpu },
    { title: 'Integrations', desc: 'Connect with 50+ services', icon: Layers },
  ];

  return (
    <section className="docs-section" id="docs">
      <div className="docs-header">
        <p className="features-label">Documentation</p>
        <h2 className="features-title">Build with Confidence</h2>
        <p className="features-subtitle">Comprehensive guides and references for every feature</p>
      </div>
      <div className="docs-grid">
        {docs.map((doc, i) => (
          <div key={i} className="docs-card">
            <div className="docs-icon">
              <doc.icon size={24} />
            </div>
            <h3>{doc.title}</h3>
            <p>{doc.desc}</p>
            <a href="#" className="docs-link">
              Read more <ChevronRight size={16} />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

function TerminalDemo() {
  const lines = [
    { type: 'command', content: '$ alpicia chat --voice' },
    { type: 'output', content: 'Initializing voice interface...' },
    { type: 'success', content: '✓ Voice activated (0.02s)' },
    { type: 'user', content: 'Create a meeting with the team tomorrow at 3pm' },
    {
      type: 'ai',
      content: '✓ Created calendar event: &quot;Team Meeting&quot; - Tomorrow at 3:00 PM EST',
    },
    { type: 'ai', content: '✓ Notified 5 team members' },
    { type: 'command', content: '$ alpicia generate image --prompt "futuristic city"' },
    { type: 'output', content: 'Generating image with DALL-E 3...' },
    { type: 'success', content: '✓ Image generated (2.3s)' },
    { type: 'success', content: '✓ Saved to /output/city.png' },
  ];

  return (
    <section className="terminal-section" id="demo">
      <div className="terminal-container">
        <div className="terminal-header">
          <div className="terminal-btn terminal-btn-close" />
          <div className="terminal-btn terminal-btn-minimize" />
          <div className="terminal-btn terminal-btn-maximize" />
          <span className="terminal-title">Alpicia Terminal v3.0</span>
        </div>
        <div className="terminal-body">
          {lines.map((line, i) => (
            <div key={i} className={`terminal-line line-${line.type}`}>
              {line.type === 'command' && (
                <>
                  <span className="terminal-prompt">$</span>
                  <span className="terminal-command">{line.content}</span>
                </>
              )}
              {line.type === 'output' && <span className="terminal-output">{line.content}</span>}
              {line.type === 'success' && (
                <>
                  <span className="terminal-success">✓</span>
                  <span className="terminal-success-text">{line.content}</span>
                </>
              )}
              {line.type === 'user' && (
                <>
                  <span className="terminal-user">You:</span>
                  <span className="terminal-user-text">{line.content}</span>
                </>
              )}
              {line.type === 'ai' && (
                <>
                  <span className="terminal-ai">Alpicia:</span>
                  <span className="terminal-ai-text">{line.content}</span>
                </>
              )}
            </div>
          ))}
          <div className="terminal-line">
            <span className="terminal-prompt">$</span>
            <span className="terminal-cursor" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const footerLinks = {
    Product: ['Features', 'Pricing', 'Integrations', 'Changelog'],
    Resources: ['Documentation', 'API Reference', 'Guides', 'Blog'],
    Company: ['About', 'Careers', 'Press', 'Contact'],
    Legal: ['Privacy', 'Terms', 'Security', 'GDPR'],
  };

  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="footer-brand">
          <div className="nav-logo">
            <div className="logo-mark" />
            <span className="logo-text">Alpicia</span>
          </div>
          <p>Your personal AI assistant for the modern workflow.</p>
          <div className="social-links">
            <a href="#">
              <MessageSquare size={20} />
            </a>
            <a href="#">
              <Star size={20} />
            </a>
            <a href="#">
              <Code size={20} />
            </a>
          </div>
        </div>
        <div className="footer-links-grid">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="footer-column">
              <h4>{category}</h4>
              <ul>
                {links.map((link, i) => (
                  <li key={i}>
                    <a href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2024 Alpicia AI. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main>
      <div className="geo-grid" />
      <div className="noise" />
      <CursorSpotlight />
      <Navigation />
      <Hero />
      <Features />
      <ToolShowcase />
      <TerminalDemo />
      <Testimonials />
      <Pricing />
      <DocsPreview />
      <CTASection />
      <Footer />
    </main>
  );
}
