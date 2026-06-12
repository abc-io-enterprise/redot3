import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  MessageSquare,
  Calendar,
  GitBranch,
  TrendingUp,
  Globe,
  Heart,
  Share2,
  ThumbsUp,
  Search,
} from 'lucide-react';

const stats = [
  { label: 'Active Users', value: '12,847', icon: Users, color: 'text-cyan-400' },
  { label: 'Messages Today', value: '1.2M', icon: MessageSquare, color: 'text-purple-400' },
  { label: 'Countries', value: '68', icon: Globe, color: 'text-green-400' },
  { label: 'Uptime', value: '99.97%', icon: TrendingUp, color: 'text-yellow-400' },
];

const discussions = [
  {
    title: 'Cross-sensory translation accuracy improvements in v2.1',
    author: 'redot1',
    replies: 34,
    likes: 127,
    tag: 'Announcement',
    time: '2 hours ago',
  },
  {
    title: 'Best practices for haptic feedback encoding in mobile apps',
    author: 'sensory_dev',
    replies: 18,
    likes: 56,
    tag: 'Tutorial',
    time: '5 hours ago',
  },
  {
    title: 'Cellular backup gateway setup guide for remote deployments',
    author: 'field_ops',
    replies: 42,
    likes: 89,
    tag: 'Guide',
    time: '1 day ago',
  },
  {
    title: 'Feature request: Scent modality API for environmental alerts',
    author: 'iot_enthusiast',
    replies: 12,
    likes: 45,
    tag: 'Feature Request',
    time: '2 days ago',
  },
  {
    title: 'Security audit results Q2 2026 — all clear',
    author: 'security_team',
    replies: 8,
    likes: 203,
    tag: 'Security',
    time: '3 days ago',
  },
];

const events = [
  {
    title: 'ABC-IO Developer Summit 2026',
    date: 'July 15-17, 2026',
    location: 'Virtual & NYC',
    type: 'Conference',
  },
  {
    title: 'Cross-Sensory Hackathon',
    date: 'August 5-7, 2026',
    location: 'Global (Online)',
    type: 'Hackathon',
  },
  {
    title: 'Community Town Hall',
    date: 'June 25, 2026',
    location: 'Live Stream',
    type: 'Meetup',
  },
];

const contributors = [
  { name: 'Christopher Porreca', role: 'Founder & Lead', handle: 'redot1', contributions: '2,847' },
  { name: 'Sarah Chen', role: 'AI Engineer', handle: 'sarah_ai', contributions: '1,234' },
  { name: 'Marcus Johnson', role: 'Security Lead', handle: 'mj_security', contributions: '987' },
  { name: 'Elena Rodriguez', role: 'UI/UX Designer', handle: 'elena_design', contributions: '756' },
];

export function Community() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 border-cyan-500/30 text-cyan-400">
              Community
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Join the <span className="text-gradient">Community</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Connect with developers, researchers, and sensory communication enthusiasts 
              building the future of cross-modal information sharing.
            </p>
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search discussions, guides, and topics..."
                className="pl-10 bg-glass border-border/50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="bg-glass border-border/50">
                  <CardContent className="p-5 text-center">
                    <Icon className={`h-6 w-6 ${stat.color} mx-auto mb-2`} />
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Discussions */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-1">Recent Discussions</h2>
              <p className="text-sm text-muted-foreground">Join the conversation</p>
            </div>
            <Button variant="outline" size="sm" className="border-white/10">
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {discussions.map((discussion, index) => (
              <Card key={index} className="bg-glass border-border/50 hover:border-cyan-500/30 transition-all cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] h-5 border-cyan-500/30 text-cyan-400">
                          {discussion.tag}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{discussion.time}</span>
                      </div>
                      <h3 className="text-sm font-medium group-hover:text-cyan-400 transition-colors">
                        {discussion.title}
                      </h3>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-muted-foreground">by {discussion.author}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {discussion.replies}
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        {discussion.likes}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Events & Contributors */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Events */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Upcoming Events</h2>
              <div className="space-y-4">
                {events.map((event, index) => (
                  <Card key={index} className="bg-glass border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-5 w-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{event.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span>{event.date}</span>
                            <span>·</span>
                            <span>{event.location}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] h-5 flex-shrink-0">
                          {event.type}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Top Contributors */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Top Contributors</h2>
              <div className="space-y-3">
                {contributors.map((contributor, index) => (
                  <Card key={index} className="bg-glass border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                          {contributor.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{contributor.name}</h4>
                          <p className="text-xs text-muted-foreground">@{contributor.handle}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{contributor.contributions}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">contributions</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Get Involved */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">Get Involved</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              There are many ways to contribute to the ABC-IO ecosystem.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: MessageSquare, title: 'Join Discussions', desc: 'Participate in forums and share your expertise.' },
              { icon: GitBranch, title: 'Contribute Code', desc: 'Submit PRs and help improve the platform.' },
              { icon: Heart, title: 'Sponsor', desc: 'Support development through sponsorship.' },
              { icon: Share2, title: 'Spread the Word', desc: 'Share ABC-IO with your network.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="bg-glass border-border/50 text-center p-6">
                  <Icon className="h-8 w-8 text-cyan-400 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
