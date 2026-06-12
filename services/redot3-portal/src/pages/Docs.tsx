import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Copy,
  Check,
  Key,
  User,
  Brain,
  Languages,
  Server,
  Terminal,
  AlertTriangle,
} from 'lucide-react';

const endpoints = [
  {
    category: 'Authentication',
    icon: User,
    items: [
      {
        method: 'POST',
        path: '/auth/register',
        description: 'Create a new user account',
        body: '{ "email": "user@example.com", "password": "min8chars", "firstName": "", "accountName": "" }',
        response: '{ "id": "uuid", "email": "user@example.com", "token": "jwt" }',
      },
      {
        method: 'POST',
        path: '/auth/login',
        description: 'Authenticate and receive JWT token',
        body: '{ "email": "user@example.com", "password": "..." }',
        response: '{ "token": "jwt", "user": { "id": "uuid", "email": "..." } }',
      },
      {
        method: 'GET',
        path: '/auth/me',
        description: 'Get current authenticated user',
        body: null,
        response: '{ "id": "uuid", "email": "...", "plan": "free" }',
      },
    ],
  },
  {
    category: 'AI',
    icon: Brain,
    items: [
      {
        method: 'POST',
        path: '/ai/generate',
        description: 'Generate AI response from prompt',
        body: '{ "prompt": "Explain quantum computing", "model": "default" }',
        response: '{ "response": "...", "tokens": 150, "model": "abc-io-v2" }',
      },
      {
        method: 'GET',
        path: '/ai/health',
        description: 'Check AI service health status',
        body: null,
        response: '{ "status": "ok", "provider": "abc-io", "latency_ms": 45 }',
      },
    ],
  },
  {
    category: 'Translation',
    icon: Languages,
    items: [
      {
        method: 'POST',
        path: '/translate/:modality',
        description: 'Universal translation across modalities',
        body: '{ "input": "Hello world", "target": "braille" }',
        response: '{ "output": "...", "modality": "text-to-braille" }',
      },
      {
        method: 'GET',
        path: '/translate/modalities',
        description: 'List available translation modalities',
        body: null,
        response: '{ "modalities": ["speech-to-text", "text-to-braille", "text-to-morse", "text-to-haptic", "sign-to-text"] }',
      },
    ],
  },
];

const codeExamples = {
  curl: `curl -X POST https://abc-io.com/api/v1/ai/generate \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Explain cross-sensory communication",
    "model": "default"
  }'`,
  javascript: `const response = await fetch('https://abc-io.com/api/v1/ai/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'Explain cross-sensory communication',
    model: 'default'
  })
});

const data = await response.json();
console.log(data.response);`,
  python: `import requests

response = requests.post(
    'https://abc-io.com/api/v1/ai/generate',
    headers={
        'Authorization': 'Bearer YOUR_JWT_TOKEN',
        'Content-Type': 'application/json',
    },
    json={
        'prompt': 'Explain cross-sensory communication',
        'model': 'default'
    }
)

data = response.json()
print(data['response'])`,
};

export function Docs() {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<'curl' | 'javascript' | 'python'>('curl');

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-green-500/20 text-green-400';
      case 'POST':
        return 'bg-cyan-500/20 text-cyan-400';
      case 'PUT':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'DELETE':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 border-cyan-500/30 text-cyan-400">
              API Documentation
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              ABC-IO <span className="text-gradient">API Reference</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Build cross-sensory applications with our comprehensive REST API. 
              Authentication, AI generation, translation, and more.
            </p>
          </div>
        </div>
      </section>

      {/* Base URL */}
      <section className="py-10 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="bg-glass border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Server className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-semibold">Base URL</span>
              </div>
              <code className="text-sm text-cyan-400 bg-black/30 px-3 py-2 rounded-lg block">
                https://abc-io.com/api/v1
              </code>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Authentication */}
      <section className="py-10 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="bg-glass border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Key className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-semibold">Authentication</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                All protected endpoints require either a JWT Bearer token (from login) or an API key (from dashboard).
              </p>
              <div className="space-y-2">
                <code className="text-xs bg-black/30 px-3 py-2 rounded-lg block text-muted-foreground">
                  Authorization: Bearer &lt;jwt-token&gt;
                </code>
                <div className="text-center text-xs text-muted-foreground">OR</div>
                <code className="text-xs bg-black/30 px-3 py-2 rounded-lg block text-muted-foreground">
                  x-api-key: &lt;api-key&gt;
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-10 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold mb-4">Quick Start Example</h2>
          <Card className="bg-glass border-border/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-medium">Example Request</span>
              </div>
              <div className="flex gap-1">
                {(['curl', 'javascript', 'python'] as const).map((lang) => (
                  <Button
                    key={lang}
                    variant={activeLang === lang ? 'default' : 'ghost'}
                    size="sm"
                    className={`text-[10px] h-6 px-2 ${activeLang === lang ? 'bg-cyan-500 text-black' : ''}`}
                    onClick={() => setActiveLang(lang)}
                  >
                    {lang}
                  </Button>
                ))}
              </div>
            </div>
            <div className="relative">
              <pre className="p-4 text-xs overflow-x-auto">
                <code className="text-muted-foreground">{codeExamples[activeLang]}</code>
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-7"
                onClick={() => handleCopy(codeExamples[activeLang], 'example')}
              >
                {copied === 'example' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Endpoints */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Endpoints</h2>
          <div className="space-y-8">
            {endpoints.map((category) => {
              const Icon = category.icon;
              return (
                <div key={category.category}>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className="h-5 w-5 text-cyan-400" />
                    <h3 className="text-lg font-semibold">{category.category}</h3>
                  </div>
                  <div className="space-y-3">
                    {category.items.map((endpoint) => (
                      <Card key={endpoint.path} className="bg-glass border-border/50 overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                            <Badge className={`${getMethodColor(endpoint.method)} w-fit font-mono text-xs`}>
                              {endpoint.method}
                            </Badge>
                            <code className="text-sm text-cyan-400 font-mono">{endpoint.path}</code>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{endpoint.description}</p>
                          {endpoint.body && (
                            <div className="mb-2">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                Request Body
                              </span>
                              <pre className="mt-1 text-xs">
                                <code className="text-muted-foreground">{endpoint.body}</code>
                              </pre>
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                              Response
                            </span>
                            <pre className="mt-1 text-xs">
                              <code className="text-muted-foreground">{endpoint.response}</code>
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Translation Modalities */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Translation Modalities</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The <code className="text-cyan-400">/translate/:modality</code> endpoint supports the following modalities:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {['speech-to-text', 'text-to-braille', 'text-to-morse', 'text-to-haptic', 'sign-to-text', 'universal'].map(
              (modality) => (
                <Card key={modality} className="bg-glass border-border/50">
                  <CardContent className="p-3 text-center">
                    <code className="text-xs text-cyan-400">{modality}</code>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </div>
      </section>

      {/* Error Codes */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <h2 className="text-2xl font-bold">Error Codes</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { code: '400', message: 'Bad Request — Invalid input parameters' },
              { code: '401', message: 'Unauthorized — Invalid or missing token' },
              { code: '403', message: 'Forbidden — Insufficient permissions' },
              { code: '404', message: 'Not Found — Resource does not exist' },
              { code: '429', message: 'Too Many Requests — Rate limit exceeded' },
              { code: '500', message: 'Internal Server Error — Please try again' },
            ].map((error) => (
              <Card key={error.code} className="bg-glass border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <Badge variant="outline" className="text-red-400 border-red-500/30 font-mono">
                    {error.code}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{error.message}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
