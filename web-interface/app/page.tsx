'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Terminal, Zap, Shield, Globe, Code, Brain, Lock } from 'lucide-react';

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
    <div
      className="cursor-spotlight"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    />
  );
}

function Navigation() {
  return (
    <nav className="nav">
      <div className="nav-logo">
        <div className="logo-mark" />
        <span className="logo-text">OpenClaw</span>
      </div>
      <ul className="nav-links">
        <li>
          <Link href="#features" className="nav-link">
            Features
          </Link>
        </li>
        <li>
          <Link href="#demo" className="nav-link">
            Demo
          </Link>
        </li>
        <li>
          <Link href="#pricing" className="nav-link">
            Pricing
          </Link>
        </li>
      </ul>
      <button className="nav-cta">Get Early Access</button>
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
        v2.0 Now Available
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
        OpenClaw isn&apos;t just an assistant. It&apos;s an extension of your mind. Automate tasks,
        analyze data, and create content with the speed of thought.
      </p>

      <div className="hero-actions">
        <button className="btn-primary">
          Start Building Free
          <ArrowRight size={18} />
        </button>
        <button className="btn-secondary">
          <Terminal size={18} />
          View Documentation
        </button>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="feature-card">
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
      title: 'Lightning Fast Processing',
      description:
        'Powered by our custom neural engine, OpenClaw processes requests in milliseconds, ensuring a seamless conversation experience.',
    },
    {
      icon: Shield,
      title: 'Privacy First Security',
      description:
        'Your data is encrypted locally and never shared. Toggle secure mode for sensitive tasks.',
    },
    {
      icon: Globe,
      title: 'Intuitive Design',
      description:
        'Designed for humans, not just engineers. Simple controls with powerful capabilities.',
    },
    {
      icon: Code,
      title: 'Developer Friendly',
      description:
        'Powerful APIs and CLI tools for developers who want to build on top of OpenClaw.',
    },
    {
      icon: Brain,
      title: 'Context Aware',
      description:
        'OpenClaw remembers your preferences and adapts to your working style over time.',
    },
    {
      icon: Lock,
      title: 'Enterprise Grade',
      description: 'SOC2 compliant, GDPR ready, and built for enterprise security requirements.',
    },
  ];

  return (
    <section className="features" id="features">
      <div className="features-header">
        <p className="features-label">Capabilities</p>
        <h2 className="features-title">Built for the Future</h2>
      </div>
      <div className="features-grid">
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
    </section>
  );
}

function TerminalDemo() {
  const lines = [
    { type: 'command', content: '$ openclaw secure-boot --fast' },
    { type: 'output', content: 'Initializing secure enclave...' },
    { type: 'output', content: 'Verifying identity...' },
    { type: 'success', content: '✓ Ready for secure interaction (0.04s)' },
    { type: 'command', content: '$ openclaw analyze --data ./data' },
    { type: 'output', content: 'Processing 10,000 records...' },
    { type: 'success', content: '✓ Analysis complete. Insights generated.' },
  ];

  return (
    <section className="terminal-section" id="demo">
      <div className="terminal-container">
        <div className="terminal-header">
          <div className="terminal-btn terminal-btn-close" />
          <div className="terminal-btn terminal-btn-minimize" />
          <div className="terminal-btn terminal-btn-maximize" />
          <span className="terminal-title">OpenClaw Terminal</span>
        </div>
        <div className="terminal-body">
          {lines.map((line, index) => (
            <div key={index} className="terminal-line">
              {line.type === 'command' && (
                <>
                  <span className="terminal-prompt">$</span>
                  <span className="terminal-command">{line.content}</span>
                </>
              )}
              {line.type === 'output' && <span className="terminal-output">{line.content}</span>}
              {line.type === 'success' && <span className="terminal-prompt">{line.content}</span>}
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
  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="footer-copy">© 2024 OpenClaw AI. All rights reserved.</p>
        <div className="footer-links">
          <a href="#" className="footer-link">
            Twitter
          </a>
          <a href="#" className="footer-link">
            GitHub
          </a>
          <a href="#" className="footer-link">
            Discord
          </a>
        </div>
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
      <TerminalDemo />
      <Footer />
    </main>
  );
}
