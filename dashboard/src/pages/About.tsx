import React from 'react';
import { Brain, Zap, Shield, Globe, Target, Heart, Users, Award, ArrowRight } from 'lucide-react';

const values = [
  {
    icon: <Target className="w-6 h-6" />,
    title: 'Mission Driven',
    description:
      "We're building AI that empowers people, not replaces them. Our goal is to amplify human capability.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Privacy First',
    description:
      'Your data stays yours. We believe in zero-knowledge architecture and transparent data practices.',
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: 'Open Source',
    description:
      'We believe in community-driven development. Our core is open, and we contribute back to the ecosystem.',
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: 'Accessibility',
    description:
      "AI should be available to everyone. We're committed to making powerful tools accessible and affordable.",
  },
];

const team = [
  {
    name: 'Alex Chen',
    role: 'Founder & CEO',
    bio: 'Ex-Google AI, 15 years in ML/AI. Passionate about democratizing AI.',
    gradient: 'from-neon-cyan to-neon-purple',
  },
  {
    name: 'Sarah Kim',
    role: 'CTO',
    bio: 'Systems architect. Built infrastructure at scale for 10M+ users.',
    gradient: 'from-neon-purple to-neon-magenta',
  },
  {
    name: 'Marcus Johnson',
    role: 'Head of Product',
    bio: 'Product leader with experience at Figma and Notion. UX enthusiast.',
    gradient: 'from-neon-magenta to-neon-pink',
  },
  {
    name: 'Emily Wong',
    role: 'Lead Engineer',
    bio: 'Full-stack developer. Open source contributor to React and Node.js.',
    gradient: 'from-neon-pink to-neon-amber',
  },
];

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-dark-950 animated-bg noise-overlay">
      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-neon-magenta/10 rounded-full blur-[128px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-neon-purple text-sm font-mono tracking-wider">ABOUT US</span>
            <h1 className="text-5xl md:text-6xl font-display font-bold text-white mt-4 mb-6">
              Building the Future of
              <br />
              <span className="text-neon-magenta">AI Assistants</span>
            </h1>
            <p className="text-xl text-slate-400 mb-10">
              We're a team of engineers, designers, and AI researchers on a mission to make AI
              accessible, powerful, and beneficial for everyone.
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-8 md:p-12">
            <h2 className="text-2xl font-display font-bold text-white mb-6">Our Story</h2>
            <div className="space-y-4 text-slate-300 leading-relaxed">
              <p>
                Alpicia started in 2023 when our founders experienced firsthand the limitations of
                existing AI assistants. They were powerful but rigid, intelligent but not adaptive.
              </p>
              <p>
                We believed AI should evolve with you, learn from interactions, and become more
                capable over time. So we built Alpicia—the first self-evolving AI assistant that
                genuinely gets better with use.
              </p>
              <p>
                Today, thousands of developers and businesses use Alpicia to power their AI
                experiences. And we're just getting started.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6 bg-dark-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold text-white mb-4">Our Values</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, idx) => (
              <div key={idx} className="glass-card p-6 text-center">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center text-neon-cyan mx-auto mb-4">
                  {value.icon}
                </div>
                <h3 className="text-lg font-display font-semibold text-white mb-2">
                  {value.title}
                </h3>
                <p className="text-slate-400 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-neon-cyan text-sm font-mono tracking-wider">TEAM</span>
            <h2 className="text-3xl font-display font-bold text-white mt-4">
              Meet the People Behind Alpicia
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, idx) => (
              <div key={idx} className="glass-card p-6 text-center group">
                <div
                  className={`w-24 h-24 rounded-full bg-gradient-to-br ${member.gradient} mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold group-hover:scale-110 transition-transform`}
                >
                  {member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                <p className="text-neon-cyan text-sm mb-2">{member.role}</p>
                <p className="text-slate-400 text-sm">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6 bg-dark-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '10K+', label: 'Active Users' },
              { value: '50+', label: 'Platforms' },
              { value: '99.9%', label: 'Uptime' },
              { value: '24/7', label: 'Support' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl font-display font-bold text-neon-cyan mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 via-neon-magenta/10 to-neon-cyan/10" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl font-display font-bold text-white mb-6">Join Our Journey</h2>
          <p className="text-xl text-slate-400 mb-10">
            We're always looking for talented people to join our team.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/contact"
              className="px-8 py-4 glow-button-cyan rounded-xl text-base font-semibold flex items-center gap-3"
            >
              Get in Touch <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="/careers"
              className="px-8 py-4 glass-card rounded-xl text-base font-semibold text-slate-300 flex items-center gap-3 hover:border-neon-cyan/30 transition-all"
            >
              View Openings
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
