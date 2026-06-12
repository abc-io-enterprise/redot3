import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  CreditCard,
  Key,
  BarChart3,
  Copy,
  Check,
  TrendingUp,
  Activity,
  Clock,
  Zap,
  Shield,
  BookOpen,
} from 'lucide-react';

const usageData = [
  { day: 'Mon', requests: 1200 },
  { day: 'Tue', requests: 1900 },
  { day: 'Wed', requests: 1500 },
  { day: 'Thu', requests: 2400 },
  { day: 'Fri', requests: 1800 },
  { day: 'Sat', requests: 900 },
  { day: 'Sun', requests: 600 },
];

const apiKeys = [
  { name: 'Production Key', key: 'ak_prod_xxxxxxxxxxxx', created: '2026-05-15', lastUsed: '2 min ago' },
  { name: 'Development Key', key: 'ak_dev_xxxxxxxxxxxx', created: '2026-06-01', lastUsed: '1 hour ago' },
];

export function Dashboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [keys, setKeys] = useState(apiKeys);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const createKey = () => {
    if (!newKeyName.trim()) return;
    const newKey = {
      name: newKeyName,
      key: `ak_${Math.random().toString(36).substring(2, 14)}`,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
    };
    setKeys([...keys, newKey]);
    setNewKeyName('');
  };

  const maxRequests = Math.max(...usageData.map((d) => d.requests));

  return (
    <div className="flex flex-col">
      {/* Header */}
      <section className="py-8 border-b border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold">
                CP
              </div>
              <div>
                <h1 className="text-xl font-bold">Dashboard</h1>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] h-5 border-cyan-500/30 text-cyan-400">
                    FREE
                  </Badge>
                  <span className="text-xs text-muted-foreground">christopher@abc-io.com</span>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-white/10 w-fit">
              <Zap className="h-3.5 w-3.5 mr-2" />
              Upgrade Plan
            </Button>
          </div>
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-glass border border-border/50">
              <TabsTrigger value="profile" className="text-xs">
                <User className="h-3.5 w-3.5 mr-1.5" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="billing" className="text-xs">
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Billing
              </TabsTrigger>
              <TabsTrigger value="keys" className="text-xs">
                <Key className="h-3.5 w-3.5 mr-1.5" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="usage" className="text-xs">
                <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                Usage
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-sm">Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Email</label>
                      <Input value="christopher@abc-io.com" disabled className="mt-1 bg-white/5" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Full Name</label>
                      <Input value="Christopher Porreca" className="mt-1 bg-white/5" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Account / Team Name</label>
                      <Input value="redot1 Labs" className="mt-1 bg-white/5" />
                    </div>
                    <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-black">
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-sm">Plan Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Current Plan</span>
                      <Badge className="bg-cyan-500 text-black">Free</Badge>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">API Requests</span>
                        <span className="text-xs text-muted-foreground">1,200 / 1,800</span>
                      </div>
                      <Progress value={66} className="h-2" />
                    </div>
                    <div className="pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        Member since June 2026
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing">
              <Card className="bg-glass border-border/50">
                <CardHeader>
                  <CardTitle className="text-sm">Billing History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium mb-1">No billing history</p>
                    <p className="text-xs text-muted-foreground">
                      You are on the Free plan. Upgrade to see billing details.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="keys">
              <Card className="bg-glass border-border/50">
                <CardHeader>
                  <CardTitle className="text-sm">API Keys</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="New key name..."
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="bg-white/5"
                    />
                    <Button onClick={createKey} className="bg-cyan-500 hover:bg-cyan-600 text-black">
                      Create Key
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {keys.map((key) => (
                      <div
                        key={key.key}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5"
                      >
                        <div>
                          <div className="text-sm font-medium">{key.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <code>{key.key.substring(0, 20)}...</code>
                            <button
                              onClick={() => handleCopy(key.key)}
                              className="text-cyan-400 hover:text-cyan-300"
                            >
                              {copiedKey === key.key ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>Created {key.created}</div>
                          <div>Last used {key.lastUsed}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Usage Tab */}
            <TabsContent value="usage">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-glass border-border/50 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-cyan-400" />
                      API Requests (Last 7 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2 h-48">
                      {usageData.map((day) => (
                        <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-cyan-500/30 rounded-t-sm hover:bg-cyan-500/50 transition-colors relative group"
                            style={{ height: `${(day.requests / maxRequests) * 100}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-glass border border-border/50 rounded px-2 py-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {day.requests.toLocaleString()} req
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{day.day}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card className="bg-glass border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-muted-foreground">Total Requests (24h)</span>
                      </div>
                      <div className="text-2xl font-bold">10,300</div>
                      <div className="text-xs text-green-400">+12% from yesterday</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-glass border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-cyan-400" />
                        <span className="text-xs text-muted-foreground">Avg Response Time</span>
                      </div>
                      <div className="text-2xl font-bold">45ms</div>
                      <div className="text-xs text-green-400">-5ms from yesterday</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-glass border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-purple-400" />
                        <span className="text-xs text-muted-foreground">Success Rate</span>
                      </div>
                      <div className="text-2xl font-bold">99.7%</div>
                      <div className="text-xs text-muted-foreground">Last 24 hours</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Help FAB */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-glass border border-border/50 rounded-xl p-3 shadow-lg">
          <div className="text-xs font-medium mb-2">Need help?</div>
          <div className="text-[10px] text-muted-foreground mb-2">Learn, onboard, or chat with support.</div>
          <div className="grid grid-cols-2 gap-1.5">
            <Link to="/help" className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300">
              <BookOpen className="h-3 w-3" /> Help Center
            </Link>
            <Link to="/learn" className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300">
              <Activity className="h-3 w-3" /> eLibrary
            </Link>
            <Link to="/onboarding" className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300">
              <TrendingUp className="h-3 w-3" /> Roadmap
            </Link>
            <Link to="/interface" className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300">
              <Activity className="h-3 w-3" /> Assistant
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
