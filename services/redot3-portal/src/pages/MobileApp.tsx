import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  Radio,
  Shield,
  Lock,
  Zap,
  Navigation,
} from 'lucide-react';

export function MobileApp() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 border-cyan-500/30 text-cyan-400">
              Free · No Account Required
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              ABC-IO <span className="text-gradient">Mobile</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Public safety awareness, community tools, and free beacon services — available on any device.
            </p>
          </div>
        </div>
      </section>

      {/* Beacon PWA */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <Radio className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Free Beacon & Awareness PWA</h2>
                </div>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                The ABC-IO Beacon is a free, installable web app that shares public events, weather, 
                and important local information when you choose to share your location.
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-400 font-medium mb-1">We do not track you.</p>
                <p className="text-xs text-muted-foreground">
                  Your location is only used at the moment you submit it to return relevant public information.
                </p>
              </div>
              <ol className="space-y-3 mb-6">
                {[
                  'Open abc-io.com/beacon on your phone or computer',
                  'Tap Share Location if you want local awareness info',
                  'Tap your browser menu and choose Add to Home Screen',
                  'Re-submit your location anytime to refresh',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <Link to="/beacon">
                <Button className="bg-green-500 hover:bg-green-600 text-black font-semibold">
                  <Navigation className="h-4 w-4 mr-2" />
                  Open Free Beacon PWA
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-border/50">
                <img src="/images/cellular-gateway.jpg" alt="ABC-IO Beacon" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Account Interface PWA */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="rounded-2xl overflow-hidden border border-border/50">
                <img src="/images/haptic.jpg" alt="Account Interface" className="w-full h-auto" />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Account Interface PWA</h2>
                </div>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                For customers and team members: the ABC-IO Account Interface is a private, installable 
                PWA with messaging, product management, billing, and quick access to translation and beacon services.
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  'Message other users on your account',
                  'Manage add-ons and subscriptions',
                  'Access help and documentation',
                  'Quick translation and beacon access',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4 text-purple-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="flex gap-3">
                <Link to="/account">
                  <Button className="bg-purple-500 hover:bg-purple-600 text-white font-semibold">
                    <Lock className="h-4 w-4 mr-2" />
                    Open Account PWA
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="outline" className="border-white/20">
                    Sign Up
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Owner Tools */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="bg-glass border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-6 w-6 text-red-400" />
                <h3 className="text-lg font-bold">Owner & Operator Tools</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Owner-only applications and cellular backup tools are not distributed on the public website. 
                If you are the system owner or an authorized operator, access these through the secure owner dashboard.
              </p>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-xs text-red-400 font-medium mb-1">Owner access only.</p>
                <p className="text-xs text-muted-foreground">
                  The cellular failsafe APK and biometric gateway are available via the owner dashboard 
                  after authentication. They are intentionally not linked from public pages.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
