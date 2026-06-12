import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Eye, EyeOff, Check, ArrowRight } from 'lucide-react';

export function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [created, setCreated] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setCreated(true);
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
  };

  if (created) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="mx-auto max-w-sm w-full px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Account Created!</h2>
          <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="mx-auto max-w-md w-full px-4">
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
              <h1 className="text-lg font-semibold">Create your account — free forever</h1>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
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
                    placeholder="Min 8 characters"
                    className="bg-white/5 pr-10"
                    required
                    minLength={8}
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
              <div>
                <label className="text-xs font-medium mb-1.5 block">First Name</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Your first name"
                  className="bg-white/5"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Account / Team Name</label>
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Your team or organization"
                  className="bg-white/5"
                />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked as boolean)}
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" className="text-cyan-400 hover:text-cyan-300">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-cyan-400 hover:text-cyan-300">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              <Button
                type="submit"
                disabled={!agreed}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
              >
                Create Account <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>

            <div className="text-center mt-4">
              <p className="text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-cyan-400 hover:text-cyan-300">
                  Log in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
