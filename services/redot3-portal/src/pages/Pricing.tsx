import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Check,
  Server,
  Code,
  TestTube,
  Globe,
  Cpu,
  Shield,
  ArrowRight,
} from 'lucide-react';

const tiers = [
  {
    name: 'Free',
    description: 'For individuals exploring AI interfacing.',
    monthlyPrice: 0,
    annualPrice: 0,
    requests: '30 requests / min',
    features: [
      'Community support',
      'Basic AI access',
      'Beacon services',
      'Public API access',
      'Basic translations',
    ],
    notIncluded: [
      'API keys',
      'Email support',
      'Webhooks',
      'Team workspaces',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Basic',
    description: 'For solo developers.',
    monthlyPrice: 9,
    annualPrice: 90,
    requests: '60 requests / min',
    features: [
      'Email support',
      'API access',
      'Standard features',
      'Basic analytics',
      'Community forums',
    ],
    notIncluded: [
      'API keys',
      'Webhooks',
      'Team workspaces',
      'Priority support',
    ],
    cta: 'Start Basic',
    popular: false,
  },
  {
    name: 'Standard',
    description: 'For growing projects.',
    monthlyPrice: 19,
    annualPrice: 190,
    requests: '120 requests / min',
    features: [
      'API keys',
      'Webhooks',
      'Priority support',
      'Advanced analytics',
      'Custom integrations',
    ],
    notIncluded: [
      'Team workspaces',
      'Dedicated support',
      'SLA guarantee',
    ],
    cta: 'Start Standard',
    popular: false,
  },
  {
    name: 'Pro',
    description: 'For professionals and small teams.',
    monthlyPrice: 29,
    annualPrice: 290,
    requests: '300 requests / min',
    features: [
      'All Standard features',
      'Advanced analytics',
      'Team workspaces',
      'Custom branding',
      'Priority queue',
    ],
    notIncluded: [
      'Dedicated support',
      'SLA guarantee',
      'Custom contracts',
    ],
    cta: 'Start Pro Trial',
    popular: true,
  },
  {
    name: 'Business',
    description: 'For small businesses.',
    monthlyPrice: 49,
    annualPrice: 490,
    requests: '600 requests / min',
    features: [
      'Webhooks',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'Audit logs',
      'SSO authentication',
    ],
    notIncluded: [],
    cta: 'Start Business',
    popular: false,
  },
];

const environments = [
  {
    name: 'Dev',
    title: 'Development',
    description: 'Local live-reload environment for gateway, operator-station, and Postgres.',
    icon: Code,
    features: ['Volume-mounted source', 'Fast iteration', 'Ideal for development'],
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'Staging',
    title: 'Staging',
    description: 'Full-stack staging with alternate host ports for safe pre-production validation.',
    icon: TestTube,
    features: ['Mirrors production', 'Isolated ports', 'Integration testing'],
    color: 'from-purple-500 to-pink-500',
  },
  {
    name: 'Production',
    title: 'Production',
    description: 'Primary full-stack deployment on redot1 with NGINX, SSL, monitoring, and AI.',
    icon: Server,
    features: ['Public traffic at abc-io.com', 'Resource limits & healthchecks', 'Prometheus + Grafana'],
    color: 'from-green-500 to-emerald-500',
  },
  {
    name: 'Replica AI-1',
    title: 'Replica AI-1',
    description: 'Redundant public-facing node on ai1 sharing primary DB/Redis for failover.',
    icon: Globe,
    features: ['192.227.212.235', 'Gateway + Portal + Kimi', 'NGINX upstream target'],
    color: 'from-orange-500 to-amber-500',
  },
  {
    name: 'Replica AI-2',
    title: 'Replica AI-2',
    description: 'Secondary redundant node on ai2 for geographic and failure resilience.',
    icon: Cpu,
    features: ['192.227.212.237', 'Gateway + Portal + Kimi', 'NGINX backup target'],
    color: 'from-red-500 to-rose-500',
  },
];

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 border-cyan-500/30 text-cyan-400">
              Pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Simple, Transparent <span className="text-gradient">Pricing</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Start free. Scale as you grow. No credit card required.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm ${!isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
              <span className={`text-sm ${isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                Annual <span className="text-green-400 text-xs">(2 months free)</span>
              </span>
            </div>

            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg inline-block">
              <p className="text-xs text-yellow-400">
                New York State lock-in: Rates shown are locked for the first 12 months for NYS customers 
                who activate before the end of the current quarter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={`bg-glass border-border/50 flex flex-col ${
                  tier.popular ? 'border-cyan-500/40 ring-1 ring-cyan-500/20 scale-105 z-10' : ''
                }`}
              >
                <CardContent className="p-5 flex flex-col flex-1">
                  {tier.popular && (
                    <Badge className="bg-cyan-500 text-black text-[10px] w-fit mb-3">MOST POPULAR</Badge>
                  )}
                  <h3 className="text-lg font-bold">{tier.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{tier.description}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold">
                      ${isAnnual ? tier.annualPrice : tier.monthlyPrice}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {tier.monthlyPrice === 0 ? '' : isAnnual ? '/year' : '/mo'}
                    </span>
                  </div>
                  <p className="text-xs text-cyan-400 font-medium mb-4">{tier.requests}</p>

                  <div className="flex-1 space-y-2 mb-4">
                    {tier.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                    {tier.notIncluded.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 opacity-40">
                        <span className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground">—</span>
                        <span className="text-xs text-muted-foreground line-through">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link to="/signup" className="mt-auto">
                    <Button
                      className={`w-full text-xs ${
                        tier.popular
                          ? 'bg-cyan-500 hover:bg-cyan-600 text-black'
                          : tier.name === 'Free'
                          ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              All paid tiers include the{' '}
              <Link to="/sensory-communications" className="text-cyan-400 hover:text-cyan-300">
                Global Sensory Interface Communications Provider
              </Link>{' '}
              feature.
            </p>
          </div>
        </div>
      </section>

      {/* 5 Deployment Environments */}
      <section id="infrastructure" className="py-20 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-purple-500/30 text-purple-400">
              Infrastructure
            </Badge>
            <h2 className="text-3xl font-bold mb-4">5 Deployment Environments</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The complete ABC-IO system ships as a purchasable, multi-environment platform 
              for personal or professional use.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {environments.map((env) => {
              const Icon = env.icon;
              return (
                <Card key={env.name} className="bg-glass border-border/50 overflow-hidden group hover:border-cyan-500/30 transition-all">
                  <div className={`h-1.5 bg-gradient-to-r ${env.color}`} />
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${env.color} flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{env.title}</h3>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{env.name}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{env.description}</p>
                    <ul className="space-y-1">
                      {env.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-20 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/20 via-cyan-500/10 to-background border border-purple-500/20 p-10 text-center">
            <div className="relative z-10">
              <Shield className="h-10 w-10 text-purple-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Need a Custom Enterprise Plan?</h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                Contact us for dedicated infrastructure, custom SLAs, and tailored sensory 
                communication solutions for your organization.
              </p>
              <Link to="/customer-area">
                <Button size="lg" className="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-8">
                  Contact Sales <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
