import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Lock,
  Building2,
  Briefcase,
  Brain,
  Eye,
  MessageSquare,
  Palette,
  ShieldCheck,
  Cloud,
  Radio,
  Accessibility,
  Sparkles,
  Siren,
  Database,
  ArrowRight,
  Check,
} from 'lucide-react';

const interfacingSystem = [
  {
    family: 'AI ISP',
    icon: Brain,
    color: 'from-cyan-500 to-blue-500',
    description: 'Accessible Translation',
    modules: [
      { name: 'Text-to-Braille', icon: Accessibility },
      { name: 'Text-to-Morse', icon: Radio },
      { name: 'Haptic Feedback', icon: Sparkles },
      { name: 'Speech-to-Text', icon: MessageSquare },
      { name: 'Sign Language', icon: Eye },
    ],
  },
  {
    family: 'Communications',
    icon: MessageSquare,
    color: 'from-purple-500 to-pink-500',
    description: 'Interface Gateway',
    modules: [
      { name: 'Secure Messaging', icon: Lock },
      { name: 'Chat Rooms', icon: Users },
      { name: 'API Access', icon: Database },
      { name: 'Rate-Limited Gateways', icon: ShieldCheck },
      { name: 'Team Workspaces', icon: Briefcase },
    ],
  },
  {
    family: 'Creativity',
    icon: Palette,
    color: 'from-orange-500 to-amber-500',
    description: 'Family-Friendly Fun',
    modules: [
      { name: 'Safe AI Generation', icon: Sparkles },
      { name: 'Creative Dashboards', icon: Palette },
      { name: 'Content Filters', icon: ShieldCheck },
      { name: 'Family Safety', icon: Users },
      { name: 'Creative Tools', icon: Brain },
    ],
  },
  {
    family: 'Safety',
    icon: ShieldCheck,
    color: 'from-red-500 to-rose-500',
    description: 'Account Protection',
    modules: [
      { name: 'Security Monitoring', icon: Siren },
      { name: 'Anomaly Detection', icon: Eye },
      { name: 'Audit Logs', icon: Database },
      { name: 'Digital Self-Help', icon: Brain },
      { name: 'Threat Response', icon: ShieldCheck },
    ],
  },
  {
    family: 'Cloud OS',
    icon: Cloud,
    color: 'from-green-500 to-emerald-500',
    description: 'Autonomous Operations',
    modules: [
      { name: 'Triple-Node Redundancy', icon: Database },
      { name: 'Cellular Backup', icon: Radio },
      { name: 'Monitoring Stack', icon: Eye },
      { name: 'Auto-Heal System', icon: Sparkles },
      { name: 'Owner Governance', icon: Lock },
    ],
  },
];

const useCases = [
  {
    title: 'Personal',
    subtitle: 'For Individuals & Families',
    icon: Users,
    description: 'Stay connected safely with accessibility-first tools, family dashboards, and free beacon services.',
    features: [
      'Free account with basic AI access',
      'Family-safe content filters',
      'Cross-sensory messaging',
      'Emergency beacon on any device',
      'Personal usage dashboard',
    ],
    color: 'cyan',
  },
  {
    title: 'Private',
    subtitle: 'For Private Groups',
    icon: Lock,
    description: 'Closed communities, teams, and organizations that need secure, private communication channels.',
    features: [
      'Private rooms and workspaces',
      'Role-based access control',
      'Encrypted signing & audit logs',
      'Custom branding options',
      'Dedicated support queue',
    ],
    color: 'purple',
  },
  {
    title: 'Public',
    subtitle: 'For Public Services',
    icon: Building2,
    description: 'City departments, transit authorities, and public safety organizations can integrate beacon and alert systems.',
    features: [
      'Public safety beacon network',
      'Location-aware alerts',
      'Responder acknowledgment',
      'Open API access',
      'Compliance-ready audit logs',
    ],
    color: 'green',
  },
  {
    title: 'Business',
    subtitle: 'For Organizations',
    icon: Briefcase,
    description: 'Enterprise-grade sensory communication with custom integrations, SLAs, and dedicated infrastructure.',
    features: [
      'Custom deployment environments',
      'SSO and SAML integration',
      'Dedicated account manager',
      'Custom SLA agreements',
      'White-label options',
    ],
    color: 'orange',
  },
];

export function Solutions() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 border-cyan-500/30 text-cyan-400">
              Solutions
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Solutions for <span className="text-gradient">Everyone</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ABC-IO delivers secure, accessible communication infrastructure for personal use, 
              private groups, public services, and global organizations.
            </p>
          </div>
        </div>
      </section>

      {/* 5x5c25 Interfacing System */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-purple-500/30 text-purple-400">
              The 5x5c25 Interfacing System
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Five Solution Families</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Five solution families across five service tiers — 25 capability modules designed 
              for safe, scalable, family-friendly communication.
            </p>
          </div>

          <div className="space-y-8">
            {interfacingSystem.map((family) => {
              const FamilyIcon = family.icon;
              return (
                <Card key={family.family} className="bg-glass border-border/50 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${family.color} flex items-center justify-center`}>
                        <FamilyIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{family.family}</h3>
                        <p className="text-sm text-muted-foreground">{family.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {family.modules.map((module) => {
                        const ModIcon = module.icon;
                        return (
                          <div
                            key={module.name}
                            className="bg-white/5 rounded-lg p-4 text-center border border-white/5 hover:border-cyan-500/30 transition-all group"
                          >
                            <ModIcon className="h-5 w-5 text-muted-foreground mx-auto mb-2 group-hover:text-cyan-400 transition-colors" />
                            <span className="text-xs font-medium">{module.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-green-500/30 text-green-400">
              Use Cases
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Designed for Every Context</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From personal safety to enterprise communications, ABC-IO scales with your needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map((useCase) => {
              const Icon = useCase.icon;
              const colorMap: Record<string, string> = {
                cyan: 'from-cyan-500 to-blue-500',
                purple: 'from-purple-500 to-pink-500',
                green: 'from-green-500 to-emerald-500',
                orange: 'from-orange-500 to-amber-500',
              };
              return (
                <Card key={useCase.title} className="bg-glass border-border/50 overflow-hidden group hover:border-cyan-500/30 transition-all">
                  <div className={`h-1 bg-gradient-to-r ${colorMap[useCase.color]}`} />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[useCase.color]} flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{useCase.title}</h3>
                        <p className="text-xs text-muted-foreground">{useCase.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{useCase.description}</p>
                    <ul className="space-y-2">
                      {useCase.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
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

      {/* CTA */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/20 via-purple-500/10 to-background border border-cyan-500/20 p-10 text-center">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-4">Find Your Solution</h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                Explore how ABC-IO can transform communication for your specific needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/pricing">
                  <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-8">
                    View Pricing <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/customer-area">
                  <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5 px-8">
                    Contact Sales
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
