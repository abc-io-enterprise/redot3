import { Link } from 'react-router-dom';
import { Sparkles, Mail, Phone, Globe, Github, Twitter, Linkedin } from 'lucide-react';

const footerLinks = {
  platform: [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Solutions', href: '/solutions' },
    { label: 'Community', href: '/community' },
  ],
  resources: [
    { label: 'Help Center', href: '/help' },
    { label: 'API Documentation', href: '/docs' },
    { label: 'eLibrary', href: '/learn' },
    { label: 'Onboarding', href: '/onboarding' },
  ],
  tools: [
    { label: 'Mobile App', href: '/mobile-app' },
    { label: 'Free Beacon', href: '/beacon' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Interface', href: '/interface' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Customer Area', href: '/customer-area' },
    { label: 'Sensory Communications', href: '/sensory-communications' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold">
                ABC<span className="text-cyan-400">-IO</span>
              </span>
            </Link>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Global Sensory Interface Communications Provider and AI Software ISP System.
            </p>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              <a href="mailto:contact@abc-io.com" className="flex items-center gap-2 hover:text-cyan-400 transition-colors">
                <Mail className="h-3 w-3" /> contact@abc-io.com
              </a>
              <a href="tel:585-348-7120" className="flex items-center gap-2 hover:text-cyan-400 transition-colors">
                <Phone className="h-3 w-3" /> 585-348-7120
              </a>
              <span className="flex items-center gap-2">
                <Globe className="h-3 w-3" /> https://abc-io.com
              </span>
            </div>
            <div className="flex gap-3 mt-4">
              <a href="#" className="text-muted-foreground hover:text-cyan-400 transition-colors">
                <Github className="h-4 w-4" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-cyan-400 transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-cyan-400 transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground">Platform</h4>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground">Tools</h4>
            <ul className="space-y-2">
              {footerLinks.tools.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            &copy; 2026 ABC-IO by Christopher Porreca / redot1. All rights reserved. Universal silicone & carbon cross-sensory information sharing communications platform. Available in 5 deployment environments for personal or professional use.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-status-pulse" />
            All Systems Operational
          </div>
        </div>
      </div>
    </footer>
  );
}
