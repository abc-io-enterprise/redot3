import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  BookOpen,
  MessageCircle,
  Zap,
  Shield,
  Smartphone,
  Code,
  CreditCard,
  Users,
  ChevronRight,
  HelpCircle,
  FileText,
  Map,
  Bot,
} from 'lucide-react';

const categories = [
  {
    icon: Zap,
    title: 'Getting Started',
    description: 'Quick start guides and basic setup',
    articles: 12,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  {
    icon: Code,
    title: 'API & Development',
    description: 'API reference and integration guides',
    articles: 24,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Smartphone,
    title: 'Mobile & Beacon',
    description: 'Mobile app and beacon services',
    articles: 8,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: Shield,
    title: 'Security & Privacy',
    description: 'Security features and best practices',
    articles: 15,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
  {
    icon: CreditCard,
    title: 'Billing & Plans',
    description: 'Pricing, billing, and account management',
    articles: 10,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
  },
  {
    icon: Users,
    title: 'Account & Teams',
    description: 'User management and team features',
    articles: 14,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
];

const popularArticles = [
  { title: 'How to set up your first cross-sensory interface', category: 'Getting Started', views: '2.4k' },
  { title: 'API authentication with HMAC-SHA256', category: 'API & Development', views: '1.8k' },
  { title: 'Understanding the 5x5c25 interfacing system', category: 'Getting Started', views: '3.1k' },
  { title: 'Cellular backup gateway configuration', category: 'Mobile & Beacon', views: '1.2k' },
  { title: 'Security best practices for enterprise deployments', category: 'Security & Privacy', views: '2.9k' },
  { title: 'Managing API keys and rate limits', category: 'API & Development', views: '1.5k' },
];

const quickLinks = [
  { icon: BookOpen, title: 'Help Center', desc: 'Browse all articles', href: '/help' },
  { icon: FileText, title: 'eLibrary', desc: 'Self-paced guides', href: '/learn' },
  { icon: Map, title: 'Onboarding Roadmap', desc: '24-month curriculum', href: '/onboarding' },
  { icon: Bot, title: 'Digital Assistant', desc: 'Ask AI for help', href: '/interface' },
];

export function Help() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = popularArticles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 border-cyan-500/30 text-cyan-400">
              Help Center
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              How Can We <span className="text-gradient">Help?</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Find answers and learn how to get the most out of ABC-IO.
            </p>
            <div className="max-w-lg mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-glass border-border/50 h-12"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-10 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link to={link.href} key={link.title}>
                  <Card className="bg-glass border-border/50 hover:border-cyan-500/30 transition-all cursor-pointer group h-full">
                    <CardContent className="p-5 text-center">
                      <Icon className="h-6 w-6 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <h3 className="text-sm font-semibold">{link.title}</h3>
                      <p className="text-xs text-muted-foreground">{link.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Card
                  key={category.title}
                  className="bg-glass border-border/50 hover:border-cyan-500/30 transition-all cursor-pointer group"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg ${category.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${category.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold group-hover:text-cyan-400 transition-colors">
                          {category.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
                        <p className="text-xs text-cyan-400 mt-2">{category.articles} articles</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 self-center" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">
            {searchQuery ? 'Search Results' : 'Popular Articles'}
          </h2>
          {filteredArticles.length > 0 ? (
            <div className="space-y-3">
              {filteredArticles.map((article, index) => (
                <Card
                  key={index}
                  className="bg-glass border-border/50 hover:border-cyan-500/30 transition-all cursor-pointer group"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium group-hover:text-cyan-400 transition-colors">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {article.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                        <HelpCircle className="h-3 w-3" />
                        {article.views} views
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-medium mb-1">No results found</h3>
              <p className="text-sm text-muted-foreground">
                Try a different search term or browse categories above.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/20 via-purple-500/10 to-background border border-cyan-500/20 p-10">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Still Need Help?</h2>
                <p className="text-muted-foreground">
                  Our support team is available 24/7 to assist you with any questions.
                </p>
              </div>
              <div className="flex gap-3">
                <Link to="/customer-area">
                  <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </Link>
                <Link to="/docs">
                  <Button variant="outline" className="border-white/20">
                    <BookOpen className="h-4 w-4 mr-2" />
                    API Docs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
