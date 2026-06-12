import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  GraduationCap,
  Check,
  BookOpen,
  Code,
  Shield,
  Smartphone,
  Users,
  Zap,
  ChevronDown,
  Lock,
} from 'lucide-react';

const phases = [
  {
    quarter: 'Q1-Q2',
    title: 'Foundation',
    description: 'Master the basics of ABC-IO platform',
    milestones: [
      { label: 'Create your account', completed: true },
      { label: 'Explore the dashboard', completed: true },
      { label: 'Make your first API call', completed: false },
      { label: 'Set up authentication', completed: false },
      { label: 'Complete getting started guide', completed: false },
    ],
    icon: Zap,
    color: 'cyan',
  },
  {
    quarter: 'Q3-Q4',
    title: 'Integration',
    description: 'Build your first cross-sensory application',
    milestones: [
      { label: 'Integrate translation API', completed: false },
      { label: 'Build haptic feedback feature', completed: false },
      { label: 'Implement speech-to-text', completed: false },
      { label: 'Test multi-modal communication', completed: false },
      { label: 'Deploy to staging environment', completed: false },
    ],
    icon: Code,
    color: 'purple',
  },
  {
    quarter: 'Q5-Q6',
    title: 'Security',
    description: 'Implement enterprise-grade security',
    milestones: [
      { label: 'Configure HMAC-SHA256 signing', completed: false },
      { label: 'Set up biometric tokens', completed: false },
      { label: 'Implement audit logging', completed: false },
      { label: 'Run security audit', completed: false },
      { label: 'Complete compliance checklist', completed: false },
    ],
    icon: Shield,
    color: 'red',
  },
  {
    quarter: 'Q7-Q8',
    title: 'Mobile & Edge',
    description: 'Deploy to mobile and edge devices',
    milestones: [
      { label: 'Install mobile app', completed: false },
      { label: 'Configure cellular backup', completed: false },
      { label: 'Test mesh gateway', completed: false },
      { label: 'Set up beacon services', completed: false },
      { label: 'Deploy PWA to devices', completed: false },
    ],
    icon: Smartphone,
    color: 'green',
  },
  {
    quarter: 'Q9-Q10',
    title: 'Scale',
    description: 'Scale your deployment across environments',
    milestones: [
      { label: 'Set up production environment', completed: false },
      { label: 'Configure replica nodes', completed: false },
      { label: 'Implement auto-failover', completed: false },
      { label: 'Set up monitoring stack', completed: false },
      { label: 'Achieve 99.99% uptime', completed: false },
    ],
    icon: Users,
    color: 'orange',
  },
  {
    quarter: 'Q11-Q12',
    title: 'Expert',
    description: 'Become an ABC-IO certified expert',
    milestones: [
      { label: 'Build custom modality', completed: false },
      { label: 'Contribute to open source', completed: false },
      { label: 'Mentor new users', completed: false },
      { label: 'Present at community event', completed: false },
      { label: 'Earn ABC-IO Expert certification', completed: false },
    ],
    icon: GraduationCap,
    color: 'yellow',
  },
  {
    quarter: 'Y2-Q1-Q2',
    title: 'Advanced Integration',
    description: 'Deep integration with enterprise systems',
    milestones: [
      { label: 'SSO/SAML integration', completed: false },
      { label: 'Custom SLA implementation', completed: false },
      { label: 'White-label deployment', completed: false },
      { label: 'Multi-tenant architecture', completed: false },
      { label: 'Enterprise audit compliance', completed: false },
    ],
    icon: Lock,
    color: 'blue',
  },
  {
    quarter: 'Y2-Q3-Q4',
    title: 'Innovation',
    description: 'Push the boundaries of sensory communication',
    milestones: [
      { label: 'Research new sensory modality', completed: false },
      { label: 'Publish technical paper', completed: false },
      { label: 'Patent new technology', completed: false },
      { label: 'Speak at industry conference', completed: false },
      { label: 'Lead ABC-IO working group', completed: false },
    ],
    icon: BookOpen,
    color: 'pink',
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
};

export function Onboarding() {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set(['m-0-0', 'm-0-1']));

  const toggleMilestone = (phaseIndex: number, milestoneIndex: number) => {
    const key = `m-${phaseIndex}-${milestoneIndex}`;
    const next = new Set(completedMilestones);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setCompletedMilestones(next);
  };

  const getProgress = (phaseIndex: number) => {
    const total = phases[phaseIndex].milestones.length;
    let completed = 0;
    for (let i = 0; i < total; i++) {
      if (completedMilestones.has(`m-${phaseIndex}-${i}`)) completed++;
    }
    return Math.round((completed / total) * 100);
  };

  const overallProgress = Math.round(
    phases.reduce((acc, _, i) => acc + getProgress(i), 0) / phases.length
  );

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 border-cyan-500/30 text-cyan-400">
              Onboarding
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Your 2-Year <span className="text-gradient">Onboarding Roadmap</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              A personalized 24-month curriculum to take you from first login to ABC-IO expert.
            </p>

            {/* Overall Progress */}
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-cyan-400">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Phases */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {phases.map((phase, phaseIndex) => {
              const Icon = phase.icon;
              const colors = colorMap[phase.color];
              const progress = getProgress(phaseIndex);
              const isExpanded = expandedPhase === phaseIndex;

              return (
                <Card
                  key={phaseIndex}
                  className={`bg-glass border-border/50 overflow-hidden transition-all ${
                    isExpanded ? `ring-1 ${colors.border}` : ''
                  }`}
                >
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => setExpandedPhase(isExpanded ? null : phaseIndex)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${colors.text}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className={`text-[10px] h-5 ${colors.border} ${colors.text}`}>
                            {phase.quarter}
                          </Badge>
                          <h3 className="text-sm font-semibold">{phase.title}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">{phase.description}</p>
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-muted-foreground">{progress}% complete</span>
                          </div>
                          <Progress value={progress} className="h-1" />
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-border/50">
                      <div className="space-y-2 mt-4">
                        {phase.milestones.map((milestone, mi) => {
                          const isCompleted = completedMilestones.has(`m-${phaseIndex}-${mi}`);
                          return (
                            <div
                              key={mi}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                              onClick={() => toggleMilestone(phaseIndex, mi)}
                            >
                              <div
                                className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isCompleted
                                    ? 'bg-green-500 border-green-500'
                                    : 'border-muted-foreground/30'
                                }`}
                              >
                                {isCompleted && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <span className={`text-sm ${isCompleted ? 'text-muted-foreground line-through' : ''}`}>
                                {milestone.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
