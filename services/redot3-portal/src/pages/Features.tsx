import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Cpu,
  Globe,
  Smartphone,
  Shield,
  Zap,
  Radio,
  Wifi,
  Fingerprint,
  Key,
  Lock,
  Eye,
  Activity,
  Database,
  Braces,
} from 'lucide-react';

const sensoryModalities = [
  { name: 'Touch', icon: Fingerprint, description: 'Haptic feedback encoding for tactile communication across devices.' },
  { name: 'Audio', icon: Radio, description: 'Real-time speech-to-text, text-to-speech, and audio translation.' },
  { name: 'Visual', icon: Eye, description: 'Sign language recognition, text-to-braille, and visual alert systems.' },
  { name: 'Haptic', icon: Activity, description: 'Vibration patterns, force feedback, and tactile signal encoding.' },
  { name: 'Scent', icon: Sparkles, description: 'Digital scent encoding for environmental awareness and alerts.' },
  { name: 'Taste', icon: Database, description: 'Chemical signature translation for sensory substitution.' },
];

const securityFeatures = [
  { icon: Key, title: 'HMAC-SHA256 Signing', description: 'All API requests cryptographically signed with HMAC-SHA256.' },
  { icon: Fingerprint, title: 'Biometric Tokens', description: 'Hardware-backed biometric authentication tokens.' },
  { icon: Lock, title: 'No Hardcoded Secrets', description: 'Zero hardcoded credentials — all secrets injected at runtime.' },
  { icon: Eye, title: 'Full Audit Logging', description: 'Every action logged with tamper-evident blockchain verification.' },
];

const aiFeatures = [
  { icon: Cpu, title: 'Dual-Provider AI', description: 'ABC-IO AI engine + secure AI provider with automatic failover.' },
  { icon: Zap, title: 'Circuit Breaker', description: 'Automatic circuit breaker prevents cascade failures.' },
  { icon: Activity, title: 'Retry Logic', description: 'Intelligent exponential backoff retry for all API calls.' },
  { icon: Database, title: '5-Min Response Cache', description: 'Subsequent identical prompts served from cache.' },
];

export function Features() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/cross-sensory.jpg')] opacity-20 bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 border-cyan-500/30 text-cyan-400">
              Platform Features
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Cross-Sensory <span className="text-gradient">Capabilities</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ABC-IO bridges the gap between human sensory experience and digital communication 
              across six distinct modalities.
            </p>
          </div>
        </div>
      </section>

      {/* Cross-Sensory Interface */}
      <section id="cross-sensory" className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4 border-purple-500/30 text-purple-400">
                Core Technology
              </Badge>
              <h2 className="text-3xl font-bold mb-4">Cross-Sensory Interface</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Communicate across touch, audio, visual, haptic, scent and taste with real-time 
                translation and multi-device sessions. Our proprietary silicone and carbon sensor 
                array captures and transmits sensory data with sub-millisecond latency.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {sensoryModalities.slice(0, 4).map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <div key={mod.name} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{mod.name}</div>
                        <div className="text-xs text-muted-foreground">{mod.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-border/50">
                <img src="/images/haptic.jpg" alt="Cross-Sensory Interface" className="w-full h-auto" />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-glass rounded-xl p-4 border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-status-pulse" />
                  <span className="text-xs font-medium">6 Modalities Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Operations */}
      <section id="ai" className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="rounded-2xl overflow-hidden border border-border/50">
                <img src="/images/ai-operations.jpg" alt="AI Operations" className="w-full h-auto" />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <Badge variant="outline" className="mb-4 border-cyan-500/30 text-cyan-400">
                Artificial Intelligence
              </Badge>
              <h2 className="text-3xl font-bold mb-4">AI Operations</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Dual-provider AI with ABC-IO AI engine and secure AI provider, plus circuit breaker, 
                retry logic, and 5-minute response cache. Built for reliability at enterprise scale.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {aiFeatures.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <Card key={feature.title} className="bg-glass border-border/50">
                      <CardContent className="p-4">
                        <Icon className="h-5 w-5 text-cyan-400 mb-2" />
                        <h4 className="text-sm font-semibold mb-1">{feature.title}</h4>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Mesh Network */}
      <section id="mesh" className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-green-500/30 text-green-400">
              Network Infrastructure
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Global Mesh Network</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Encrypted mesh VPN across 3 continent-spanning nodes with automatic failover.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden border border-border/50 mb-8">
            <img src="/images/mesh-network.jpg" alt="Global Mesh Network" className="w-full h-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-glass border-border/50">
              <CardContent className="p-6 text-center">
                <Globe className="h-8 w-8 text-green-400 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">3 Continent Nodes</h3>
                <p className="text-sm text-muted-foreground">Strategic placement across US East, US Central for optimal latency.</p>
              </CardContent>
            </Card>
            <Card className="bg-glass border-border/50">
              <CardContent className="p-6 text-center">
                <Wifi className="h-8 w-8 text-green-400 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Encrypted Mesh VPN</h3>
                <p className="text-sm text-muted-foreground">WireGuard-based mesh with AES-256-GCM encryption.</p>
              </CardContent>
            </Card>
            <Card className="bg-glass border-border/50">
              <CardContent className="p-6 text-center">
                <Zap className="h-8 w-8 text-green-400 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Automatic Failover</h3>
                <p className="text-sm text-muted-foreground">Sub-second failover between ai1 and ai2 with zero downtime.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Enterprise Security */}
      <section id="security" className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4 border-red-500/30 text-red-400">
                Security
              </Badge>
              <h2 className="text-3xl font-bold mb-4">Enterprise Security</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                HMAC-SHA256 signing, biometric tokens, no hardcoded secrets, full audit logging. 
                ABC-IO is built with security as the foundational layer, not an afterthought.
              </p>
              <div className="space-y-4">
                {securityFeatures.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.title} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-red-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">{feature.title}</h4>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-border/50">
                <img src="/images/security.jpg" alt="Enterprise Security" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cellular Backup Gateway */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="rounded-2xl overflow-hidden border border-border/50">
                <img src="/images/cellular-gateway.jpg" alt="Cellular Backup Gateway" className="w-full h-auto" />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <Badge variant="outline" className="mb-4 border-orange-500/30 text-orange-400">
                Emergency Communications
              </Badge>
              <h2 className="text-3xl font-bold mb-4">Cellular Backup Gateway</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Android app turns any phone into an emergency mesh gateway when internet fails. 
                Critical for disaster response, remote operations, and continuity of communications.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-orange-400" />
                  <span className="text-sm">Android APK for emergency mesh gateway</span>
                </div>
                <div className="flex items-center gap-3">
                  <Radio className="h-5 w-5 text-orange-400" />
                  <span className="text-sm">Automatic cellular failover detection</span>
                </div>
                <div className="flex items-center gap-3">
                  <Wifi className="h-5 w-5 text-orange-400" />
                  <span className="text-sm">Mesh network relay over cellular</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-orange-400" />
                  <span className="text-sm">Encrypted traffic over cellular backbone</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-yellow-500/30 text-yellow-400">
              Technology Stack
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Built on Proven Technology</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              ABC-IO leverages industry-standard technologies for maximum compatibility and reliability.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {['Node.js', 'React', 'PostgreSQL', 'Redis', 'Docker', 'NGINX', 'Prometheus', 'Grafana'].map((tech) => (
              <div key={tech} className="bg-glass rounded-lg p-4 text-center border border-border/50 hover:border-cyan-500/30 transition-colors">
                <Braces className="h-5 w-5 text-cyan-400 mx-auto mb-2" />
                <span className="text-sm font-medium">{tech}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
