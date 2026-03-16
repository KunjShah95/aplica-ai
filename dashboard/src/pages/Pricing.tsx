import React from 'react';
import {
  Brain,
  Zap,
  Layers,
  Shield,
  Check,
  ArrowRight,
  Rocket,
  Star,
  ChevronRight,
} from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'Perfect for individuals getting started',
    gradient: 'from-slate-700 to-slate-600',
    features: [
      '3 messaging platforms',
      '1,000 messages/month',
      'Basic memory (100 items)',
      '5 workflows',
      'Community support',
      'Standard response time',
    ],
    notIncluded: ['Self-evolution', 'Advanced analytics', 'Custom integrations'],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For developers and small teams',
    gradient: 'from-neon-cyan to-neon-purple',
    features: [
      'Unlimited platforms',
      'Unlimited messages',
      'Advanced memory (10K items)',
      'Unlimited workflows',
      'Self-evolution engine',
      'Causal analytics',
      'Priority support',
      'Custom integrations',
      'API access',
      'Webhooks',
    ],
    notIncluded: [],
    cta: 'Start 14-Day Trial',
    popular: true,
  },
  {
    name: 'Team',
    price: '$99',
    period: '/month',
    description: 'For growing organizations',
    gradient: 'from-neon-purple to-neon-magenta',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Role-based access',
      'Advanced analytics',
      'Audit logs',
      'SLA guarantee (99.9%)',
      'Dedicated support',
      'Custom contracts',
      'On-premise option',
      'White-labeling',
    ],
    notIncluded: [],
    cta: 'Start Trial',
    popular: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    gradient: 'from-neon-amber to-neon-pink',
    features: [
      'Everything in Team',
      'Unlimited scaling',
      'Dedicated infrastructure',
      'Custom SLA',
      '24/7 phone support',
      'On-site training',
      'Custom development',
      'Advanced security',
      'Compliance reports',
      'Migration assistance',
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    popular: false,
  },
];

const faqs = [
  {
    question: "What's included in the free tier?",
    answer:
      "The free tier includes 3 messaging platforms, 1,000 messages per month, basic memory with 100 items, and 5 workflows. It's perfect for testing and personal use.",
  },
  {
    question: 'Can I change plans later?',
    answer:
      "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate your billing.",
  },
  {
    question: 'Do you offer refunds?',
    answer:
      "We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact support for a full refund.",
  },
  {
    question: 'What happens if I exceed my limits?',
    answer:
      "We'll notify you when you're approaching your limits. If you exceed them, your assistant will continue working, but you may need to upgrade to avoid service interruption.",
  },
  {
    question: 'Do you offer academic discounts?',
    answer:
      'Yes! We offer 50% off all plans for educational institutions and researchers. Contact us with your institution email to get started.',
  },
  {
    question: 'Is there a self-hosted option?',
    answer:
      'Yes, the Enterprise plan includes an on-premise deployment option. We also support Docker and Kubernetes installations.',
  },
];

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-dark-950 animated-bg noise-overlay">
      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-green/10 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[128px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-neon-green text-sm font-mono tracking-wider">PRICING</span>
            <h1 className="text-5xl md:text-6xl font-display font-bold text-white mt-4 mb-6">
              Simple, Transparent
              <br />
              <span className="text-neon-cyan">Pricing</span>
            </h1>
            <p className="text-xl text-slate-400 mb-10">
              Start free, scale as you grow. No hidden fees, no surprises.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-1 bg-dark-800 rounded-xl">
              <button className="px-6 py-2 rounded-lg bg-neon-cyan/20 text-neon-cyan font-medium">
                Monthly
              </button>
              <button className="px-6 py-2 rounded-lg text-slate-400 hover:text-white transition-colors">
                Yearly <span className="text-neon-green text-sm ml-1">-20%</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`glass-card p-6 relative ${
                  plan.popular
                    ? 'border-neon-cyan shadow-[0_0_30px_rgba(0,245,255,0.2)] scale-105'
                    : ''
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
                  {idx === 0 && <Brain className="w-6 h-6" />}
                  {idx === 1 && <Zap className="w-6 h-6" />}
                  {idx === 2 && <Layers className="w-6 h-6" />}
                  {idx === 3 && <Shield className="w-6 h-6" />}
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
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-neon-green flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2 text-sm opacity-50">
                      <span className="w-4 h-4 mt-0.5">×</span>
                      <span className="text-slate-500">{feature}</span>
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

      {/* FAQ */}
      <section className="py-24 px-6 bg-dark-900/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{faq.question}</h3>
                <p className="text-slate-400 text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 via-neon-purple/10 to-neon-magenta/10" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl font-display font-bold text-white mb-6">Still Have Questions?</h2>
          <p className="text-xl text-slate-400 mb-10">
            Talk to our team to find the perfect plan for your needs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/contact"
              className="px-8 py-4 glow-button-cyan rounded-xl text-base font-semibold flex items-center gap-3"
            >
              Contact Sales <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="/docs"
              className="px-8 py-4 glass-card rounded-xl text-base font-semibold text-slate-300 flex items-center gap-3 hover:border-neon-cyan/30 transition-all"
            >
              Read Documentation
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
