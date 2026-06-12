import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Eye, EyeOff, ArrowRight } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = '/dashboard';
  };

  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="mx-auto max-w-sm w-full px-4">
        <Card className="bg-glass border-border/50">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">
                  ABC<span className="text-cyan-400">-IO</span>
                </span>
              </div>
              <h1 className="text-lg font-semibold">Welcome back</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Sign in to access your dashboard
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-white/5"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="bg-white/5 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
              >
                Sign In <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>

            <div className="text-center mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link to="/signup" className="text-cyan-400 hover:text-cyan-300">
                  Sign up
                </Link>
              </p>
              <p className="text-xs text-muted-foreground">
                <Link to="/account" className="text-cyan-400 hover:text-cyan-300">
                  Access Account PWA
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
