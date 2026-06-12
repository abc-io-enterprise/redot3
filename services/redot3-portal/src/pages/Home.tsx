import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Globe,
  Shield,
  Smartphone,
  Cpu,
  Zap,
  ChevronRight,
  Server,
  Activity,
  ArrowRight,
  Check,
} from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'Cross-Sensory Interface',
    description: 'Communicate across touch, audio, visual, haptic, scent and taste with real-time translation and multi-device sessions.',
    href: '/features#cross-sensory',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Cpu,
    title: 'AI Operations',
    description: 'Dual-provider AI with ABC-IO AI engine and secure AI provider, plus circuit breaker, retry logic, and 5-min response cache.',
    href: '/features#ai',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Globe,
    title: 'Global Mesh Network',
    description: 'Encrypted mesh VPN across 3 continent-spanning nodes with automatic failover.',
    href: '/features#mesh',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Smartphone,
    title: 'Cellular Backup Gateway',
    description: 'Android app turns any phone into an emergency mesh gateway when internet fails.',
    href: '/mobile-app',
    color: 'from-orange-500 to-amber-500',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'HMAC-SHA256 signing, biometric tokens, no hardcoded secrets, full audit logging.',
    href: '/features#security',
    color: 'from-red-500 to-rose-500',
  },
  {
    icon: Zap,
    title: '24/7 Infrastructure',
    description: '3-node cluster with continuous monitoring via our monitoring and observability stack.',
    href: '/pricing#infrastructure',
    color: 'from-yellow-500 to-gold-500',
  },
];

const infrastructure = [
  { name: 'redot1', role: 'Primary', location: 'US East', ip: '162.254.32.142', status: 'operational', color: 'bg-green-500' },
  { name: 'ai1', role: 'AI Worker', location: 'US Central', ip: '192.227.212.235', status: 'operational', color: 'bg-green-500' },
  { name: 'ai2', role: 'AI Standby', location: 'US Central', ip: '192.227.212.237', status: 'operational', color: 'bg-green-500' },
];

const pricingTiers = [
  { name: 'Free', price: '$0', requests: '30 requests / min', features: ['Community support', 'Basic AI access', 'Beacon services'] },
  { name: 'Basic', price: '$9', requests: '60 requests / min', features: ['Email support', 'API access', 'Standard features'] },
  { name: 'Standard', price: '$19', requests: '120 requests / min', features: ['API keys', 'Webhooks', 'Priority support'] },
  { name: 'Pro', price: '$29', requests: '300 requests / min', features: ['All Standard features', 'Advanced analytics', 'Team workspaces'] },
  { name: 'Business', price: '$49', requests: '600 requests / min', features: ['Webhooks', 'Dedicated support', 'Custom integrations'] },
];

