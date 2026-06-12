import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Radio,
  Eye,
  Activity,
  Wind,
  Database,
  Globe,
  Shield,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'Touch-to-Digital',
    description: 'Convert tactile inputs into digital signals for cross-platform communication.',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  {
    icon: Radio,
    title: 'Audio Translation',
    description: 'Real-time speech-to-text and text-to-speech in 50+ languages.',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Eye,
    title: 'Visual Processing',
    description: 'Sign language recognition and text-to-braille conversion.',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: Activity,
    title: 'Haptic Encoding',
    description: 'Vibration patterns and force feedback for sensory substitution.',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: Wind,
    title: 'Scent Modulation',
    description: 'Digital scent encoding for environmental alerts and awareness.',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
  },
  {
    icon: Database,
    title: 'Taste Synthesis',
    description: 'Chemical signature translation for sensory research applications.',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
  },
];

const stats = [
  { label: 'Languages Supported', value: '50+', icon: Globe },
  { label: 'Modalities', value: '6', icon: Sparkles },
  { label: 'Translation Speed', value: '<100ms', icon: Zap },
  { label: 'Uptime SLA', value: '99.97%', icon: Shield },
];

export function SensoryCommunications() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 border-cyan-500/30 text-cyan-400">
              Global Sensory Interface Communications Provider
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Cross-Sensory <span className="text-gradient">Communications</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The world&apos;s first comprehensive platform for translating information across 
              all six human sensory modalities — enabling truly universal communication.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="bg-glass border-border/50">
                  <CardContent className="p-5 text-center">
                    <Icon className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Six Sensory Modalities</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              ABC-IO bridges every sensory gap with real-time, AI-powered translation.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="bg-glass border-border/50">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="space-y-8">
            {[
              { step: '01', title: 'Capture', desc: 'Silicone and carbon sensor arrays detect input across all six modalities.' },
              { step: '02', title: 'Process', desc: 'AI engine analyzes and normalizes the sensory data in real-time.' },
              { step: '03', title: 'Translate', desc: 'Cross-modal translation converts the signal to the target output format.' },
              { step: '04', title: 'Deliver', desc: 'The translated information is delivered via the optimal channel.' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-6">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-cyan-400">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
