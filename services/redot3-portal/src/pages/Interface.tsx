import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Bot, User, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function Interface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Welcome to the ABC-IO Universal Interface. I am your cross-sensory communication assistant. How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        'I can help you with cross-sensory communication setup, API integration, or platform configuration. What specific area would you like to explore?',
        'ABC-IO supports six sensory modalities: touch, audio, visual, haptic, scent, and taste. Each can be accessed via our REST API.',
        'To get started with the API, you\'ll need to authenticate using HMAC-SHA256 signing. Check the API Documentation for detailed examples.',
        'The 5x5c25 interfacing system provides 25 capability modules across 5 solution families. Would you like me to explain any specific module?',
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setMessages((prev) => [...prev, { role: 'assistant', content: randomResponse }]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col max-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="border-b border-border/50 p-4">
        <div className="mx-auto max-w-4xl flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">ABC-IO Interface</h1>
            <p className="text-[10px] text-muted-foreground">
              Universal silicone and carbon cross-sensory information sharing communications.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-cyan-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                  message.role === 'user'
                    ? 'bg-cyan-500 text-black'
                    : 'bg-glass border border-border/50'
                }`}
              >
                {message.content}
              </div>
              {message.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="bg-glass border border-border/50 rounded-xl px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-4">
        <div className="mx-auto max-w-4xl flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about cross-sensory communication, API, or platform features..."
            className="bg-glass border-border/50"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-cyan-500 hover:bg-cyan-600 text-black px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mx-auto max-w-4xl mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>Powered by ABC-IO AI Engine</span>
          <div className="flex gap-3">
            <Link to="/" className="hover:text-cyan-400">Portal</Link>
            <Link to="/account" className="hover:text-cyan-400">Account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
