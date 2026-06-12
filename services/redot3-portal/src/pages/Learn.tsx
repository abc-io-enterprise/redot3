import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  BookOpen,
  Code,
  Shield,
  Smartphone,
  Zap,
  Users,
  Clock,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';

const categories = [
  { id: 'all', label: 'All' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'api', label: 'API & Dev' },
  { id: 'security', label: 'Security' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'advanced', label: 'Advanced' },
];

const articles = [
  {
    title: 'Getting Started with ABC-IO',
    category: 'getting-started',
    readTime: '5 min',
    description: 'Learn the basics of setting up your ABC-IO account and first project.',
    icon: Zap,
  },
  {
    title: 'Understanding Cross-Sensory Communication',
    category: 'getting-started',
    readTime: '8 min',
    description: 'A deep dive into the six sensory modalities and how they work together.',
    icon: BookOpen,
  },
  {
    title: 'API Authentication Guide',
    category: 'api',
    readTime: '6 min',
    description: 'How to authenticate with HMAC-SHA256 and manage API keys securely.',
    icon: Code,
  },
  {
    title: 'Building Your First Integration',
    category: 'api',
    readTime: '12 min',
    description: 'Step-by-step guide to integrating ABC-IO into your application.',
    icon: Code,
  },
  {
    title: 'Enterprise Security Best Practices',
    category: 'security',
    readTime: '10 min',
    description: 'Security configurations for production deployments at scale.',
    icon: Shield,
  },
  {
    title: 'Configuring Biometric Tokens',
    category: 'security',
    readTime: '7 min',
    description: 'Set up hardware-backed biometric authentication for your team.',
    icon: Shield,
  },
  {
    title: 'Mobile App Setup Guide',
    category: 'mobile',
    readTime: '5 min',
    description: 'Install and configure the ABC-IO mobile app on your device.',
    icon: Smartphone,
  },
  {
    title: 'Cellular Backup Gateway Configuration',
    category: 'mobile',
    readTime: '9 min',
    description: 'Configure emergency mesh gateway on Android devices.',
    icon: Smartphone,
  },
  {
    title: 'Advanced Mesh Network Topology',
    category: 'advanced',
    readTime: '15 min',
    description: 'Understanding the 3-node cluster architecture and failover mechanisms.',
    icon: Users,
  },
  {
    title: 'Custom Sensory Modality Development',
    category: 'advanced',
    readTime: '20 min',
    description: 'Extend ABC-IO with custom sensory translation modules.',
    icon: BookOpen,
  },
];

export function Learn() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = articles.filter((article) => {
    const matchesCategory = activeCategory === 'all' || article.category === activeCategory;
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 border-cyan-500/30 text-cyan-400">
              eLibrary
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              ABC-IO <span className="text-gradient">eLibrary</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Self-paced guides, onboarding tracks, and reference articles for ABC-IO.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Link to="/onboarding">
                <Badge className="bg-cyan-500 text-black px-4 py-2 text-sm cursor-pointer hover:bg-cyan-600 transition-colors">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Start Onboarding Roadmap
                </Badge>
              </Link>
              <Link to="/help">
                <Badge variant="outline" className="px-4 py-2 text-sm cursor-pointer">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Help Center
                </Badge>
              </Link>
            </div>
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-glass border-border/50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-6 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-cyan-500 text-black'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-10 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredArticles.map((article, index) => {
              const Icon = article.icon;
              return (
                <Card
                  key={index}
                  className="bg-glass border-border/50 hover:border-cyan-500/30 transition-all cursor-pointer group"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold group-hover:text-cyan-400 transition-colors mb-1">
                          {article.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-2">{article.description}</p>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {categories.find((c) => c.id === article.category)?.label}
                          </Badge>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {article.readTime}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filteredArticles.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No articles found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