export function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero-bg.jpg"
            alt="ABC-IO Global Network"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col items-center text-center">
            {/* Status Badge */}
            <Badge variant="outline" className="mb-6 bg-green-500/10 text-green-400 border-green-500/30 px-4 py-1.5 text-xs font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-2 animate-status-pulse" />
              All Systems Operational
            </Badge>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
              <span className="text-gradient">The Universal</span>
              <br />
              <span className="text-foreground">Silicone & Carbon</span>
              <br />
              <span className="text-gradient">Cross-Sensory Platform</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
              Universal silicone and carbon cross-sensory information sharing communications — 
              across touch, audio, visual, haptic, scent, taste, and thought-enabled AI relay.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Link to="/signup">
                <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-8 text-base">
                  Start Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/docs">
                <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5 px-8 text-base">
                  View API Docs
                </Button>
              </Link>
            </div>

            {/* Environment Tags */}
            <div className="flex flex-wrap justify-center gap-2">
              {['Personal', 'Professional', 'Enterprise', 'Emergency', 'IoT'].map((env) => (
                <Badge key={env} variant="secondary" className="bg-white/5 text-muted-foreground border border-white/10 px-3 py-1">
                  {env}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Built for Every Environment */}
      <section className="py-20 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Built for Every Environment</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From disaster zones to boardrooms — ABC-IO adapts to your connectivity reality.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-glass border-border/50 overflow-hidden group">
              <div className="h-40 overflow-hidden">
                <img src="/images/disaster-zone.jpg" alt="Disaster Zone" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <CardContent className="p-5">
                <h3 className="font-semibold mb-2">Disaster Zones</h3>
                <p className="text-sm text-muted-foreground">Emergency mesh gateway with cellular backup when internet fails.</p>
              </CardContent>
            </Card>
            <Card className="bg-glass border-border/50 overflow-hidden group">
              <div className="h-40 overflow-hidden">
                <img src="/images/boardroom.jpg" alt="Boardroom" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <CardContent className="p-5">
                <h3 className="font-semibold mb-2">Boardrooms</h3>
                <p className="text-sm text-muted-foreground">Enterprise security with HMAC-SHA256 and biometric tokens.</p>
              </CardContent>
            </Card>
            <Card className="bg-glass border-border/50 overflow-hidden group">
              <div className="h-40 overflow-hidden">
                <img src="/images/community.jpg" alt="Global Community" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <CardContent className="p-5">
                <h3 className="font-semibold mb-2">Global Communities</h3>
                <p className="text-sm text-muted-foreground">Real-time translation across languages and sensory modalities.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Core Capabilities</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Six foundational pillars powering the next generation of sensory communication.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Link to={feature.href} key={index}>
                  <Card className="bg-glass border-border/50 h-full hover:border-cyan-500/30 transition-all duration-300 group cursor-pointer">
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2 group-hover:text-cyan-400 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                      <div className="flex items-center gap-1 mt-4 text-cyan-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Learn more <ChevronRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Infrastructure Status */}
      <section className="py-20 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Infrastructure</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              3-node cluster with 24/7 monitoring via our monitoring and observability stack.
            </p>
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="rounded-xl border border-border/50 bg-glass overflow-hidden">
              <div className="p-4 border-b border-border/50 bg-white/5">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-semibold">Node Status</span>
                </div>
              </div>
              <div className="divide-y divide-border/50">
                {infrastructure.map((node) => (
                  <div key={node.name} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${node.color} animate-status-pulse`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{node.name}</span>
                          <Badge variant="outline" className="text-[10px] h-5 border-cyan-500/30 text-cyan-400">
                            {node.role}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {node.location} · {node.ip}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-400 font-medium capitalize">{node.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Start free. Scale as you grow. No credit card required.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {pricingTiers.map((tier, index) => (
              <Card key={index} className={`bg-glass border-border/50 ${index === 3 ? 'border-cyan-500/40 ring-1 ring-cyan-500/20' : ''}`}>
                <CardContent className="p-5">
                  {index === 3 && (
                    <Badge className="bg-cyan-500 text-black text-[10px] mb-3">MOST POPULAR</Badge>
                  )}
                  <h3 className="text-sm font-medium text-muted-foreground">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1 mb-3">
                    <span className="text-2xl font-bold">{tier.price}</span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{tier.requests}</p>
                  <ul className="space-y-1.5 mb-4">
                    {tier.features.map((feature, fi) => (
                      <li key={fi} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link to="/pricing">
                    <Button variant={index === 0 ? 'outline' : 'default'} size="sm" className={`w-full text-xs ${index === 3 ? 'bg-cyan-500 hover:bg-cyan-600 text-black' : ''}`}>
                      {index === 0 ? 'Get Started' : index === 3 ? 'Start Pro Trial' : `Start ${tier.name}`}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/pricing" className="text-sm text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
              View full pricing details <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/20 via-purple-500/10 to-background border border-cyan-500/20 p-10 text-center">
            <div className="absolute inset-0 bg-[url('/images/mesh-network.jpg')] opacity-10 bg-cover bg-center" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-4">Ready to Experience the Future?</h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                Join thousands of users already communicating across sensory boundaries. 
                Deploy in any of our 5 environments.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup">
                  <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-8">
                    Create Free Account
                  </Button>
                </Link>
                <Link to="/solutions">
                  <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5 px-8">
                    Explore Solutions
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
