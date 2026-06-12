import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Menu,
  Home,
  Layers,
  Tag,
  Briefcase,
  Users,
  HelpCircle,
  Smartphone,
  LayoutDashboard,
  LogIn,
  Sparkles,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/features', label: 'Features', icon: Layers },
  { path: '/pricing', label: 'Pricing', icon: Tag },
  { path: '/solutions', label: 'Solutions', icon: Briefcase },
  { path: '/community', label: 'Community', icon: Users },
  { path: '/help', label: 'Help', icon: HelpCircle },
  { path: '/mobile-app', label: 'Mobile App', icon: Smartphone },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export function Navigation() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight leading-none">
              ABC<span className="text-cyan-400">-IO</span>
            </span>
            <span className="text-[9px] text-muted-foreground tracking-widest uppercase">
              by redot1
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const currentPath = location.pathname.replace(/^\/portal/, '') || '/';
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  isActive
                    ? 'text-cyan-400 bg-cyan-500/10'
                    : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-cyan-400 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link to="/docs">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              API Docs
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold">
              Start Free
            </Button>
          </Link>
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 bg-background border-border">
            <SheetTitle className="flex items-center gap-2 pb-4 border-b border-border">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold">ABC-IO</span>
            </SheetTitle>
            <nav className="flex flex-col gap-1 mt-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-all ${
                      isActive
                        ? 'text-cyan-400 bg-cyan-500/10'
                        : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="border-t border-border my-2" />
              <Link
                to="/docs"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg text-foreground/70 hover:text-foreground hover:bg-white/5"
              >
                <Layers className="h-4 w-4" />
                API Documentation
              </Link>
              <Link
                to="/signup"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg bg-cyan-500 text-black hover:bg-cyan-600 mt-2"
              >
                <LogIn className="h-4 w-4" />
                Start Free
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
