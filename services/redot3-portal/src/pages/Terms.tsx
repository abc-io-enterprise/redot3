import { Card, CardContent } from '@/components/ui/card';
import { FileText, Scale, Ban, CreditCard, AlertTriangle, Gavel } from 'lucide-react';

const sections = [
  {
    icon: FileText,
    title: '1. Acceptance of Terms',
    content: `By accessing or using ABC-IO, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the service. ABC-IO is a product of redot1 (Christopher Porreca).`,
  },
  {
    icon: Scale,
    title: '2. Description of Service',
    content: `ABC-IO provides a universal silicone and carbon cross-sensory information sharing communications platform. The service includes AI-powered translation, mesh networking, beacon services, and API access across multiple deployment environments.`,
  },
  {
    icon: FileText,
    title: '3. User Accounts',
    content: `You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. Notify us immediately of any unauthorized access.`,
  },
  {
    icon: Ban,
    title: '4. Acceptable Use',
    content: `You may not use ABC-IO for:
- Illegal activities or violations of applicable laws
- Transmitting harmful, threatening, or discriminatory content
- Attempting to disrupt or compromise the service
- Reverse engineering or unauthorized access to systems
- Sharing account credentials with unauthorized users`,
  },
  {
    icon: CreditCard,
    title: '5. Billing and Payments',
    content: `Paid plans are billed in advance. You may cancel at any time. Refunds are provided at our discretion. Rate limits apply based on your subscription tier.`,
  },
  {
    icon: AlertTriangle,
    title: '6. Limitation of Liability',
    content: `ABC-IO is provided "as is" without warranties of any kind. We are not liable for indirect, incidental, or consequential damages. Our total liability is limited to the amount you paid in the last 12 months.`,
  },
  {
    icon: Gavel,
    title: '7. Governing Law',
    content: `These terms are governed by the laws of the State of New York, USA. Any disputes will be resolved in the courts of New York State.`,
  },
];

export function Terms() {
  return (
    <div className="flex flex-col">
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: June 10, 2026</p>
          </div>

          <div className="space-y-4">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <Card key={index} className="bg-glass border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className="h-5 w-5 text-cyan-400" />
                      <h2 className="text-lg font-semibold">{section.title}</h2>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                      {section.content}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              8. Changes to Terms — We may modify these terms at any time. Continued use constitutes acceptance of changes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
