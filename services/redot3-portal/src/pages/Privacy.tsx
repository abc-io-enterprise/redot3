import { Card, CardContent } from '@/components/ui/card';
import { Shield, Lock, Eye, Trash2, Cookie, Baby, FileText } from 'lucide-react';

const sections = [
  {
    icon: FileText,
    title: '1. Information We Collect',
    content: `Account data: email, name, password hash, billing information.
Usage data: API requests, endpoints called, response times, tokens consumed.
Beacon data: anonymized GPS coordinates, auto-purged after 24 hours.
Device data: IP address, user agent, for security and rate limiting.`,
  },
  {
    icon: Eye,
    title: '2. How We Use Information',
    content: `To provide and improve our services, process payments, prevent fraud, and comply with legal obligations.`,
  },
  {
    icon: Lock,
    title: '3. Data Sharing',
    content: `We do not sell your personal data. We share data only with:
- Billing provider (payment processing)
- Hosting providers (infrastructure)
- Law enforcement when legally required`,
  },
  {
    icon: Shield,
    title: '4. Data Security',
    content: `Passwords are hashed with bcrypt. API traffic uses TLS. Database access is restricted. We use HMAC-SHA256 for internal service authentication.`,
  },
  {
    icon: Trash2,
    title: '5. Your Rights',
    content: `Access, correct, or delete your personal data.
Export your data.
Cancel your account at any time.`,
  },
  {
    icon: Cookie,
    title: '6. Cookies',
    content: `We use essential cookies for authentication. We do not use tracking cookies for advertising.`,
  },
  {
    icon: FileText,
    title: '7. Data Retention',
    content: `Account data is retained until account deletion. Usage logs are retained for 90 days. Beacon data is purged after 24 hours.`,
  },
  {
    icon: Baby,
    title: "8. Children's Privacy",
    content: `Our service is not intended for children under 18. We do not knowingly collect data from minors.`,
  },
];

export function Privacy() {
  return (
    <div className="flex flex-col">
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
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
              9. Changes — We may update this policy. Significant changes will be notified via email.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
